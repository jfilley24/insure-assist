import urllib.request, urllib.parse

data = {
    'certificate_holder_name': 'TEST',
    'description_of_operations': '',
    'policies_json': '{}',
    'client_settings_json': '{"managedAuto": true, "managedGL": true, "managedUmb": true, "managedWC": true}'
}
encoded_data = urllib.parse.urlencode(data).encode('ascii')
req = urllib.request.Request('http://127.0.0.1:8000/generate-coi-manual', data=encoded_data)
try:
    print("Testing manual COI generation...")
    res = urllib.request.urlopen(req, timeout=30)
    print(f"Status Output: {res.status}")
except Exception as e:
    print(f"Error: {e}")
