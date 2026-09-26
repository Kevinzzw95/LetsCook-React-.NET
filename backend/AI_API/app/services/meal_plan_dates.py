from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError, TypeError) as exc:
        raise ValueError('timezone must be a valid IANA timezone') from exc
    return value


def resolve_start_date(timezone_name: str, start_date: date | None, day_offset: int | None,
                       now: datetime | None = None) -> date | None:
    if start_date is not None:
        return start_date
    if day_offset is None:
        return None
    local_today = (now or datetime.now(timezone.utc)).astimezone(ZoneInfo(timezone_name)).date()
    return local_today + timedelta(days=day_offset)
