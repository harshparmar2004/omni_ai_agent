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
        browser = await p.chromium.launch(headless=True)
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

            title = await page.title()
            meta_desc = await page.get_attribute('meta[property="og:description"]', 'content') or ''
            meta_image = await page.get_attribute('meta[property="og:image"]', 'content') or ''
            meta_title = await page.get_attribute('meta[property="og:title"]', 'content') or ''

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
        browser = await p.chromium.launch(headless=True)
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
            target_url = f"https://www.instagram.com/{username}/"
            await page.goto(target_url, timeout=20000, wait_until="domcontentloaded")
            await page.wait_for_timeout(random.randint(1800, 3200))
            await page.mouse.wheel(0, random.randint(250, 480))
            await page.wait_for_timeout(random.randint(800, 1600))

            title = await page.title()
            meta_desc = await page.get_attribute('meta[property="og:description"]', 'content') or ''
            meta_image = await page.get_attribute('meta[property="og:image"]', 'content') or ''

            # Format: "406K Followers, 13 Following, 649 Posts - See Instagram photos and videos from GitHub (@github)"
            followers_match = re.search(r'([\d,KkMm.]+)\s+Followers', meta_desc)
            following_match = re.search(r'([\d,KkMm.]+)\s+Following', meta_desc)
            posts_match = re.search(r'([\d,KkMm.]+)\s+Posts', meta_desc)
            bio_match = re.search(r':\s+"(.*)"', meta_desc, re.DOTALL)

            # Find post and reel links on page if rendered
            post_links = await page.eval_on_selector_all('a[href*="/p/"], a[href*="/reel/"]', 'elements => elements.map(el => el.href)')
            unique_posts = list(dict.fromkeys(post_links))[:12]

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
