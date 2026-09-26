import sys
import os
import json
from instagrapi import Client

def upload_post(username, password, media_path, caption, post_type="photo"):
    cl = Client()
    try:
        cl.login(username, password)
        
        if post_type == "reel":
            media = cl.clip_upload(media_path, caption=caption)
        elif post_type == "photo":
            media = cl.photo_upload(media_path, caption=caption)
        elif post_type == "album":
            # list of file paths
            paths = [p.strip() for p in media_path.split(',') if p.strip()]
            media = cl.album_upload(paths, caption=caption)
        else:
            return {"success": False, "error": f"Unknown post type: {post_type}"}
            
        return {
            "success": True,
            "media_id": str(media.pk),
            "code": media.code,
            "permalink": f"https://www.instagram.com/p/{media.code}/"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"success": False, "error": "Usage: python instagram_instagrapi_uploader.py <user> <pass> <media_path> <caption> [type]"}))
        sys.exit(1)
        
    u = sys.argv[1]
    p = sys.argv[2]
    m = sys.argv[3]
    c = sys.argv[4]
    t = sys.argv[5] if len(sys.argv) > 5 else "photo"
    
    res = upload_post(u, p, m, c, t)
    print(json.dumps(res))
