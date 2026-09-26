import sys
import os
import re
import json
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cv2

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def sanitize_caption_text(caption, competitor_handles, our_brand_handle):
    """
    Strips competitor mentions, credit lines, and author tags from caption,
    and cleanly injects our brand handle.
    """
    if not caption:
        return "", []

    discarded = []
    cleaned = caption

    # Normalization: ensure handles start with @
    norm_handles = [h.strip().lstrip('@') for h in competitor_handles if h]

    for handle in norm_handles:
        # Regex patterns for credit lines and mentions
        patterns = [
            rf'(?i)(?:curated|created|by|via|credit[s]?|follow)\s*[:\-–]?\s*@{re.escape(handle)}\b',
            rf'(?i)@{re.escape(handle)}\b',
            rf'(?i)#{re.escape(handle)}\b'
        ]
        for pat in patterns:
            found = re.findall(pat, cleaned)
            if found:
                discarded.extend(found)
                cleaned = re.sub(pat, '', cleaned)

    # Clean up empty lines / consecutive spaces caused by removals
    cleaned = re.sub(r'[ \t]+', ' ', cleaned)
    cleaned = re.sub(r'\n\s*\n\s*\n+', '\n\n', cleaned).strip()

    # Append our brand attribution if not already present
    brand_mention = f"Curated by {our_brand_handle}"
    if our_brand_handle not in cleaned:
        # Insert attribution smoothly right before hashtags or at the end
        lines = cleaned.split('\n')
        hashtag_idx = -1
        for i, line in enumerate(lines):
            if line.strip().startswith('#'):
                hashtag_idx = i
                break
        
        if hashtag_idx != -1:
            lines.insert(hashtag_idx, f"\n🚀 {brand_mention}\n")
            cleaned = '\n'.join(lines)
        else:
            cleaned += f"\n\n🚀 {brand_mention}"

    return cleaned.strip(), list(set(discarded))

def get_font(size):
    """Try system fonts for crisp text rendering, fallback to default."""
    font_paths = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/arialbd.ttf"
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()

