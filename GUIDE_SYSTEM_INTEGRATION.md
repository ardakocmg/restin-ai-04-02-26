# Universal Guide System - Integration Guide

## Overview
The Universal Guide System provides a unified way to attach photos, steps, and measures to any entity (menu items, inventory items, recipes, etc.) across all apps (POS, KDS, Admin, Inventory).

## Components Created

### 1. Backend Models (`/app/backend/server.py`)
- `GuideDocument` - Main guide model
- `GuidePhoto` - Photo attachments with labels
- `GuideStep` - Step-by-step instructions
- `GuideMeasure` - Ingredient/portion measurements
- `Asset` - File upload management

### 2. Backend API Endpoints
- `POST /api/assets/upload` - Upload photos
- `GET /api/venues/{venue_id}/guides` - List all guides
- `GET /api/guides/{guide_id}` - Get specific guide
- `GET /api/guides/entity/{entity_type}/{entity_id}` - Get guide for entity
- `POST /api/guides` - Create guide
- `PUT /api/guides/{guide_id}` - Update guide
- `DELETE /api/guides/{guide_id}` - Delete guide

### 3. Frontend Service (`/app/frontend/src/services/GuideService.ts`)
- TypeScript service with full type definitions
- Methods for all CRUD operations
- Asset upload support

### 4. Frontend Component (`/app/frontend/src/components/GuideDrawer.tsx`)
- Universal drawer component
- 3 tabs: Photos, Steps, Measures
- Read-only and edit modes
- Works with any entity type

## Integration Examples

### Example 1: Add Guide Button to POS Menu Items

```jsx
// In POSMain.js or MenuItemCard component
import { useState } from 'react';
import GuideDrawer from '../../components/GuideDrawer';
import { BookOpen } from 'lucide-react';

function MenuItemCard({ item }) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <div className="menu-item-card">
        <h3>{item.name}</h3>
        <p>${item.price}</p>
        
        {/* Add Guide Button */}
        <button 
          onClick={() => setShowGuide(true)}
          className="guide-button"
        >
          <BookOpen size={16} />
          Guide
        </button>
      </div>

      {/* Guide Drawer */}
      <GuideDrawer
        open={showGuide}
        onClose={() => setShowGuide(false)}
        entityType="menu_item"
        entityId={item.id}
        entityName={item.name}
        guideKind="service"
        readOnly={true}
      />
    </>
  );
}
```

### Example 2: Add Guide to KDS Tickets

```jsx
// In KDSTicket component
import GuideDrawer from '../../components/GuideDrawer';

function KDSTicket({ ticket }) {
  const [showGuide, setShowGuide] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <>
      <div className="kds-ticket">
        {ticket.items.map(item => (
          <div key={item.id}>
            <span>{item.menu_item_name}</span>
            <button onClick={() => {
              setSelectedItem(item);
              setShowGuide(true);
            }}>
              📖 Guide
            </button>
          </div>
        ))}
      </div>

      {selectedItem && (
        <GuideDrawer
          open={showGuide}
          onClose={() => setShowGuide(false)}
          entityType="menu_item"
          entityId={selectedItem.menu_item_id}
          entityName={selectedItem.menu_item_name}
          guideKind="prep"
          readOnly={true}
        />
      )}
    </>
  );
}
```

### Example 3: Add Guide to Admin Menu Management

```jsx
// In MenuManagement.js
import GuideDrawer from '../../components/GuideDrawer';
import GuideEditor from '../../components/GuideEditor'; // To be created

function MenuItemRow({ item }) {
  const [showGuide, setShowGuide] = useState(false);
  const [editMode, setEditMode] = useState(false);

  return (
    <>
      <tr>
        <td>{item.name}</td>
        <td>${item.price}</td>
        <td>
          <button onClick={() => setShowGuide(true)}>
            View Guide
          </button>
        </td>
      </tr>

      <GuideDrawer
        open={showGuide && !editMode}
        onClose={() => setShowGuide(false)}
        entityType="menu_item"
        entityId={item.id}
        entityName={item.name}
        guideKind="service"
        onEdit={() => setEditMode(true)}
        readOnly={false}
      />
    </>
  );
}
```

