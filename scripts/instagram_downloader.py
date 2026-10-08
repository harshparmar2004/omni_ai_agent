import sys
import os
import re
import json
import shutil
import zipfile
import asyncio
import subprocess
from playwright.async_api import async_playwright

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def extract_shortcode(url):
    m = re.search(r'instagram\.com/(?:[A-Za-z0-9_.-]+/)?(?:p|reel|tv)/([A-Za-z0-9_-]+)', url)
    return m.group(1) if m else "media"

def find_post_by_shortcode(obj, code):
    """Recursively search for the exact media node corresponding to target shortcode."""
    if isinstance(obj, dict):
        if obj.get("code") == code or obj.get("shortcode") == code:
            if "if_not_gated_logged_out" in obj or "carousel_media" in obj or "image_versions2" in obj:
                return obj
        for k, v in obj.items():
            res = find_post_by_shortcode(v, code)
            if res:
                return res
    elif isinstance(obj, list):
        for item in obj:
            res = find_post_by_shortcode(item, code)
            if res:
                return res
    return None

def get_best_image_url(image_versions2):
    """Pick candidate 0 (master uncropped high-resolution photo)."""
    if not isinstance(image_versions2, dict):
        return None
    candidates = image_versions2.get("candidates", [])
    if not candidates:
        return None
    # Candidate 0 is the uncropped highest resolution file in Instagram's candidate list
    return candidates[0].get("url")

