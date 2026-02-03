#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Optional

class EventDrivenTester:
    def __init__(self, base_url="https://observe-hub-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200) -> tuple:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_auth_login(self):
        """Test authentication with PIN 0000 for admin app"""
        print("\n🔐 Testing Authentication")
        print("=" * 60)
        
        # Test Product Owner PIN (0000) for admin app
        login_url = "auth/login/pin?pin=0000&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("POST /api/auth/login with PIN 0000 for admin app", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            print(f"   Venue ID: {data['user']['venueId']}")
            return True
        else:
            self.log_test("POST /api/auth/login with PIN 0000 for admin app", False, error or "No accessToken received")
            return False

    def test_venues_endpoint(self):
        """Test GET /api/venues"""
        print("\n🏢 Testing Venues Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'venues')
        self.log_test("GET /api/venues", success, error)
        
        if success and data:
            print(f"   Found {len(data)} venues")
            return True
        return False

    def test_health_endpoint(self):
        """Test GET /api/health"""
        print("\n💚 Testing Health Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'health')
        self.log_test("GET /api/health", success, error)
        
        if success:
            print(f"   Health check passed")
            return True
        return False

    def test_system_version(self):
        """Test GET /api/system/version"""
        print("\n📦 Testing System Version Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'system/version')
        self.log_test("GET /api/system/version", success, error)
        
        if success:
            print(f"   Version: {data.get('version', 'N/A')}")
            print(f"   Build ID: {data.get('build_id', 'N/A')}")
            print(f"   Git SHA: {data.get('git_sha', 'N/A')}")
            return True
        return False

    def test_services_status(self):
        """Test GET /api/services/status - should show 7 microservices"""
        print("\n🔧 Testing Services Status Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'services/status')
        self.log_test("GET /api/services/status", success, error)
        
        if not success:
            return False
        
        # Check if we have services array
        services = data.get('services', [])
        print(f"   Found {len(services)} registered services")
        
        # Expected 7 microservices
        expected_services = [
            'OrderService',
            'InventoryService',
            'AnalyticsService',
            'EmailService',
            'NotificationService',
            'PaymentService',
            'PayrollService'
        ]
        
        found_services = [s.get('name') for s in services]
        
        # Check if all expected services are present
        all_found = all(svc in found_services for svc in expected_services)
        
        if all_found:
            self.log_test("All 7 microservices registered", True)
            print("\n   ✅ All expected services found:")
            for service in services:
                print(f"      - {service.get('name')}")
                print(f"        Capabilities: {', '.join(service.get('capabilities', []))}")
                print(f"        Subscribed Events: {', '.join(service.get('subscribed_events', []))}")
        else:
            missing = [s for s in expected_services if s not in found_services]
            self.log_test("All 7 microservices registered", False, f"Missing: {', '.join(missing)}")
            print(f"\n   ❌ Missing services: {', '.join(missing)}")
            print(f"   Found services: {', '.join(found_services)}")
        
        # Verify each service has capabilities and subscribed_events
        for service in services:
            has_capabilities = 'capabilities' in service and len(service['capabilities']) > 0
            has_subscribed_events = 'subscribed_events' in service
            
            if not has_capabilities:
                self.log_test(f"{service.get('name')} has capabilities", False, "No capabilities listed")
            else:
                self.log_test(f"{service.get('name')} has capabilities", True)
            
            if not has_subscribed_events:
                self.log_test(f"{service.get('name')} has subscribed_events", False, "No subscribed_events field")
            else:
                self.log_test(f"{service.get('name')} has subscribed_events", True)
        
        return all_found

    def test_events_outbox(self):
        """Test GET /api/events/outbox - event queue"""
        print("\n📤 Testing Events Outbox Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'events/outbox')
        self.log_test("GET /api/events/outbox", success, error)
        
        if success:
            events = data.get('events', [])
            print(f"   Found {len(events)} events in outbox")
            
            if events:
                print("\n   Sample events:")
                for event in events[:3]:  # Show first 3
                    print(f"      - Event Type: {event.get('event_type')}")
                    print(f"        Status: {event.get('status')}")
                    print(f"        Created: {event.get('created_at')}")
            
            return True
        return False

    def test_events_dlq(self):
        """Test GET /api/events/dlq - dead letter queue"""
        print("\n💀 Testing Events DLQ Endpoint")
        print("=" * 60)
        
        success, data, error = self.make_request('GET', 'events/dlq')
        self.log_test("GET /api/events/dlq", success, error)
        
        if success:
            failed_events = data.get('failed_events', [])
            print(f"   Found {len(failed_events)} failed events in DLQ")
            
            if failed_events:
                print("\n   Sample failed events:")
                for event in failed_events[:3]:  # Show first 3
                    print(f"      - Event Type: {event.get('event_type')}")
                    print(f"        Error: {event.get('error')}")
                    print(f"        Retry Count: {event.get('retry_count')}")
            
            return True
        return False

    def test_service_registry(self):
        """Verify service registry has all 7 services"""
        print("\n📋 Testing Service Registry")
        print("=" * 60)
        
        # This is tested via /api/services/status endpoint
        # Just verify the structure
        success, data, error = self.make_request('GET', 'services/status')
        
        if not success:
            self.log_test("Service registry accessible", False, error)
            return False
        
        services = data.get('services', [])
        
        # Verify each service has required fields
        required_fields = ['name', 'capabilities', 'subscribed_events']
        
        all_valid = True
        for service in services:
            for field in required_fields:
                if field not in service:
                    self.log_test(f"Service {service.get('name', 'Unknown')} has {field}", False, f"Missing {field}")
                    all_valid = False
        
        if all_valid:
            self.log_test("All services have required fields", True)
            print("   ✅ All services properly registered with capabilities and subscribed_events")
        
        return all_valid

    def run_all_tests(self):
        """Run complete event-driven test suite"""
        print("🚀 Starting Event-Driven Microservice Test Suite")
        print("=" * 60)
        
        # Step 1: Authentication
        if not self.test_auth_login():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with tests.")
            return 1
        
        # Step 2: Test key modular route endpoints
        print("\n\n📍 TESTING KEY MODULAR ROUTE ENDPOINTS")
        print("=" * 60)
        
        self.test_venues_endpoint()
        self.test_health_endpoint()
        self.test_system_version()
        
        # Step 3: Test event-driven endpoints (requires auth)
        print("\n\n🔄 TESTING EVENT-DRIVEN ENDPOINTS")
        print("=" * 60)
        
        self.test_services_status()
        self.test_events_outbox()
        self.test_events_dlq()
        
        # Step 4: Verify service registry
        print("\n\n📋 VERIFYING SERVICE REGISTRY")
        print("=" * 60)
        
        self.test_service_registry()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print("=" * 60)
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            print(f"⚠️  {failed} test(s) failed")
            
            # Show failed tests
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
            
            return 1

def main():
    tester = EventDrivenTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
