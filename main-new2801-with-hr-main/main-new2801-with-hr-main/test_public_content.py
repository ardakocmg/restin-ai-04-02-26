#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
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
                    expected_status: int = 200, params: Optional[Dict] = None) -> tuple:
        """Make API request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=10)
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

    def test_admin_login(self):
        """Test admin login with Owner PIN"""
        print("\n🔐 Testing Admin Login")
        login_url = "auth/login/pin?pin=1234&app=admin"
        success, data, error = self.make_request('POST', login_url)
        
        if success and 'accessToken' in data:
            self.token = data['accessToken']
            self.log_test("Admin Login (PIN: 1234)", True)
            print(f"   Logged in as: {data['user']['name']} ({data['user']['role']})")
            return True
        else:
            self.log_test("Admin Login (PIN: 1234)", False, error or "No accessToken received")
            return False

    def test_public_content_endpoints(self):
        """Test public content API endpoints"""
        print("\n📄 Testing Public Content API Endpoints")
        
        content_types = ['marketing', 'technical', 'modules']
        
        for content_type in content_types:
            print(f"\n--- Testing {content_type} content ---")
            
            # Test public endpoint (no auth required)
            success, data, error = self.make_request('GET', 'public-content/current', 
                                                   params={'type': content_type})
            self.log_test(f"GET /api/public-content/current?type={content_type}", success, error)
            
            if success:
                print(f"   ✅ {content_type} content loaded")
                print(f"   Version: {data.get('version', 'N/A')}")
                print(f"   Status: {data.get('status', 'N/A')}")
                
                # Verify content structure
                content = data.get('content', {})
                if content_type == 'marketing':
                    has_hero = 'hero' in content
                    self.log_test(f"Marketing content has hero section", has_hero)
                elif content_type == 'technical':
                    has_hero = 'hero' in content
                    self.log_test(f"Technical content has hero section", has_hero)
                elif content_type == 'modules':
                    has_modules = 'modules' in content
                    self.log_test(f"Modules content has modules array", has_modules)

    def test_admin_content_management(self):
        """Test admin content management workflow"""
        if not self.token:
            print("❌ Cannot test admin endpoints without authentication")
            return

        print("\n🔧 Testing Admin Content Management")
        
        content_type = 'marketing'  # Focus on marketing for testing
        
        # 1. List existing versions
        print(f"\n1. GET /api/public-content/versions?type={content_type}")
        success, data, error = self.make_request('GET', 'public-content/versions', 
                                               params={'type': content_type})
        self.log_test(f"List {content_type} versions", success, error)
        
        existing_versions = []
        if success:
            existing_versions = data.get('versions', [])
            print(f"   Found {len(existing_versions)} existing versions")
        
        # 2. Get current content to create draft from
        print(f"\n2. GET /api/public-content/current?type={content_type}")
        success, current_data, error = self.make_request('GET', 'public-content/current', 
                                                       params={'type': content_type})
        
        if not success:
            print("   ❌ Cannot get current content for draft creation")
            return
        
        current_content = current_data.get('content', {})
        
        # 3. Create a new draft version
        print(f"\n3. POST /api/public-content (create draft)")
        
        # Modify the hero title for testing
        test_content = current_content.copy()
        if 'hero' in test_content:
            original_title = test_content['hero'].get('title', '')
            test_content['hero']['title'] = f"[TEST] {original_title} - Updated at {datetime.now().strftime('%H:%M:%S')}"
        
        create_payload = {
            'type': content_type,
            'content': test_content,
            'changelog': 'Test draft created by automated testing'
        }
        
        success, create_data, error = self.make_request('POST', 'public-content', create_payload)
        self.log_test(f"Create {content_type} draft version", success, error)
        
        if not success:
            print("   ❌ Cannot create draft version")
            return
        
        draft_version = create_data.get('version', {})
        version_id = draft_version.get('id')
        print(f"   ✅ Draft created: {draft_version.get('version')} (ID: {version_id})")
        
        # 4. Update the draft
        print(f"\n4. PATCH /api/public-content/{version_id} (update draft)")
        
        # Further modify the content
        updated_content = test_content.copy()
        if 'hero' in updated_content:
            updated_content['hero']['title'] = f"[UPDATED] {original_title} - Modified at {datetime.now().strftime('%H:%M:%S')}"
        
        update_payload = {
            'content': updated_content,
            'changelog': 'Updated hero title in test draft'
        }
        
        success, update_data, error = self.make_request('PATCH', f'public-content/{version_id}', update_payload)
        self.log_test(f"Update draft version", success, error)
        
        if success:
            print(f"   ✅ Draft updated successfully")
        
        # 5. Approve the version
        print(f"\n5. POST /api/public-content/{version_id}/approve")
        
        success, approve_data, error = self.make_request('POST', f'public-content/{version_id}/approve')
        self.log_test(f"Approve version", success, error)
        
        if success:
            print(f"   ✅ Version approved successfully")
            
            # 6. Verify the public endpoint now returns the updated content
            print(f"\n6. Verify public endpoint returns updated content")
            success, verify_data, error = self.make_request('GET', 'public-content/current', 
                                                          params={'type': content_type})
            
            if success:
                new_content = verify_data.get('content', {})
                new_title = new_content.get('hero', {}).get('title', '')
                
                if '[UPDATED]' in new_title:
                    self.log_test(f"Public endpoint returns updated content", True)
                    print(f"   ✅ Public content updated: {new_title[:50]}...")
                else:
                    self.log_test(f"Public endpoint returns updated content", False, 
                                "Title not updated in public endpoint")
                    print(f"   ❌ Public content not updated. Title: {new_title[:50]}...")
        
        return version_id if success else None

    def test_content_versioning_workflow(self):
        """Test complete content versioning workflow"""
        print("\n🔄 Testing Complete Content Versioning Workflow")
        
        if not self.token:
            print("❌ Cannot test versioning without authentication")
            return
        
        # Test the workflow for all content types
        for content_type in ['marketing', 'technical', 'modules']:
            print(f"\n--- Testing {content_type} versioning workflow ---")
            
            # Get current content
            success, current_data, error = self.make_request('GET', 'public-content/current', 
                                                           params={'type': content_type})
            if not success:
                print(f"   ❌ Cannot get current {content_type} content")
                continue
            
            current_content = current_data.get('content', {})
            
            # Create draft from current
            test_content = current_content.copy()
            
            # Modify content based on type
            if content_type == 'marketing' and 'hero' in test_content:
                test_content['hero']['title'] = f"[AUTO-TEST] Marketing - {datetime.now().strftime('%H:%M:%S')}"
            elif content_type == 'technical' and 'hero' in test_content:
                test_content['hero']['title'] = f"[AUTO-TEST] Technical - {datetime.now().strftime('%H:%M:%S')}"
            elif content_type == 'modules' and 'hero' in test_content:
                test_content['hero']['title'] = f"[AUTO-TEST] Modules - {datetime.now().strftime('%H:%M:%S')}"
            
            # Create → Save → Approve workflow
            create_payload = {
                'type': content_type,
                'content': test_content,
                'changelog': f'Auto-test draft for {content_type}'
            }
            
            success, create_data, error = self.make_request('POST', 'public-content', create_payload)
            if success:
                version_id = create_data.get('version', {}).get('id')
                
                # Approve immediately
                success, _, error = self.make_request('POST', f'public-content/{version_id}/approve')
                
                if success:
                    self.log_test(f"{content_type} versioning workflow", True)
                    print(f"   ✅ {content_type} workflow completed")
                else:
                    self.log_test(f"{content_type} versioning workflow", False, f"Approval failed: {error}")
            else:
                self.log_test(f"{content_type} versioning workflow", False, f"Creation failed: {error}")

    def run_all_tests(self):
        """Run all public content tests"""
        print("🚀 Starting Public Content Management System Tests")
        print("=" * 60)
        
        # Test public endpoints first (no auth needed)
        self.test_public_content_endpoints()
        
        # Test admin functionality
        if self.test_admin_login():
            self.test_admin_content_management()
            self.test_content_versioning_workflow()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 PUBLIC CONTENT TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = PublicContentTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())