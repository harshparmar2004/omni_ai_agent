import os
import sys
import json
import asyncio
import uvicorn
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel
import yt_dlp
from instagrapi import Client

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

app = FastAPI(
    title="OmniResearch Instagram & Media REST Microservice",
    description="Unified REST API combining meube/yt-dlp-api and subzeroid/aiograpi-rest specifications for downloading, extracting, and publishing Instagram posts, reels, and carousels.",
    version="1.0.0"
)

# Shared instagrapi client session
ig_client = Client()
logged_in_user: Optional[str] = None

SESSION_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "ig_session.json"))
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "omni_research.db"))

def ensure_scout_login():
    global logged_in_user
    if logged_in_user:
        return True
    # Try saved settings first
    if os.path.exists(SESSION_PATH):
        try:
            ig_client.load_settings(SESSION_PATH)
            logged_in_user = ig_client.username
            if logged_in_user:
                print(f"[Microservice] Loaded persisted Instagram session for @{logged_in_user}")
                return True
        except Exception as e:
            print(f"[Microservice] Note: Session reload skipped: {e}")

    # Fallback: Query active scout from SQLite database
    if os.path.exists(DB_PATH):
        try:
            import sqlite3
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            row = c.execute("SELECT session_id, username FROM scout_accounts WHERE status = 'active' ORDER BY id DESC LIMIT 1").fetchone()
            conn.close()
            if row and row[0]:
                sess_id = row[0].strip()
                username = row[1]
                print(f"[Microservice] 🔄 Authenticating Scout @{username} from database...")
                ig_client.login_by_sessionid(sess_id)
                logged_in_user = ig_client.username or username
                try:
                    ig_client.dump_settings(SESSION_PATH)
                except Exception:
                    pass
                print(f"[Microservice] 🟢 Successfully authenticated Scout @{logged_in_user}!")
                return True
        except Exception as e:
            print(f"[Microservice] ⚠️ Auto scout login error: {e}")
    return False

# Attempt auto login on boot
ensure_scout_login()

# Ensure download directory exists
DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "generated", "downloads"))
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# ═════════════════════════════════════════════════════════════════════
# 1. meube/yt-dlp-api COMPATIBLE ENDPOINTS (Video & Post Extraction)
# ═════════════════════════════════════════════════════════════════════

class DownloadRequest(BaseModel):
    url: str
    format: Optional[str] = "mp4"
    extract_flat: Optional[bool] = False

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "yt-dlp-api & aiograpi-rest unified microservice",
        "endpoints": {
            "swagger_docs": "/docs",
            "yt_dlp_info": "/api/info?url={url}",
            "yt_dlp_download": "POST /api/download",
            "instagrapi_info": "/media/info_by_url?url={url}",
            "instagrapi_clip_upload": "POST /media/clip/upload",
            "instagrapi_album_upload": "POST /media/album/upload"
        },
        "logged_in_user": logged_in_user
    }

