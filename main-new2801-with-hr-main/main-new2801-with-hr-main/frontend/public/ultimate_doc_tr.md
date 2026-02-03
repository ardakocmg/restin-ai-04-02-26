RESTIN.AI Ultimate Paket Özelliklerine Uygun Teknik Dokümantasyon

Giriş

Ultimate platformunun Ultimate paketinde sunulan tüm özellikleri karşılayan ve bunları restin.ai mimarisiyle tam uyumlu şekilde uygulayan bir sistem tasarlanmıştır. Bu doküman, söz konusu sistemin teknik mimarisini ve bileşenlerini ayrıntılı olarak açıklamaktadır. Teknik tasarım, restin.ai’nin offline-first (çevrimdışı öncelikli çalışma), audit-first (denetim odaklı kayıt tutma), idempotent mutasyon (tekrarlı işlemlerde aynı sonuç) ve feature-flag tabanlı modülerlik ilkelerine dayanmaktadır.

Bu dokümanda, Envanter (Inventory), Satınalma & Tedarik (Procurement), AI Destekli Fatura İşleme (AI Invoice Processing), Talep Tahminleme (Demand Forecasting), Merkezi Üretim Yönetimi (Central Kitchen Production), Tedarikçi Analitiği (Supplier Analytics) ve Kurumsal API & Webhook entegrasyonları gibi Ultimate pakete dahil tüm fonksiyonlar ele alınmıştır. Her ana domain, kendi sınırları içinde çalışır ve “cross-write” olmadan (yani bir domain’in doğrudan diğerinin veritabanını değiştirmemesi) olay tabanlı entegrasyon ile birlikte çalışır. Doküman boyunca, gerekli domain olayları, read-model yapıları, API uç noktaları ve MongoDB koleksiyon şemaları örneklerle açıklanacaktır.

Mimari Tasarım ve Domain Entegrasyonu

Sistem, monolitik çekirdek yaklaşımıyla geliştirilmiş olsa da (tüm temel modüller tek bir deploy içinde) mimari olarak domain-driven prensipler izlenir. Her bir domain (örn. Envanter, Satınalma, Finans, POS, Menü/Tarif) kendi iş kurallarını uygular ve verisini kendi koleksiyonlarında tutar. Domain’ler arası iletişim, domain event’leri ve ortak okuma modelleri (read-models) üzerinden gerçekleştirilir. Bu sayede, örneğin POS domain’i envanteri doğrudan güncellemez; bunun yerine bir SatışTamamlandi olayı yayınlar ve Envanter domain’i bu olayı işleyerek stok düşümünü kendi içinde gerçekleştirir. Bu yaklaşım, her domain’in boundary kurallarına uymasını ve modüller arasında gevşek bağlı (loose coupling) entegrasyonu sağlar.

Çekirdek Prensipler:
• Çevrimdışı-Öncelikli (Offline-first): Sistem, internet bağlantısı olmasa da kritik işlemlerin devamlılığını sağlar. İstemci uygulama, işlemleri yerel kuyrukta tutar ve bağlantı geldiğinde sunucuya iletir.
• Denetim Odaklı (Audit-first) & Değişmez Kayıt: Tüm kritik işlemler immutable (değişmez) bir günlükte kaydedilir.
• İdempotent İşlemler: Tüm API uç noktaları ve arka uç işlemler idempotent olacak şekilde tasarlanmıştır.
• Feature-Flag Tabanlı Modülerlik: Modüller kodda mevcut olabilir fakat kapalı durumda feature flag’ler ile yönetilir.

Envanter ve Maliyet Kontrolü (Inventory & Cost Control)

Envanter domain’i, çok lokasyonlu stok takibi ve maliyet kontrolü fonksiyonlarını içerir. Gerçek zamanlı stok takibi, çoklu depo/şube desteği, barkod ile sayım, parti ve SKT takibi, reçete bazlı otomatik düşüm, atık (fire) takibi ve güçlü bir stok değerleme altyapısı mevcuttur.

Stok Takibi ve Lot Yönetimi

{
  "_id": "item_123",
  "name": "Mozerella Peyniri",
  "sku": "SKU-00123",
  "uom": "kg",
  "locations": {
    "Outlet_A": { "on_hand": 50, "reserved": 5 },
    "Central_Kitchen": { "on_hand": 200, "reserved": 0 }
  },
  "cost_method": "WAC",
  "current_cost": 120.50,
  "lot_tracking": true,
  "expiry_tracking": true
}

FIFO ve WAC yöntemleri desteklenir. FIFO’da katmanlar korunur, WAC’ta ortalama maliyet güncellenir.

Stok Defteri (Stock Ledger)

{
  "_id": "ledger_1001",
  "item_id": "item_123",
  "location": "Outlet_A",
  "event_type": "STOCK_OUT",
  "sub_type": "SALE",
  "quantity": -2,
  "unit_cost": 26.56,
  "total_cost": 53.12,
  "ref": { "order_id": "POS_555", "recipe_id": "recipe_987" },
  "timestamp": "2026-02-15T18:25:43.511Z",
  "prev_hash": "abcdef1234567890",
  "hash": "edcba09876543210"
}

Satınalma ve Tedarik Yönetimi (Procurement)

PO oluşturma, teslim alma (GRN) ve mutabakat desteklenir. Talep tahminine dayalı sipariş önerileri üretilir.

AI Destekli Fatura İşleme ve Mutabakat

OCR ile fatura verileri çıkarılır. PO karşılaştırması ile fiyat ve miktar varyansları hesaplanır.

Menü & Tarif Yönetimi (Menu/Recipes)

Tarif maliyetleri otomatik güncellenir. Menü mühendisliği metrikleri, kârlılık analizi ve versioning desteklenir.

Merkezi Üretim Yönetimi (Central Kitchen Production)

CPU iç siparişleri toplar, üretim batch’leri planlar ve dağıtımı ledger/event bazlı yönetir.

Finans ve Maliyet Muhasebesi (Finance & Cost Accounting)

COGS, IPV ve stok değerlemeleri immutable journal yapısında tutulur.

Talep Tahminleme Motoru (Demand Forecasting Engine)

AI motoru yalnızca öneri üretir; otomatik sipariş geçmez. Forecast read-model ile raporlama sağlanır.

API ve Harici Entegrasyonlar

REST API + Webhook entegrasyonları, HMAC imzası ve idempotent event ID’leri ile güvence altındadır.

MongoDB Koleksiyon Özeti
• InventoryItems, StockLedger, PurchaseOrder, Supplier, Invoice, Recipe, MenuItem, InternalOrder, ProductionBatch, Journal, Forecast

Sonuç

Bu mimari, offline-first, audit-first ve idempotent tasarımıyla Ultimate Ultimate kapsamını restin.ai içinde karşılar.
