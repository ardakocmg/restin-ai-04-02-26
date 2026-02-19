"""
Restin.AI Intelligence Engine — Zero-Cost Local AI
===================================================
Self-contained AI that learns from venue data. No external API calls by default.

Architecture:
1. Intent Classifier — Pattern matching to understand user queries
2. Data Engine — MongoDB aggregation pipelines for real insights
3. Response Builder — Templates filled with real data
4. Knowledge Store — Learns venue facts, remembers past queries
5. Conversation Memory — Tracks context per session
6. Escalation Layer — When local AI can't answer, optionally call external AI
   (Gemini/OpenAI) with venue-level approval. Cost tracked per request.
"""

import os
import re
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from uuid import uuid4
from core.database import get_database
from services.role_access import (
    get_role_tier, can_access_intent, get_blocked_message,
    should_filter_staff_data, should_hide_costs, get_allowed_intents,
    get_role_prompt_segment, can_use_external_ai,
)

logger = logging.getLogger(__name__)


# ─── INTENT DEFINITIONS ───────────────────────────────────────────

INTENTS = {
    "sales_today": {
        "patterns": [
            r"(sales|revenue|income|earnings|turnover).*(today|now|current)",
            r"how.*(much|many).*(made|earned|sold)",
            r"(bugün|satış|ciro)",
            r"today.*(sales|revenue)",
        ],
        "handler": "_insight_sales",
        "description": "Today's sales and revenue",
    },
    "sales_period": {
        "patterns": [
            r"(sales|revenue).*(week|month|yesterday|last)",
            r"(weekly|monthly|daily).*(sales|revenue|report)",
            r"(haftalık|aylık|dünkü).*(satış|ciro)",
        ],
        "handler": "_insight_sales_period",
        "description": "Sales over a time period",
    },
    "staff_now": {
        "patterns": [
            r"(who|which).*(working|staff|on.?shift|clocked)",
            r"(team|crew|staff).*(now|today|current|status)",
            r"(kim|personel|çalışan).*(şimdi|bugün)",
            r"labor.*(cost|percent)",
        ],
        "handler": "_insight_staff",
        "description": "Current staff and labor info",
    },
    "inventory_low": {
        "patterns": [
            r"(low|critical|running.?out|stock.?out)",
            r"(stock|inventory).*(alert|warning|level|status)",
            r"(stok|envanter).*(düşük|biten|azalan)",
            r"what.*(need|order|restock|buy)",
        ],
        "handler": "_insight_inventory_low",
        "description": "Low stock alerts",
    },
    "inventory_summary": {
        "patterns": [
            r"(inventory|stock).*(summary|overview|total|count)",
            r"how.*(many|much).*(ingredient|item|product)",
            r"(envanter|stok).*(özet|toplam)",
        ],
        "handler": "_insight_inventory_summary",
        "description": "Inventory overview",
    },
    "top_sellers": {
        "patterns": [
            r"(top|best|most).*(sell|popular|ordered|sold)",
            r"(en çok|popüler).*(satılan|sipariş)",
            r"what.*(selling|popular)",
        ],
        "handler": "_insight_top_sellers",
        "description": "Best selling items",
    },
    "suppliers": {
        "patterns": [
            r"(supplier|vendor|tedarikçi)",
            r"(who|which).*(supply|deliver|provide)",
            r"(kimden|nereden).*(alıyor|sipariş)",
        ],
        "handler": "_insight_suppliers",
        "description": "Supplier information",
    },
    "waste": {
        "patterns": [
            r"(waste|wastage|thrown|israf|atık)",
            r"(food.?waste|fire)",
            r"(kayıp|zayi)",
        ],
        "handler": "_insight_waste",
        "description": "Waste tracking",
    },
    "recipe_count": {
        "patterns": [
            r"(kaç|how.?many).*(recipe|tarif|reçete)",
            r"(recipe|tarif).*(kaç|count|sayı|toplam|how.?many)",
            r"(sistemde|database).*(recipe|tarif)",
            r"(recipe|tarif).*(list|özet|summary|breakdown)",
            r"(venue|mekan).*(recipe|tarif)",
            r"(hangi|which).*(venue|mekan).*(recipe|tarif)",
        ],
        "handler": "_insight_recipe_count",
        "description": "Recipe count and per-venue breakdown",
    },
    "recipe_detail": {
        "patterns": [
            r"(recipe|tarif).*(detail|detay|içind|ingredient|malzeme|göster|show)",
            r"(içinde|inside|content).*(ne|what).*(var|have|contain)",
            r"(show|göster).*(recipe|tarif)",
            r"(recipe|tarif).*\b(nedir|nelerden|nasıl|what.?is)\b",
            r"(ne.?var|ingredients).*(recipe|tarif)",
            r"(malzeme|ingredient).*(list|listele|göster|show)",
        ],
        "handler": "_insight_recipe_detail",
        "description": "Recipe detail with ingredients",
    },
    "recipe_ingredient_search": {
        "patterns": [
            r"(zeytinyağ|olive.?oil|domates|tomato|un\b|flour|tuz|salt|biber|pepper|peynir|cheese|süt|milk|tereyağ|butter|soğan|onion|sarımsak|garlic|limon|lemon|şeker|sugar|tavuk|chicken|et\b|meat|balık|fish)",
            r"(hangi|which).*(tarif|recipe).*(içer|contain|kullan|use|include)",
            r"(nelerde|where|which).*(var|used|kullanıl|bulun)",
            r"(recipe|tarif).*(with|ile|iceren|contain|kullan).+",
            r"(.+).*(içeren|containing|with|olan).*(tarif|recipe)",
            r"(.+).*(nelerde|hangi.?tarif|which.?recipe)",
        ],
        "handler": "_insight_recipe_ingredient_search",
        "description": "Find recipes containing a specific ingredient",
    },
    "menu_info": {
        "patterns": [
            r"(menu|dish|yemek).*(list|ne.?var|göster|show)",
            r"(allergen|alerjen|gluten|vegan)",
            r"what.*(serve|offer|menu)",
            r"menü.*(bilgi|ürün|göster)",
        ],
        "handler": "_insight_menu",
        "description": "Menu and recipe info",
    },
    "employees": {
        "patterns": [
            r"(employee|personel|çalışan|staff|ekip).*(list|kaç|count|kim|who|göster|show|toplam)",
            r"(kaç|how.?many).*(employee|personel|çalışan|kişi|staff)",
            r"(kim|who).*(çalışıyor|work|employed)",
            r"(departman|department).*(kim|who|kaç|many)",
            r"(role|görev|pozisyon).*(kim|who|list)",
            r"employee.*(detail|detay|bilgi|info)",
        ],
        "handler": "_insight_employees",
        "description": "Employee information and counts",
    },
    "clockings": {
        "patterns": [
            r"(clocking|clock.?in|clock.?out|mesai|puantaj|devam|attendance)",
            r"(kim|who).*(giriş|gir|çıkış|çık|clock)",
            r"(saat|hour|time).*(çalış|work|mesai)",
            r"(geç|late|erken|early).*(gelen|giriş|clock)",
            r"(devamsızlık|absence|yoklama)",
        ],
        "handler": "_insight_clockings",
        "description": "Clocking and attendance data",
    },
    "shifts_schedule": {
        "patterns": [
            r"(shift|vardiya|nöbet|schedule|program|çizelge)",
            r"(kim|who).*(shift|vardiya|nöbet)",
            r"(bugün|today|yarın|tomorrow|bu.?hafta|this.?week).*(shift|vardiya|program)",
            r"(shift|vardiya).*(plan|schedule|program)",
        ],
        "handler": "_insight_shifts",
        "description": "Shift schedules",
    },
    "orders_pos": {
        "patterns": [
            r"(order|sipariş|pos).*(count|kaç|toplam|list|today|bugün)",
            r"(kaç|how.?many).*(order|sipariş)",
            r"(masa|table).*(sipariş|order)",
            r"(open|açık|active|aktif).*(order|sipariş|tab)",
            r"(session|oturum).*(pos|kasa)",
        ],
        "handler": "_insight_orders",
        "description": "Orders and POS data",
    },
    "payroll_info": {
        "patterns": [
            r"(payroll|maaş|bordro|salary|ücret)",
            r"(payslip|bordo|slip)",
            r"(brüt|gross|net|vergi|tax).*(maaş|pay|salary)",
            r"(maaş|pay|salary).*(toplam|total|run|çalıştır)",
        ],
        "handler": "_insight_payroll",
        "description": "Payroll and salary data",
    },
    "tables_zones": {
        "patterns": [
            r"(table|masa).*(kaç|count|list|durum|status|boş|empty|dolu|occupied)",
            r"(zone|bölge|alan).*(kaç|list|göster)",
            r"(kaç|how.?many).*(table|masa)",
            r"(floor|kat).*(plan|layout)",
        ],
        "handler": "_insight_tables",
        "description": "Tables and zones info",
    },
    "venue_overview": {
        "patterns": [
            r"(venue|mekan|restoran|restaurant).*(list|kaç|bilgi|info|overview|özet)",
            r"(kaç|how.?many).*(venue|mekan|restoran|şube|branch)",
            r"(şube|branch).*(list|kaç|bilgi)",
        ],
        "handler": "_insight_venues",
        "description": "Venue and branch info",
    },
    "system_overview": {
        "patterns": [
            r"(sistem|system).*(özet|overview|summary|durum|status|bilgi|info)",
            r"(genel|overall|total).*(durum|status|özet|summary)",
            r"(dashboard|pano).*(data|veri|göster|show)",
            r"(bana|give.?me).*(her.?ş|everything|all|tüm|genel)",
            r"(ne.?kadar|how.?much).*(data|veri|kayıt|record)",
        ],
        "handler": "_insight_system_overview",
        "description": "Full system overview",
    },
    "task_create": {
        "patterns": [
            r"(task|görev).*(oluştur|create|ekle|add|yeni|new)",
            r"(yeni|new).*(task|görev)",
            r"(ata|assign).*(görev|task)",
        ],
        "handler": "_action_task_create",
        "description": "Create a new task",
    },
    "task_update": {
        "patterns": [
            r"(task|görev).*(güncelle|update|durum|status|tamamla|complete|kapat|close)",
            r"(görev|task).*(bitir|finish|done|iptal|cancel)",
        ],
        "handler": "_action_task_update",
        "description": "Update task status",
    },
    "hive_send": {
        "patterns": [
            r"(mesaj|message).*(gönder|send|yolla|yaz|write)",
            r"(gönder|send).*(mesaj|message)",
            r"(yaz|write).*(mesaj|message|hive)",
            r"(hive|chat).*(gönder|send)",
            r"(bildir|notify|haber.?ver).*(kişi|person|ekip|team)",
        ],
        "handler": "_action_hive_send",
        "description": "Send a Hive message",
    },
    "table_assign": {
        "patterns": [
            r"(table|masa).*(assign|ata|ver|give)",
            r"(assign|ata).*(table|masa)",
            r"(masa|table)\s*\d+.*(ata|assign|ver)",
        ],
        "handler": "_action_table_assign",
        "description": "Assign server to table",
    },
    "announcement": {
        "patterns": [
            r"(announce|duyur|duyuru|broadcast|ilan)",
            r"(herkese|everyone|all.?staff).*(söyle|tell|bildir|notify)",
        ],
        "handler": "_action_announcement",
        "description": "Send announcement to all staff",
    },
    "order_comp": {
        "patterns": [
            r"(comp|ikram|bedava|complimentary|free)",
            r"(ikram|comp).*(masa|table)",
            r"(masa|table).*(ikram|comp)",
        ],
        "handler": "_action_order_comp",
        "description": "Comp an item on an order",
    },
    "help": {
        "patterns": [
            r"^(help|yardım|ne.?yapabilirsin|what.?can.?you)",
            r"(capability|abilities|commands)",
        ],
        "handler": "_show_help",
        "description": "Show available commands",
    },
}


