import requests

def test_cors(url, origin):
    headers = {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
    }
    
    print(f"\nTesting OPTIONS {url} with Origin {origin}...")
    try:
        response = requests.options(url, headers=headers)
        print(f"Status: {response.status_code}")
        print("Headers:")
        for k, v in response.headers.items():
            if 'Access-Control' in k:
                print(f"  {k}: {v}")
        
        print(f"\nTesting GET {url} with Origin {origin}...")
        response = requests.get(url, headers={'Origin': origin})
        print(f"Status: {response.status_code}")
        print("Headers:")
        for k, v in response.headers.items():
            if 'Access-Control' in k:
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_cors('http://localhost:8000/api/system/version', 'http://localhost:3000')
    test_cors('http://localhost:8000/api/clocking/data', 'http://localhost:3000')
