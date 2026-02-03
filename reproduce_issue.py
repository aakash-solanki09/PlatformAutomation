import requests
import json

url = "http://localhost:8012/run-task"
payload = {
    "url": "https://www.linkedin.com/jobs",
    "resume_text": "Experienced content writer and translator...",
    "rules": "Remote jobs only",
    "username": "testuser",
    "password": "testpassword"
}

try:
    print(f"Sending request to {url}...")
    response = requests.post(url, json=payload, timeout=60)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")