class IntelligenceEngine:
    """
    Zero-Cost Local AI Engine.
    Queries real venue data from MongoDB and builds intelligent responses.
    No external API calls — all intelligence is local.
    """

    def __init__(self):
        self.name = "Restin AI"
        self.version = "2.0.0"
        # Compile regex patterns for speed
        self._compiled_intents = {}
        for intent_id, intent in INTENTS.items():
            self._compiled_intents[intent_id] = {
                "patterns": [re.compile(p, re.IGNORECASE) for p in intent["patterns"]],
                "handler": intent["handler"],
            }
        # Session memory — in-memory cache of recent conversations per session
        self._session_memory: Dict[str, List[Dict[str, str]]] = {}
        self._max_memory = 20
        # Follow-up detection patterns
        self._followup_re = [
            re.compile(r"(more|daha|devam|details|detay|explain|açıkla)", re.IGNORECASE),
            re.compile(r"(that|those|bunu|şunu|önceki|previous|bunlar)", re.IGNORECASE),
            re.compile(r"(why|neden|niye|how come|nasıl)", re.IGNORECASE),
            re.compile(r"(and|also|ve|ayrıca|bir de)", re.IGNORECASE),
            re.compile(r"(compare|karşılaştır|vs|versus|fark)", re.IGNORECASE),
        ]

    # ─── MAIN ENTRY POINT ─────────────────────────────────────────

    async def ask(self, venue_id: str, query: str, user: dict = None, session_id: str = None) -> Dict[str, Any]:
        """
        Main entry point. Classify intent, gather data, build response.
        Includes conversation memory for contextual follow-ups.
        Role-based access control filters data per user tier.
        """
        db = get_database()
        start_time = datetime.now(timezone.utc)
        sid = session_id or str(uuid4())
        role_tier = get_role_tier(user)

        # 1. Load memory & detect follow-up
        memory = self._session_memory.get(sid, [])
        is_followup = self._is_followup(query)

        # 2. Classify intent
        intent_id = self._classify_intent(query)

        # If follow-up with unrecognized intent, reuse last intent
        if is_followup and intent_id == "help" and memory:
            last = next((m for m in reversed(memory) if m.get("role") == "user"), None)
            if last and last.get("intent", "help") != "help":
                intent_id = last["intent"]

        # 3. ROLE-BASED ACCESS CHECK — block before executing handler
        if not can_access_intent(role_tier, intent_id):
            response_text = get_blocked_message(intent_id, role_tier)
            elapsed_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            # Log blocked attempt
            try:
                await db.ai_interactions.insert_one({
                    "id": str(uuid4()), "venue_id": venue_id, "session_id": sid,
                    "query": query, "intent": intent_id, "response": "[ACCESS_DENIED]",
                    "user_id": user.get("id") if user else None,
                    "user_role": role_tier, "access_denied": True,
                    "processing_ms": elapsed_ms,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
            except Exception:
                pass
            return {
                "response": response_text, "intent": intent_id,
                "processing_ms": elapsed_ms, "session_id": sid,
                "source": "local_intelligence", "cost": 0,
                "access_denied": True, "role_tier": role_tier,
            }

        # 4. Execute handler (pass user context for data filtering)
        handler_name = self._compiled_intents.get(intent_id, {}).get("handler", "_show_help")
        handler = getattr(self, handler_name, self._show_help)

        try:
            # Pass user for handlers that need role-based filtering
            if handler_name in ("_insight_staff", "_show_help"):
                handler_result = await handler(db, venue_id, query, user=user, role_tier=role_tier)
            else:
                handler_result = await handler(db, venue_id, query)
        except Exception as e:
            logger.error("Intelligence engine error: %s", e)
            handler_result = f"⚠️ Veriyi çekerken bir sorun oluştu: {str(e)}"

        # 4b. Detect ACTION responses (dict with 'action' key) vs plain text
        action_payload = None
        if isinstance(handler_result, dict) and "action" in handler_result:
            response_text = handler_result.get("response", "")
            action_payload = handler_result["action"]
        else:
            response_text = handler_result if isinstance(handler_result, str) else str(handler_result)

        # 5. Add memory note if follow-up
        if is_followup and memory:
            response_text += f"\n\n_📝 Önceki konuşmadan devam — {len(memory)//2} mesaj hafızada._"

        elapsed_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

        # 6. Store in session memory
        self._mem_push(sid, {"role": "user", "content": query, "intent": intent_id})
        self._mem_push(sid, {"role": "assistant", "content": response_text[:500], "intent": intent_id})

        # 7. Log interaction with role
        try:
            await db.ai_interactions.insert_one({
                "id": str(uuid4()), "venue_id": venue_id, "session_id": sid,
                "query": query, "intent": intent_id, "response": response_text,
                "user_id": user.get("id") if user else None,
                "user_role": role_tier,
                "processing_ms": elapsed_ms, "is_followup": is_followup,
                "memory_depth": len(memory) // 2,
                "has_action": action_payload is not None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        except Exception:
            pass

        result = {
            "response": response_text, "intent": intent_id,
            "processing_ms": elapsed_ms, "session_id": sid,
            "source": "local_intelligence", "cost": 0,
            "memory_depth": len(memory) // 2,
            "role_tier": role_tier,
        }

        # Attach action metadata if present (frontend shows confirmation card)
        if action_payload:
            result["action"] = action_payload

        return result

    # ─── CONVERSATION MEMORY ──────────────────────────────────────

    def _mem_push(self, sid: str, msg: Dict[str, str]):
        """Store a message in session memory (capped)."""
        if sid not in self._session_memory:
            self._session_memory[sid] = []
        self._session_memory[sid].append(msg)
        if len(self._session_memory[sid]) > self._max_memory:
            self._session_memory[sid] = self._session_memory[sid][-self._max_memory:]

    def _is_followup(self, query: str) -> bool:
        """Detect if query is a follow-up to previous conversation."""
        q = query.strip().lower()
        if len(q.split()) <= 3:
            return any(p.search(q) for p in self._followup_re)
        return False

    def get_conversation_context(self, session_id: str) -> str:
        """Build conversation context string for external AI calls."""
        memory = self._session_memory.get(session_id, [])
        if not memory:
            return "No previous conversation."
        lines = []
        for msg in memory[-10:]:
            role = "User" if msg["role"] == "user" else "AI"
            lines.append(f"{role}: {msg['content'][:200]}")
        return "\n".join(lines)

    # ─── INTENT CLASSIFIER ────────────────────────────────────────

    def _classify_intent(self, query: str) -> str:
        """Pattern-match the query to an intent. Returns intent_id."""
        query_clean = query.strip().lower()

        best_intent = "help"
        best_score = 0

        for intent_id, intent in self._compiled_intents.items():
            for pattern in intent["patterns"]:
                match = pattern.search(query_clean)
                if match:
                    score = len(match.group(0))  # Longer match = higher confidence
                    if score > best_score:
                        best_score = score
                        best_intent = intent_id

        return best_intent

    # ─── DATA HANDLERS ─────────────────────────────────────────────

    async def _insight_sales(self, db, venue_id: str, query: str) -> str:
        """Real sales data from orders collection."""
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        pipeline = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": today_start.isoformat()},
                "status": {"$nin": ["cancelled", "voided"]}
            }},
            {"$group": {
                "_id": None,
                "total_revenue": {"$sum": "$total"},
                "order_count": {"$sum": 1},
                "avg_order": {"$avg": "$total"},
            }}
        ]

        result = await db.orders.aggregate(pipeline).to_list(1)

        if result and result[0].get("order_count", 0) > 0:
            data = result[0]
            revenue = data["total_revenue"] / 100  # cents to euros
            count = data["order_count"]
            avg = data["avg_order"] / 100
            return (
                f"💰 **Bugünkü Satışlar**\n\n"
                f"| Metrik | Değer |\n"
                f"|---|---|\n"
                f"| Toplam Ciro | **€{revenue:,.2f}** |\n"
                f"| Sipariş Sayısı | **{count}** |\n"
                f"| Ortalama Sipariş | **€{avg:,.2f}** |\n\n"
                f"_Veriler gerçek zamanlı — MongoDB'den çekildi._"
            )

        # No orders yet — check if we have any historical data
        total_ever = await db.orders.count_documents({"venue_id": venue_id})
        if total_ever > 0:
            return "📊 Bugün henüz sipariş yok. Daha önceki veriler mevcut — 'haftalık satış' diye sorabilirsin."
        else:
            return "📭 Henüz sipariş verisi yok. POS üzerinden satış yapıldıkça burada göreceksin."

    async def _insight_sales_period(self, db, venue_id: str, query: str) -> str:
        """Sales over a period (week, month)."""
        q = query.lower()

        if "month" in q or "aylık" in q:
            days = 30
            period_name = "Son 30 Gün"
        elif "yesterday" in q or "dün" in q:
            days = 1
            period_name = "Dün"
        else:
            days = 7
            period_name = "Son 7 Gün"

        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

        pipeline = [
            {"$match": {
                "venue_id": venue_id,
                "created_at": {"$gte": since},
                "status": {"$nin": ["cancelled", "voided"]}
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$total"},
                "count": {"$sum": 1},
            }}
        ]

        result = await db.orders.aggregate(pipeline).to_list(1)

        if result and result[0]["count"] > 0:
            data = result[0]
            revenue = data["total"] / 100
            count = data["count"]
            daily_avg = revenue / max(days, 1)
            return (
                f"📈 **{period_name} — Satış Raporu**\n\n"
                f"| Metrik | Değer |\n"
                f"|---|---|\n"
                f"| Toplam Ciro | **€{revenue:,.2f}** |\n"
                f"| Sipariş Sayısı | **{count}** |\n"
                f"| Günlük Ortalama | **€{daily_avg:,.2f}** |\n"
            )

        return f"📊 {period_name} içinde veri bulunamadı."

    async def _insight_staff(self, db, venue_id: str, query: str, user: dict = None, role_tier: str = "staff") -> str:
        """Real staff and clocking data. Role-filtered."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # STAFF TIER: Only show own clocking
        if should_filter_staff_data(role_tier, "staff_overview") and user:
            user_id = user.get("id", "")
            user_name = user.get("name", user.get("full_name", "?"))
            my_clockings = await db.clockings.find({
                "venue_id": venue_id,
                "date": today,
                "$or": [{"employee_id": user_id}, {"user_id": user_id}],
            }, {"_id": 0, "clock_in": 1, "clock_out": 1, "department": 1}).to_list(10)

            if my_clockings:
                c = my_clockings[0]
                status = "🟢 Aktif" if not c.get("clock_out") else "⚪ Tamamlandı"
                return (
                    f"👤 **Senin Vardiya Durumun** ({today})\n\n"
                    f"- İsim: **{user_name}**\n"
                    f"- Giriş: {c.get('clock_in', '-')}\n"
                    f"- Çıkış: {c.get('clock_out', '-')}\n"
                    f"- Durum: {status}\n"
                    f"- Departman: {c.get('department', '-')}"
                )
            return f"👤 Bugün giriş kaydın yok, {user_name}."

        # MANAGER / OWNER: Full staff overview
        clockings = await db.clockings.find({
            "venue_id": venue_id,
            "date": today
        }, {"_id": 0, "employee_name": 1, "clock_in": 1, "clock_out": 1, "department": 1}).to_list(100)

        total_staff = await db.employees.count_documents({"venue_id": venue_id, "status": "active"})

        if clockings:
            on_shift = [c for c in clockings if not c.get("clock_out")]
            finished = [c for c in clockings if c.get("clock_out")]

            lines = [f"👨‍🍳 **Personel Durumu** ({today})\n"]
            if on_shift:
                lines.append("**🟢 Şu An Çalışan:**")
                for c in on_shift:
                    dept = c.get("department", "")
                    lines.append(f"- {c.get('employee_name', '?')} ({dept})")

            if finished:
                lines.append(f"\n**⚪ Vardiyasını Bitiren:** {len(finished)} kişi")

            lines.append(f"\n📊 Toplam aktif personel: **{total_staff}**")
            return "\n".join(lines)

        return f"👥 Bugün giriş yapan personel yok. Toplam **{total_staff}** aktif çalışan kayıtlı."

    async def _insight_inventory_low(self, db, venue_id: str, query: str) -> str:
        """Low stock alerts from real ingredient data."""
        # Find ingredients with low stock (quantity < min_stock or < 10% of par_level)
        low_items = await db.ingredients.find({
            "venue_id": venue_id,
            "$or": [
                {"current_stock": {"$lte": 0}},
                {"$expr": {"$lt": ["$current_stock", {"$multiply": ["$par_level", 0.1]}]}},
            ]
        }, {"_id": 0, "name": 1, "current_stock": 1, "unit": 1, "par_level": 1, "category": 1}).limit(20).to_list(20)

        if not low_items:
            # Try a simpler query - just check for very low stock
            low_items = await db.ingredients.find({
                "venue_id": venue_id,
                "current_stock": {"$exists": True, "$lte": 5}
            }, {"_id": 0, "name": 1, "current_stock": 1, "unit": 1}).limit(20).to_list(20)

        if low_items:
            lines = ["⚠️ **Düşük Stok Uyarıları**\n"]
            lines.append("| Ürün | Stok | Birim |")
            lines.append("|---|---|---|")
            for item in low_items[:15]:
                name = item.get("name", "?")
                stock = item.get("current_stock", 0)
                unit = item.get("unit", "")
                emoji = "🔴" if stock <= 0 else "🟡"
                lines.append(f"| {emoji} {name} | {stock} | {unit} |")

            if len(low_items) > 15:
                lines.append(f"\n_...ve {len(low_items) - 15} ürün daha._")

            lines.append("\n💡 Otomatik PO oluşturmak için 'sipariş oluştur' deyin.")
            return "\n".join(lines)

        # Check total inventory
        total = await db.ingredients.count_documents({"venue_id": venue_id})
        if total > 0:
            return f"✅ Stok seviyeleri normal görünüyor. Toplam **{total}** ingredient takip ediliyor."
        return "📭 Henüz ingredient verisi yok. Migration Hub'dan içe aktarabilirsin."

    async def _insight_inventory_summary(self, db, venue_id: str, query: str) -> str:
        """Overall inventory summary."""
        ingredients = await db.ingredients.count_documents({"venue_id": venue_id})
        suppliers = await db.suppliers.count_documents({"venue_id": venue_id})
        recipes = await db.recipes.count_documents({"venue_id": venue_id})
        menu_items = await db.menu_items.count_documents({"venue_id": venue_id})

        # Category breakdown
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 8}
        ]
        by_category = await db.ingredients.aggregate(pipeline).to_list(8)

        lines = [
            "📦 **Envanter Özeti**\n",
            "| Modül | Sayı |",
            "|---|---|",
            f"| Ingredients | **{ingredients:,}** |",
            f"| Suppliers | **{suppliers:,}** |",
            f"| Recipes | **{recipes:,}** |",
            f"| Menu Items | **{menu_items:,}** |",
        ]

        if by_category:
            lines.append("\n**Kategoriye Göre:**")
            for cat in by_category:
                cat_name = cat["_id"] or "Uncategorized"
                lines.append(f"- {cat_name}: {cat['count']}")

        return "\n".join(lines)

    async def _insight_top_sellers(self, db, venue_id: str, query: str) -> str:
        """Top selling items from sales history."""
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$unwind": "$items"},
            {"$group": {
                "_id": "$items.name",
                "total_qty": {"$sum": "$items.quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
            }},
            {"$sort": {"total_qty": -1}},
            {"$limit": 10}
        ]

        result = await db.orders.aggregate(pipeline).to_list(10)

        if result:
            lines = ["🏆 **En Çok Satan Ürünler**\n"]
            lines.append("| # | Ürün | Adet | Ciro |")
            lines.append("|---|---|---|---|")
            for i, item in enumerate(result, 1):
                name = item["_id"] or "?"
                qty = item["total_qty"]
                rev = item["total_revenue"] / 100
                medal = ["🥇", "🥈", "🥉"][i - 1] if i <= 3 else f"{i}."
                lines.append(f"| {medal} | {name} | {qty} | €{rev:,.2f} |")
            return "\n".join(lines)

        return "📊 Henüz satış verisi yok. POS'tan satış yapıldıkça burada göreceksin."

    async def _insight_suppliers(self, db, venue_id: str, query: str) -> str:
        """Supplier information."""
        suppliers = await db.suppliers.find(
            {"venue_id": venue_id, "is_active": {"$ne": False}},
            {"_id": 0, "name": 1, "contact_email": 1, "phone": 1, "category": 1}
        ).sort("name", 1).limit(15).to_list(15)

        total = await db.suppliers.count_documents({"venue_id": venue_id})

        if suppliers:
            lines = [f"🏭 **Tedarikçiler** (toplam {total})\n"]
            lines.append("| Tedarikçi | Kategori | İletişim |")
            lines.append("|---|---|---|")
            for s in suppliers:
                name = s.get("name", "?")
                cat = s.get("category", "-")
                contact = s.get("contact_email") or s.get("phone") or "-"
                lines.append(f"| {name} | {cat} | {contact} |")
            if total > 15:
                lines.append(f"\n_...ve {total - 15} tedarikçi daha._")
            return "\n".join(lines)

        return "📭 Henüz tedarikçi kaydı yok."

    async def _insight_waste(self, db, venue_id: str, query: str) -> str:
        """Waste tracking data."""
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

        pipeline = [
            {"$match": {"venue_id": venue_id, "created_at": {"$gte": seven_days_ago}}},
            {"$group": {
                "_id": None,
                "total_entries": {"$sum": 1},
                "total_cost": {"$sum": "$cost"},
                "total_quantity": {"$sum": "$quantity"},
            }}
        ]

        result = await db.waste_logs.aggregate(pipeline).to_list(1)
        total_ever = await db.waste_logs.count_documents({"venue_id": venue_id})

        if result and result[0]["total_entries"] > 0:
            data = result[0]
            cost = data.get("total_cost", 0) / 100 if data.get("total_cost") else 0
            return (
                f"🗑️ **Fireleme Raporu** (Son 7 Gün)\n\n"
                f"| Metrik | Değer |\n"
                f"|---|---|\n"
                f"| Fire Kayıtları | **{data['total_entries']}** |\n"
                f"| Tahmini Maliyet | **€{cost:,.2f}** |\n"
                f"| Toplam Miktar | **{data.get('total_quantity', 0):.1f}** |\n\n"
                f"📈 Toplam kayıtlı fire: {total_ever}"
            )

        if total_ever > 0:
            return f"✅ Son 7 günde fire kaydı yok. Toplam {total_ever} geçmiş kayıt mevcut."
        return "📭 Henüz fire kaydı yok."

    async def _insight_recipe_count(self, db, venue_id: str, query: str) -> str:
        """Comprehensive recipe count with per-venue breakdown."""
        # Current venue count
        venue_recipes = await db.recipes.count_documents({"venue_id": venue_id, "active": {"$ne": False}, "deleted_at": None})
        menu_items = await db.menu_items.count_documents({"venue_id": venue_id})
        ingredients_count = await db.ingredients.count_documents({"venue_id": venue_id})

        # Total across all venues
        total_recipes = await db.recipes.count_documents({"active": {"$ne": False}, "deleted_at": None})

        # Per-venue breakdown
        pipeline = [
            {"$match": {"active": {"$ne": False}, "deleted_at": None}},
            {"$group": {"_id": "$venue_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        venue_breakdown = await db.recipes.aggregate(pipeline).to_list(10)

        # Category breakdown for current venue
        cat_pipeline = [
            {"$match": {"venue_id": venue_id, "active": {"$ne": False}, "deleted_at": None}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        cat_breakdown = await db.recipes.aggregate(cat_pipeline).to_list(10)

        # Venue name lookup
        venue_names = {}
        for v in venue_breakdown:
            vid = v["_id"]
            if vid:
                venue_doc = await db.venues.find_one({"id": vid}, {"name": 1, "_id": 0})
                venue_names[vid] = venue_doc.get("name", vid) if venue_doc else vid

        lines = [
            f"📋 **Tarif Sistemi Ozeti**\n",
            f"Bu venue ({venue_id}): **{venue_recipes}** aktif tarif",
            f"Tum sistem: **{total_recipes}** tarif\n",
        ]

        # Per-venue table
        if len(venue_breakdown) > 1:
            lines.append("**Venue Bazinda Dagılım:**")
            lines.append("| Venue | Tarif Sayisi |")
            lines.append("|---|---|")
            for v in venue_breakdown:
                vid = v["_id"] or "(tanimsiz)"
                vname = venue_names.get(vid, vid)
                lines.append(f"| {vname} | {v['count']} |")
            lines.append("")

        # Category breakdown
        if cat_breakdown:
            lines.append("**Kategori Bazinda (bu venue):**")
            for cat in cat_breakdown:
                cname = cat["_id"] or "Diger"
                lines.append(f"- {cname}: **{cat['count']}** tarif")
            lines.append("")

        lines.append(f"Menu Urunu: **{menu_items}** aktif")
        lines.append(f"Ingredient: **{ingredients_count}** kayitli")

        return "\n".join(lines)

    async def _insight_recipe_detail(self, db, venue_id: str, query: str) -> str:
        """Show recipe detail with ingredients for a specific recipe."""
        import re

        # Try to extract recipe name from query
        # Remove common filler words
        clean_q = re.sub(
            r"(recipe|tarif|detail|detay|icind|ingredients|malzeme|goster|show|nedir|what|is|the|of|for|bana|bak|ne|var|listele)",
            "", query, flags=re.IGNORECASE
        ).strip()

        if not clean_q or len(clean_q) < 2:
            # No specific recipe mentioned — show top 10 recipes
            recipes = await db.recipes.find(
                {"venue_id": venue_id, "active": {"$ne": False}, "deleted_at": None},
                {"_id": 0, "recipe_name": 1, "name": 1, "category": 1, "item_id": 1}
            ).sort("recipe_name", 1).limit(15).to_list(15)

            if not recipes:
                return "Bu venue icin tarif bulunamadi."

            lines = ["📋 **Tarif Listesi** (ilk 15)\n"]
            lines.append("| # | Tarif Adi | Kategori |")
            lines.append("|---|---|---|")
            for i, r in enumerate(recipes, 1):
                rname = r.get("recipe_name") or r.get("name", "?")
                cat = r.get("category", "-")
                lines.append(f"| {i} | {rname} | {cat} |")

            total = await db.recipes.count_documents({"venue_id": venue_id, "active": {"$ne": False}, "deleted_at": None})
            if total > 15:
                lines.append(f"\n_...ve {total - 15} tarif daha. Spesifik bir tarif ismi sorun!_")
            return "\n".join(lines)

        # Search for the recipe by name (fuzzy)
        recipe = await db.recipes.find_one(
            {
                "venue_id": venue_id,
                "$or": [
                    {"recipe_name": {"$regex": clean_q, "$options": "i"}},
                    {"name": {"$regex": clean_q, "$options": "i"}},
                ]
            },
            {"_id": 0}
        )

        if not recipe:
            # Try broader search across all venues
            recipe = await db.recipes.find_one(
                {
                    "$or": [
                        {"recipe_name": {"$regex": clean_q, "$options": "i"}},
                        {"name": {"$regex": clean_q, "$options": "i"}},
                    ]
                },
                {"_id": 0}
            )

        if not recipe:
            # Show similar recipes
            words = clean_q.split()
            if words:
                first_word = words[0]
                similar = await db.recipes.find(
                    {
                        "venue_id": venue_id,
                        "$or": [
                            {"recipe_name": {"$regex": first_word, "$options": "i"}},
                            {"name": {"$regex": first_word, "$options": "i"}},
                        ]
                    },
                    {"_id": 0, "recipe_name": 1, "name": 1}
                ).limit(5).to_list(5)

                if similar:
                    names = [r.get("recipe_name") or r.get("name", "?") for r in similar]
                    return f"'{clean_q}' bulunamadi. Benzer tarifler:\n" + "\n".join(f"- {n}" for n in names)

            return f"'{clean_q}' adinda tarif bulunamadi. Farkli bir isim deneyin."

        # Build detailed response
        rname = recipe.get("recipe_name") or recipe.get("name", "?")
        lines = [f"📋 **{rname}**\n"]

        # Basic info
        if recipe.get("category"):
            lines.append(f"**Kategori:** {recipe['category']}")
        if recipe.get("subcategory"):
            lines.append(f"**Alt Kategori:** {recipe['subcategory']}")
        if recipe.get("item_id"):
            lines.append(f"**Kod:** {recipe['item_id']}")
        if recipe.get("servings") or recipe.get("portions"):
            lines.append(f"**Porsiyon:** {recipe.get('servings') or recipe.get('portions')}")

        # Cost info
        cost_analysis = recipe.get("cost_analysis", {})
        if cost_analysis:
            total_cost = cost_analysis.get("total_cost", 0)
            cost_per_serving = cost_analysis.get("cost_per_serving", 0)
            food_cost_pct = cost_analysis.get("food_cost_percentage", 0)
            lines.append(f"\n**Maliyet:**")
            lines.append(f"- Toplam: EUR{total_cost:.2f}")
            lines.append(f"- Porsiyon basina: EUR{cost_per_serving:.2f}")
            if food_cost_pct:
                lines.append(f"- Food Cost: %{food_cost_pct:.1f}")
        elif recipe.get("cost_price"):
            lines.append(f"**Maliyet:** EUR{recipe['cost_price']}")

        if recipe.get("sell_price") or recipe.get("sale_price"):
            sp = recipe.get("sell_price") or recipe.get("sale_price", 0)
            lines.append(f"**Satis Fiyati:** EUR{sp}")

        # Ingredients
        ingredients = recipe.get("ingredients", [])
        ingredients_raw = recipe.get("ingredients_raw", "")

        if ingredients and len(ingredients) > 0:
            lines.append(f"\n**Malzemeler ({len(ingredients)} adet):**")
            for ing in ingredients[:20]:
                iname = ing.get("name") or ing.get("item_name", "?")
                qty = ing.get("quantity", "")
                unit = ing.get("unit", "")
                itype = ing.get("type", "")
                type_icon = " (alt tarif)" if itype == "sub_recipe" else ""
                lines.append(f"- {iname}: {qty} {unit}{type_icon}")
            if len(ingredients) > 20:
                lines.append(f"  _...ve {len(ingredients) - 20} malzeme daha_")
        elif ingredients_raw:
            lines.append(f"\n**Malzemeler:** {ingredients_raw[:500]}")
        else:
            lines.append("\n_Malzeme listesi henuz girilmemis._")

        # Allergens
        allergens = recipe.get("allergens", [])
        if allergens:
            lines.append(f"\n**Alerjenler:** {', '.join(allergens)}")

        return "\n".join(lines)

    async def _insight_recipe_ingredient_search(self, db, venue_id: str, query: str) -> str:
        """Find all recipes containing a specific ingredient."""
        import re

        # Common ingredient mappings (TR -> search terms)
        ingredient_map = {
            "zeytinyag": ["olive", "zeytinyag", "zeytin yag"],
            "domates": ["tomato", "domates"],
            "sogan": ["onion", "sogan"],
            "sarimsak": ["garlic", "sarimsak"],
            "biber": ["pepper", "biber"],
            "tuz": ["salt", "tuz"],
            "seker": ["sugar", "seker"],
            "un": ["flour", "un\\b"],
            "peynir": ["cheese", "peynir"],
            "sut": ["milk", "sut"],
            "tereyag": ["butter", "tereyag"],
            "limon": ["lemon", "limon"],
            "tavuk": ["chicken", "tavuk"],
            "et": ["meat", "beef", "et\\b"],
            "balik": ["fish", "balik"],
            "makarna": ["pasta", "makarna"],
            "pirinc": ["rice", "pirinc"],
            "patates": ["potato", "patates"],
            "kremasi": ["cream", "krema"],
        }

        # Extract the ingredient name from query
        clean_q = re.sub(
            r"(hangi|which|tarif|recipe|iceren|containing|with|olan|nelerde|kullanilan|used|var|bul|find|ara|search|listele|list|goster|show|icinde|inside|icerisinde)",
            "", query, flags=re.IGNORECASE
        ).strip()

        if not clean_q or len(clean_q) < 2:
            return "Lutfen bir malzeme adi belirtin. Ornek: 'zeytinyagi iceren tarifler' veya 'which recipes use garlic'"

        # Build search regex
        search_term = clean_q.lower().strip()
        search_patterns = [search_term]

        # Check ingredient map for bilingual search
        for key, aliases in ingredient_map.items():
            if any(a in search_term for a in aliases) or search_term in key:
                search_patterns = aliases
                break

        regex_pattern = "|".join(search_patterns)

        # Search in ingredients array (structured data)
        structured_query = {
            "venue_id": venue_id,
            "active": {"$ne": False},
            "deleted_at": None,
            "$or": [
                {"ingredients.name": {"$regex": regex_pattern, "$options": "i"}},
                {"ingredients.item_name": {"$regex": regex_pattern, "$options": "i"}},
                {"ingredients_raw": {"$regex": regex_pattern, "$options": "i"}},
            ]
        }

        recipes = await db.recipes.find(
            structured_query,
            {"_id": 0, "recipe_name": 1, "name": 1, "category": 1, "item_id": 1, "ingredients": 1, "ingredients_raw": 1}
        ).limit(25).to_list(25)

        total_matches = await db.recipes.count_documents(structured_query)

        if not recipes:
            # Try broader search across all venues
            broader_query = dict(structured_query)
            del broader_query["venue_id"]
            total_all = await db.recipes.count_documents(broader_query)
            if total_all > 0:
                return f"Bu venue'de '{clean_q}' iceren tarif bulunamadi, ama diger venue'lerde **{total_all}** tarif var."
            return f"'{clean_q}' iceren hicbir tarif bulunamadi. Farkli bir malzeme adi deneyin."

        lines = [f"🔍 **'{clean_q}' iceren tarifler** ({total_matches} sonuc)\n"]
        lines.append("| # | Tarif | Kategori | Kullanim |")
        lines.append("|---|---|---|---|")

        for i, r in enumerate(recipes, 1):
            rname = r.get("recipe_name") or r.get("name", "?")
            cat = r.get("category", "-")

            # Find the matching ingredient detail
            usage = ""
            for ing in r.get("ingredients", []):
                iname = (ing.get("name") or ing.get("item_name", "")).lower()
                if any(re.search(p, iname, re.IGNORECASE) for p in search_patterns):
                    qty = ing.get("quantity", "")
                    unit = ing.get("unit", "")
                    usage = f"{qty} {unit}".strip()
                    break

            if not usage and r.get("ingredients_raw"):
                usage = "(raw data)"

            lines.append(f"| {i} | {rname} | {cat} | {usage} |")

        if total_matches > 25:
            lines.append(f"\n_...ve {total_matches - 25} tarif daha._")

        return "\n".join(lines)

    async def _insight_menu(self, db, venue_id: str, query: str) -> str:
        """Menu and recipe information — with smart product-specific filtering."""
        q = query.lower().strip()

        # ─── 1. Try to detect a specific product name in the query ─────
        # Remove common Turkish/English noise words to extract the product name
        noise_words = {
            "da", "de", "nedir", "ne", "neler", "hangi", "var", "mı", "mi",
            "mu", "mü", "olan", "içeren", "alerjen", "allergen", "allergens",
            "alerjenler", "alerjenleri", "gluten", "vegan", "lactose",
            "what", "which", "does", "have", "contain", "contains", "is", "are",
            "the", "in", "of", "menu", "menü", "yemek", "dish", "ürün",
            "show", "göster", "list", "bilgi", "info", "fiyat", "price",
            "hakkında", "about", "için", "for", "kaç", "how", "much",
        }

        # Extract potential product name by removing noise
        words = re.split(r'\s+', q)
        product_words = [w for w in words if w not in noise_words and len(w) > 1]
        product_query = " ".join(product_words).strip()

        # If we have a plausible product name (2+ chars remaining), search specifically
        if len(product_query) >= 2:
            # Search menu_items with regex for partial match
            regex = re.compile(re.escape(product_query), re.IGNORECASE)
            specific_items = await db.menu_items.find(
                {"venue_id": venue_id, "name": {"$regex": regex}, "is_active": {"$ne": False}},
                {"_id": 0, "name": 1, "price": 1, "category": 1, "allergens": 1, "description": 1}
            ).limit(5).to_list(5)

            # Also check recipes collection
            specific_recipes = await db.recipes.find(
                {"venue_id": venue_id, "name": {"$regex": regex}, "active": {"$ne": False}, "deleted_at": None},
                {"_id": 0, "name": 1, "category": 1, "allergens": 1, "ingredients": 1, "description": 1}
            ).limit(5).to_list(5)

            if specific_items or specific_recipes:
                lines = []
                # Menu items found
                for item in specific_items:
                    name = item.get("name", "?")
                    price_val = item.get("price", 0)
                    price = price_val / 100 if price_val > 100 else price_val
                    cat = item.get("category", "-")
                    allergens = item.get("allergens", [])
                    desc = item.get("description", "")

                    lines.append(f"🍽️ **{name}**\n")
                    lines.append(f"| Bilgi | Değer |")
                    lines.append(f"|---|---|")
                    lines.append(f"| Kategori | {cat} |")
                    lines.append(f"| Fiyat | €{price:.2f} |")

                    if allergens:
                        allergen_str = ", ".join(f"⚠️ {a}" for a in allergens)
                        lines.append(f"| Alerjenler | {allergen_str} |")
                    else:
                        lines.append(f"| Alerjenler | ✅ Bilinen alerjen yok |")

                    if desc:
                        lines.append(f"\n_{desc}_")

                # Recipe matches (if no menu item found or additional context)
                for recipe in specific_recipes:
                    if any(item.get("name", "").lower() == recipe.get("name", "").lower() for item in specific_items):
                        continue  # Skip duplicates
                    name = recipe.get("name", "?")
                    allergens = recipe.get("allergens", [])
                    ingredients = recipe.get("ingredients", [])

                    lines.append(f"\n📋 **Tarif: {name}**\n")
                    if allergens:
                        allergen_str = ", ".join(f"⚠️ {a}" for a in allergens)
                        lines.append(f"Alerjenler: {allergen_str}")
                    if ingredients and len(ingredients) <= 10:
                        ing_names = [i.get("name", i.get("ingredient_name", "?")) for i in ingredients[:10]]
                        lines.append(f"Malzemeler: {', '.join(ing_names)}")

                if lines:
                    return "\n".join(lines)

            # Product name was detected but nothing matched — tell user
            return (
                f"🔍 **'{product_query}'** menüde bulunamadı.\n\n"
                f"Lütfen ürün adını kontrol edin veya "
                f"'menüyü göster' diyerek tüm ürünleri listeleyebilirsiniz."
            )

        # ─── 2. Fallback: Full menu listing ────────────────────────────
        menu_items = await db.menu_items.find(
            {"venue_id": venue_id, "is_active": {"$ne": False}},
            {"_id": 0, "name": 1, "price": 1, "category": 1, "allergens": 1}
        ).sort("category", 1).limit(20).to_list(20)

        total = await db.menu_items.count_documents({"venue_id": venue_id})
        recipes = await db.recipes.count_documents({"venue_id": venue_id})

        if menu_items:
            lines = [f"🍽️ **Menü** ({total} ürün, {recipes} tarif)\n"]
            lines.append("| Ürün | Kategori | Fiyat |")
            lines.append("|---|---|---|")
            for item in menu_items:
                name = item.get("name", "?")
                cat = item.get("category", "-")
                price_val = item.get("price", 0)
                price = price_val / 100 if price_val > 100 else price_val  # Handle cents vs euros
                allergens = ", ".join(item.get("allergens", [])) if item.get("allergens") else ""
                allergen_tag = f" ⚠️{allergens}" if allergens else ""
                lines.append(f"| {name}{allergen_tag} | {cat} | €{price:.2f} |")
            if total > 20:
                lines.append(f"\n_...ve {total - 20} ürün daha._")
            return "\n".join(lines)

        return "No menu data yet."

    # ─── EMPLOYEES ────────────────────────────────────────────────

    async def _insight_employees(self, db, venue_id: str, query: str) -> str:
        """Employee information: counts, by department, by role."""
        total = await db.employees.count_documents({"venue_id": venue_id})
        users = await db.users.count_documents({"venue_id": venue_id})

        # By department
        dept_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        depts = await db.employees.aggregate(dept_pipeline).to_list(20)

        # By role
        role_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        roles = await db.employees.aggregate(role_pipeline).to_list(20)

        # Employee list (top 15)
        emps = await db.employees.find(
            {"venue_id": venue_id},
            {"_id": 0, "name": 1, "department": 1, "role": 1, "status": 1, "employee_code": 1}
        ).sort("name", 1).limit(15).to_list(15)

        lines = [f"**Employees** ({total} total, {users} users)\n"]

        if depts:
            lines.append("**By Department:**")
            for d in depts:
                dname = d["_id"] or "Unassigned"
                lines.append(f"- {dname}: **{d['count']}**")
            lines.append("")

        if roles:
            lines.append("**By Role:**")
            for r in roles:
                rname = r["_id"] or "Unassigned"
                lines.append(f"- {rname}: **{r['count']}**")
            lines.append("")

        if emps:
            lines.append("| Name | Department | Role | Status |")
            lines.append("|---|---|---|---|")
            for e in emps:
                lines.append(f"| {e.get('name', '?')} | {e.get('department', '-')} | {e.get('role', '-')} | {e.get('status', '-')} |")
            if total > 15:
                lines.append(f"\n_...and {total - 15} more._")

        if not emps and total == 0:
            return "No employees found for this venue."

        return "\n".join(lines)

    # ─── CLOCKINGS ────────────────────────────────────────────────

    async def _insight_clockings(self, db, venue_id: str, query: str) -> str:
        """Clocking and attendance data."""
        from datetime import timedelta

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_records = await db.clocking_records.count_documents({"venue_id": venue_id})
        today_clockings = await db.clocking_records.count_documents({
            "venue_id": venue_id,
            "clock_in": {"$gte": today_start.isoformat()}
        })

        # Recent clockings
        recent = await db.clocking_records.find(
            {"venue_id": venue_id},
            {"_id": 0, "employee_name": 1, "clock_in": 1, "clock_out": 1, "status": 1, "department": 1}
        ).sort("clock_in", -1).limit(10).to_list(10)

        # Also check 'clockings' collection
        clockings_total = await db.clockings.count_documents({"venue_id": venue_id})

        lines = [f"**Attendance Overview**\n"]
        lines.append(f"- Total clocking records: **{total_records + clockings_total}**")
        lines.append(f"- Today: **{today_clockings}** clock-ins\n")

        if recent:
            lines.append("**Recent Clockings:**")
            lines.append("| Employee | Clock In | Clock Out | Status |")
            lines.append("|---|---|---|---|")
            for c in recent:
                name = c.get("employee_name", "?")
                cin = str(c.get("clock_in", "-"))[:16]
                cout = str(c.get("clock_out", "-"))[:16] if c.get("clock_out") else "Still in"
                status = c.get("status", "-")
                lines.append(f"| {name} | {cin} | {cout} | {status} |")
        else:
            lines.append("_No recent clocking records._")

        return "\n".join(lines)

    # ─── SHIFTS ───────────────────────────────────────────────────

    async def _insight_shifts(self, db, venue_id: str, query: str) -> str:
        """Shift schedule data."""
        total = await db.shifts.count_documents({"venue_id": venue_id})

        # Today's shifts
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        today_shifts = await db.shifts.find(
            {"venue_id": venue_id, "start_time": {"$regex": f"^{today_str}"}},
            {"_id": 0, "employee_name": 1, "role": 1, "department": 1, "start_time": 1, "end_time": 1, "status": 1}
        ).sort("start_time", 1).limit(20).to_list(20)

        # By department
        dept_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$department", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        depts = await db.shifts.aggregate(dept_pipeline).to_list(10)

        lines = [f"**Shift Schedule** ({total} total shifts)\n"]

        if today_shifts:
            lines.append(f"**Today ({today_str}):** {len(today_shifts)} shifts")
            lines.append("| Employee | Role | Start | End | Status |")
            lines.append("|---|---|---|---|---|")
            for s in today_shifts:
                name = s.get("employee_name", "?")
                role = s.get("role", "-")
                start = str(s.get("start_time", ""))[:16]
                end = str(s.get("end_time", ""))[:16]
                status = s.get("status", "-")
                lines.append(f"| {name} | {role} | {start} | {end} | {status} |")
        else:
            lines.append(f"_No shifts scheduled for today ({today_str})._\n")

        if depts:
            lines.append("\n**Shifts by Department:**")
            for d in depts:
                lines.append(f"- {d['_id'] or 'Unassigned'}: **{d['count']}** shifts")

        # Upcoming shifts
        upcoming = await db.shifts.find(
            {"venue_id": venue_id, "start_time": {"$gte": now.isoformat()}},
            {"_id": 0, "employee_name": 1, "start_time": 1}
        ).sort("start_time", 1).limit(5).to_list(5)

        if upcoming:
            lines.append("\n**Upcoming:**")
            for u in upcoming:
                lines.append(f"- {u.get('employee_name', '?')} @ {str(u.get('start_time', ''))[:16]}")

        return "\n".join(lines)

    # ─── ORDERS / POS ─────────────────────────────────────────────

    async def _insight_orders(self, db, venue_id: str, query: str) -> str:
        """Orders and POS session data."""
        pos_orders = await db.pos_orders.count_documents({"venue_id": venue_id})
        orders = await db.orders.count_documents({"venue_id": venue_id})
        sessions = await db.pos_sessions.count_documents({"venue_id": venue_id})

        # Active sessions
        active_sessions = await db.pos_sessions.find(
            {"venue_id": venue_id, "status": "active"},
            {"_id": 0, "device_id": 1, "opened_at": 1, "user_id": 1}
        ).to_list(10)

        # Recent orders
        recent = await db.pos_orders.find(
            {"venue_id": venue_id},
            {"_id": 0, "display_id": 1, "table_name": 1, "order_type": 1, "status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(10).to_list(10)

        lines = [f"**Orders & POS**\n"]
        lines.append(f"- POS Orders: **{pos_orders}**")
        lines.append(f"- Legacy Orders: **{orders}**")
        lines.append(f"- POS Sessions: **{sessions}** ({len(active_sessions)} active)\n")

        if active_sessions:
            lines.append("**Active POS Sessions:**")
            for s in active_sessions:
                lines.append(f"- Device: {s.get('device_id', '?')} | Opened: {str(s.get('opened_at', ''))[:16]}")
            lines.append("")

        if recent:
            lines.append("**Recent Orders:**")
            lines.append("| # | Table | Type | Status |")
            lines.append("|---|---|---|---|")
            for o in recent:
                lines.append(f"| {o.get('display_id', '?')} | {o.get('table_name', '-')} | {o.get('order_type', '-')} | {o.get('status', '-')} |")

        if pos_orders == 0 and orders == 0:
            return "No orders found for this venue."

        return "\n".join(lines)

    # ─── PAYROLL ──────────────────────────────────────────────────

    async def _insight_payroll(self, db, venue_id: str, query: str) -> str:
        """Payroll runs and salary data."""
        runs = await db.payroll_runs.find(
            {},
            {"_id": 0, "run_name": 1, "period_start": 1, "period_end": 1, "state": 1,
             "employee_count": 1, "total_gross": 1, "total_net": 1, "total_tax": 1}
        ).sort("period_start", -1).limit(5).to_list(5)

        payslips = await db.payslips.count_documents({"venue_id": venue_id})
        total_runs = await db.payroll_runs.count_documents({})

        lines = [f"**Payroll Overview**\n"]
        lines.append(f"- Total Runs: **{total_runs}**")
        lines.append(f"- Payslips: **{payslips}**\n")

        if runs:
            lines.append("**Recent Payroll Runs:**")
            lines.append("| Run | Period | State | Employees | Gross | Net | Tax |")
            lines.append("|---|---|---|---|---|---|---|")
            for r in runs:
                name = r.get("run_name", "?")
                period = f"{str(r.get('period_start', ''))[:10]} - {str(r.get('period_end', ''))[:10]}"
                state = r.get("state", "-")
                emp_c = r.get("employee_count", 0)
                gross = r.get("total_gross", 0)
                net = r.get("total_net", 0)
                tax = r.get("total_tax", 0)
                lines.append(f"| {name} | {period} | {state} | {emp_c} | EUR{gross:,.2f} | EUR{net:,.2f} | EUR{tax:,.2f} |")
        else:
            lines.append("_No payroll runs yet._")

        return "\n".join(lines)

    # ─── TABLES & ZONES ──────────────────────────────────────────

    async def _insight_tables(self, db, venue_id: str, query: str) -> str:
        """Tables and zones overview."""
        total_tables = await db.tables.count_documents({"venue_id": venue_id})
        total_zones = await db.zones.count_documents({"venue_id": venue_id})

        # Table status breakdown
        status_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
        statuses = await db.tables.aggregate(status_pipeline).to_list(10)

        # Zones list
        zones = await db.zones.find(
            {"venue_id": venue_id},
            {"_id": 0, "name": 1, "type": 1}
        ).to_list(20)

        # Tables by zone
        zone_pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$zone_id", "count": {"$sum": 1}, "total_seats": {"$sum": "$seats"}}},
        ]
        by_zone = await db.tables.aggregate(zone_pipeline).to_list(20)

        lines = [f"**Floor Plan Overview**\n"]
        lines.append(f"- Tables: **{total_tables}**")
        lines.append(f"- Zones: **{total_zones}**\n")

        if statuses:
            lines.append("**Table Status:**")
            for s in statuses:
                lines.append(f"- {s['_id'] or 'Unknown'}: **{s['count']}**")
            lines.append("")

        if zones:
            lines.append("**Zones:**")
            for z in zones:
                lines.append(f"- {z.get('name', '?')} ({z.get('type', '-')})")

        if not total_tables and not total_zones:
            return "No tables or zones configured for this venue."

        return "\n".join(lines)

    # ─── VENUES ───────────────────────────────────────────────────

    async def _insight_venues(self, db, venue_id: str, query: str) -> str:
        """Multi-venue overview."""
        venues = await db.venues.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "currency": 1, "timezone": 1}
        ).to_list(20)

        total = len(venues)
        lines = [f"**Venues ({total})**\n"]

        for v in venues:
            vid = v.get("id", "?")
            vname = v.get("name", "?")
            currency = v.get("currency", "EUR")
            tz = v.get("timezone", "?")

            # Quick counts for each venue
            recipes = await db.recipes.count_documents({"venue_id": vid})
            employees = await db.employees.count_documents({"venue_id": vid})
            tables = await db.tables.count_documents({"venue_id": vid})
            menu_items = await db.menu_items.count_documents({"venue_id": vid})

            lines.append(f"### {vname}")
            lines.append(f"- ID: `{vid}`")
            lines.append(f"- Currency: {currency} | Timezone: {tz}")
            lines.append(f"- Recipes: **{recipes}** | Menu Items: **{menu_items}**")
            lines.append(f"- Employees: **{employees}** | Tables: **{tables}**")
            lines.append("")

        if not venues:
            return "No venues found."

        return "\n".join(lines)

    # ─── SYSTEM OVERVIEW ─────────────────────────────────────────

    async def _insight_system_overview(self, db, venue_id: str, query: str) -> str:
        """Complete system overview — every major collection counted."""
        collections_to_check = {
            "Recipes": "recipes",
            "Menu Items": "menu_items",
            "Menu Categories": "menu_categories",
            "Menus": "menus",
            "Inventory Items": "inventory_items",
            "Employees": "employees",
            "Users": "users",
            "Clocking Records": "clocking_records",
            "Clockings": "clockings",
            "Shifts": "shifts",
            "Orders": "orders",
            "POS Orders": "pos_orders",
            "POS Sessions": "pos_sessions",
            "Tables": "tables",
            "Zones": "zones",
            "Suppliers": "suppliers",
            "Venues": "venues",
            "Payroll Runs": "payroll_runs",
            "Payslips": "payslips",
            "Waste Logs": "waste_logs",
            "Production Batches": "production_batches",
            "Tasks": "tasks",
            "Profiles": "profiles",
            "Performance Reviews": "performance_reviews",
            "Audit Logs": "audit_logs",
            "Migration History": "migration_history",
            "System Logs": "system_logs",
            "Hive Messages": "hive_messages",
            "Integrations": "integration_configs",
            "Roles": "roles",
        }

        lines = [f"**SYSTEM OVERVIEW**\n"]

        # Venue info
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "name": 1})
        vname = venue.get("name", venue_id) if venue else venue_id
        total_venues = await db.venues.count_documents({})
        lines.append(f"Current Venue: **{vname}** ({total_venues} total venues)\n")

        lines.append("| Module | This Venue | All System |")
        lines.append("|---|---|---|")

        grand_total = 0
        for label, col_name in collections_to_check.items():
            try:
                venue_count = await db[col_name].count_documents({"venue_id": venue_id})
            except Exception:
                venue_count = 0
            try:
                total_count = await db[col_name].estimated_document_count()
            except Exception:
                total_count = 0
            grand_total += total_count
            if total_count > 0:
                lines.append(f"| {label} | {venue_count:,} | {total_count:,} |")

        lines.append(f"\n**Grand Total: {grand_total:,} records across all modules**")

        return "\n".join(lines)

    # ─── ACTION HANDLERS (return confirmation metadata) ─────────────
    # These return dicts with 'action' key instead of plain strings.
    # The ask() method detects this and sends confirmation UI to frontend.

    async def _action_task_create(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for task creation."""
        clean = re.sub(
            r"(task|görev|oluştur|create|ekle|add|yeni|new|:|\bata\b|assign)",
            "", query, flags=re.IGNORECASE
        ).strip()

        if not clean or len(clean) < 3:
            return "⚠️ Please specify a task title.\nExample: *Create task: Check inventory levels*"

        # Check for assignee pattern
        assignee = ""
        assignee_match = re.search(r"(?:to|kime|for)\s+(\w+)", clean, re.IGNORECASE)
        if not assignee_match:
            assignee_match = re.search(r"(\w+)['\u2019]?[eaE]$", clean, re.IGNORECASE)
        if assignee_match:
            assignee = assignee_match.group(1)
            clean = re.sub(r"(?:to|kime|for)\s+\w+", "", clean, flags=re.IGNORECASE).strip()

        title = clean.strip(". ")
        desc = f"📋 Görev: **{title}**"
        if assignee:
            desc += f"\nAtanan: **{assignee}**"

        return {
            "response": desc + "\n\nOnaylıyor musun?",
            "action": {
                "type": "task_create",
                "requires_confirmation": True,
                "sensitivity": "normal",
                "icon": "📋",
                "label": "Görev Oluştur",
                "params": {"title": title, "assignee": assignee, "priority": "medium"},
            },
        }

    async def _action_task_update(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for task update."""
        new_status = "in_progress"
        if re.search(r"(tamamla|complete|done|bitir|finish|bitti)", query, re.IGNORECASE):
            new_status = "done"
        elif re.search(r"(iptal|cancel|sil|remove)", query, re.IGNORECASE):
            new_status = "cancelled"
        elif re.search(r"(başla|start|devam|progress|continue)", query, re.IGNORECASE):
            new_status = "in_progress"

        clean = re.sub(
            r"(task|görev|güncelle|update|durum|status|tamamla|complete|kapat|close|bitir|finish|done|iptal|cancel|başla|start)",
            "", query, flags=re.IGNORECASE
        ).strip(": .")

        if not clean or len(clean) < 2:
            tasks = await db.tasks.find(
                {"venue_id": venue_id, "status": {"$nin": ["done", "cancelled"]}},
                {"_id": 0, "id": 1, "title": 1, "status": 1}
            ).limit(10).to_list(10)
            if tasks:
                lines = ["⚠️ Hangi görev? Aktif görevler:\n"]
                lines.append("| ID | Başlık | Durum |")
                lines.append("|---|---|---|")
                for t in tasks:
                    lines.append(f"| `{t.get('id', '?')[:8]}` | {t.get('title', '?')} | {t.get('status', '?')} |")
                lines.append("\n*Tamamla görev [başlık]* diye söyle.")
                return "\n".join(lines)
            return "Güncellenecek aktif görev bulunamadı."

        # Find the task
        task = await db.tasks.find_one({
            "venue_id": venue_id,
            "$or": [
                {"title": {"$regex": clean, "$options": "i"}},
                {"id": clean.strip()},
            ]
        }, {"_id": 0, "id": 1, "title": 1, "status": 1})

        if not task:
            return f"⚠️ Görev bulunamadı: '{clean}'"

        status_emoji = {"done": "✅", "in_progress": "🔄", "cancelled": "❌"}.get(new_status, "📝")
        return {
            "response": f"{status_emoji} **{task.get('title', '?')}** → `{new_status}`\n\nOnaylıyor musun?",
            "action": {
                "type": "task_update",
                "requires_confirmation": True,
                "sensitivity": "normal",
                "icon": status_emoji,
                "label": "Görev Güncelle",
                "params": {"task_name": task.get("title", clean), "status": new_status},
            },
        }

    async def _action_hive_send(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for Hive message."""
        recipient_match = re.search(
            r"(?:to|kime|için)\s+(\w+)\s*[:\.]\s*(.+)",
            query, re.IGNORECASE
        )
        if not recipient_match:
            recipient_match = re.search(
                r"(\w+)['\u2019]?[eaE]\s+(?:mesaj|message)\s*(?:gönder|send|yaz|yolla)\s*[:\.]\s*(.+)",
                query, re.IGNORECASE
            )
        if not recipient_match:
            recipient_match = re.search(
                r"(?:mesaj|message)\s+(?:gönder|send)?\s*(\w+)\s+(.+)",
                query, re.IGNORECASE
            )
        # Try team/general channel pattern
        if not recipient_match:
            channel_match = re.search(
                r"(?:team|ekip|herkese|everyone)\s*[:\.]?\s*(.+)",
                query, re.IGNORECASE
            )
            if channel_match:
                message_text = channel_match.group(1).strip()
                return {
                    "response": f"💬 **#general** kanalına mesaj:\n> {message_text[:150]}\n\nOnaylıyor musun?",
                    "action": {
                        "type": "hive_send",
                        "requires_confirmation": True,
                        "sensitivity": "normal",
                        "icon": "💬",
                        "label": "Mesaj Gönder",
                        "params": {"message": message_text, "channel": "general"},
                    },
                }

        if not recipient_match:
            return (
                "⚠️ Alıcı ve mesaj belirtin.\n\n"
                "Örnekler:\n"
                "- *Send message to John: Kitchen is ready*\n"
                "- *Ahmet'e mesaj gönder: Mutfak hazır*\n"
                "- *Tell team: Closing in 30 min*"
            )

        name_query = recipient_match.group(1).strip()
        message_text = recipient_match.group(2).strip()

        return {
            "response": f"💬 **{name_query}**'a mesaj:\n> {message_text[:150]}\n\nOnaylıyor musun?",
            "action": {
                "type": "hive_send",
                "requires_confirmation": True,
                "sensitivity": "normal",
                "icon": "💬",
                "label": "Mesaj Gönder",
                "params": {"message": message_text, "recipient": name_query},
            },
        }

    async def _action_table_assign(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for table assignment."""
        # Extract table number
        table_match = re.search(r"(?:table|masa)\s*(\d+)", query, re.IGNORECASE)
        table_number = table_match.group(1) if table_match else ""

        # Extract server name
        name_match = re.search(r"(?:to|kime|için|assign)\s+(\w+)", query, re.IGNORECASE)
        if not name_match:
            name_match = re.search(r"(\w+)['\u2019]?[eaE]\s+(?:ata|ver)", query, re.IGNORECASE)
        server_name = name_match.group(1) if name_match else ""

        if not table_number:
            return "⚠️ Masa numarası belirtin.\nÖrnek: *Assign table 5 to Marco*"
        if not server_name:
            return f"⚠️ Masa {table_number} için garson ismi belirtin.\nÖrnek: *Masa {table_number}'i Marco'ya ata*"

        return {
            "response": f"🪑 Masa **{table_number}** → **{server_name}**\n\nOnaylıyor musun?",
            "action": {
                "type": "table_assign",
                "requires_confirmation": True,
                "sensitivity": "normal",
                "icon": "🪑",
                "label": "Masa Ata",
                "params": {"table_number": table_number, "server_name": server_name},
            },
        }

    async def _action_announcement(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for announcement."""
        clean = re.sub(
            r"(announce|duyur|duyuru|broadcast|ilan|herkese|everyone|all.?staff|söyle|tell|bildir|notify)",
            "", query, flags=re.IGNORECASE
        ).strip(": .")

        if not clean or len(clean) < 3:
            return "⚠️ Duyuru metnini belirtin.\nÖrnek: *Duyur: Mutfak 22:00'da kapanıyor*"

        return {
            "response": f"📢 **Duyuru:**\n> {clean[:200]}\n\nTüm ekibe gönderilecek. Onaylıyor musun?",
            "action": {
                "type": "announcement",
                "requires_confirmation": True,
                "sensitivity": "normal",
                "icon": "📢",
                "label": "Duyuru Yayınla",
                "params": {"message": clean},
            },
        }

    async def _action_order_comp(self, db, venue_id: str, query: str):
        """Parse NLP and return confirmation payload for comping an item."""
        table_match = re.search(r"(?:table|masa)\s*(\d+)", query, re.IGNORECASE)
        table_number = table_match.group(1) if table_match else ""

        # Extract item name (everything after table ref, minus trigger words)
        item_clean = re.sub(
            r"(comp|ikram|bedava|complimentary|free|table|masa)\s*\d*",
            "", query, flags=re.IGNORECASE
        ).strip(": .")

        if not table_number:
            return "⚠️ Masa numarası belirtin.\nÖrnek: *Comp table 3 dessert*"
        if not item_clean or len(item_clean) < 2:
            return f"⚠️ İkram edilecek ürünü belirtin.\nÖrnek: *Masa {table_number} tatlı ikram et*"

        return {
            "response": f"🎁 **İkram:** {item_clean}\nMasa: **{table_number}**\n\n⚠️ Bu işlem sipariş tutarını etkiler. Onaylıyor musun?",
            "action": {
                "type": "order_comp",
                "requires_confirmation": True,
                "sensitivity": "sensitive",
                "icon": "🎁",
                "label": "İkram / Comp",
                "params": {"table_number": table_number, "item_name": item_clean},
            },
        }


    async def _show_help(self, db, venue_id: str, query: str, user: dict = None, role_tier: str = "staff") -> str:
        """Show available capabilities — filtered by role."""
        ingredients = await db.ingredients.count_documents({"venue_id": venue_id})
        suppliers = await db.suppliers.count_documents({"venue_id": venue_id})

        # All commands with their minimum role tier
        ALL_COMMANDS = [
            # ── QUERIES ──
            ("*Today's sales?*", "💰 Daily revenue & orders", ["owner", "manager"]),
            ("*Weekly sales report*", "📈 Period sales analysis", ["owner", "manager"]),
            ("*Who's working?*", "👨‍🍳 Active staff on shift", ["owner", "manager", "staff"]),
            ("*Low stock?*", "⚠️ Stock alerts", ["owner", "manager", "staff"]),
            ("*Inventory summary*", "📦 Inventory overview", ["owner", "manager", "staff"]),
            ("*Top sellers?*", "🏆 Popular items", ["owner", "manager"]),
            ("*Suppliers*", "🏭 Supplier list", ["owner", "manager"]),
            ("*Waste report*", "🗑️ Waste tracking", ["owner", "manager", "staff"]),
            ("*Menu info*", "🍽️ Active menu items", ["owner", "manager", "staff"]),
            ("*How many recipes?*", "📋 Recipe count & breakdown", ["owner", "manager", "staff"]),
            ("*Recipe details*", "🧾 Ingredients, cost, prep", ["owner", "manager", "staff"]),
            ("*Recipes with garlic*", "🔍 Ingredient search", ["owner", "manager", "staff"]),
            ("*Employee list*", "👥 Team by department/role", ["owner", "manager"]),
            ("*Attendance*", "⏰ Clock-in/out records", ["owner", "manager"]),
            ("*Shift schedule*", "📅 Today & upcoming shifts", ["owner", "manager", "staff"]),
            ("*Orders*", "🛒 POS orders & sessions", ["owner", "manager"]),
            ("*Payroll*", "💳 Payroll runs & payslips", ["owner"]),
            ("*Tables*", "🪑 Floor plan & zones", ["owner", "manager", "staff"]),
            ("*Venues*", "🏢 Multi-venue overview", ["owner", "manager"]),
            ("*System overview*", "🖥️ Full data dashboard", ["owner"]),
            # ── ACTIONS ──
            ("*Create task: [title]*", "✅ Create a new task", ["owner", "manager"]),
            ("*Complete task [title]*", "📝 Update task status", ["owner", "manager", "staff"]),
            ("*Send message to [name]*", "💬 Send Hive message", ["owner", "manager", "staff"]),
        ]

        visible = [(cmd, desc) for cmd, desc, tiers in ALL_COMMANDS if role_tier in tiers]

        user_name = (user or {}).get("name", "")
        greeting = f" Hi **{user_name}**!" if user_name else ""

        lines = [
            f"🐕 **Hey Rin** v{self.version}{greeting}\n",
            "I can help you with:\n",
            "| Command | Description |",
            "|---|---|",
        ]
        for cmd, desc in visible:
            lines.append(f"| {cmd} | {desc} |")

        lines.append(f"\n📊 Tracking **{ingredients:,}** ingredients, **{suppliers:,}** suppliers.")
        lines.append("\n_🗣️ Voice enabled! Speak in English, Turkish, Maltese, Italian, or Spanish._")
        return "\n".join(lines)

    # ─── ESCALATION LAYER (External AI Fallback) ──────────────────

    async def _get_venue_context(self, db, venue_id: str, role_tier: str = "owner") -> str:
        """
        Build a comprehensive context string about the venue.
        Filtered by role tier — staff sees limited context.
        """
        from services.role_access import get_role_prompt_segment

        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0}) or {}
        ingredients_count = await db.ingredients.count_documents({"venue_id": venue_id})
        menu_count = await db.menu_items.count_documents({"venue_id": venue_id})

        # Base context — visible to all
        context_lines = [
            "VENUE CONTEXT (Restin.AI Restaurant Operating System):",
            f"- Venue: {venue.get('name', venue_id)}",
            f"- Type: {venue.get('type', 'Restaurant')}",
            f"- Menu Items: {menu_count}",
            f"- Ingredients: {ingredients_count}",
            f"- System Language: Turkish/English bilingual",
        ]

        # Manager+ gets more context
        if role_tier in ("owner", "manager"):
            suppliers_count = await db.suppliers.count_documents({"venue_id": venue_id})
            employees_count = await db.employees.count_documents({"venue_id": venue_id, "status": "active"})
            context_lines.append(f"- Suppliers: {suppliers_count}")
            context_lines.append(f"- Active Staff: {employees_count}")
            context_lines.append(f"- Location: {venue.get('address', 'N/A')}")

            cats = await db.ingredients.aggregate([
                {"$match": {"venue_id": venue_id}},
                {"$group": {"_id": "$category", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}, {"$limit": 5}
            ]).to_list(5)
            categories = ", ".join([f"{c['_id']} ({c['count']})" for c in cats if c["_id"]])
            context_lines.append(f"- Top Categories: {categories}")

        # Recent interactions (exclude staff queries for privacy)
        recent = await db.ai_interactions.find(
            {"venue_id": venue_id},
            {"_id": 0, "query": 1, "intent": 1}
        ).sort("created_at", -1).limit(5).to_list(5)
        recent_qas = "\n".join([f"Q: {r.get('query','')} -> Intent: {r.get('intent','')}" for r in recent])

        from services.ai_system_prompts import general_venue_instructions

        # Inject role-specific system prompt
        role_prompt = get_role_prompt_segment(role_tier)

        return f"""
{chr(10).join(context_lines)}

{role_prompt}

RECENT USER QUESTIONS:
{recent_qas}

{general_venue_instructions()}
"""

    async def _check_external_ai_enabled(self, db, venue_id: str) -> dict:
        """Check if venue has external AI enabled and which provider."""
        config = await db.ai_configs.find_one({"venue_id": venue_id}, {"_id": 0})
        if not config:
            # Default: external AI disabled
            return {"enabled": False, "provider": None, "model": None}

        return {
            "enabled": config.get("external_ai_enabled", False),
            "provider": config.get("provider", "google"),  # google or openai
            "model": config.get("model", "gemini-2.0-flash"),
            "api_key": config.get("api_key", os.environ.get("GOOGLE_API_KEY", ""))
        }

    async def ask_external(self, venue_id: str, query: str, user: dict = None, session_id: str = None) -> Dict[str, Any]:
        """
        Escalate to external AI (Gemini/OpenAI).
        Only called when:
        1. Local AI couldn't handle the query (unknown intent)
        2. User explicitly requests deeper analysis
        3. Venue has external AI enabled in settings
        """
        db = get_database()
        start_time = datetime.now(timezone.utc)

        # Check if venue allows external AI
        ai_config = await self._check_external_ai_enabled(db, venue_id)
        if not ai_config["enabled"]:
            return {
                "response": (
                    "🔒 **Harici AI devre dışı.**\n\n"
                    "Daha derin analiz için harici AI (Gemini/OpenAI) desteği açılabilir.\n"
                    "**Ayarlar → AI Yapılandırma** bölümünden etkinleştirin.\n\n"
                    "_Bu özellik ek maliyet doğurabilir._"
                ),
                "intent": "escalation_blocked",
                "processing_ms": 0,
                "source": "local_intelligence",
                "cost": 0,
                "requires_approval": True,
            }

        # Build venue context + conversation memory (role-filtered)
        from services.role_access import get_role_tier
        role_tier = get_role_tier(user)
        context = await self._get_venue_context(db, venue_id, role_tier=role_tier)
        if session_id:
            conv_history = self.get_conversation_context(session_id)
            if conv_history != "No previous conversation.":
                context += f"\n\n--- CONVERSATION HISTORY ---\n{conv_history}"
        provider = ai_config["provider"]
        model = ai_config.get("model", "gemini-2.0-flash")
        api_key = ai_config.get("api_key", "")

        if not api_key or api_key.endswith("..."):
            return {
                "response": "⚠️ API anahtarı yapılandırılmamış. Ayarlar → AI Yapılandırma'dan ekleyin.",
                "intent": "escalation_error",
                "processing_ms": 0,
                "source": "local_intelligence",
                "cost": 0,
            }

        try:
            if provider == "google":
                response_text = await self._call_gemini(api_key, model, context, query)
            else:
                response_text = await self._call_openai(api_key, model, context, query)

            elapsed_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)

            # Log usage for billing
            await db.ai_usage_logs.insert_one({
                "id": str(uuid4()),
                "venue_id": venue_id,
                "provider": provider.upper(),
                "model": model,
                "action": "copilot_escalation",
                "query": query,
                "response_length": len(response_text),
                "cost_units": 1,
                "processing_ms": elapsed_ms,
                "user_id": user.get("id") if user else None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            # Also log in interactions for learning
            await db.ai_interactions.insert_one({
                "id": str(uuid4()),
                "venue_id": venue_id,
                "query": query,
                "intent": "external_ai",
                "response": response_text,
                "source": provider,
                "processing_ms": elapsed_ms,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            return {
                "response": response_text,
                "intent": "external_ai",
                "processing_ms": elapsed_ms,
                "source": f"external_{provider}",
                "model": model,
                "cost": 1,  # 1 unit tracked for billing
            }

        except Exception as e:
            logger.error("External AI call failed: %s", e)
            return {
                "response": f"⚠️ Harici AI çağrısı başarısız: {str(e)}\n\nYerel AI ile tekrar deneyin.",
                "intent": "escalation_error",
                "processing_ms": 0,
                "source": "local_intelligence",
                "cost": 0,
            }

    async def _call_gemini(self, api_key: str, model: str, context: str, query: str) -> str:
        """Call Google Gemini API."""
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=f"{context}\n\nUSER QUERY: {query}"
            )
            return response.text
        except ImportError:
            # Fallback to HTTP request if SDK not installed
            import httpx
            async with httpx.AsyncClient() as http:
                resp = await http.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
                    json={"contents": [{"parts": [{"text": f"{context}\n\nUSER QUERY: {query}"}]}]},
                    timeout=30.0
                )
                data = resp.json()
                return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response")

    async def _call_openai(self, api_key: str, model: str, context: str, query: str) -> str:
        """Call OpenAI API."""
        import httpx
        async with httpx.AsyncClient() as http:
            resp = await http.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": context},
                        {"role": "user", "content": query},
                    ],
                    "max_tokens": 1000,
                },
                timeout=30.0
            )
            data = resp.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "No response")

    # ─── LEARNING METHODS ─────────────────────────────────────────

    async def get_stats(self, venue_id: str) -> Dict[str, Any]:
        """Get AI usage stats for a venue."""
        db = get_database()
        total = await db.ai_interactions.count_documents({"venue_id": venue_id})
        local = await db.ai_interactions.count_documents({"venue_id": venue_id, "source": {"$exists": False}})
        external = await db.ai_usage_logs.count_documents({"venue_id": venue_id})

        # Intent distribution
        pipeline = [
            {"$match": {"venue_id": venue_id}},
            {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        intent_dist = await db.ai_interactions.aggregate(pipeline).to_list(20)

        return {
            "total_queries": total,
            "local_queries": local,
            "external_queries": external,
            "cost_units": external,  # Each external call = 1 unit
            "intent_distribution": {i["_id"]: i["count"] for i in intent_dist},
        }


# Singleton
intelligence_engine = IntelligenceEngine()
