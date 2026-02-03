#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional

class PublicContentTester:
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
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"

            try:
                response_data = response.json() if response.content else {}
            except:
                response_data = {"raw_response": response.text}

            success = response.status_code == expected_status
            if not success:
                return False, response_data, f"Expected {expected_status}, got {response.status_code}"
            
            return True, response_data, ""

        except requests.exceptions.Timeout:
            return False, {}, "Request timeout"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error"
        except Exception as e:
            return False, {}, f"Request error: {str(e)}"

    def test_authentication(self):
        """Test authentication with owner PIN"""
        print("\n🔐 Testing Authentication")
        
        # Test Owner PIN (1234) for admin access
        login_url = "auth/login/pin?pin=1234&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Admin Login (PIN: 1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
        else:
            self.log_test("Admin Login (PIN: 1234)", False, error or "No accessToken received")
            return False
        return True

    def test_get_current_content(self):
        """Test getting current approved content"""
        print("\n📄 Testing Get Current Content")
        
        content_types = ['marketing', 'technical', 'modules']
        
        for content_type in content_types:
            success, data, error = self.make_request('GET', f'public-content/current?type={content_type}')
            self.log_test(f"GET current {content_type} content", success, error)
            
            if success:
                print(f"   ✅ {content_type}: version {data.get('version', 'N/A')}, status {data.get('status', 'N/A')}")
                if content_type == 'modules' and data.get('content', {}).get('auto_sync_registry'):
                    print(f"      Auto-sync enabled: {data['content']['auto_sync_registry']}")

    def test_list_versions(self):
        """Test listing content versions"""
        print("\n📋 Testing List Versions")
        
        if not self.token:
            print("   ❌ No authentication token")
            return
        
        content_types = ['marketing', 'technical', 'modules']
        
        for content_type in content_types:
            success, data, error = self.make_request('GET', f'public-content/versions?type={content_type}')
            self.log_test(f"GET {content_type} versions", success, error)
            
            if success:
                versions = data.get('versions', [])
                print(f"   ✅ {content_type}: {len(versions)} versions")
                for version in versions[:3]:  # Show first 3
                    print(f"      - {version.get('version', 'N/A')} ({version.get('status', 'N/A')})")

    def test_create_draft(self):
        """Test creating a new draft version"""
        print("\n📝 Testing Create Draft")
        
        if not self.token:
            print("   ❌ No authentication token")
            return None
        
        # Create a draft for marketing content
        draft_content = {
            "hero": {
                "title": "Test Marketing Title - Draft",
                "subtitle": "This is a test draft created by automated testing"
            }
        }
        
        from datetime import timedelta
        scheduled_time = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(minutes=5)
        
        payload = {
            "type": "marketing",
            "content": draft_content,
            "changelog": "Test draft created by automation",
            "scheduled_publish_at": scheduled_time.isoformat()
        }
        
        success, data, error = self.make_request('POST', 'public-content', payload)
        self.log_test("POST create marketing draft", success, error)
        
        if success:
            version = data.get('version', {})
            print(f"   ✅ Draft created: {version.get('version', 'N/A')}")
            print(f"      Status: {version.get('status', 'N/A')}")
            print(f"      Scheduled: {version.get('scheduled_publish_at', 'N/A')}")
            return version
        
        return None

    def test_update_draft(self, draft_version):
        """Test updating a draft version"""
        print("\n✏️ Testing Update Draft")
        
        if not self.token or not draft_version:
            print("   ❌ No authentication token or draft version")
            return
        
        # Update the draft content
        updated_content = {
            "hero": {
                "title": "Updated Test Marketing Title - Draft",
                "subtitle": "This draft has been updated by automated testing"
            }
        }
        
        payload = {
            "content": updated_content,
            "changelog": "Updated by automation test"
        }
        
        version_id = draft_version.get('id')
        success, data, error = self.make_request('PATCH', f'public-content/{version_id}', payload)
        self.log_test("PATCH update draft", success, error)
        
        if success:
            version = data.get('version', {})
            print(f"   ✅ Draft updated: {version.get('version', 'N/A')}")
            print(f"      Updated at: {version.get('updated_at', 'N/A')}")

    def test_preview_version(self, draft_version):
        """Test previewing a version"""
        print("\n👁️ Testing Preview Version")
        
        if not self.token or not draft_version:
            print("   ❌ No authentication token or draft version")
            return
        
        version_id = draft_version.get('id')
        success, data, error = self.make_request('GET', f'public-content/preview/{version_id}')
        self.log_test("GET preview version", success, error)
        
        if success:
            print(f"   ✅ Preview retrieved: version {data.get('version', 'N/A')}")
            print(f"      Status: {data.get('status', 'N/A')}")
            content = data.get('content', {})
            if content.get('hero', {}).get('title'):
                print(f"      Title: {content['hero']['title']}")

    def test_approve_version(self, draft_version):
        """Test approving a version"""
        print("\n✅ Testing Approve Version")
        
        if not self.token or not draft_version:
            print("   ❌ No authentication token or draft version")
            return
        
        version_id = draft_version.get('id')
        success, data, error = self.make_request('POST', f'public-content/{version_id}/approve')
        self.log_test("POST approve version", success, error)
        
        if success:
            version = data.get('version', {})
            print(f"   ✅ Version approved: {version.get('version', 'N/A')}")
            print(f"      Status: {version.get('status', 'N/A')}")
            print(f"      Approved at: {version.get('approved_at', 'N/A')}")

    def test_sync_modules(self):
        """Test syncing modules from registry"""
        print("\n🔄 Testing Sync Modules")
        
        if not self.token:
            print("   ❌ No authentication token")
            return
        
        success, data, error = self.make_request('POST', 'public-content/sync-modules')
        self.log_test("POST sync modules from registry", success, error)
        
        if success:
            version = data.get('version', {})
            print(f"   ✅ Modules synced: {version.get('version', 'N/A')}")
            print(f"      Status: {version.get('status', 'N/A')}")
            print(f"      Changelog: {version.get('changelog', 'N/A')}")

    def test_scheduled_publishing(self):
        """Test scheduled publishing functionality"""
        print("\n⏰ Testing Scheduled Publishing")
        
        if not self.token:
            print("   ❌ No authentication token")
            return
        
        from datetime import timedelta
        scheduled_time = datetime.now(timezone.utc).replace(microsecond=0) + timedelta(minutes=1)
        
        draft_content = {
            "hero": {
                "title": "Scheduled Test Content",
                "subtitle": "This content should be auto-published"
            }
        }
        
        payload = {
            "type": "technical",
            "content": draft_content,
            "changelog": "Scheduled publish test",
            "scheduled_publish_at": scheduled_time.isoformat()
        }
        
        success, data, error = self.make_request('POST', 'public-content', payload)
        self.log_test("Create scheduled draft", success, error)
        
        if success:
            version = data.get('version', {})
            print(f"   ✅ Scheduled draft created: {version.get('version', 'N/A')}")
            print(f"      Scheduled for: {version.get('scheduled_publish_at', 'N/A')}")
            print(f"      Note: This will be auto-published by the scheduler")

    def run_all_tests(self):
        """Run all public content tests"""
        print("🚀 Starting Public Content API Tests")
        print("=" * 60)
        
        # Authentication
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return
        
        # Basic content retrieval
        self.test_get_current_content()
        self.test_list_versions()
        
        # Draft workflow
        draft_version = self.test_create_draft()
        if draft_version:
            self.test_update_draft(draft_version)
            self.test_preview_version(draft_version)
            self.test_approve_version(draft_version)
        
        # Module sync
        self.test_sync_modules()
        
        # Scheduled publishing
        self.test_scheduled_publishing()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 PUBLIC CONTENT API TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PublicContentTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())