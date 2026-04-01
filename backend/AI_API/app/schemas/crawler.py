from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class PlatformEnum(str, Enum):
    """Supported media platforms"""
    XHS = "xhs"
    DOUYIN = "dy"
    KUAISHOU = "ks"
    BILIBILI = "bili"
    WEIBO = "wb"
    TIEBA = "tieba"
    ZHIHU = "zhihu"


class LoginTypeEnum(str, Enum):
    """Login method"""
    QRCODE = "qrcode"
    PHONE = "phone"
    COOKIE = "cookie"


class CrawlerTypeEnum(str, Enum):
    """Crawler type"""
    SEARCH = "search"
    DETAIL = "detail"
    CREATOR = "creator"


class SaveDataOptionEnum(str, Enum):
    """Data save option"""
    CSV = "csv"
    DB = "db"
    JSON = "json"
    JSONL = "jsonl"
    SQLITE = "sqlite"
    MONGODB = "mongodb"
    EXCEL = "excel"
    POSTGRES = "postgres"


class CrawlerStartRequest(BaseModel):
    """Crawler start request"""
    platform: PlatformEnum = PlatformEnum.XHS
    login_type: LoginTypeEnum = LoginTypeEnum.COOKIE
    crawler_type: CrawlerTypeEnum = CrawlerTypeEnum.DETAIL
    keywords: str = ""  # Keywords for search mode
    specified_ids: str = "https://www.xiaohongshu.com/discovery/item/68b6496b000000001c012f9a?source=webshare&xhsshare=pc_web&xsec_token=AB2Db2ABvvfbM6uaaHUrUeQzfo4SPIQR5ku2dQnupGfCQ=&xsec_source=pc_share"  # Post/video ID list for detail mode, comma-separated
    creator_ids: str = ""  # Creator ID list for creator mode, comma-separated
    start_page: int = Field(default=1, ge=1)
    enable_comments: bool = False
    enable_sub_comments: bool = False
    save_option: SaveDataOptionEnum = SaveDataOptionEnum.JSONL
    cookies: str = "abRequestId=d137752e-15b5-58ac-b67b-8ccc288f175d; webBuild=6.1.2; xsecappid=xhs-pc-web; a1=19d0d05a999diypi3pv9546rpowyp42l3ha9f2txi30000185867; webId=f1d6bd4c51a6164672689735133924fc; unread={%22ub%22:%2269b0ff64000000000800fe88%22%2C%22ue%22:%22699971c4000000001b01732f%22%2C%22uc%22:24}; gid=yjf8f82SfWqDyjf8f820jxJ9jjf3vU3qUhj20C34KFUlEjq8vU4J1i888yY2YKW8qSi2Yf4Y; web_session=040069b10752635668086856f53b4b7c073b4f; id_token=VjEAABfVz7GuDKs0Tss2OMmd9eArnGm0ApKYbeRN1hv3Fh336aQD9qcXbvnNmPezmBHpawgjt5lEbcKu4c/hqBY24k5dpCm31BVB2De545wBPwQ3krVO4s1oVWlHZGhLSafNbneR; loadts=1774198277356; websectiga=cffd9dcea65962b05ab048ac76962acee933d26157113bb213105a116241fa6c; sec_poison_id=97e8de25-b579-4aa4-8b13-5b3352bd2d7e"
    headless: bool = False
    url_list: List[str] = Field(default_factory=list)

    @field_validator("keywords", "specified_ids", "creator_ids", "cookies", mode="before")
    @classmethod
    def _strip_string_fields(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value

    """ @model_validator(mode="after")
    def _validate_mode_requirements(self):
        if self.crawler_type == CrawlerTypeEnum.SEARCH and not self.keywords:
            raise ValueError("keywords is required when crawler_type is 'search'")

        if self.crawler_type == CrawlerTypeEnum.DETAIL and not self.specified_ids:
            raise ValueError("specified_ids is required when crawler_type is 'detail'")

        if self.crawler_type == CrawlerTypeEnum.CREATOR and not self.creator_ids:
            raise ValueError("creator_ids is required when crawler_type is 'creator'")

        if self.login_type == LoginTypeEnum.COOKIE and not self.cookies:
            raise ValueError("cookies is required when login_type is 'cookie'")

        return self """


class CrawlerStatusResponse(BaseModel):
    """Crawler status response"""
    status: Literal["idle", "running", "stopping", "error"]
    platform: Optional[str] = None
    crawler_type: Optional[str] = None
    started_at: Optional[str] = None
    error_message: Optional[str] = None


class LogEntry(BaseModel):
    """Log entry"""
    id: int
    timestamp: str
    level: Literal["info", "warning", "error", "success", "debug"]
    message: str


class DataFileInfo(BaseModel):
    """Data file information"""
    name: str
    path: str
    size: int
    modified_at: str
    record_count: Optional[int] = None
