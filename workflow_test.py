#!/usr/bin/env python3

import requests
import sys
from datetime import datetime, timezone, timedelta

def test_complete_workflow():
    """Test the complete content management workflow"""
    base_url = "https://observe-hub-1.preview.emergentagent.com"
    
    print("🔄 Testing Complete Content Management Workflow")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1. Authenticating as admin...")
    login_url = f"{base_url}/api/auth/login/pin?pin=1234&app=admin"
    response = requests.post(login_url, headers={'Content-Type': 'application/json'})
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return False
    
    data = response.json()
    token = data.get('accessToken')
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    
    print(f"✅ Logged in as: {data['user']['name']}")
    
    # Step 2: Get current approved content for comparison
    print("\n2. Getting current approved content...")
    
    response = requests.get(f"{base_url}/api/public-content/current?type=marketing")
    if response.status_code == 200:
        current_content = response.json()
        print(f"✅ Current approved version: {current_content.get('version')}")
        print(f"   Status: {current_content.get('status')}")
    else:
        print(f"❌ Failed to get current content: {response.status_code}")
        return False
    
    # Step 3: Create a draft with modified content
    print("\n3. Creating draft with modified content...")
    
    # Modify the existing content
    modified_content = current_content.get('content', {}).copy()
    if 'hero' not in modified_content:
        modified_content['hero'] = {}
    
    modified_content['hero']['title'] = "🚀 MODIFIED TITLE - Draft Version"
    modified_content['hero']['subtitle'] = "This is a modified subtitle for testing diff viewer"
    
    # Add a new pricing tier for testing
    if 'pricing' not in modified_content:
        modified_content['pricing'] = []
    
    modified_content['pricing'].append({
        "key": "enterprise",
        "name": "Enterprise",
        "price": "€2,500",
        "period": "/month",
        "tagline": "For large-scale operations requiring maximum control",
        "highlights": ["Everything in Business", "Multi-region deployment", "24/7 dedicated support"],
        "future": ["AI-powered optimization", "Custom integrations"]
    })
    
    draft_payload = {
        "type": "marketing",
        "content": modified_content,
        "changelog": "Added Enterprise tier and modified hero content for diff testing"
    }
    
    response = requests.post(f"{base_url}/api/public-content", json=draft_payload, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to create draft: {response.status_code}")
        return False
    
    draft_data = response.json()
    draft_version_id = draft_data['version']['id']
    print(f"✅ Draft created: {draft_data['version']['version']}")
    print(f"   ID: {draft_version_id}")
    
    # Step 4: Update the draft (simulate visual editor changes)
    print("\n4. Updating draft (simulating visual editor)...")
    
    # Further modify the content
    modified_content['hero']['title'] = "🎯 UPDATED TITLE - Visual Editor Changes"
    modified_content['cta'] = {
        "title": "Ready to transform your operations?",
        "subtitle": "Join the next generation of hospitality technology"
    }
    
    update_payload = {
        "content": modified_content,
        "changelog": "Updated via visual editor - changed title and CTA"
    }
    
    response = requests.patch(f"{base_url}/api/public-content/{draft_version_id}", json=update_payload, headers=headers)
    
    if response.status_code == 200:
        updated_data = response.json()
        print(f"✅ Draft updated: {updated_data['version']['version']}")
        print(f"   Updated at: {updated_data['version']['updated_at']}")
    else:
        print(f"❌ Failed to update draft: {response.status_code}")
        return False
    
    # Step 5: Test preview of updated draft
    print("\n5. Testing preview of updated draft...")
    
    response = requests.get(f"{base_url}/api/public-content/preview/{draft_version_id}", headers=headers)
    
    if response.status_code == 200:
        preview_data = response.json()
        preview_title = preview_data.get('content', {}).get('hero', {}).get('title', '')
        
        if "UPDATED TITLE" in preview_title:
            print("✅ Preview shows updated content")
            print(f"   Title: {preview_title}")
        else:
            print("❌ Preview does not show updated content")
            return False
    else:
        print(f"❌ Failed to get preview: {response.status_code}")
        return False
    
    # Step 6: Test diff functionality (simulate what diff viewer would show)
    print("\n6. Testing diff functionality...")
    
    # Get all versions to compare
    response = requests.get(f"{base_url}/api/public-content/versions?type=marketing", headers=headers)
    
    if response.status_code == 200:
        versions_data = response.json()
        versions = versions_data.get('versions', [])
        
        approved_version = next((v for v in versions if v['status'] == 'APPROVED'), None)
        draft_version = next((v for v in versions if v['id'] == draft_version_id), None)
        
        if approved_version and draft_version:
            print("✅ Found approved and draft versions for comparison")
            print(f"   Approved: {approved_version['version']} ({approved_version['status']})")
            print(f"   Draft: {draft_version['version']} ({draft_version['status']})")
            
            # Compare key fields
            approved_title = approved_version.get('content', {}).get('hero', {}).get('title', '')
            draft_title = draft_version.get('content', {}).get('hero', {}).get('title', '')
            
            if approved_title != draft_title:
                print("✅ Diff detected in hero title:")
                print(f"     Approved: {approved_title}")
                print(f"     Draft: {draft_title}")
            
            # Check pricing differences
            approved_pricing = approved_version.get('content', {}).get('pricing', [])
            draft_pricing = draft_version.get('content', {}).get('pricing', [])
            
            if len(draft_pricing) > len(approved_pricing):
                print(f"✅ Diff detected in pricing: {len(draft_pricing)} vs {len(approved_pricing)} tiers")
        else:
            print("❌ Could not find versions for comparison")
    else:
        print(f"❌ Failed to get versions: {response.status_code}")
    
    # Step 7: Test approval workflow
    print("\n7. Testing approval workflow...")
    
    response = requests.post(f"{base_url}/api/public-content/{draft_version_id}/approve", headers=headers)
    
    if response.status_code == 200:
        approved_data = response.json()
        print(f"✅ Draft approved: {approved_data['version']['version']}")
        print(f"   Status: {approved_data['version']['status']}")
        print(f"   Approved at: {approved_data['version']['approved_at']}")
        print(f"   Approved by: {approved_data['version']['approved_by']}")
    else:
        print(f"❌ Failed to approve draft: {response.status_code}")
        return False
    
    # Step 8: Verify public page shows updated content
    print("\n8. Verifying public page shows updated content...")
    
    response = requests.get(f"{base_url}/api/public-content/current?type=marketing")
    
    if response.status_code == 200:
        new_current = response.json()
        new_title = new_current.get('content', {}).get('hero', {}).get('title', '')
        
        if "UPDATED TITLE" in new_title:
            print("✅ Public page now shows approved content")
            print(f"   New current version: {new_current.get('version')}")
        else:
            print("❌ Public page does not show updated content")
            return False
    else:
        print(f"❌ Failed to get updated current content: {response.status_code}")
        return False
    
    # Step 9: Test rollback functionality (approve an older version)
    print("\n9. Testing rollback functionality...")
    
    # Get versions again to find an archived version
    response = requests.get(f"{base_url}/api/public-content/versions?type=marketing", headers=headers)
    
    if response.status_code == 200:
        versions_data = response.json()
        versions = versions_data.get('versions', [])
        
        archived_version = next((v for v in versions if v['status'] == 'ARCHIVED'), None)
        
        if archived_version:
            print(f"   Found archived version: {archived_version['version']}")
            
            # Approve the archived version (rollback)
            response = requests.post(f"{base_url}/api/public-content/{archived_version['id']}/approve", headers=headers)
            
            if response.status_code == 200:
                rollback_data = response.json()
                print(f"✅ Rollback successful: {rollback_data['version']['version']}")
                print(f"   Status: {rollback_data['version']['status']}")
            else:
                print(f"❌ Rollback failed: {response.status_code}")
        else:
            print("⚠️  No archived version found for rollback test")
    
    # Step 10: Test modules with registry sync
    print("\n10. Testing modules with registry sync...")
    
    response = requests.post(f"{base_url}/api/public-content/sync-modules", headers=headers)
    
    if response.status_code == 200:
        sync_data = response.json()
        sync_version_id = sync_data['version']['id']
        print(f"✅ Modules synced from registry: {sync_data['version']['version']}")
        
        # Check if auto_sync_registry is enabled
        response = requests.get(f"{base_url}/api/public-content/preview/{sync_version_id}", headers=headers)
        
        if response.status_code == 200:
            sync_preview = response.json()
            auto_sync = sync_preview.get('content', {}).get('auto_sync_registry', False)
            
            if auto_sync:
                print("✅ Auto-sync registry is enabled in synced content")
            else:
                print("⚠️  Auto-sync registry not enabled")
            
            # Check if modules have registry fields
            modules = sync_preview.get('content', {}).get('modules', [])
            if modules and any('status' in module or 'enabled_by_default' in module for module in modules):
                print("✅ Modules contain registry fields (status, enabled_by_default)")
            else:
                print("⚠️  Modules do not contain registry fields")
        else:
            print(f"❌ Failed to preview synced modules: {response.status_code}")
    else:
        print(f"❌ Modules sync failed: {response.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ Complete workflow testing finished")
    return True

if __name__ == "__main__":
    success = test_complete_workflow()
    sys.exit(0 if success else 1)