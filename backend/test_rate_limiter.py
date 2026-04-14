import asyncio
import httpx
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rate_limit():
    print("Testing Rate Limiter...")
    limit = 15
    route = "/api/v1/ai/test" # Mock AI endpoint if real one requires auth?
    # actually, middleware catches it before route. So let's use a non-existent AI path
    # and just see if it returns 429. If not 429, it could return 404 (if not limited).
    
    # Send 15 requests
    for i in range(limit):
        response = client.get("/api/v1/ai/mock", headers={'X-Forwarded-For': '192.168.1.1'})
        if response.status_code == 429:
            print(f"Failed too early on request {i+1}")
            return
            
    print(f"Successfully sent {limit} requests under limit.")
    
    # 16th should be limited
    response = client.get("/api/v1/ai/mock", headers={'X-Forwarded-For': '192.168.1.1'})
    if response.status_code == 429:
        print("Success: 16th request blocked with 429.")
        print(f"Error Message: {response.json()}")
    else:
        print(f"Failure: 16th request got status {response.status_code}")
        
    print("Testing Non-AI endpoint...")
    for _ in range(limit + 5):
        client.get("/api/v1/history/docs", headers={'X-Forwarded-For': '192.168.1.1'})
        
    response = client.get("/api/v1/history/mock", headers={'X-Forwarded-For': '192.168.1.1'})
    if response.status_code == 429:
        print("Failure: Non-AI route was rate limited!")
    else:
        print("Success: Non-AI routes unaffected.")

if __name__ == "__main__":
    test_rate_limit()
