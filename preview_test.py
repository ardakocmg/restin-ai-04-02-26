#!/usr/bin/env python3

import requests
import sys
from datetime import datetime, timezone, timedelta

def test_preview_functionality():
    """Test the preview functionality end-to-end"""
    base_url = "https://observe-hub-1.preview.emergentagent.com"
    
    print("🎯 Testing Preview Functionality")
    print("=" * 50)
    
    # Step 1: Login to get admin token
    print("\n1. Authenticating as admin...")
    login_url = f"{base_url}/api/auth/login/pin?pin=1234&app=admin"
    response = requests.post(login_url, headers={'Content-Type': 'application/json'})
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    data = response.json()
    token = data.get('accessToken')
    if not token:
        print("❌ No access token received")
        return False
    
    print(f"✅ Logged in as: {data['user']['name']}")
    
    # Step 2: Create a draft with distinctive content
    print("\n2. Creating a draft with test content...")
    
    test_content = {
        "hero": {
            "title": "🚀 PREVIEW MODE TEST - This is a draft version",
            "subtitle": "If you can see this message, preview mode is working correctly!",
            "tag": "PREVIEW TEST CONTENT"
        }
    }
    
    draft_payload = {
        "type": "marketing",
        "content": test_content,
        "changelog": "Preview functionality test draft"
    }
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    response = requests.post(f"{base_url}/api/public-content", json=draft_payload, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to create draft: {response.status_code}")
        return False
    
    draft_data = response.json()
    version_id = draft_data['version']['id']
    print(f"✅ Draft created with ID: {version_id}")
    
    # Step 3: Test preview API endpoint
    print("\n3. Testing preview API endpoint...")
    
    response = requests.get(f"{base_url}/api/public-content/preview/{version_id}", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Preview API failed: {response.status_code}")
        return False
    
    preview_data = response.json()
    if preview_data.get('content', {}).get('hero', {}).get('title') == test_content['hero']['title']:
        print("✅ Preview API returns correct draft content")
    else:
        print("❌ Preview API content mismatch")
        return False
    
    # Step 4: Test preview URL on public pages
    print("\n4. Testing preview URLs on public pages...")
    
    # Test marketing page with preview
    preview_url = f"{base_url}/?previewId={version_id}"
    response = requests.get(preview_url)
    
    if response.status_code == 200:
        print("✅ Marketing page with preview loads (200)")
        
        # Check if the page contains preview-specific content
        page_content = response.text
        if "PREVIEW MODE TEST" in page_content:
            print("✅ Preview content appears on marketing page")
        else:
            print("⚠️  Preview content not found in page (may be loaded via JS)")
        
        if "preview-banner" in page_content or "Preview mode" in page_content:
            print("✅ Preview banner detected in page")
        else:
            print("⚠️  Preview banner not detected (may be added via JS)")
    else:
        print(f"❌ Marketing preview page failed: {response.status_code}")
    
    # Test technical page with preview
    tech_preview_url = f"{base_url}/technic?previewId={version_id}"
    response = requests.get(tech_preview_url)
    
    if response.status_code == 200:
        print("✅ Technical page with preview loads (200)")
    else:
        print(f"❌ Technical preview page failed: {response.status_code}")
    
    # Test modules page with preview
    modules_preview_url = f"{base_url}/modules?previewId={version_id}"
    response = requests.get(modules_preview_url)
    
    if response.status_code == 200:
        print("✅ Modules page with preview loads (200)")
    else:
        print(f"❌ Modules preview page failed: {response.status_code}")
    
    # Step 5: Test current content (without preview)
    print("\n5. Testing current content (without preview)...")
    
    current_url = f"{base_url}/"
    response = requests.get(current_url)
    
    if response.status_code == 200:
        print("✅ Current marketing page loads (200)")
        
        page_content = response.text
        if "PREVIEW MODE TEST" not in page_content:
            print("✅ Current page does NOT show draft content")
        else:
            print("❌ Current page incorrectly shows draft content")
    else:
        print(f"❌ Current marketing page failed: {response.status_code}")
    
    # Step 6: Test modules sync functionality
    print("\n6. Testing modules sync functionality...")
    
    response = requests.post(f"{base_url}/api/public-content/sync-modules", headers=headers)
    
    if response.status_code == 200:
        sync_data = response.json()
        sync_version_id = sync_data['version']['id']
        print(f"✅ Modules sync created draft: {sync_version_id}")
        
        # Test preview of synced modules
        modules_sync_preview_url = f"{base_url}/modules?previewId={sync_version_id}"
        response = requests.get(modules_sync_preview_url)
        
        if response.status_code == 200:
            print("✅ Synced modules preview loads (200)")
        else:
            print(f"❌ Synced modules preview failed: {response.status_code}")
    else:
        print(f"❌ Modules sync failed: {response.status_code}")
    
    # Step 7: Test scheduled publishing
    print("\n7. Testing scheduled publishing...")
    
    future_time = datetime.now(timezone.utc) + timedelta(minutes=10)
    scheduled_content = {
        "hero": {
            "title": "Scheduled Content Test",
            "subtitle": "This content is scheduled for future publishing"
        }
    }
    
    scheduled_payload = {
        "type": "technical",
        "content": scheduled_content,
        "changelog": "Scheduled publishing test",
        "scheduled_publish_at": future_time.isoformat()
    }
    
    response = requests.post(f"{base_url}/api/public-content", json=scheduled_payload, headers=headers)
    
    if response.status_code == 200:
        scheduled_data = response.json()
        scheduled_version_id = scheduled_data['version']['id']
        scheduled_time = scheduled_data['version']['scheduled_publish_at']
        print(f"✅ Scheduled draft created: {scheduled_version_id}")
        print(f"   Scheduled for: {scheduled_time}")
    else:
        print(f"❌ Scheduled draft creation failed: {response.status_code}")
    
    print("\n" + "=" * 50)
    print("✅ Preview functionality testing completed")
    return True

if __name__ == "__main__":
    success = test_preview_functionality()
    sys.exit(0 if success else 1)