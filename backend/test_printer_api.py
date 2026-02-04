import asyncio
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def run_test():
    print("Testing Printer API...")
    
    # 1. Create Printer
    print("\n1. Creating Printer...")
    printer_data = {
        "name": "Kitchen Printer 1",
        "type": "Kitchen",
        "location": "Main Kitchen",
        "ip_address": "192.168.1.200",
        "port": 9100
    }
    
    try:
        res = requests.post(f"{BASE_URL}/printers", json=printer_data)
        if res.status_code != 201:
            print(f"FAILED to create printer: {res.status_code} {res.text}")
            return
        printer = res.json()
        printer_id = printer["id"]
        print(f"SUCCESS: Created printer {printer_id}")
    except Exception as e:
        print(f"ERROR: Could not connect to {BASE_URL}. Is server running? {e}")
        return

    # 2. List Printers
    print("\n2. Listing Printers...")
    res = requests.get(f"{BASE_URL}/printers")
    printers = res.json()
    print(f"Found {len(printers)} printers")
    found = any(p["id"] == printer_id for p in printers)
    if found:
        print("SUCCESS: New printer found in list")
    else:
        print("FAILED: New printer not found in list")

    # 3. Submit Print Job
    print("\n3. Submitting Print Job...")
    job_data = {
        "printer_id": printer_id,
        "raw_content": "Hello World\n\nCut"
    }
    venue_id = "venue_1"
    
    res = requests.post(f"{BASE_URL}/print/jobs?venue_id={venue_id}", json=job_data)
    if res.status_code != 200:
        print(f"FAILED to submit job: {res.status_code} {res.text}")
        return
    job = res.json()
    job_id = job["id"]
    print(f"SUCCESS: Submitted job {job_id} status={job['status']}")

    # 4. List Jobs
    print("\n4. Listing Jobs...")
    res = requests.get(f"{BASE_URL}/print/jobs?venue_id={venue_id}&printer_id={printer_id}")
    jobs = res.json()
    print(f"Found {len(jobs)} jobs for printer")
    
    # 5. Complete Job
    print("\n5. Completing Job...")
    res = requests.post(f"{BASE_URL}/print-jobs/{job_id}/complete")
    if res.status_code != 200:
        print(f"FAILED to complete job: {res.status_code} {res.text}")
    else:
        print(f"SUCCESS: {res.json()}")

if __name__ == "__main__":
    run_test()
