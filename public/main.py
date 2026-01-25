import asyncio
import hashlib
import json
import logging
import os
import random
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, List
from urllib.parse import urlparse, parse_qs

import httpx
from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import engine, get_db
from app.models import YoutubeLiveStatus  # 對應 youtube_live_status 表

# -------------------------
# 密碼 Hash 設定（與前端 Edge Function 一致）
# -------------------------
PASSWORD_SALT = "tw_live_salt_2024"

def hash_password(password: str) -> str:
    """使用 SHA-256 和固定 salt 進行密碼雜湊"""
    salted = password + PASSWORD_SALT
    return hashlib.sha256(salted.encode()).hexdigest()


# -------------------------
# logging
# -------------------------
logger = logging.getLogger("yt-live-monitor")
logging.basicConfig(level=logging.INFO)

CONFIG_PATH = Path("config.json")

# 目前 DB 沒有 name 欄位：先用記憶體暫存（重開會消失）
NAME_CACHE: Dict[str, Optional[str]] = {}



# -------------------------
# config
# -------------------------
def load_config() -> dict:
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return {"polling": {"interval_seconds": 30, "jitter_seconds": 10}}


def get_poll_seconds(cfg: dict) -> tuple[int, int]:
    polling = cfg.get("polling", {})
    h = float(polling.get("interval_hours", 0) or 0)
    s = int(polling.get("interval_seconds", 0) or 0)
    base = int(h * 3600) if h > 0 else (s if s > 0 else 30)
    jitter = int(polling.get("jitter_seconds", 0) or 0)
    return max(1, base), max(0, jitter)


# -------------------------
# youtube helpers
# -------------------------
def extract_video_id(value: str) -> Optional[str]:
    """
    支援：
    - video_id
    - https://www.youtube.com/watch?v=xxxxx
    - https://youtu.be/xxxxx
    """
    v = (value or "").strip()
    if not v:
        return None

    # 直接是 11 碼
    if len(v) == 11 and all(c.isalnum() or c in "-_" for c in v):
        return v

    try:
        u = urlparse(v)
        if u.netloc in ("www.youtube.com", "youtube.com", "m.youtube.com") and u.path == "/watch":
            q = parse_qs(u.query)
            vid = (q.get("v") or [None])[0]
            if vid and len(vid) == 11:
                return vid
        if u.netloc in ("youtu.be",) and u.path.strip("/"):
            vid = u.path.strip("/")
            if len(vid) == 11:
                return vid
    except Exception:
        return None

    return None


