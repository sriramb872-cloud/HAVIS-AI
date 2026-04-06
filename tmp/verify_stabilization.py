import requests
import time
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_validation_error():
    print("\n--- Testing Validation Error ---")
    # Missing required field 'content'
    payload = {"feature_type": "smart-notes"}
    resp = requests.post(f"{BASE_URL}/ai/assistant", json=payload)
    print(f"Case: Missing content")
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")
    # Expected: 422, {"error": "Invalid input format. Please check required fields."}
    
def test_http_exception():
    print("\n--- Testing HTTPException ---")
    # 404 Not Found
    resp = requests.get(f"{BASE_URL}/non-existent")
    print(f"Case: 404 Not Found")
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.json()}")
    # Expected: 404, {"error": "Not Found"}

def test_rate_limiter():
    print("\n--- Testing Rate Limiter ---")
    # Hit /ai/health (or any /ai/ route) 16 times
    # Note: rate_limit_middleware checks "/api/v1/ai/"
    endpoint = f"{BASE_URL}/ai/health"
    print(f"Target: {endpoint}")
    
    for i in range(1, 18):
        resp = requests.get(endpoint)
        if resp.status_code == 429:
            print(f"Request {i}: Blocked (429)")
            print(f"Body: {resp.json()}")
            break
        elif resp.status_code == 200:
            if i % 5 == 0:
                print(f"Request {i}: Success (200)")
        else:
            print(f"Request {i}: Unexpected status {resp.status_code}")
            break
    else:
        print("Error: Rate limiter did not block after 15 requests.")

def test_non_ai_rate_limit():
    print("\n--- Testing Non-AI Rate Limit ---")
    # /history should NOT be limited by the AI limiter
    endpoint = f"{BASE_URL}/health" # Using general health check
    print(f"Target: {endpoint}")
    for i in range(1, 20):
        resp = requests.get(endpoint)
        if resp.status_code == 429:
            print(f"Request {i}: FAILED - History/General route was blocked.")
            return
    print("Success: Non-AI route was not blocked.")

if __name__ == "__main__":
    test_validation_error()
    test_http_exception()
    test_rate_limiter()
    test_non_ai_rate_limit()
