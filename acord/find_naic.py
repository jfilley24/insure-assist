import requests

url = "https://data.ny.gov/api/views?q=licensed insurance companies"
response = requests.get(url)
if response.status_code == 200:
    results = response.json()
    for item in results.get("results", [])[:5]:
        print(item.get("view", {}).get("name"), "-", item.get("view", {}).get("id"))
else:
    print("Failed to fetch")