async def download_scoped_instagram_media(url, output_dir, shortcode):
    carousel_dir = os.path.join(output_dir, "carousels", shortcode)
    # Clean up previous download artifacts for this shortcode to avoid stale file pollution
    if os.path.exists(carousel_dir):
        shutil.rmtree(carousel_dir, ignore_errors=True)
    os.makedirs(carousel_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/128.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900}
        )
        page = await context.new_page()

        print(f"[Downloader] Navigating to Instagram post {shortcode}...", file=sys.stderr)
        await page.goto(url, wait_until="domcontentloaded", timeout=45000)
        await page.wait_for_timeout(3000)

        # ── 1. STRATEGY A: Direct Server State Extraction (Ground Truth) ────────
        scripts_data = await page.evaluate('''() => {
            const list = [];
            for (const s of document.querySelectorAll('script')) {
                const txt = s.innerText || s.textContent || '';
                if (txt.includes('Polaris') || txt.includes('carousel_media') || txt.includes('shortcode') || txt.includes('xdt_api')) {
                    list.push(txt);
                }
            }
            return list;
        }''')

        target_post = None
        for txt in scripts_data:
            try:
                parsed = json.loads(txt)
                found = find_post_by_shortcode(parsed, shortcode)
                if found:
                    target_post = found
                    break
            except Exception:
                continue

        slides = []
        caption = ""
        owner = "instagram"
        likes = "0"
        comments = "0"

        if target_post:
            print(f"[Downloader] Successfully extracted ground-truth node for {shortcode}!", file=sys.stderr)
            media_info = target_post.get("if_not_gated_logged_out") or target_post
            
            # Author & Caption
            user_dict = media_info.get("user") or {}
            owner = user_dict.get("username") or "instagram"
            caption_dict = media_info.get("caption") or {}
            caption = caption_dict.get("text") if isinstance(caption_dict, dict) else ""
            likes = str(media_info.get("like_count", "0"))
            comments = str(media_info.get("comment_count", "0"))

            carousel_items = media_info.get("carousel_media")
            video_versions = media_info.get("video_versions")
            if carousel_items and isinstance(carousel_items, list):
                # ── MULTI-IMAGE CAROUSEL ──────────────────────────────────────
                total_slides = len(carousel_items)
                print(f"[Downloader] Detected Carousel with EXACTLY {total_slides} slides.", file=sys.stderr)

                for idx, item in enumerate(carousel_items):
                    slide_num = idx + 1
                    iv2 = item.get("image_versions2", {})
                    img_url = get_best_image_url(iv2)
                    if not img_url:
                        continue

                    try:
                        resp = await context.request.get(img_url, timeout=20000)
                        if resp.status == 200:
                            body = await resp.body()
                            filename = f"slide_{slide_num}.jpg"
                            filepath = os.path.join(carousel_dir, filename)
                            with open(filepath, "wb") as f:
                                f.write(body)

                            rel_path = f"/generated/downloads/carousels/{shortcode}/{filename}"
                            slides.append({
                                "slide_number": slide_num,
                                "filename": filename,
                                "local_path": filepath,
                                "relative_url": rel_path,
                                "size_bytes": len(body),
                                "size_kb": round(len(body) / 1024, 1)
                            })
                            print(f"[Downloader] ✓ Saved Slide {slide_num}/{total_slides} ({len(body)//1024} KB)", file=sys.stderr)
                    except Exception as err:
                        print(f"[Downloader] Failed to download slide {slide_num}: {err}", file=sys.stderr)
            elif video_versions and isinstance(video_versions, list) and len(video_versions) > 0:
                # ── VIDEO REEL POST ───────────────────────────────────────────
                print(f"[Downloader] Detected Video Reel Post.", file=sys.stderr)
                vid_url = video_versions[0].get("url")
                if vid_url:
                    try:
                        resp = await context.request.get(vid_url, timeout=40000)
                        if resp.status == 200:
                            body = await resp.body()
                            filename = f"reel_{shortcode}.mp4"
                            filepath = os.path.join(output_dir, filename)
                            with open(filepath, "wb") as f:
                                f.write(body)
                            rel_path = f"/generated/downloads/{filename}"
                            print(f"[Downloader] ✓ Saved Reel Video ({len(body)//1024} KB)", file=sys.stderr)
                            await browser.close()
                            return {
                                "success": True,
                                "type": "reel",
                                "id": shortcode,
                                "title": caption[:80] if caption else f"Instagram Reel {shortcode}",
                                "caption": caption,
                                "uploader": owner,
                                "owner": owner,
                                "duration": media_info.get("video_duration", 0),
                                "local_file": filename,
                                "relative_url": rel_path,
                                "is_video": True,
                                "is_carousel": False,
                                "slides_count": 0,
                                "slides": []
                            }
                    except Exception as err:
                        print(f"[Downloader] Failed to download video stream: {err}", file=sys.stderr)
            else:
                # ── SINGLE PHOTO POST ─────────────────────────────────────────
                print(f"[Downloader] Detected Single Photo Post.", file=sys.stderr)
                iv2 = media_info.get("image_versions2", {})
                img_url = get_best_image_url(iv2)
                if img_url:
                    try:
                        resp = await context.request.get(img_url, timeout=20000)
                        if resp.status == 200:
                            body = await resp.body()
                            filename = f"slide_1.jpg"
                            filepath = os.path.join(carousel_dir, filename)
                            with open(filepath, "wb") as f:
                                f.write(body)

                            rel_path = f"/generated/downloads/carousels/{shortcode}/{filename}"
                            slides.append({
                                "slide_number": 1,
                                "filename": filename,
                                "local_path": filepath,
                                "relative_url": rel_path,
                                "size_bytes": len(body),
                                "size_kb": round(len(body) / 1024, 1)
                            })
                            print(f"[Downloader] ✓ Saved Single Photo ({len(body)//1024} KB)", file=sys.stderr)
                    except Exception as err:
                        print(f"[Downloader] Failed to download single photo: {err}", file=sys.stderr)

        # ── 2. STRATEGY B: Scoped Viewport Fallback (if script parsing missed) ──
        if not slides:
            print(f"[Downloader] Falling back to scoped DOM extraction...", file=sys.stderr)
            curr_video_src = await page.evaluate('''() => {
                const v = document.querySelector('video');
                return v ? (v.src || v.querySelector('source')?.src) : null;
            }''')
            if curr_video_src and not curr_video_src.startswith('blob:'):
                try:
                    resp = await context.request.get(curr_video_src, timeout=30000)
                    if resp.status == 200:
                        body = await resp.body()
                        filename = f"reel_{shortcode}.mp4"
                        filepath = os.path.join(output_dir, filename)
                        with open(filepath, "wb") as f:
                            f.write(body)
                        rel_path = f"/generated/downloads/{filename}"
                        await browser.close()
                        return {
                            "success": True,
                            "type": "reel",
                            "id": shortcode,
                            "title": caption[:80] if caption else f"Instagram Reel {shortcode}",
                            "caption": caption,
                            "uploader": owner,
                            "owner": owner,
                            "duration": 0,
                            "local_file": filename,
                            "relative_url": rel_path,
                            "is_video": True,
                            "is_carousel": False,
                            "slides_count": 0,
                            "slides": []
                        }
                except Exception as ve:
                    print(f"[Downloader] Scoped video download error: {ve}", file=sys.stderr)
            # Find the primary post container only
            dot_count = await page.evaluate('''() => {
                const dots = document.querySelectorAll('div._acnb ul li, nav li, ul[class*="indicator"] li');
                return dots.length > 1 ? dots.length : 1;
            }''')
            
            # Scoped slide traversal
            for i in range(dot_count):
                curr_src = await page.evaluate('''() => {
                    const article = document.querySelector('article') || document.querySelector('main');
                    if (!article) return null;
                    const imgs = [...article.querySelectorAll('img')].filter(img => {
                        const s = img.src || '';
                        return s.includes('cdninstagram') && !s.includes('150x150') && !s.includes('s32x32');
                    });
                    return imgs.length > 0 ? imgs[0].src : null;
                }''')
                if curr_src:
                    resp = await context.request.get(curr_src, timeout=15000)
                    if resp.status == 200:
                        body = await resp.body()
                        filename = f"slide_{i+1}.jpg"
                        filepath = os.path.join(carousel_dir, filename)
                        with open(filepath, "wb") as f:
                            f.write(body)
                        slides.append({
                            "slide_number": i+1,
                            "filename": filename,
                            "local_path": filepath,
                            "relative_url": f"/generated/downloads/carousels/{shortcode}/{filename}",
                            "size_bytes": len(body),
                            "size_kb": round(len(body) / 1024, 1)
                        })
                # Advance slide
                await page.evaluate('''() => {
                    const btn = document.querySelector('button[aria-label="Next"]');
                    if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }''')
                await page.wait_for_timeout(800)

        await browser.close()

        # ── 3. Package ZIP Archive if Multi-Slide ──────────────────────────────
        zip_rel = None
        if len(slides) > 1:
            zip_filename = f"carousel_{shortcode}_all_slides.zip"
            zip_filepath = os.path.join(carousel_dir, zip_filename)
            with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for s in slides:
                    zipf.write(s["local_path"], arcname=s["filename"])
            zip_rel = f"/generated/downloads/carousels/{shortcode}/{zip_filename}"

        total = len(slides)
        return {
            "success": total > 0,
            "type": "carousel" if total > 1 else "image",
            "id": shortcode,
            "title": caption[:80] if caption else f"Instagram Post {shortcode}",
            "caption": caption,
            "uploader": owner,
            "owner": owner,
            "duration": 0,
            "likes": likes,
            "comments": comments,
            "slides_count": total,
            "slides": slides,
            "zip_relative_url": zip_rel,
            "relative_url": slides[0]["relative_url"] if slides else None,
            "is_carousel": total > 1,
            "is_video": False
        }

