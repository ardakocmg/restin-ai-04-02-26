# 🍽️ RESTIN.AI - Enterprise Restaurant Operating System

## 🚀 Quick Start

### Active Application (Legacy React - Port 3000)

```bash
cd frontend
npm install
npm start
```

**URL:** `http://localhost:3000`

### Backend API (FastAPI - Port 8000)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**API Docs:** `http://localhost:8000/docs`

---

## 📁 Project Structure

### ✅ **Active: Legacy React App** (`frontend/`)

**The main application - actively maintained and developed.**

**Features:**

- 🖥️ POS System
- 👨‍🍳 Kitchen Display (KDS)
- 👥 HR & Payroll Management
- 📦 Inventory & Procurement
- 📊 Reports & Analytics
- ✨ **AI Hub (7 Features):**
  - 📞 Voice AI (24/7 Receptionist)
  - 🎨 Studio (Content Generation)
  - 🌐 Web Builder
  - 🔬 Radar (Market Intelligence)
  - 🤖 CRM (Customer Retention)
  - 💳 Fintech (Payment Solutions)
  - 👥 Ops Hub (Workforce Management)

**Routes:**

- Login: `/login`
- Admin: `/admin/*`
- AI Hub: `/admin/ai/*`
- POS: `/pos/*`
- KDS: `/kds/*`

---

### 🗄️ **Archived: Next.js App** (`apps/web/`)

**No longer actively used - kept for reference only.**

This was the experimental Next.js version where AI features were initially developed. All features have been **migrated to the Legacy React app**.

**Status:** ❌ Not running, not maintained
**Purpose:** Code reference and backup

---

## 🎯 Development Workflow

**1. Start Backend:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**2. Start Frontend:**

```bash
cd frontend
npm start
```

**3. Access:**

- App: `http://localhost:3000`
- API: `http://localhost:8000`

---

## ✨ AI Features (All in Legacy React)

All 7 AI features are accessible at `/admin/ai/*`:

| Feature | Route | Description |
|---------|-------|-------------|
| Voice AI | `/admin/ai/voice` | AI Receptionist (RAG-powered) |
| Studio | `/admin/ai/studio` | Content Generation |
| Web Builder | `/admin/ai/web-builder` | Drag & Drop Website |
| Radar | `/admin/ai/radar` | Market Intelligence |
| CRM | `/admin/ai/crm` | Customer Retention AI |
| Fintech | `/admin/ai/fintech` | Payment & Kiosk |
| Ops Hub | `/admin/ai/ops` | Workforce Management |

---

## 🧪 Test Credentials

**PIN Login:**

- Owner: `1234`
- Manager: `2345`
- Staff: `1111`

---

## 🏗️ Tech Stack

**Frontend (Legacy React):**

- React 18
- React Router
- Tailwind CSS
- Shadcn UI
- React Query
- Zustand

**Backend:**

- FastAPI
- MongoDB + Prisma
- Google Vertex AI (Gemini)

---

## 📝 Notes

- **Primary App:** Use `frontend/` for all development
- **AI Features:** Located in `frontend/src/pages/admin/ai/`
- **Next.js Code:** In `apps/web/` - reference only, do not modify
