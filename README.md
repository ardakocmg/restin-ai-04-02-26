# restin.ai - Enterprise Hospitality Operating System

A production-grade, multi-venue restaurant management system featuring POS, KDS, Inventory, and Review Risk Control.

## Quick Start

### Test Credentials
All venues use the same PINs:
- **Owner**: 1234
- **Manager**: 2345
- **Staff**: 1111

### Venues (Marvin Gauci Group)
1. **Caviar & Bull** - Fine Dining
2. **Don Royale** - Steakhouse
3. **Sole by Tarragon** - Mediterranean

## Features

### Stage 1 (Core)
- ✅ Multi-venue support with venue scoping
- ✅ PIN-based authentication with MFA for owners/managers
- ✅ POS with seat-based ordering, course pacing
- ✅ KDS with real-time ticket management
- ✅ Inventory with immutable ledger
- ✅ Review Risk Control (0-100 scoring)
- ✅ Audit logs with hash chaining

### Stage 2 (Current)
- ✅ Real Marvin Gauci Group venues
- ✅ Realistic menus with allergens
- ✅ Enhanced floor setup (zones/tables)
- ✅ Menu management with categories
- ✅ Venue-scoped menu items

## How to Manage Venues & Menus

### 1. Accessing Admin Panel
1. Go to the login page
2. Select a venue from the dropdown
3. Enter owner PIN (1234) or manager PIN (2345)
4. Click ENTER

### 2. Managing Venues
Navigate to **Admin > Venues**:
- **General Tab**: Edit venue name, type, timezone, course pacing settings
- **Zones Tab**: Add/manage dining areas, kitchens, bars
- **Tables Tab**: Add/configure tables with seat counts

### 3. Managing Menus
Navigate to **Admin > Menu**:

#### Categories
- Click "Add Category" to create new categories (Starters, Mains, etc.)
- Set prep area (Kitchen/Bar) for routing to correct KDS
- Use sort order to control display order

#### Menu Items
1. Select a category from the sidebar
2. Click "Add Item" to create new items
3. Fill in:
   - **Name**: Item name
   - **Price**: Price in EUR (use 0 for "Market Price")
   - **Description**: Brief description
   - **Prep Time**: Estimated preparation time
   - **Prep Area**: Kitchen or Bar (for KDS routing)
   - **Allergens**: Select applicable allergens
   - **Active**: Toggle to show/hide on POS

#### Allergen Options
- Gluten, Dairy, Eggs, Fish, Shellfish, Nuts, Soy, Sesame

### 4. Using POS
1. Login and select "POS" target
2. Complete setup wizard (select venue & zone)
3. Select a table to start an order
4. Choose seat number and course (if pacing enabled)
5. Tap menu items to add to order
6. Click "Send to Kitchen" to fire tickets

### 5. Using KDS
1. Login and select "KDS" target
2. Complete setup wizard (select venue & prep area)
3. Tickets appear automatically when orders are sent
4. Tap "Start" to begin preparation
5. Tap "Done" when ready

## API Reference

### Venue Endpoints
```
GET  /api/venues                    - List all venues
GET  /api/venues/{id}               - Get venue details
PUT  /api/venues/{id}               - Update venue
GET  /api/venues/{id}/zones         - List zones
GET  /api/venues/{id}/tables        - List tables
```

### Menu Endpoints
```
GET  /api/venues/{id}/menus         - List menus
GET  /api/venues/{id}/menus/active  - Get active menu
GET  /api/venues/{id}/menu/categories - List categories
GET  /api/venues/{id}/menu/items    - List items
POST /api/menu/items                - Create item
PUT  /api/menu/items/{id}           - Update item
DELETE /api/menu/items/{id}         - Delete item (soft delete)
```

### Order Endpoints
```
POST /api/orders                    - Create order
POST /api/orders/{id}/items         - Add item
POST /api/orders/{id}/send          - Send to kitchen
POST /api/orders/{id}/close         - Close order
```

## Adding a New Venue

### Via Admin UI
1. This requires database seeding (menus, zones, tables)
2. Contact system administrator

### Via Seed Script
1. Edit `/app/backend/seed_data.py`
2. Add venue to the `venues` array
3. Add zones, tables, menu, categories, and items
4. Run: `python seed_data.py`

## Technical Stack
- **Backend**: FastAPI (Python) + MongoDB
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT + PIN + TOTP MFA

## Timezone
All venues configured for **Europe/Malta** timezone.
