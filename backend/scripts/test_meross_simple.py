
import socket
import ssl

def test_connect():
    hostname = "iotx-eu.meross.com"
    port = 443
    context = ssl.create_default_context()
    
    print(f"Connecting to {hostname}:{port}...")
    try:
        with socket.create_connection((hostname, port)) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                print(f"Connected to {hostname} over SSL!")
                print(f"Cipher: {ssock.cipher()}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    test_connect()
