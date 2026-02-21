# RESTIN.AI - Implementation Roadmap & Backlog

**Son Güncelleme:** 27 Ocak 2026  
**Mevcut Durum:** KDS/POS/Inventory Bulk Implementation + Emergent Dark Theme Completed

---

## 📊 Mevcut Durum Özeti

### ✅ Tamamlanan Major Features (Bu Session)

1. **Stock Count & Waste Management Sistemi**
   - Backend: Start count, submit lines, complete count, log waste
   - Frontend: StockCount.jsx, WasteLog.jsx tam fonksiyonel
   - Ledger integration çalışıyor (variance adjustments, negative entries)
   - Test coverage: 25/31 backend tests passed (80.6%)

2. **Token Authentication Bug Fix**
   - POSRuntime.jsx ve diğer tüm sayfalar `restin_token` kullanıyor
   - 401 Unauthorized hataları çözüldü
   - POS→KDS integration çalışıyor

3. **Emergent Dark + Red Premium Theme**
   - Global dark theme default olarak aktif
   - PIN ekranı tamamen yeniden tasarlandı
   - Brand red (#E53935) tüm sistemde consistent
   - Premium animasyonlar: shake, pulse-glow, shimmer, success-pulse
   - Button & card stilleri: gradient, shadow, hover effects

4. **State Screens & Okunurluk Düzeltmeleri**
   - StateModal component (reusable, PIN screen style)
   - Venue selection ekranı güncellendi
   - Text kontrast artırıldı (dark theme'de okunabilir)
   - Turuncu renkler → brand red
   - Toast notifications Emergent stilinde

### ⚠️ Bilinen Sorunlar (Minor)

- POS-KDS integration bazen gecikmeli çalışabiliyor (event timing)
- Stock count 0 variance için gereksiz ledger entry oluşturuyor (optimizasyon yapıldı ama test edilmeli)

---

## 🎯 Öncelikli Görevler (Priority Order)

### 🔴 P0 - CRITICAL (Hemen Yapılmalı) - ✅ TAMAMLANDI

#### 1. POS UI/UX Polish - Tablet-First Interface

**Neden kritik:** POS operasyonlar için temel kullanıcı deneyimi  
**Scope:**

- [x] POSRuntime.jsx responsive design (iPad split-view, 1024px+)
- [x] Modifier modal implementation (eklentiler, seçenekler)
- [x] Split/Merge/Transfer UI (görsel flow)
- [x] Touch-optimized buttons (min 44x44px)
- [x] Keyboard shortcuts (hız için)
- [x] Order item void/modification UI
- [x] Dark theme uyumluluğu
- [x] Loading states ve skeleton screens

**Tahmini Süre:** Tamamlandı  
**Bağımlılıklar:** Yok  
**Test:** Frontend testing subagent

---

#### 2. Reporting Dashboards - KDS, POS, Inventory

**Neden kritik:** Operasyonel insight ve decision making  
**Scope:**

- [x] KDS Performance Dashboard
- [x] POS Sales Dashboard
- [x] Inventory Dashboard

**Tahmini Süre:** Tamamlandı  
**Bağımlılıklar:** Backend reporting endpoints (zaten var)  
**Test:** Frontend testing + data validation

---

#### 3. Admin Dashboard - Dark Theme Refresh

**Neden kritik:** İlk giriş noktası, brand consistency  
**Scope:**

- [x] Dashboard kartları: card-dark style
- [x] Stat cards: brand red accent
- [x] Charts: dark theme colors
- [x] Empty states: StateModal style
- [x] Loading skeletons: brand red shimmer
- [x] Responsive layout check
- [x] Icon colors: white/red consistency

**Tahmini Süre:** Tamamlandı  
**Bağımlılıklar:** Yok  
**Test:** Screenshot review

---

### 🟡 P1 - HIGH (Önümüzdeki 1-2 Hafta)

#### 4. Inventory Frontend Completion

**Scope:**

- [ ] Recipe Management UI
  - Create/edit recipes
  - Component list with quantities
  - Cost calculation display
  - Yield management
- [ ] Production Management UI
  - Production batches
  - Batch tracking
  - Production history
- [ ] Stock Transfer UI (location to location)
- [ ] Inventory Adjustments UI (manual corrections)
- [ ] All pages dark theme compliant

**Tahmini Süre:** 2-3 gün  
**Bağımlılıklar:** Backend recipe/production endpoints (var)  
**Test:** Frontend testing subagent

---

#### 5. KDS Runtime - Dark Theme & UX Polish

**Scope:**

- [ ] KDSRuntime.jsx dark theme update
- [ ] Ticket cards: brand red for urgent
- [ ] Station view optimization (large screens)
- [ ] Bump animation improvements
- [ ] Sound notifications (optional)
- [ ] Auto-refresh optimization
- [ ] Empty state (no tickets)

**Tahmini Süre:** 1 gün  
**Bağımlılıklar:** Yok  
**Test:** KDS testing subagent

---

#### 6. Global Navigation & Sidebar - Dark Theme

**Scope:**

- [ ] NewSidebar.jsx: dark bg, red active states
- [ ] NewTopBar.jsx: dark theme update
- [ ] Logo update (white + red)
- [ ] Menu icons consistency
- [ ] Hover states (red glow)
- [ ] Breadcrumbs (if any)
- [ ] User dropdown menu styling

**Tahmini Süre:** 1 gün  
**Bağımlılıklar:** Yok  
**Test:** Visual review

---

#### 7. Empty States Standardization

**Scope:**

- [ ] Tüm empty list/table states
- [ ] StateModal component kullanımı
- [ ] Consistent iconography
- [ ] Action buttons (create new, refresh)
- [ ] Dark theme compliant
- [ ] Examples:
  - Empty inventory items
  - No active orders
  - No KDS tickets
  - No reports

**Tahmini Süre:** 1-2 gün  
**Bağımlılıklar:** StateModal (✅ done)  
**Test:** Manual review

---

#### 8. Print Job Implementation

**Neden önemli:** Operasyonel gereklilik (mutfak fişleri, hesaplar)  
**Scope:**

- [ ] Print job backend logic (zaten var mı?)
- [ ] Print preview modal (web view)
- [ ] Browser print API integration
- [ ] Print templates (kitchen ticket, receipt)
- [ ] Print queue management
- [ ] Printer device binding

**Tahmini Süre:** 2 gün  
**Bağımlılıklar:** Backend print service  
**Test:** Integration testing

---

### 🟢 P2 - MEDIUM (Önümüzdeki 2-4 Hafta)

#### 9. End-to-End Integration Testing

**Scope:**

- [ ] POS order → KDS ticket creation
- [ ] POS item add → Inventory depletion (recipe-based)
- [ ] Stock count complete → Inventory update
- [ ] Waste log → Inventory decrease
- [ ] Multi-venue data isolation test
- [ ] Concurrent user testing

**Tahmini Süre:** 2 gün  
**Bağımlılıklar:** Tüm core features complete  
**Test:** Testing subagent + manual scenarios

---

#### 10. Granular Permission Enforcement

**Neden önemli:** Security & role-based access  
**Scope:**

- [ ] Backend: Permission checks on all endpoints
  - INV_VIEW, INV_EDIT, PO_APPROVE, etc.
- [ ] Frontend: Conditional rendering by permissions
- [ ] Permission matrix documentation
- [ ] CRM_VIEW permission fix (test_result'dan)
- [ ] Role default permissions review

**Tahmini Süre:** 2-3 gün  
**Bağımlılıklar:** Backend permission system (var)  
**Test:** Permission matrix validation

---

#### 11. Responsive Design - Full Compliance

**Scope:**

- [ ] Mobile layout (320px - 768px)
- [ ] Tablet layout (768px - 1024px)
- [ ] Desktop layout (1024px+)
- [ ] POS: iPad split-view optimized
- [ ] KDS: Large screen (1920px+) optimized
- [ ] Admin: responsive grid layouts
- [ ] Touch targets (min 44x44px)

**Tahmini Süre:** 3-4 gün  
**Bağımlılıklar:** Yok  
**Test:** Device testing (physical or emulator)

---

#### 12. Offline Queue & Sync

**Neden önemli:** POS reliability  
**Scope:**

- [ ] IndexedDB integration
- [ ] Offline order queue
- [ ] Sync on reconnection
- [ ] Conflict resolution strategy
- [ ] Offline indicator UI
- [ ] Retry mechanism

**Tahmini Süre:** 3-4 gün  
**Bağımlılıklar:** Service Worker setup  
**Test:** Network throttling tests

---

#### 13. Bill Split by Item

**Scope:**

- [ ] Backend: Split order logic by items
- [ ] Frontend: Item selection UI for splits
- [ ] Payment allocation
- [ ] Separate receipts generation
- [ ] Split history tracking

**Tahmini Süre:** 2 gün  
**Bağımlılıklar:** POS payment flow  
**Test:** Integration testing

---

#### 14. Table Merge Functionality

**Scope:**

- [ ] Backend: Merge table logic
- [ ] Frontend: Table selection UI for merge
- [ ] Order consolidation
- [ ] Seat renumbering
- [ ] Audit log entry

**Tahmini Süre:** 1-2 gün  
**Bağımlılıklar:** Floor plan system  
**Test:** POS testing

---

### 🔵 P3 - LOW / NICE-TO-HAVE (Backlog)

#### 15. Menu Item Modifiers System

- [ ] Modifier groups (size, extras, cooking level)
- [ ] Nested modifiers
- [ ] Price adjustments
- [ ] UI: Modifier selection modal

#### 16. Receipt Generation & Templates

- [ ] Receipt template engine
- [ ] Customizable fields
- [ ] Logo upload
- [ ] Multi-language support

#### 17. Daily Closeout Reports

- [ ] Sales summary report
- [ ] Payment reconciliation
- [ ] Cash drawer close
- [ ] Z-report generation

#### 18. OCR Integration (Document Processing)

- [ ] Invoice OCR
- [ ] Menu scanning
- [ ] Receipt scanning
- [ ] Data extraction

#### 19. Allergen Tracking

- [ ] Allergen database
- [ ] Menu item allergen tags
- [ ] Customer allergen preferences
- [ ] Warning system

#### 20. Staff Scheduling

- [ ] Shift templates
- [ ] Schedule builder
- [ ] Conflict detection
- [ ] Staff notifications

#### 21. Advanced Analytics & AI

- [ ] Demand forecasting
- [ ] Inventory optimization
- [ ] Dynamic pricing suggestions
- [ ] Customer behavior analysis

#### 22. Payment Gateway Integration

- [ ] Stripe integration
- [ ] Apple Pay / Google Pay
- [ ] Split payment (multiple cards)
- [ ] Tip handling

---

## 🧪 Testing Strategy

### Testing Subagent Usage Guide

**Backend Testing:**

```
- Yeni API endpoint: curl test
- Major flow: deep_testing_backend_v2
- Integration: testing subagent after feature complete
```

**Frontend Testing:**

```
- UI changes: auto_frontend_testing_agent
- Multi-component: screenshot tool
- E2E flow: frontend testing subagent
```

### Test Coverage Targets

- Backend API: 85%+ (critical paths)
- Frontend: Visual regression + E2E
- Integration: All major flows

---

## 📁 Refactoring Needs

### Code Organization (Sonra Yapılacak)

1. **Backend Structure**
   - [ ] API routes: `/app/backend/routes/` cleanup
   - [ ] Models: `/app/backend/models/` consolidation
   - [ ] Services: `/app/backend/services/` organization
   - [ ] Tests: `/app/backend/tests/` per feature

2. **Frontend Structure**
   - [ ] Components: shared components library
   - [ ] Hooks: custom hooks extraction
   - [ ] Utils: helper functions centralization
   - [ ] Styles: global style cleanup

3. **File Cleanup**
   - [ ] Duplicate files removal (Login-old-backup.js, etc.)
   - [ ] Unused imports cleanup
   - [ ] Dead code removal

---

## 🎨 Design System Completion

### Emergent Theme - Remaining Work

1. **Components Needing Dark Theme**
   - [ ] Forms & Inputs (all input fields)
   - [ ] Modals & Dialogs
   - [ ] Dropdowns & Selects
   - [ ] Tables & Data grids
   - [ ] Pagination
   - [ ] Tabs
   - [ ] Accordions
   - [ ] Tooltips

2. **Color Consistency**
   - [ ] All orange → brand red conversion (check remaining files)
   - [ ] Chart colors (dark theme compatible)
   - [ ] Status indicators (green, yellow, red)

3. **Animation Polish**
   - [ ] Page transitions
   - [ ] Modal enter/exit
   - [ ] Loading states
   - [ ] Success feedback

---

## 🔐 Security & Performance

### Security Todos

- [ ] CSRF token implementation
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection prevention (N/A - MongoDB)
- [ ] XSS prevention audit
- [ ] Input validation strengthening
- [ ] Secret rotation strategy

### Performance Todos

- [ ] React.memo optimization
- [ ] Lazy loading routes
- [ ] Image optimization
- [ ] Bundle size analysis
- [ ] API response caching
- [ ] Database indexing review

---

## 📝 Documentation Needs

- [ ] API documentation (Swagger/OpenAPI)
- [ ] Component library (Storybook?)
- [ ] User guides (per role)
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Permission matrix document

---

## 🚀 Deployment Preparation

### Pre-Production Checklist

- [ ] Environment variables audit
- [ ] Database migration strategy
- [ ] Backup & restore procedures
- [ ] Monitoring setup (logs, metrics)
- [ ] Error tracking (Sentry?)
- [ ] CDN setup for assets
- [ ] SSL/TLS configuration
- [ ] Domain setup
- [ ] Load testing

---

## 💡 Önerilen Yaklaşım

### İlk 1 Hafta (Sprint 1)

1. **P0 Görevler 1-3:** POS UI Polish, Reporting Dashboards, Admin Dark Theme
2. **Test & Review:** Frontend testing subagent ile validation
3. **User Feedback:** Stakeholder demo

### 2. Hafta (Sprint 2)

1. **P1 Görevler 4-7:** Inventory completion, KDS polish, Navigation, Empty states
2. **Integration Testing:** E2E flow validation
3. **Bug Fixes:** Testing'den gelen issue'lar

### 3-4. Hafta (Sprint 3-4)

1. **P1 Görevler 8+:** Print, Permissions, Responsive
2. **P2 Görevler:** Integration testing, Offline, Bill split
3. **Polish:** Animation, UX refinement

### Ongoing

- **P3 Backlog:** Feature request priority'ye göre
- **Refactoring:** Code quality improvement
- **Documentation:** Incremental updates

---

## 📞 Stakeholder Communication

### Demo Hazırlığı

**Hangi özellikleri gösterelim:**

1. ✅ PIN login (dark theme)
2. ✅ Stock Count flow (start → count → complete)
3. ✅ Waste logging
4. ✅ POS basic flow (order → add items → pay)
5. ⏳ KDS ticket workflow (gösterebiliriz ama polish'e ihtiyacı var)
6. ⏳ Inventory lists (basic)

**Eksiklikler (açıkça söylenecek):**

- Modifier system yok (P3)
- Print preview dummy
- Reports data görselleştirmesi minimal
- Bazı admin pages light theme'de

---

## 🎯 Success Metrics

### Teknik Metrikler

- Test coverage: 80%+ backend, 70%+ frontend
- Page load time: <2s
- API response time: <500ms (p95)
- Crash rate: <1%
- Dark theme coverage: 95%+ pages

### Kullanıcı Metrikleri

- PIN login success rate: 98%+
- POS order completion time: <30s avg
- KDS ticket bump time: <5s avg
- User satisfaction: 4.5/5+ (survey)

---

**Son Not:** Bu roadmap dinamik bir dokümandır. Her sprint sonunda güncellenmeli, priority'ler yeniden değerlendirilmelidir.
