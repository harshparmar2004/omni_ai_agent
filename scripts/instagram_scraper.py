import sys
import re
import json
import asyncio
import random
from playwright.async_api import async_playwright

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
            locale="en-US",
            extra_http_headers={
                "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "accept-language": "en-US,en;q=0.9"
            }
        )
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

            return {
                "success": True,
                "type": "post",
                "shortcode": shortcode,
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
            locale="en-US",
            extra_http_headers={
                "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "none",
                "sec-fetch-user": "?1",
                "accept-language": "en-US,en;q=0.9"
            }
        )
        # Pre-seed consent cookies
        try:
            await context.add_cookies([
                {"name": "ig_nrcb", "value": "1", "domain": ".instagram.com", "path": "/"},
                {"name": "ig_did", "value": "C8D5A1E2-F4B3-4A5C-9D8E-7B6A5C4D3E2F", "domain": ".instagram.com", "path": "/"}
            ])
        except Exception:
            pass

        await context.add_init_script(STEALTH_JS)
        page = await context.new_page()
        try:
            target_url = f"https://www.instagram.com/{username}/"
            sys.stderr.write(f"[Scraper] Navigating to {target_url}...\n")
            await page.goto(target_url, timeout=25000, wait_until="domcontentloaded")
            await page.wait_for_timeout(random.randint(1800, 2800))

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

            # Extract from raw HTML
            raw_html = await page.content()
            shortcodes_json = re.findall(r'"shortcode":"([A-Za-z0-9_-]{9,13})"', raw_html)
            codes_json = re.findall(r'"code":"([A-Za-z0-9_-]{9,13})"', raw_html)
            urls_reels = re.findall(r'/(?:reel|p)/([A-Za-z0-9_-]{9,13})/?', raw_html)

            excluded = {'explore', 'reels', 'stories', 'direct', 'accounts', 'developer', 'about', 'legal', 'privacy', 'login'}
            clean_shortcodes = []
            for c in (shortcodes_json + codes_json + urls_reels):
                if c and c.lower() not in excluded and len(c) >= 9 and c not in clean_shortcodes:
                    clean_shortcodes.append(c)

            # 3. Fallback: If 0 shortcodes on main profile (or redirected to login), try /reels/ tab directly
            if len(clean_shortcodes) == 0:
                reels_target = f"https://www.instagram.com/{username}/reels/"
                sys.stderr.write(f"[Scraper] 0 shortcodes on main profile. Attempting reels tab: {reels_target}...\n")
                try:
                    await page.goto(reels_target, timeout=20000, wait_until="domcontentloaded")
                    await page.wait_for_timeout(2500)
                    for btn_text in cookie_btn_texts:
                        try:
                            btn = page.locator(f'button:has-text("{btn_text}")').first
                            if await btn.is_visible(timeout=800):
                                await btn.click()
                                await page.wait_for_timeout(1000)
                                break
                        except Exception:
                            pass
                    reels_html = await page.content()
                    sc_reels = re.findall(r'"code":"([A-Za-z0-9_-]{9,13})"', reels_html)
                    sc_json2 = re.findall(r'"shortcode":"([A-Za-z0-9_-]{9,13})"', reels_html)
                    sc_href2 = re.findall(r'/(?:reel|p)/([A-Za-z0-9_-]{9,13})/?', reels_html)
                    for c in (sc_reels + sc_json2 + sc_href2):
                        if c and c.lower() not in excluded and len(c) >= 9 and c not in clean_shortcodes:
                            clean_shortcodes.append(c)
                except Exception as reels_err:
                    sys.stderr.write(f"[Scraper] Reels tab attempt notice: {str(reels_err)}\n")

            meta_desc_match = re.search(r'<meta\s+(?:property|name)="(?:og:description|description)"\s+content="([^"]*)"', raw_html, re.I)
            meta_desc = meta_desc_match.group(1) if meta_desc_match else ""
            meta_img_match = re.search(r'<meta\s+property="og:image"\s+content="([^"]*)"', raw_html, re.I)
            meta_image = meta_img_match.group(1) if meta_img_match else ""

            unique_posts = [f"https://www.instagram.com/reel/{sc}/" for sc in clean_shortcodes[:12]]
            sys.stderr.write(f"[Scraper] Finished @{username}. Current URL: {page.url}. Extracted {len(unique_posts)} reels.\n")

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
                "recent_post_urls": unique_posts
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
