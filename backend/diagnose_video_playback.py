import os
import requests
from pathlib import Path

# 1. Verify exact backend path
backend_root = Path("c:/Users/srira/OneDrive/Desktop/brainforge-ai-hub-main/backend")
upload_dir = backend_root / "uploads/videos"
print(f"Checking directory: {upload_dir}")
print(f"Exists: {upload_dir.exists()}")

# 2. Check for files and sizes
if upload_dir.exists():
    files = list(upload_dir.glob("*"))
    print(f"Found {len(files)} files in uploads/videos")
    for f in files:
        print(f"File: {f.name}, Size: {f.stat().st_size} bytes")

# 3. Verify FastAPI Range support
# We'll create a dummy video file (100KB) and try a range request
dummy_file = backend_root / "uploads/test_video.mp4"
with open(dummy_file, "wb") as f:
    f.write(os.urandom(1024 * 100)) # 100KB of random data

print(f"Created dummy file: {dummy_file}")

try:
    # We'll try to request this via the running server
    # The server is running on localhost:8000
    url = "http://localhost:8000/api/v1/media/test_video.mp4"
    headers = {"Range": "bytes=0-1023"}
    response = requests.get(url, headers=headers)
    print(f"Range request to {url}: Status {response.status_code}")
    print(f"Content-Range header: {response.headers.get('Content-Range')}")
    print(f"Content-Length: {response.headers.get('Content-Length')}")
    
    if response.status_code == 206:
        print("PASS: Server supports Range requests (206 Partial Content)")
    else:
        print(f"FAIL: Server returned {response.status_code} instead of 206")

except Exception as e:
    print(f"Error checking Range support: {e}")

# Cleanup dummy
if dummy_file.exists():
    os.remove(dummy_file)