def create_brand_badge(brand_handle, brand_logo_path=None, badge_height=48):
    """
    Generates a sleek, anti-aliased pill watermark badge with brand logo + handle.
    """
    font = get_font(int(badge_height * 0.42))
    
    # Calculate text width
    dummy_img = Image.new("RGBA", (1, 1))
    draw_dummy = ImageDraw.Draw(dummy_img)
    bbox = draw_dummy.textbbox((0, 0), brand_handle, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    icon_size = int(badge_height * 0.65)
    padding_x = 18
    gap = 10 if brand_logo_path and os.path.exists(brand_logo_path) else 0

    total_w = padding_x * 2 + (icon_size + gap if gap else 0) + text_w
    badge = Image.new("RGBA", (total_w, badge_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)

    # Draw rounded pill background with dark frosted glass effect
    radius = badge_height // 2
    draw.rounded_rectangle([0, 0, total_w, badge_height], radius=radius, fill=(15, 23, 42, 210), outline=(255, 255, 255, 50), width=1)

    cur_x = padding_x
    if gap and os.path.exists(brand_logo_path):
        try:
            icon = Image.open(brand_logo_path).convert("RGBA")
            icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
            badge.paste(icon, (cur_x, (badge_height - icon_size) // 2), icon)
            cur_x += icon_size + gap
        except Exception:
            pass

    # Draw handle text
    text_y = (badge_height - text_h) // 2 - 2
    draw.text((cur_x, text_y), brand_handle, font=font, fill=(255, 255, 255, 240))
    return badge

def clean_and_brand_image(image_path, output_path, competitor_handles, our_brand_handle, brand_logo_path=None, position="bottom-right"):
    """
    Detects competitor handle regions on image, inpaints/cleans them,
    and composites our brand badge.
    """
    if not os.path.exists(image_path):
        return False

    img_bgr = cv2.imread(image_path)
    if img_bgr is None:
        return False

    h, w = img_bgr.shape[:2]

    # Watermark candidate search regions:
    # 1. Bottom-right: [h - int(h*0.12):h, w - int(w*0.45):w]
    # 2. Bottom-left: [h - int(h*0.12):h, 0:int(w*0.45)]
    # 3. Top-right: [0:int(h*0.10), w - int(w*0.40):w]
    # 4. Top-left: [0:int(h*0.10), 0:int(w*0.40)]
    
    # Inpaint competitor text in bottom regions if text is detected
    mask = np.zeros((h, w), dtype=np.uint8)

    # Convert to grayscale for text detection
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    
    # Look for high-contrast watermark text in bottom 12% and top 10%
    zones = [
        (int(h * 0.88), h, int(w * 0.55), w),     # bottom right
        (int(h * 0.88), h, 0, int(w * 0.45)),     # bottom left
        (0, int(h * 0.10), int(w * 0.60), w),     # top right
        (0, int(h * 0.10), 0, int(w * 0.40))      # top left
    ]

    for y1, y2, x1, x2 in zones:
        roi = gray[y1:y2, x1:x2]
        # Otsu threshold to detect crisp watermark text
        _, thresh = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        # Check text-like component density
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            cw, ch_h = cv2.boundingRect(cnt)[2:]
            # Typical watermark character/word bounds
            if 8 < cw < 300 and 8 < ch_h < 40:
                cv2.drawContours(mask[y1:y2, x1:x2], [cnt], -1, 255, thickness=cv2.FILLED)

    # If any text was detected in corners, apply Navier-Stokes inpainting
    if np.count_nonzero(mask) > 50:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated_mask = cv2.dilate(mask, kernel, iterations=2)
        cleaned_bgr = cv2.inpaint(img_bgr, dilated_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
    else:
        cleaned_bgr = img_bgr

    # Convert back to PIL for high-quality badge compositing
    cleaned_rgb = cv2.cvtColor(cleaned_bgr, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(cleaned_rgb)

    # Generate our brand badge
    badge_height = max(38, int(h * 0.038))
    badge = create_brand_badge(our_brand_handle, brand_logo_path, badge_height)
    bw, bh = badge.size

    # Position calculations with 24px margin
    margin = int(min(w, h) * 0.025)
    if position == "bottom-right":
        pos = (w - bw - margin, h - bh - margin)
    elif position == "bottom-left":
        pos = (margin, h - bh - margin)
    elif position == "top-right":
        pos = (w - bw - margin, margin)
    elif position == "top-left":
        pos = (margin, margin)
    else: # bottom-center
        pos = ((w - bw) // 2, h - bh - margin)

    pil_img.paste(badge, pos, badge)
    pil_img.save(output_path, "JPEG", quality=95, optimize=True)
    return True

def clean_and_brand_video(video_path, output_path, our_brand_handle, brand_logo_path=None):
    """
    Uses FFmpeg to composite our brand badge over the video.
    """
    if not os.path.exists(video_path):
        return False

    # First, generate temporary badge PNG
    temp_badge_path = os.path.join(os.path.dirname(output_path), "temp_video_badge.png")
    badge = create_brand_badge(our_brand_handle, brand_logo_path, badge_height=52)
    badge.save(temp_badge_path, "PNG")

    try:
        # Probe if video has audio stream
        has_audio = True
        try:
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", video_path],
                capture_output=True, text=True, timeout=10
            )
            has_audio = bool(probe.stdout.strip())
        except Exception:
            has_audio = True

        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-i", temp_badge_path
        ]
        if not has_audio:
            cmd.extend(["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"])

        cmd.extend([
            "-filter_complex", "[0:v][1:v]overlay=W-w-30:H-h-30[outv]",
            "-map", "[outv]"
        ])

        if has_audio:
            cmd.extend(["-map", "0:a?", "-c:a", "aac", "-b:a", "128k", "-ar", "44100"])
        else:
            cmd.extend(["-map", "2:a", "-c:a", "aac", "-b:a", "128k", "-shortest"])

        cmd.extend([
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "fast",
            "-crf", "18",
            "-movflags", "+faststart",
            output_path
        ])

        res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return res.returncode == 0
    except Exception as e:
        print(f"[Brand Cleanser Video Error] {e}", file=sys.stderr)
        return False
    finally:
        if os.path.exists(temp_badge_path):
            try: os.remove(temp_badge_path)
            except: pass

def main():
    if len(sys.argv) < 5:
        print(json.dumps({"success": False, "error": "Usage: python brand_cleanser.py <mode: images|video|caption> <input_json> <competitor_handles_json> <our_brand_handle> [logo_path]"}))
        sys.exit(1)

    mode = sys.argv[1]
    input_data = json.loads(sys.argv[2])
    competitor_handles = json.loads(sys.argv[3])
    our_brand_handle = sys.argv[4]
    logo_path = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != "null" else None

    result = {
        "success": True,
        "mode": mode,
        "our_brand_handle": our_brand_handle,
        "discarded_tags": []
    }

    if mode == "caption":
        raw_caption = input_data.get("caption", "")
        cleaned_caption, discarded = sanitize_caption_text(raw_caption, competitor_handles, our_brand_handle)
        result["cleaned_caption"] = cleaned_caption
        result["discarded_tags"] = discarded
        print(json.dumps(result))
        return

    elif mode == "images":
        image_paths = input_data.get("images", [])
        cleaned_paths = []
        for p in image_paths:
            if not os.path.exists(p):
                continue
            dir_name = os.path.dirname(p)
            base_name = os.path.basename(p)
            clean_name = f"clean_{base_name}"
            out_p = os.path.join(dir_name, clean_name)
            ok = clean_and_brand_image(p, out_p, competitor_handles, our_brand_handle, logo_path)
            if ok:
                cleaned_paths.append(out_p)

        result["cleaned_images"] = cleaned_paths
        print(json.dumps(result))
        return

    elif mode == "video":
        video_path = input_data.get("video", "")
        if os.path.exists(video_path):
            dir_name = os.path.dirname(video_path)
            base_name = os.path.basename(video_path)
            out_v = os.path.join(dir_name, f"clean_{base_name}")
            ok = clean_and_brand_video(video_path, out_v, our_brand_handle, logo_path)
            result["cleaned_video"] = out_v if ok else video_path
        print(json.dumps(result))
        return

if __name__ == '__main__':
    main()
