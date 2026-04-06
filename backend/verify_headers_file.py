import requests
try:
    r = requests.head("http://localhost:8000/api/v1/media/videos/test_playback.webm")
    
    with open("headers_output.txt", "w") as f:
        f.write(f"Status: {r.status_code}\n")
        f.write(f"Content-Type: {r.headers.get('Content-Type')}\n")
        f.write(f"Access-Control-Allow-Origin: {r.headers.get('Access-Control-Allow-Origin')}\n")
        f.write(f"Cross-Origin-Resource-Policy: {r.headers.get('Cross-Origin-Resource-Policy')}\n")
        f.write(f"Accept-Ranges: {r.headers.get('Accept-Ranges')}\n")
        
    print("Headers saved to headers_output.txt")
except Exception as e:
    print(f"Error: {e}")