### Example 4: Add Guide to Inventory Items

```jsx
// In InventoryManagement component
import GuideDrawer from '../../components/GuideDrawer';

function InventoryItemCard({ item }) {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <div className="inventory-card">
        <h3>{item.name}</h3>
        <p>Stock: {item.current_stock} {item.unit}</p>
        
        <button onClick={() => setShowGuide(true)}>
          📦 Storage Guide
        </button>
      </div>

      <GuideDrawer
        open={showGuide}
        onClose={() => setShowGuide(false)}
        entityType="inventory_item"
        entityId={item.id}
        entityName={item.name}
        guideKind="storage"
        readOnly={true}
      />
    </>
  );
}
```

## Quick Integration Checklist

### For POS/KDS (Read-Only)
1. Import `GuideDrawer` component
2. Add state: `const [showGuide, setShowGuide] = useState(false)`
3. Add button with icon (BookOpen, Info, etc.)
4. Add `<GuideDrawer>` with `readOnly={true}`

### For Admin (Edit Mode)
1. Import `GuideDrawer` component
2. Add state for drawer and edit mode
3. Add "View/Edit Guide" button
4. Add `<GuideDrawer>` with `onEdit` callback
5. Create `GuideEditor` component for editing (future)

## Entity Types Supported
- `menu_item` - Menu items (POS, KDS)
- `inventory_item` - Inventory items (Inventory, Receiving)
- `recipe` - Recipes (Kitchen, Prep)
- `receiving` - Receiving procedures (Receiving)
- `task_template` - Task templates (Operations)

## Guide Kinds
- `service` - Service/plating guides (POS, KDS)
- `prep` - Prep/cooking guides (Kitchen)
- `storage` - Storage guides (Inventory)
- `receiving` - Receiving guides (Receiving)
- `recipe` - Recipe guides (Kitchen)

## Next Steps (Nice-to-Haves)

### 1. GuideEditor Component
Create a full editor for creating/editing guides with:
- Photo upload with drag-and-drop
- Step builder with reordering
- Measure calculator
- Tag management

### 2. Quick Guide Access
Add floating action button or 3-dot menu to:
- POS menu items
- KDS ticket items
- Inventory item cards
- Admin menu rows

### 3. Guide Indicators
Show visual indicators when guides exist:
- Badge on menu items
- Icon on KDS tickets
- Color coding for completeness

### 4. Offline Support
- Cache guides locally
- Sync when online
- Offline photo upload queue

### 5. Guide Templates
- Pre-built templates for common items
- Copy guide from similar items
- Bulk guide creation

## Testing

### Test Guide Creation
```bash
# Create a test guide
curl -X POST http://localhost:8001/api/guides \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "venue_id": "venue-123",
    "entity_type": "menu_item",
    "entity_id": "item-456",
    "guide_kind": "service",
    "steps": [
      {
        "step_no": 1,
        "title": "Plate Setup",
        "description": "Place white plate on counter",
        "critical": false,
        "required_tools": ["white plate", "tongs"]
      }
    ],
    "tags": ["plating", "service"]
  }'
```

### Test Guide Retrieval
```bash
# Get guide for menu item
curl http://localhost:8001/api/guides/entity/menu_item/item-456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Collections
- `guide_documents` - Main guide storage
- `assets` - Photo/file storage metadata

## Performance Notes
- Guides are loaded on-demand (not with menu items)
- Photos are lazy-loaded
- Consider pagination for large guide lists
- Cache guides in frontend state/context

## Security
- All endpoints require authentication
- Venue access control enforced
- Audit logs for guide changes
- File upload size limits (configure in backend)
