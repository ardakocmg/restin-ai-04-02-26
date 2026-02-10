
import socket

def test_dns(hostname):
    print(f"Resolving {hostname}...")
    try:
        ip = socket.gethostbyname(hostname)
        print(f"{hostname} -> {ip}")
    except Exception as e:
        print(f"{hostname} failed: {e}")

if __name__ == "__main__":
    test_dns("google.com")
    test_dns("iot.meross.com")
    test_dns("iotx-eu.meross.com")
    test_dns("iotx-us.meross.com")