async def check_video_live(video_id: str) -> tuple[bool, Optional[str], Optional[str]]:
    """
    免 key 的簡易判斷：抓 /watch 頁面判斷是否直播中
    回傳: (is_live_now, live_status_text, note)
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; YTLiveMonitor/1.0)",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    }

    async with httpx.AsyncClient(timeout=15, headers=headers, follow_redirects=True) as client:
        r = await client.get(url)

    if r.status_code != 200:
        return False, None, f"HTTP {r.status_code}"

    t = (r.text or "").lower()

    # 粗略判斷（你後續要更準我再幫你加解析 ytInitialPlayerResponse）
    if "islivecontent" in t or '"isLive"' in t or '"is_live"' in t:
        return True, "LIVE", None

    # 有些可能是預告 upcoming
    if "upcoming" in t and "livestream" in t:
        return False, "UPCOMING", None

    return False, "OFF", None


# -------------------------
# schemas (配合你前端)
# -------------------------
class VideoCreate(BaseModel):
    watch_url: str
    name: Optional[str] = None


class VideoItem(BaseModel):
    video_id: str
    name: Optional[str] = None


class StatusItem(BaseModel):
    video_id: str
    is_live_now: bool
    live_status: Optional[str] = None
    checked_at: str
    note: Optional[str] = None




class ChangePasswordRequest(BaseModel):
    username: str
    currentPassword: str
    newPassword: str


class ChangePasswordResponse(BaseModel):
    success: bool
    message: Optional[str] = None


# -------------------------
# app
# -------------------------
app = FastAPI(title="YT Live 影片檢測（CRUD）", version="0.1.0")

# 加入 CORS 支援（讓前端可以跨域請求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境建議改成你的前端 URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
# 掛載 static 資料夾
app.mount("/static", StaticFiles(directory="static"), name="static")

STATUS_CACHE: Dict[str, StatusItem] = {}


# -------------------------
# DB crud (youtube_live_status)
# -------------------------
async def db_list(db: AsyncSession) -> list[YoutubeLiveStatus]:
    res = await db.execute(select(YoutubeLiveStatus))
    return res.scalars().all()


async def db_get(db: AsyncSession, live_id: str) -> Optional[YoutubeLiveStatus]:
    res = await db.execute(select(YoutubeLiveStatus).where(YoutubeLiveStatus.live_id == live_id))
    return res.scalar_one_or_none()


async def db_upsert(db: AsyncSession, live_id: str, status: bool, error_message: Optional[str]):
    obj = await db_get(db, live_id)
    if obj:
        obj.status = bool(status)
        obj.error_message = error_message
    else:
        obj = YoutubeLiveStatus(live_id=live_id, status=bool(status), error_message=error_message)
        db.add(obj)
    await db.commit()
    return obj


async def db_insert_if_missing(db: AsyncSession, live_id: str):
    obj = await db_get(db, live_id)
    if obj:
        return obj
    obj = YoutubeLiveStatus(live_id=live_id, status=False, error_message=None)
    db.add(obj)
    await db.commit()
    return obj


async def db_delete(db: AsyncSession, live_id: str) -> bool:
    obj = await db_get(db, live_id)
    if not obj:
        return False
    await db.delete(obj)
    await db.commit()
    return True


# -------------------------
# polling loop
# -------------------------
async def poll_loop():
    while True:
        cfg = load_config()
        base, jitter = get_poll_seconds(cfg)

        try:
            async with SessionLocal() as db:
                rows = await db_list(db)

                # rows.live_id 可能存 video_id 或 URL：都轉成 video_id
                for r in rows:
                    raw = (r.live_id or "").strip()
                    vid = extract_video_id(raw)

                    now = datetime.now(timezone.utc).isoformat()

                    if not vid:
                        STATUS_CACHE[raw] = StatusItem(
                            video_id=raw,
                            is_live_now=False,
                            live_status=None,
                            checked_at=now,
                            note="無法解析 video_id",
                        )
                        await db_upsert(db, raw, False, "invalid video_id/url")
                        continue

                    is_live, live_status, note = await check_video_live(vid)

                    STATUS_CACHE[vid] = StatusItem(
                        video_id=vid,
                        is_live_now=is_live,
                        live_status=live_status,
                        checked_at=now,
                        note=note,
                    )

                    await db_upsert(db, raw, is_live, note)

        except Exception as e:
            logger.warning(f"poll_loop error: {type(e).__name__}")

        sleep_s = base + (random.randint(0, jitter) if jitter > 0 else 0)
        await asyncio.sleep(sleep_s)


@app.on_event("startup")
async def startup():
    cfg = load_config()
    base, jitter = get_poll_seconds(cfg)
    Year = base // 3600 // 24 // 365
    Month = (base // 3600 // 24) % 365 // 30 - Year * 12 
    Day = (base // 3600) % 24 // 30 - Year * 365 - Month * 30
    Hour = (base // 3600) % 24 - Year * 365 * 24 - Month * 30 * 24 - Day * 24
    Minute = (base // 60) % 60 - Year * 365 * 24 - Month * 30 * 24 - Day * 24 - Hour * 60
    Second = base % 60 
    logger.info(f"後端輪詢間隔設定為：{(Year,'年')if Year>0 else ''} {(Month,'月') if Month>0 else ''} {(Day,'天') if Day>0 else ''} {(Hour,'小時') if Hour>0 else ''} {(Minute,'分') if Minute>0 else ''} {(Second,'秒') if Second>0 else ''}（不含 jitter）")
    asyncio.create_task(poll_loop())


# -------------------------
# routes (配合你 HTML)
# -------------------------
@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/healthz")
async def healthz(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        rows = await db_list(db)
        return {"ok": True, "watching": len(rows), "cached": len(STATUS_CACHE)}
    except Exception as e:
        raise HTTPException(500, f"db error: {type(e).__name__}")


@app.get("/videos", response_model=List[VideoItem])
async def list_videos(db: AsyncSession = Depends(get_db)):
    rows = await db_list(db)

    out: List[VideoItem] = []
    for r in rows:
        raw = (r.live_id or "").strip()
        vid = extract_video_id(raw) or raw
        out.append(VideoItem(video_id=vid, name=NAME_CACHE.get(vid)))
    return out


@app.post("/videos", response_model=VideoItem)
async def add_video(item: VideoCreate, db: AsyncSession = Depends(get_db)):
    vid = extract_video_id(item.watch_url)
    if not vid:
        raise HTTPException(400, "watch_url 無法解析成 11 碼 video_id")

    await db_insert_if_missing(db, item.watch_url.strip())  # live_id 保留原始輸入
    NAME_CACHE[vid] = item.name
    return VideoItem(video_id=vid, name=item.name)


@app.delete("/videos/{video_id}")
async def delete_video(video_id: str, db: AsyncSession = Depends(get_db)):
    # DB 裡 live_id 可能是 URL，也可能是 video_id，所以兩種都試
    ok = await db_delete(db, video_id)
    if not ok:
        # 嘗試刪除 watch URL 版本
        ok = await db_delete(db, f"https://www.youtube.com/watch?v={video_id}")
        if not ok:
            ok = await db_delete(db, f"https://youtu.be/{video_id}")

    if not ok:
        raise HTTPException(404, "not found")

    NAME_CACHE.pop(video_id, None)
    STATUS_CACHE.pop(video_id, None)
    return {"removed": video_id}


@app.get("/status", response_model=List[StatusItem])
async def list_status():
    return list(STATUS_CACHE.values())



# -------------------------
# 更改密碼 API
# -------------------------
@app.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(req: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    """
    更改用戶密碼
    - username: 用戶名
    - currentPassword: 目前密碼
    - newPassword: 新密碼
    """
    username = req.username.strip()
    current_password = req.currentPassword
    new_password = req.newPassword
    
    if not username or not current_password or not new_password:
        raise HTTPException(400, "請填寫所有欄位")
    
    if len(new_password) < 4:
        raise HTTPException(400, "新密碼至少需要 4 個字元")
    
    # 計算密碼 hash
    current_hash = hash_password(current_password)
    new_hash = hash_password(new_password)
    
    try:
        # 查詢用戶
        result = await db.execute(
            text("SELECT id, password_hash FROM users WHERE username = :username"),
            {"username": username}
        )
        user = result.fetchone()
        
        if not user:
            raise HTTPException(404, "用戶不存在")
        
        # 驗證目前密碼
        if user.password_hash != current_hash:
            raise HTTPException(401, "目前密碼不正確")
        
        # 更新密碼
        await db.execute(
            text("UPDATE users SET password_hash = :new_hash WHERE username = :username"),
            {"new_hash": new_hash, "username": username}
        )
        await db.commit()
        
        logger.info(f"用戶 {username} 成功更改密碼")
        
        return ChangePasswordResponse(success=True, message="密碼已更改")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更改密碼失敗: {type(e).__name__}: {e}")
        raise HTTPException(500, "更改密碼失敗，請稍後再試")


# -------------------------
# frontend: 直接回傳你的 HTML
# -------------------------
INDEX_HTML = r"""REPLACE_WITH_YOUR_HTML"""

@app.get("/", response_class=HTMLResponse)
async def index():
    return INDEX_HTML
