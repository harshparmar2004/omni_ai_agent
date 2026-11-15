#!/usr/bin/env python3
"""
OpenCV Video Vision & Headline ROI Detector
Extracts, localizes, and enhances on-screen headline text from social media reels
using OpenCV morphological gradients, contour analysis, and Otsu binarization.
"""

import sys
import os
import json
import cv2
import numpy as np

def extract_headline_roi(video_path, output_roi_path=None):
    if not video_path or not os.path.exists(video_path):
        return {"success": False, "error": f"File not found: {video_path}"}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"success": False, "error": f"Could not open video: {video_path}"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Sample timestamps across the intro hook (0.5s, 0.8s, 1.2s, 1.6s)
    sample_timestamps = [0.5, 0.8, 1.2, 1.6]
    best_roi = None
    best_candidate_boxes = []

    for t in sample_timestamps:
        frame_idx = int(t * fps)
        if frame_idx >= total_frames:
            continue

        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret or frame is None:
            continue

        # Focus on upper 70% where reel headlines and hooks are located
        crop_h = int(height * 0.70)
        top_region = frame[0:crop_h, 0:width]
        gray = cv2.cvtColor(top_region, cv2.COLOR_BGR2GRAY)

        # 1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # 2. Morphological gradient to identify high-contrast text character edges
        kernel_grad = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        grad = cv2.morphologyEx(enhanced, cv2.MORPH_GRADIENT, kernel_grad)
        _, thresh = cv2.threshold(grad, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

        # 3. Horizontal rectangular closing to bridge letters into text lines
        kernel_close = cv2.getStructuringElement(cv2.MORPH_RECT, (17, 3))
        connected = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel_close)

        # 4. Find external contours of candidate text lines
        contours, _ = cv2.findContours(connected, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        headline_boxes = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect = w / float(h)
            # Filter for wide headline text lines
            if w > width * 0.35 and h > 18 and h < crop_h * 0.35 and aspect > 1.8:
                # Exclude bottom credit badges / handle overlays near the bottom of crop_h
                if y + h < crop_h * 0.90:
                    headline_boxes.append((x, y, w, h))

        if len(headline_boxes) > len(best_candidate_boxes):
            best_candidate_boxes = headline_boxes
            if headline_boxes:
                # Merge individual text line bounding boxes into a cohesive headline ROI
                min_x = max(0, min(b[0] for b in headline_boxes) - 24)
                min_y = max(0, min(b[1] for b in headline_boxes) - 18)
                max_x = min(width, max(b[0] + b[2] for b in headline_boxes) + 24)
                max_y = min(crop_h, max(b[1] + b[3] for b in headline_boxes) + 18)
                best_roi = top_region[min_y:max_y, min_x:max_x]

    cap.release()

    if best_roi is None:
        return {"success": False, "error": "No headline text region detected"}

    if not output_roi_path:
        base_dir = os.path.dirname(video_path)
        output_roi_path = os.path.join(base_dir, f"headline_roi_{os.path.basename(video_path)}.png")

    os.makedirs(os.path.dirname(os.path.abspath(output_roi_path)), exist_ok=True)

    # Preprocessing for maximum OCR fidelity:
    # 1. Grayscale
    roi_gray = cv2.cvtColor(best_roi, cv2.COLOR_BGR2GRAY)
    # 2. Upscale 2.0x with bicubic interpolation
    roi_upscaled = cv2.resize(roi_gray, (0, 0), fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    # 3. Bilateral filter to smooth compression artifacts
    filtered = cv2.bilateralFilter(roi_upscaled, 9, 75, 75)
    # 4. Otsu binarization
    _, bin_img = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    cv2.imwrite(output_roi_path, bin_img)

    return {
        "success": True,
        "roi_path": os.path.abspath(output_roi_path),
        "boxes_detected": len(best_candidate_boxes),
        "roi_width": int(best_roi.shape[1]),
        "roi_height": int(best_roi.shape[0])
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: opencvTextDetector.py <video_path> [output_roi_path]"}))
        sys.exit(1)

    video_in = sys.argv[1]
    roi_out = sys.argv[2] if len(sys.argv) > 2 else None
    res = extract_headline_roi(video_in, roi_out)
    print(json.dumps(res))
