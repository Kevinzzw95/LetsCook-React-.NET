import asyncio
import os
import signal
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Any, List, Optional

import config
from main import CrawlerFactory
from store.xhs._store_impl import XhsMemoryStoreImplement

from app.schemas import CrawlerStartRequest, LogEntry


class CrawlerManager:
    """Crawler process manager"""

    def __init__(self):
        self._lock = asyncio.Lock()
        self.process: Optional[subprocess.Popen] = None
        self.status = "idle"
        self.started_at: Optional[datetime] = None
        self.current_config: Optional[CrawlerStartRequest] = None
        self._log_id = 0
        self._logs: List[LogEntry] = []
        self._read_task: Optional[asyncio.Task] = None
        # Project root directory
        self._project_root = Path(__file__).parent.parent.parent
        # Log queue - for pushing to WebSocket
        self._log_queue: Optional[asyncio.Queue] = None

    @property
    def logs(self) -> List[LogEntry]:
        return self._logs

    def get_log_queue(self) -> asyncio.Queue:
        """Get or create log queue"""
        if self._log_queue is None:
            self._log_queue = asyncio.Queue()
        return self._log_queue

    def _create_log_entry(self, message: str, level: str = "info") -> LogEntry:
        """Create log entry"""
        self._log_id += 1
        entry = LogEntry(
            id=self._log_id,
            timestamp=datetime.now().strftime("%H:%M:%S"),
            level=level,
            message=message
        )
        self._logs.append(entry)
        # Keep last 500 logs
        if len(self._logs) > 500:
            self._logs = self._logs[-500:]
        return entry

    async def _push_log(self, entry: LogEntry):
        """Push log to queue"""
        if self._log_queue is not None:
            try:
                self._log_queue.put_nowait(entry)
            except asyncio.QueueFull:
                pass

    def _parse_log_level(self, line: str) -> str:
        """Parse log level"""
        line_upper = line.upper()
        if "ERROR" in line_upper or "FAILED" in line_upper:
            return "error"
        elif "WARNING" in line_upper or "WARN" in line_upper:
            return "warning"
        elif "SUCCESS" in line_upper or "完成" in line or "成功" in line:
            return "success"
        elif "DEBUG" in line_upper:
            return "debug"
        return "info"

    def _redact_command_for_log(self, cmd: list[str]) -> list[str]:
        """Redact sensitive CLI argument values before logging."""
        redacted: list[str] = []
        skip_next_cookie_value = False

        for part in cmd:
            if skip_next_cookie_value:
                redacted.append("<redacted>")
                skip_next_cookie_value = False
                continue

            redacted.append(part)
            if part == "--cookies":
                skip_next_cookie_value = True

        return redacted

    async def start(self, config: CrawlerStartRequest) -> bool:
        """Start crawler process"""
        async with self._lock:
            if self.process and self.process.poll() is None:
                return False

            # Clear old logs
            self._logs = []
            self._log_id = 0

            # Clear pending queue (don't replace object to avoid WebSocket broadcast coroutine holding old queue reference)
            if self._log_queue is None:
                self._log_queue = asyncio.Queue()
            else:
                try:
                    while True:
                        self._log_queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass

            # Build command line arguments
            cmd = self._build_command(config)

            # Log start information
            safe_cmd = self._redact_command_for_log(cmd)
            entry = self._create_log_entry(f"Starting crawler: {' '.join(safe_cmd)}", "info")
            await self._push_log(entry)

            try:
                # Start subprocess
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',
                    bufsize=1,
                    cwd=str(self._project_root),
                    env={**os.environ, "PYTHONUNBUFFERED": "1"}
                )

                self.status = "running"
                self.started_at = datetime.now()
                self.current_config = config

                entry = self._create_log_entry(
                    f"Crawler started on platform: {config.platform.value}, type: {config.crawler_type.value}",
                    "success"
                )
                await self._push_log(entry)

                # Start log reading task
                self._read_task = asyncio.create_task(self._read_output())

                return True
            except Exception as e:
                self.status = "error"
                entry = self._create_log_entry(f"Failed to start crawler: {str(e)}", "error")
                await self._push_log(entry)
                return False

    async def start_detail_and_collect(self, request: CrawlerStartRequest) -> Optional[dict[str, List[dict[str, Any]]]]:
        """Run XHS detail crawling in-process and return scraped data directly."""
        async with self._lock:
            if self.status == "running" or (self.process and self.process.poll() is None):
                return None

            if request.platform.value != "xhs":
                raise ValueError("Direct in-response detail crawling is currently supported for xhs only")

            self._logs = []
            self._log_id = 0
            self.status = "running"
            self.started_at = datetime.now()
            self.current_config = request

            entry = self._create_log_entry(
                f"Starting in-memory detail crawl for platform: {request.platform.value}",
                "info",
            )
            await self._push_log(entry)

            previous_config = self._snapshot_config()
            crawler = None

            try:
                self._apply_request_config(request, save_option_override="memory")
                XhsMemoryStoreImplement.reset()

                crawler = CrawlerFactory.create_crawler(platform=request.platform.value)
                await crawler.start(request.url_list)

                results = XhsMemoryStoreImplement.snapshot()
                if not results["contents"]:
                    raise RuntimeError("Crawler completed but no note detail was collected")

                entry = self._create_log_entry("In-memory detail crawl completed successfully", "success")
                await self._push_log(entry)
                return results
            except Exception as e:
                self.status = "error"
                entry = self._create_log_entry(f"Failed to run detail crawl: {str(e)}", "error")
                await self._push_log(entry)
                raise RuntimeError(str(e))
            finally:
                await self._cleanup_crawler(crawler)
                self._restore_config(previous_config)
                self.status = "idle"
                self.current_config = None
                self.process = None
                self._read_task = None

    async def stop(self) -> bool:
        """Stop crawler process"""
        async with self._lock:
            if not self.process or self.process.poll() is not None:
                return False

            self.status = "stopping"
            entry = self._create_log_entry("Sending SIGTERM to crawler process...", "warning")
            await self._push_log(entry)

            try:
                self.process.send_signal(signal.SIGTERM)

                # Wait for graceful exit (up to 15 seconds)
                for _ in range(30):
                    if self.process.poll() is not None:
                        break
                    await asyncio.sleep(0.5)

                # If still not exited, force kill
                if self.process.poll() is None:
                    entry = self._create_log_entry("Process not responding, sending SIGKILL...", "warning")
                    await self._push_log(entry)
                    self.process.kill()

                entry = self._create_log_entry("Crawler process terminated", "info")
                await self._push_log(entry)

            except Exception as e:
                entry = self._create_log_entry(f"Error stopping crawler: {str(e)}", "error")
                await self._push_log(entry)

            self.status = "idle"
            self.current_config = None

            # Cancel log reading task
            if self._read_task:
                self._read_task.cancel()
                self._read_task = None

            return True

    def get_status(self) -> dict:
        """Get current status"""
        return {
            "status": self.status,
            "platform": self.current_config.platform.value if self.current_config else None,
            "crawler_type": self.current_config.crawler_type.value if self.current_config else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "error_message": None
        }

    def _build_command(self, config: CrawlerStartRequest) -> list:
        """Build main.py command line arguments"""
        cmd = ["uv", "run", "main.py"]

        cmd.extend(["--platform", config.platform.value])
        cmd.extend(["--lt", config.login_type.value])
        cmd.extend(["--type", config.crawler_type.value])
        cmd.extend(["--save_data_option", config.save_option.value])

        # Pass different arguments based on crawler type
        if config.crawler_type.value == "search" and config.keywords:
            cmd.extend(["--keywords", config.keywords])
        elif config.crawler_type.value == "detail" and config.specified_ids:
            cmd.extend(["--specified_id", config.specified_ids])
        elif config.crawler_type.value == "creator" and config.creator_ids:
            cmd.extend(["--creator_id", config.creator_ids])

        if config.start_page != 1:
            cmd.extend(["--start", str(config.start_page)])

        cmd.extend(["--get_comment", "true" if config.enable_comments else "false"])
        cmd.extend(["--get_sub_comment", "true" if config.enable_sub_comments else "false"])

        if config.cookies:
            cmd.extend(["--cookies", config.cookies])

        cmd.extend(["--headless", "true" if config.headless else "false"])

        return cmd

    def _snapshot_config(self) -> dict[str, Any]:
        """Snapshot config values that the API mutates for in-process crawling."""
        return {
            "PLATFORM": config.PLATFORM,
            "LOGIN_TYPE": config.LOGIN_TYPE,
            "CRAWLER_TYPE": config.CRAWLER_TYPE,
            "KEYWORDS": config.KEYWORDS,
            "COOKIES": config.COOKIES,
            "START_PAGE": config.START_PAGE,
            "ENABLE_GET_COMMENTS": config.ENABLE_GET_COMMENTS,
            "ENABLE_GET_SUB_COMMENTS": config.ENABLE_GET_SUB_COMMENTS,
            "SAVE_DATA_OPTION": config.SAVE_DATA_OPTION,
            "HEADLESS": config.HEADLESS,
            "CDP_HEADLESS": config.CDP_HEADLESS,
            "XHS_SPECIFIED_NOTE_URL_LIST": list(config.XHS_SPECIFIED_NOTE_URL_LIST),
            "XHS_CREATOR_ID_LIST": list(config.XHS_CREATOR_ID_LIST),
        }

    def _restore_config(self, previous_config: dict[str, Any]):
        """Restore mutated config values after an in-process crawl."""
        for key, value in previous_config.items():
            setattr(config, key, value)

    def _apply_request_config(self, request: CrawlerStartRequest, save_option_override: Optional[str] = None):
        """Apply request values to global config for in-process crawling."""
        config.PLATFORM = request.platform.value
        config.LOGIN_TYPE = request.login_type.value
        config.CRAWLER_TYPE = request.crawler_type.value
        config.KEYWORDS = request.keywords
        config.COOKIES = request.cookies
        config.START_PAGE = request.start_page
        config.ENABLE_GET_COMMENTS = request.enable_comments
        config.ENABLE_GET_SUB_COMMENTS = request.enable_sub_comments
        config.SAVE_DATA_OPTION = save_option_override or request.save_option.value
        config.HEADLESS = request.headless
        config.CDP_HEADLESS = request.headless

        if request.platform.value == "xhs":
            config.XHS_SPECIFIED_NOTE_URL_LIST = [
                item.strip() for item in request.specified_ids.split(",") if item.strip()
            ]

    async def _cleanup_crawler(self, crawler):
        """Best-effort cleanup for in-process crawlers."""
        if not crawler:
            return

        close_method = getattr(crawler, "close", None)
        if callable(close_method):
            try:
                await close_method()
                return
            except Exception:
                pass

        browser_context = getattr(crawler, "browser_context", None)
        if browser_context:
            try:
                await browser_context.close()
            except Exception:
                pass

    async def _read_output(self):
        """Asynchronously read process output"""
        loop = asyncio.get_event_loop()

        try:
            while self.process and self.process.poll() is None:
                # Read a line in thread pool
                line = await loop.run_in_executor(
                    None, self.process.stdout.readline
                )
                if line:
                    line = line.strip()
                    if line:
                        level = self._parse_log_level(line)
                        entry = self._create_log_entry(line, level)
                        await self._push_log(entry)

            # Read remaining output
            if self.process and self.process.stdout:
                remaining = await loop.run_in_executor(
                    None, self.process.stdout.read
                )
                if remaining:
                    for line in remaining.strip().split('\n'):
                        if line.strip():
                            level = self._parse_log_level(line)
                            entry = self._create_log_entry(line.strip(), level)
                            await self._push_log(entry)

            # Process ended
            if self.status == "running":
                exit_code = self.process.returncode if self.process else -1
                if exit_code == 0:
                    entry = self._create_log_entry("Crawler completed successfully", "success")
                else:
                    entry = self._create_log_entry(f"Crawler exited with code: {exit_code}", "warning")
                await self._push_log(entry)
                self.status = "idle"

        except asyncio.CancelledError:
            pass
        except Exception as e:
            entry = self._create_log_entry(f"Error reading output: {str(e)}", "error")
            await self._push_log(entry)


# Global singleton
crawler_manager = CrawlerManager()
