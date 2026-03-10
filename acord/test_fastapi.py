import requests

def test_generation():
    with open('main.py', 'rb') as f:
        res = requests.post(
            'http://127.0.0.1:8000/generate-coi', 
            files={'request_pdf': f}, 
            data={'policies_json': '{"auto":{},"gl":{},"umbrella":{},"wc":{}}'}
        )
        print(res.status_code)
        print(res.text)

if __name__ == '__main__':
    test_generation()
