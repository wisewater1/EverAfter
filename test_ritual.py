import requests
import json

url = "http://127.0.0.1:8001/api/v1/rituals/generate"
headers = {
    "Authorization": "Bearer demo-token"
}
payload = {
    "ritual_type": "crisis_intercession",
    "context": "im feeling overwhelmsed",
    "participants": ["joseph"],
    "ancestor_id": None
}

try:
    print("Sending POST request to /api/v1/rituals/generate...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
