import sys
import os
import re
import json
import asyncio
import random
import datetime
from playwright.async_api import async_playwright

def shortcode_to_snowflake(sc):
    """
    Decodes an Instagram base64 shortcode into a 64-bit Snowflake Media ID
    and calculates the exact UTC post publication timestamp to the millisecond.
    Instagram epoch: 1314220021721 (Aug 24, 2011)
    """
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    media_id = 0
    for char in sc:
        idx = alphabet.find(char)
        if idx == -1:
            return 0, None
        media_id = (media_id * 64) + idx
    
    # 41-bit millisecond timestamp offset
    ms = (media_id >> 23) + 1314220021721
    try:
        dt = datetime.datetime.fromtimestamp(ms / 1000.0, datetime.timezone.utc)
        return media_id, dt
    except Exception:
        return media_id, None

STEALTH_JS = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = { runtime: {} };
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
"""

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def parse_instagram_url(url):
    clean_url = url.strip()
    # Match post / reel / p (with or without username prefix like /github/p/...)
    post_match = re.search(r'instagram\.com/(?:[A-Za-z0-9_.-]+/)?(?:p|reel|tv)/([A-Za-z0-9_-]+)', clean_url)
    if post_match:
        return {'type': 'post', 'shortcode': post_match.group(1), 'url': clean_url}
    
    # Match profile
    profile_match = re.search(r'instagram\.com/([A-Za-z0-9_.-]+)', clean_url)
    if profile_match:
        username = profile_match.group(1).replace('/', '')
        if username not in ['explore', 'reels', 'stories', 'direct', 'accounts', 'p', 'reel', 'tv']:
            return {'type': 'profile', 'username': username, 'url': clean_url}
    
    # Fallback assuming raw username if no slashes
    if not clean_url.startswith('http') and '/' not in clean_url:
        return {'type': 'profile', 'username': clean_url.replace('@', ''), 'url': f'https://www.instagram.com/{clean_url.replace("@", "")}/'}

    return {'type': 'unknown', 'url': clean_url}

async def scrape_post(shortcode, url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            viewport={"width": random.randint(1260, 1360), "height": random.randint(780, 880)},
            locale="en-US"
        )
        # Pre-seed consent & Scout Account session cookies
        try:
            post_cookies = [
                {"name": "ig_nrcb", "value": "1", "domain": ".instagram.com", "path": "/"},
                {"name": "ig_did", "value": "C8D5A1E2-F4B3-4A5C-9D8E-7B6A5C4D3E2F", "domain": ".instagram.com", "path": "/"}
            ]
            scout_session = os.environ.get('INSTAGRAM_SESSION_ID') or os.environ.get('IG_SESSION_ID') or os.environ.get('SCOUT_SESSION_ID') or os.environ.get('INSTAGRAM_SESSIONID')
            if scout_session:
                post_cookies.append({"name": "sessionid", "value": scout_session.strip().strip('"').strip("'"), "domain": ".instagram.com", "path": "/"})
            await context.add_cookies(post_cookies)
        except Exception:
            pass

        await context.add_init_script(STEALTH_JS)
        page = await context.new_page()
        try:
            target_url = f"https://www.instagram.com/p/{shortcode}/"
            await page.goto(target_url, timeout=20000, wait_until="domcontentloaded")
            await page.wait_for_timeout(random.randint(1800, 3200))
            await page.mouse.wheel(0, random.randint(150, 350))
            await page.wait_for_timeout(random.randint(600, 1200))

            meta_data = await page.evaluate("""() => {
                return {
                    title: document.title || '',
                    meta_desc: document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || '',
                    meta_image: document.querySelector('meta[property="og:image"]')?.content || '',
                    meta_title: document.querySelector('meta[property="og:title"]')?.content || ''
                };
            }""")
            title = meta_data.get('title', '')
            meta_desc = meta_data.get('meta_desc', '')
            meta_image = meta_data.get('meta_image', '')
            meta_title = meta_data.get('meta_title', '')

            # Extract likes and caption from meta_desc (Format: "123 likes, 4 comments - username on date: "caption"")
            likes_match = re.search(r'([\d,KkMm.]+)\s+likes', meta_desc)
            comments_match = re.search(r'([\d,KkMm.]+)\s+comments', meta_desc)
            owner_match = re.search(r'-\s+([^\s]+)\s+on', meta_desc)
            caption_match = re.search(r':\s+"(.*)"', meta_desc, re.DOTALL)

            likes = likes_match.group(1) if likes_match else "0"
            comments = comments_match.group(1) if comments_match else "0"
            owner = owner_match.group(1) if owner_match else ""
            caption = caption_match.group(1) if caption_match else (meta_desc or title)

            # Extract hashtags
            hashtags = re.findall(r'#([A-Za-z0-9_]+)', caption)

            # Extract Hook (first sentence or non-empty line)
            lines = [l.strip() for l in caption.split('\n') if l.strip() and not l.strip().startswith('#')]
            hook = lines[0] if len(lines) > 0 else title

            # Detect topic/technology
            tech_match = re.search(r'\b(python|langchain|docker|fastapi|react|next\.?js|rust|kubernetes|k8s|sql|dsa|ai|ml|pytorch|tensorflow|bun|mojo|go|golang|redis|aws)\b', caption, re.I)
            detected_topic = tech_match.group(1).title() if tech_match else hook[:40]

            mid, dt = shortcode_to_snowflake(shortcode)
            return {
                "success": True,
                "type": "post",
                "shortcode": shortcode,
                "media_id": str(mid) if mid else None,
                "posted_at": dt.isoformat() if dt else None,
                "url": target_url,
                "owner": owner,
                "caption": caption,
                "hook": hook,
                "likes": likes,
                "comments": comments,
                "thumbnail_url": meta_image,
                "hashtags": hashtags[:10],
                "detected_topic": detected_topic
            }
        except Exception as e:
            return {
                "success": False,
                "type": "post",
                "shortcode": shortcode,
                "error": str(e)
            }
        finally:
            await browser.close()

async def scrape_profile(username, url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
                "--disable-features=IsolateOrigins,site-per-process"
            ]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            viewport={"width": random.randint(1260, 1360), "height": random.randint(780, 880)},
            locale="en-US"
        )
        # Pre-seed consent & Scout Account session cookies
        try:
            profile_cookies = [
                {"name": "ig_nrcb", "value": "1", "domain": ".instagram.com", "path": "/"},
                {"name": "ig_did", "value": "C8D5A1E2-F4B3-4A5C-9D8E-7B6A5C4D3E2F", "domain": ".instagram.com", "path": "/"}
            ]
            scout_session = os.environ.get('INSTAGRAM_SESSION_ID') or os.environ.get('IG_SESSION_ID') or os.environ.get('SCOUT_SESSION_ID') or os.environ.get('INSTAGRAM_SESSIONID')
            if scout_session:
                scout_clean = scout_session.strip().strip('"').strip("'")
                profile_cookies.append({"name": "sessionid", "value": scout_clean, "domain": ".instagram.com", "path": "/"})
                sys.stderr.write("[Scraper] 🔑 Authenticated Scout Account session loaded.\n")
            await context.add_cookies(profile_cookies)
        except Exception as ce:
            sys.stderr.write(f"[Scraper] Cookie setup note: {str(ce)}\n")

        await context.add_init_script(STEALTH_JS)
        page = await context.new_page()
        try:
            # Primary target: /{username}/reels/ to guarantee 100% video reels (and ignore photo carousels)
            target_url = f"https://www.instagram.com/{username}/reels/"
            sys.stderr.write(f"[Scraper] Navigating to {target_url}...\n")
            await page.goto(target_url, timeout=25000, wait_until="domcontentloaded")
            await page.wait_for_timeout(random.randint(2000, 3000))

            # 1. Active European / Datacenter Cookie Consent Acceptor
            cookie_btn_texts = [
                "Allow all cookies", "Decline optional cookies",
                "Allow essential and optional cookies", "Only allow essential cookies",
                "Accept All", "Accept", "Allow"
            ]
            for btn_text in cookie_btn_texts:
                try:
                    btn = page.locator(f'button:has-text("{btn_text}")').first
                    if await btn.is_visible(timeout=1000):
                        sys.stderr.write(f"[Scraper] Found cookie consent button '{btn_text}', clicking...\n")
                        await btn.click()
                        await page.wait_for_timeout(1500)
                        break
                except Exception:
                    pass

            await page.mouse.wheel(0, random.randint(250, 480))
            await page.wait_for_timeout(random.randint(800, 1500))

            # 2. Dismiss any login dialog overlays & unblock scrolling
            try:
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
                await page.evaluate("""
                    () => {
                        try {
                            const dialogs = document.querySelectorAll('div[role="dialog"], [aria-label*="Close"], [aria-label*="close"]');
                            dialogs.forEach(d => {
                                if (d.tagName === 'BUTTON' || d.getAttribute('role') === 'button') {
                                    d.click();
                                } else if (d.getAttribute('role') === 'dialog') {
                                    d.remove();
                                }
                            });
                            const backdrops = document.querySelectorAll('div[style*="position: fixed"], div[style*="opacity"]');
                            backdrops.forEach(b => {
                                if (parseInt(window.getComputedStyle(b).zIndex || '0') > 10) {
                                    b.remove();
                                }
                            });
                            document.body.style.overflow = 'auto';
                            document.documentElement.style.overflow = 'auto';
                        } catch(e) {}
                    }
                """)
            except Exception:
                pass

            # 1. Extract shortcodes strictly from /reel/ elements in visual reverse-chronological order
            dom_shortcodes = await page.evaluate(r"""() => {
                const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
                const results = [];
                for (const a of links) {
                    const href = a.getAttribute('href') || '';
                    const m = href.match(/\/(?:[A-Za-z0-9_.-]+\/)?reel\/([A-Za-z0-9_-]{9,13})/);
                    if (m && !results.includes(m[1])) {
                        results.push(m[1]);
                    }
                }
                return results;
            }""")

            # 2. Extract from raw HTML regex fallback (strictly /reel/)
            raw_html = await page.content()
            urls_reels = re.findall(r'/(?:[A-Za-z0-9_.-]+/)?reel/([A-Za-z0-9_-]{9,13})', raw_html)

            excluded = {'explore', 'reels', 'stories', 'direct', 'accounts', 'developer', 'about', 'legal', 'privacy', 'login'}
            clean_shortcodes = []
            
            # Prioritize DOM elements as they are strictly in visual reverse-chronological order
            for sc in dom_shortcodes:
                if sc and sc.lower() not in excluded and len(sc) >= 9 and sc not in clean_shortcodes:
                    clean_shortcodes.append(sc)

            for c in urls_reels:
                if c and c.lower() not in excluded and len(c) >= 9 and c not in clean_shortcodes:
                    clean_shortcodes.append(c)

            # 3. Fallback: If 0 reels found on /reels/ tab, try main profile root
            if len(clean_shortcodes) == 0:
                profile_target = f"https://www.instagram.com/{username}/"
                sys.stderr.write(f"[Scraper] 0 reels on /reels/ tab. Checking main profile: {profile_target}...\n")
                try:
                    await page.goto(profile_target, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(2500)
                    profile_dom = await page.evaluate(r"""() => {
                        const links = Array.from(document.querySelectorAll('a[href*="/reel/"]'));
                        return links.map(a => {
                            const m = (a.getAttribute('href') || '').match(/\/(?:[A-Za-z0-9_.-]+\/)?reel\/([A-Za-z0-9_-]{9,13})/);
                            return m ? m[1] : null;
                        }).filter(Boolean);
                    }""")
                    for sc in profile_dom:
                        if sc and sc.lower() not in excluded and len(sc) >= 9 and sc not in clean_shortcodes:
                            clean_shortcodes.append(sc)
                except Exception as p_err:
                    sys.stderr.write(f"[Scraper] Profile fallback notice: {str(p_err)}\n")

            meta_desc_match = re.search(r'<meta\s+(?:property|name)="(?:og:description|description)"\s+content="([^"]*)"', raw_html, re.I)
            meta_desc = meta_desc_match.group(1) if meta_desc_match else ""
            meta_img_match = re.search(r'<meta\s+property="og:image"\s+content="([^"]*)"', raw_html, re.I)
            meta_image = meta_img_match.group(1) if meta_img_match else ""

            # Decode and sort all candidates strictly by 64-bit Snowflake Media ID (Newest timestamp first)
            now_utc = datetime.datetime.now(datetime.timezone.utc)
            enriched_candidates = []
            for sc in clean_shortcodes:
                mid, dt = shortcode_to_snowflake(sc)
                if mid > 0 and dt:
                    age_hours = (now_utc - dt).total_seconds() / 3600.0
                    enriched_candidates.append({
                        "shortcode": sc,
                        "media_id": mid,
                        "posted_at": dt.isoformat(),
                        "age_hours": age_hours
                    })

            # Sort descending by media_id (highest media_id is strictly the newest reel)
            enriched_candidates.sort(key=lambda x: x["media_id"], reverse=True)

            # Filter: Exclude posts older than 48 hours to eliminate pinned posts from months ago.
            # If all are older than 48h, keep the newest available.
            fresh_candidates = [c for c in enriched_candidates if c["age_hours"] <= 48.0]
            if not fresh_candidates:
                fresh_candidates = enriched_candidates

            unique_posts = [f"https://www.instagram.com/reel/{c['shortcode']}/" for c in fresh_candidates[:8]]
            detailed_posts = [
                {
                    "shortcode": c["shortcode"],
                    "url": f"https://www.instagram.com/reel/{c['shortcode']}/",
                    "posted_at": c["posted_at"],
                    "age_hours": round(c["age_hours"], 1),
                    "media_id": str(c["media_id"])
                }
                for c in fresh_candidates[:8]
            ]
            sys.stderr.write(f"[Scraper] Finished @{username}. Current URL: {page.url}. Extracted {len(unique_posts)} reels (newest first, top: {fresh_candidates[0]['shortcode'] if fresh_candidates else 'None'}).\n")

            followers_match = re.search(r'([\d,KkMm.]+)\s+Followers', meta_desc)
            following_match = re.search(r'([\d,KkMm.]+)\s+Following', meta_desc)
            posts_match = re.search(r'([\d,KkMm.]+)\s+Posts', meta_desc)
            bio_match = re.search(r':\s+"(.*)"', meta_desc, re.DOTALL)

            return {
                "success": True,
                "type": "profile",
                "username": username,
                "url": target_url,
                "followers": followers_match.group(1) if followers_match else "N/A",
                "following": following_match.group(1) if following_match else "N/A",
                "posts_count": posts_match.group(1) if posts_match else "N/A",
                "bio": bio_match.group(1) if bio_match else meta_desc,
                "profile_pic": meta_image,
                "recent_post_urls": unique_posts,
                "posts": detailed_posts
            }
        except Exception as e:
            sys.stderr.write(f"[Scraper Error] @{username}: {str(e)}\n")
            return {
                "success": False,
                "type": "profile",
                "username": username,
                "error": str(e)
            }
        finally:
            await browser.close()

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No URL or username provided"}))
        return

    raw_input = sys.argv[1]
    parsed = parse_instagram_url(raw_input)

    if parsed['type'] == 'post':
        res = await scrape_post(parsed['shortcode'], parsed['url'])
        print(json.dumps(res))
    elif parsed['type'] == 'profile':
        res = await scrape_profile(parsed['username'], parsed['url'])
        print(json.dumps(res))
    else:
        print(json.dumps({"success": False, "error": f"Could not determine Instagram URL format for: {raw_input}"}))

if __name__ == '__main__':
    asyncio.run(main())