def download_instagram_media(url, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    shortcode = extract_shortcode(url)

    # ── 1. Fast Path: Single-Pass yt-dlp Stream Extractor (< 5 seconds) ────────
    output_template = os.path.join(output_dir, f"{shortcode}.%(ext)s")
    try:
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--format", "best[ext=mp4]/best",
            "-o", output_template,
            "--print-json",
            "--no-playlist",
            url
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        if res.returncode == 0 and res.stdout.strip():
            # Find the JSON metadata line
            lines = [ln.strip() for ln in res.stdout.strip().split('\n') if ln.strip().startswith('{')]
            if lines:
                info = json.loads(lines[0])
                ext = info.get('ext', 'mp4')
                local_filename = f"{shortcode}.{ext}"
                target_file_path = os.path.join(output_dir, local_filename)
                
                # Check if file was saved with shortcode or media id
                if not os.path.exists(target_file_path):
                    alt_id = info.get('id', '')
                    if alt_id and os.path.exists(os.path.join(output_dir, f"{alt_id}.{ext}")):
                        local_filename = f"{alt_id}.{ext}"
                    elif os.path.exists(os.path.join(output_dir, f"{shortcode}.mp4")):
                        local_filename = f"{shortcode}.mp4"

                caption = info.get('description') or info.get('title') or ''
                uploader = info.get('uploader') or info.get('uploader_id') or 'instagram'
                return {
                    "success": True,
                    "type": "video",
                    "id": shortcode,
                    "title": info.get('title', ''),
                    "caption": caption,
                    "uploader": uploader,
                    "owner": uploader,
                    "duration": info.get('duration', 0),
                    "width": info.get('width', 1080),
                    "height": info.get('height', 1920),
                    "thumbnail": info.get('thumbnail', ''),
                    "local_file": local_filename,
                    "relative_url": f"/generated/downloads/{local_filename}",
                    "is_video": True,
                    "is_carousel": False,
                    "slides_count": 0,
                    "slides": []
                }
    except Exception as yt_err:
        print(f"[yt-dlp fast path notice: {yt_err} -> proceeding to Scoped Playwright Extractor]", file=sys.stderr)

    # ── 2. Playwright Scoped Post Media Extractor ─────────────────────────────
    try:
        result = asyncio.run(download_scoped_instagram_media(url, output_dir, shortcode))
        if result.get("success"):
            return result
        return {"success": False, "error": "Could not extract media for this Instagram URL."}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python instagram_downloader.py <url> <output_dir>"}))
        sys.exit(1)
    target_url = sys.argv[1]
    target_dir = sys.argv[2]
    res = download_instagram_media(target_url, target_dir)
    print(json.dumps(res))