@app.get("/api/info")
async def get_media_info(url: str = Query(..., description="Target Instagram URL or video URL")):
    """
    Extracts metadata, captions, duration, thumbnails, and direct stream URLs via yt-dlp.
    Compatible with meube/yt-dlp-api specification.
    Falls back to Playwright scraper for images and carousels.
    """
    ydl_opts = {
        'skip_download': True,
        'quiet': True,
        'no_warnings': True
    }
    loop = asyncio.get_running_loop()
    try:
        def _extract():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        info = await loop.run_in_executor(None, _extract)
        return {
            "success": True,
            "id": info.get("id"),
            "title": info.get("title") or info.get("description"),
            "uploader": info.get("uploader") or info.get("uploader_id"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail"),
            "view_count": info.get("view_count"),
            "like_count": info.get("like_count"),
            "formats": [
                {
                    "format_id": f.get("format_id"),
                    "ext": f.get("ext"),
                    "resolution": f.get("resolution"),
                    "url": f.get("url")
                } for f in (info.get("formats") or [])[:5]
            ],
            "caption": info.get("description")
        }
    except Exception as e:
        # Fallback to Playwright scraper for image/carousel posts or cookie-restricted pages
        try:
            from instagram_scraper import scrape_post, parse_instagram_url
            parsed = parse_instagram_url(url)
            if parsed['type'] == 'post':
                p_info = await scrape_post(parsed['shortcode'], parsed['url'])
                if p_info.get('success'):
                    return {
                        "success": True,
                        "id": parsed['shortcode'],
                        "title": p_info.get("hook"),
                        "uploader": p_info.get("owner"),
                        "duration": 0,
                        "thumbnail": p_info.get("thumbnail_url"),
                        "view_count": None,
                        "like_count": p_info.get("likes"),
                        "formats": [],
                        "caption": p_info.get("caption")
                    }
        except Exception as fb_err:
            print(f"[Microservice Playwright fallback error]: {fb_err}", file=sys.stderr)
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/download")
async def download_media(req: DownloadRequest):
    """
    Downloads media to local disk and returns relative & absolute file URLs.
    Compatible with meube/yt-dlp-api specification.
    """
    out_template = os.path.join(DOWNLOAD_DIR, "%(id)s.%(ext)s")
    ydl_opts = {
        'outtmpl': out_template,
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        'quiet': True,
        'no_warnings': True
    }
    loop = asyncio.get_running_loop()
    try:
        def _download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(req.url, download=True)
        info = await loop.run_in_executor(None, _download)
        media_id = info.get("id", "media")
        ext = info.get("ext", "mp4")
        filename = f"{media_id}.{ext}"
        file_path = os.path.join(DOWNLOAD_DIR, filename)
        
        return {
            "success": True,
            "id": media_id,
            "filename": filename,
            "local_path": file_path,
            "relative_url": f"/generated/downloads/{filename}",
            "title": info.get("title") or info.get("description"),
            "caption": info.get("description"),
            "uploader": info.get("uploader") or info.get("uploader_id"),
            "duration": info.get("duration"),
            "thumbnail": info.get("thumbnail")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═════════════════════════════════════════════════════════════════════
# 2. subzeroid/aiograpi-rest COMPATIBLE ENDPOINTS (Instagram Engine)
# ═════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str
    password: str
    verification_code: Optional[str] = None

class ClipUploadRequest(BaseModel):
    path: str
    caption: str
    thumbnail_path: Optional[str] = None

class AlbumUploadRequest(BaseModel):
    paths: List[str]
    caption: str

class PhotoUploadRequest(BaseModel):
    path: str
    caption: str

class SessionLoginRequest(BaseModel):
    session_id: str

@app.post("/auth/login_session")
def login_session(req: SessionLoginRequest):
    """
    Authenticates using an Instagram sessionid cookie string.
    Dumps settings to data/ig_session.json for persistence.
    """
    global logged_in_user
    try:
        ig_client.login_by_sessionid(req.session_id.strip())
        logged_in_user = ig_client.username
        try:
            ig_client.dump_settings(SESSION_PATH)
        except Exception:
            pass
        return {"success": True, "message": f"Successfully authenticated as @{logged_in_user}", "username": logged_in_user}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/auth/login")
def login(req: LoginRequest):
    """
    Authenticates with Instagram via instagrapi.
    Compatible with subzeroid/aiograpi-rest specification.
    """
    global logged_in_user
    try:
        if req.verification_code:
            ig_client.login(req.username, req.password, verification_code=req.verification_code)
        else:
            ig_client.login(req.username, req.password)
        logged_in_user = req.username
        try:
            ig_client.dump_settings(SESSION_PATH)
        except Exception:
            pass
        return {"success": True, "message": f"Successfully authenticated as @{req.username}", "username": req.username}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/media/info_by_url")
def instagrapi_info_by_url(url: str = Query(...)):
    """
    Inspects Instagram post/reel metadata via instagrapi.
    Compatible with subzeroid/aiograpi-rest.
    """
    try:
        media_pk = ig_client.media_pk_from_url(url)
        info = ig_client.media_info(media_pk)
        return {
            "success": True,
            "pk": str(info.pk),
            "id": info.id,
            "code": info.code,
            "caption_text": info.caption_text,
            "user": {
                "username": info.user.username,
                "full_name": info.user.full_name,
                "profile_pic_url": str(info.user.profile_pic_url)
            },
            "like_count": info.like_count,
            "comment_count": info.comment_count,
            "media_type": info.media_type,
            "video_url": str(info.video_url) if info.video_url else None,
            "thumbnail_url": str(info.thumbnail_url) if info.thumbnail_url else None
        }
    except Exception as e:
        # Fallback to public extraction via yt-dlp if session not active
        return get_media_info(url)

@app.post("/media/clip/upload")
def upload_reel(req: ClipUploadRequest):
    """
    Uploads and publishes an Instagram Reel.
    Compatible with subzeroid/aiograpi-rest.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before publishing.")
    
    file_path = req.path
    if not os.path.isabs(file_path):
        file_path = os.path.join(DOWNLOAD_DIR, file_path)
        
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Media file not found at: {file_path}")

    try:
        media = ig_client.clip_upload(file_path, caption=req.caption, thumbnail=req.thumbnail_path)
        return {
            "success": True,
            "media_pk": str(media.pk),
            "code": media.code,
            "permalink": f"https://www.instagram.com/reel/{media.code}/"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/media/album/upload")
def upload_carousel(req: AlbumUploadRequest):
    """
    Uploads and publishes a multi-slide Carousel album.
    Compatible with subzeroid/aiograpi-rest.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before publishing.")

    resolved_paths = []
    for p in req.paths:
        if not os.path.isabs(p):
            p = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", p.lstrip("/")))
        if not os.path.exists(p):
            raise HTTPException(status_code=404, detail=f"Slide image not found: {p}")
        resolved_paths.append(p)

    try:
        media = ig_client.album_upload(resolved_paths, caption=req.caption)
        return {
            "success": True,
            "media_pk": str(media.pk),
            "code": media.code,
            "permalink": f"https://www.instagram.com/p/{media.code}/"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/media/photo/upload")
def upload_photo(req: PhotoUploadRequest):
    """
    Uploads and publishes a single Instagram photo.
    Compatible with subzeroid/aiograpi-rest.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before publishing.")
    
    file_path = req.path
    if not os.path.isabs(file_path):
        file_path = os.path.join(DOWNLOAD_DIR, file_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Photo file not found: {file_path}")

    try:
        media = ig_client.photo_upload(file_path, caption=req.caption)
        return {
            "success": True,
            "media_pk": str(media.pk),
            "code": media.code,
            "permalink": f"https://www.instagram.com/p/{media.code}/"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CommentRequest(BaseModel):
    media_url: str
    text: str

@app.post("/media/comment")
def post_comment(req: CommentRequest):
    """
    Posts a comment (trigger keyword) on an Instagram post.
    Used by the Autonomous DM Harvester to trigger competitor DM automation.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before commenting.")
    try:
        media_pk = ig_client.media_pk_from_url(req.media_url)
        comment = ig_client.media_comment(media_pk, req.text)
        return {
            "success": True,
            "comment_pk": str(comment.pk),
            "text": comment.text,
            "message": f"Successfully commented '{req.text}' on media {media_pk}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_urls_from_xma(raw_xma):
    urls = []
    if not raw_xma or not isinstance(raw_xma, dict):
        return urls
    try:
        for gx in raw_xma.get("generic_xma", []):
            if isinstance(gx, dict):
                for btn in gx.get("cta_buttons", []):
                    if isinstance(btn, dict) and btn.get("action_url"):
                        urls.append(btn["action_url"])
                for key in ["target_url", "preview_url", "playable_url"]:
                    val = gx.get(key)
                    if val and isinstance(val, str) and val.startswith("http"):
                        urls.append(val)
    except Exception:
        pass
    return urls

@app.get("/direct/threads")
def get_direct_threads(amount: int = 10):
    """
    Fetches latest direct message threads and messages.
    Used by Autonomous DM Harvester to capture deliverable links from competitor bots.
    """
    if not logged_in_user:
        ensure_scout_login()
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before reading DMs.")
    try:
        threads = ig_client.direct_threads(amount=amount)
        parsed = []
        for t in threads:
            messages = []
            for m in t.messages[:10]:
                msg_text = m.text or ""
                xma_urls = []
                xma_title = ""

                # Extract URLs from raw_xma (ManyChat buttons & cards)
                if hasattr(m, 'raw_xma') and m.raw_xma:
                    xma_urls.extend(extract_urls_from_xma(m.raw_xma))
                    try:
                        gx_list = m.raw_xma.get('generic_xma', [])
                        if gx_list and isinstance(gx_list[0], dict):
                            xma_title = gx_list[0].get('title_text') or ""
                    except Exception:
                        pass

                # Extract URLs from link attribute
                if hasattr(m, 'link') and m.link:
                    if isinstance(m.link, dict):
                        l_url = m.link.get('text') or m.link.get('link_context', {}).get('link_url')
                        if l_url: xma_urls.append(l_url)
                    elif hasattr(m.link, 'text') and m.link.text:
                        xma_urls.append(m.link.text)

                # If no text but title or URLs exist, populate text
                if not msg_text and xma_title:
                    msg_text = xma_title
                if xma_urls and not any(u in msg_text for u in xma_urls):
                    msg_text = f"{msg_text} {' '.join(xma_urls)}".strip()

                messages.append({
                    "id": str(m.id),
                    "user_id": str(m.user_id),
                    "text": msg_text,
                    "item_type": m.item_type,
                    "is_sent_by_viewer": bool(getattr(m, 'is_sent_by_viewer', False)),
                    "urls": xma_urls,
                    "timestamp": str(m.timestamp)
                })
            parsed.append({
                "thread_id": str(t.id),
                "thread_title": t.thread_title,
                "users": [u.username for u in t.users],
                "messages": messages
            })
        return {"success": True, "threads": parsed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DirectSendRequest(BaseModel):
    recipient_username: Optional[str] = None
    thread_id: Optional[str] = None
    text: str

@app.post("/direct/send")
def send_direct_message(req: DirectSendRequest):
    """
    Sends an outbound Direct Message to an Instagram user or thread.
    Used by the Mobile-First Bot to send status updates and live links back to the owner.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before sending DMs.")
    try:
        if req.thread_id:
            ig_client.direct_answer(req.thread_id, req.text)
        elif req.recipient_username:
            clean_username = req.recipient_username.replace("@", "").strip()
            user_id = ig_client.user_id_from_username(clean_username)
            ig_client.direct_send(req.text, user_ids=[user_id])
        else:
            raise HTTPException(status_code=400, detail="Either thread_id or recipient_username is required")
        return {"success": True, "message": "DM sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/direct/inbox_shares")
def get_inbox_shares(amount: int = 10):
    """
    Scans direct message inbox threads for shared Reels, Carousels, or Instagram URLs.
    Used by the Mobile Share-to-DM Autonomous Bot.
    """
    if not logged_in_user:
        raise HTTPException(status_code=401, detail="Please authenticate via /auth/login before reading inbox.")
    try:
        threads = ig_client.direct_threads(amount=amount)
        shares = []
        for t in threads:
            users = [u.username for u in t.users]
            for m in t.messages[:6]:
                url = None
                shortcode = None
                if m.text:
                    match = re.search(r'https?://(?:www\.)?instagram\.com/(?:[A-Za-z0-9_.-]+/)?(?:p|reel|tv)/([A-Za-z0-9_-]+)', m.text)
                    if match:
                        url = match.group(0)
                        shortcode = match.group(1)
                
                if not url and hasattr(m, 'clip') and m.clip:
                    shortcode = getattr(m.clip, 'code', None)
                    if shortcode:
                        url = f"https://www.instagram.com/reel/{shortcode}/"
                elif not url and hasattr(m, 'media_share') and m.media_share:
                    shortcode = getattr(m.media_share, 'code', None)
                    if shortcode:
                        url = f"https://www.instagram.com/p/{shortcode}/"

                if url:
                    shares.append({
                        "thread_id": str(t.id),
                        "message_id": str(m.id),
                        "sender_user_id": str(m.user_id),
                        "users": users,
                        "url": url,
                        "shortcode": shortcode,
                        "text": m.text or '',
                        "timestamp": str(m.timestamp)
                    })
        return {"success": True, "count": len(shares), "shares": shares}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/info_by_username")
def get_user_info(username: str = Query(...)):
    """
    Fetches full user profile details.
    Compatible with subzeroid/aiograpi-rest.
    """
    try:
        user = ig_client.user_info_by_username(username.replace("@", ""))
        return {
            "success": True,
            "pk": str(user.pk),
            "username": user.username,
            "full_name": user.full_name,
            "biography": user.biography,
            "follower_count": user.follower_count,
            "following_count": user.following_count,
            "media_count": user.media_count,
            "profile_pic_url": str(user.profile_pic_url)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    port = int(os.environ.get("PORT", 8001))
    print(f"[Microservice] Launching OmniResearch Instagram & Media Microservice on port {port}...")
    uvicorn.run("instagram_microservice:app", host="127.0.0.1", port=port, reload=False)
