import requests
try:
    r = requests.head("http://localhost:8000/api/v1/media/videos/test_playback.webm")
    print(f"Status: {r.status_code}")
    print(f"Content-Type: {r.headers.get('Content-Type')}")
    print(f"Access-Control-Allow-Origin: {r.headers.get('Access-Control-Allow-Origin')}")
    print(f"Cross-Origin-Resource-Policy: {r.headers.get('Cross-Origin-Resource-Policy')}")
    print(f"Accept-Ranges: {r.headers.get('Accept-Ranges')}")
except Exception as e:
    print(f"Error: {e}")
