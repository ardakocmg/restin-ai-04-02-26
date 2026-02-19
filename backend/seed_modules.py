"""
Seed data for the 7 activated modules.
Seeds: CRM, Loyalty, Voice AI, Content Studio, Web Architect, Marketing, Payroll Malta
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restin_v2')]

VENUE_ID = "venue-caviar-bull"
TENANT_ID = "group-marvin-gauci"
NOW = datetime.now(timezone.utc).isoformat()


def uid():
    return str(uuid.uuid4())[:12]


async def seed_crm():
    """CRM & Guest Profiles — 8 customer profiles with taste tags, visit history, churn score"""
    await db.guest_profiles.delete_many({"venue_id": VENUE_ID})

    profiles = [
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Maria", "last_name": "Camilleri",
         "contact_info": {"email": "maria.cam@gmail.com", "phone": "+35679123456"}, "type": "regular",
         "taste_tags": ["seafood", "white-wine", "gluten-free"], "allergens": ["gluten"],
         "tags": ["Regular"], "visit_count": 34, "ltv_cents": 485000,
         "last_visit_days": 9, "churn_risk": "LOW", "tier": "gold",
         "notes": "Anniversary dinner every June. Prefers sparkling water.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "James", "last_name": "Borg",
         "contact_info": {"email": "jborg@outlook.com", "phone": "+35679234567"}, "type": "vip",
         "taste_tags": ["steak", "red-wine", "truffle"], "allergens": [],
         "tags": ["VIP"], "visit_count": 52, "ltv_cents": 1120000,
         "last_visit_days": 5, "churn_risk": "LOW", "tier": "platinum",
         "notes": "Cigar aficionado. Always orders Wagyu Ribeye.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Sophie", "last_name": "Vella",
         "contact_info": {"email": "sophie.v@yahoo.com", "phone": "+35679345678"}, "type": "regular",
         "taste_tags": ["vegetarian", "organic", "dessert"], "allergens": ["nuts"],
         "tags": [], "visit_count": 18, "ltv_cents": 198000,
         "last_visit_days": 22, "churn_risk": "MEDIUM", "tier": "silver",
         "notes": "Strict vegetarian. Loves Black Truffle Risotto.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Robert", "last_name": "Micallef",
         "contact_info": {"email": "rmicallef@gmail.com", "phone": "+35679456789"}, "type": "occasional",
         "taste_tags": ["cocktails", "sharing-plates"], "allergens": ["shellfish"],
         "tags": [], "visit_count": 8, "ltv_cents": 96000,
         "last_visit_days": 61, "churn_risk": "HIGH", "tier": "bronze",
         "notes": "Shellfish allergy — CRITICAL. Always verify with kitchen.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Elena", "last_name": "Grech",
         "contact_info": {"email": "elena.grech@restin.ai", "phone": "+35679567890"}, "type": "vip",
         "taste_tags": ["champagne", "caviar", "lobster"], "allergens": [],
         "tags": ["VIP"], "visit_count": 41, "ltv_cents": 920000,
         "last_visit_days": 3, "churn_risk": "LOW", "tier": "platinum",
         "notes": "Food blogger. Takes photos of every dish. @elenaeats on IG.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "David", "last_name": "Azzopardi",
         "contact_info": {"email": "david.azz@hotmail.com", "phone": "+35679678901"}, "type": "regular",
         "taste_tags": ["steak", "bourbon", "classic"], "allergens": ["dairy"],
         "tags": [], "visit_count": 22, "ltv_cents": 330000,
         "last_visit_days": 14, "churn_risk": "LOW", "tier": "gold",
         "notes": "Dairy intolerant. Substitute butter sauces with olive oil.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Lisa", "last_name": "Galea",
         "contact_info": {"email": "lisa.galea@gmail.com", "phone": "+35679789012"}, "type": "new",
         "taste_tags": ["wine-pairing", "tasting-menu"], "allergens": [],
         "tags": [], "visit_count": 2, "ltv_cents": 48000,
         "last_visit_days": 7, "churn_risk": "MEDIUM", "tier": "bronze",
         "notes": "Brought by Elena Grech. Interested in wine pairings.", "updated_at": NOW, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID, "first_name": "Mark", "last_name": "Spiteri",
         "contact_info": {"email": "mark.spiteri@business.mt", "phone": "+35679890123"}, "type": "corporate",
         "taste_tags": ["private-dining", "wine", "premium"], "allergens": [],
         "tags": ["VIP"], "visit_count": 15, "ltv_cents": 680000,
         "last_visit_days": 11, "churn_risk": "LOW", "tier": "platinum",
         "notes": "CEO of Spiteri Holdings. Books private room for 8-12 guests.", "updated_at": NOW, "created_at": NOW},
    ]
    await db.guest_profiles.insert_many(profiles)
    print(f"[OK] CRM: {len(profiles)} guest profiles seeded")


async def seed_loyalty():
    """Loyalty Program — 1 program + 8 member records"""
    await db.loyalty_programs.delete_many({"venue_id": VENUE_ID})
    await db.loyalty_accounts.delete_many({"venue_id": VENUE_ID})

    program_id = uid()
    program = {
        "id": program_id, "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
        "name": "Caviar & Bull Rewards", "is_active": True,
        "points_per_euro": 10, "currency_symbol": "EUR",
        "tiers": [
            {"name": "Bronze", "min_points": 0, "discount_pct": 0, "color": "#CD7F32"},
            {"name": "Silver", "min_points": 5000, "discount_pct": 5, "color": "#C0C0C0"},
            {"name": "Gold", "min_points": 15000, "discount_pct": 10, "color": "#FFD700"},
            {"name": "Platinum", "min_points": 50000, "discount_pct": 15, "color": "#E5E4E2"},
        ],
        "rewards": [
            {"id": uid(), "name": "Free Dessert", "points_cost": 2000, "type": "free_item"},
            {"id": uid(), "name": "Complimentary Champagne", "points_cost": 5000, "type": "free_item"},
            {"id": uid(), "name": "10% Off Next Visit", "points_cost": 3000, "type": "discount"},
            {"id": uid(), "name": "Private Room Upgrade", "points_cost": 10000, "type": "upgrade"},
        ],
        "created_at": NOW,
    }
    await db.loyalty_programs.insert_one(program)

    accounts = [
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Maria Camilleri",
         "guest_email": "maria.cam@gmail.com", "guest_phone": "+35679123456", "points_balance": 14850, "points_redeemed": 3000,
         "tier": "GOLD", "visits": 34, "lifetime_spend_cents": 485000, "enrolled_at": "2024-06-10T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "James Borg",
         "guest_email": "jborg@outlook.com", "guest_phone": "+35679234567", "points_balance": 52300, "points_redeemed": 8000,
         "tier": "PLATINUM", "visits": 52, "lifetime_spend_cents": 1120000, "enrolled_at": "2023-11-01T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Sophie Vella",
         "guest_email": "sophie.v@yahoo.com", "guest_phone": "+35679345678", "points_balance": 6200, "points_redeemed": 1500,
         "tier": "SILVER", "visits": 18, "lifetime_spend_cents": 198000, "enrolled_at": "2025-03-15T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Robert Micallef",
         "guest_email": "rmicallef@gmail.com", "guest_phone": "+35679456789", "points_balance": 2400, "points_redeemed": 0,
         "tier": "BRONZE", "visits": 8, "lifetime_spend_cents": 96000, "enrolled_at": "2025-08-20T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Elena Grech",
         "guest_email": "elena.grech@restin.ai", "guest_phone": "+35679567890", "points_balance": 41200, "points_redeemed": 6000,
         "tier": "PLATINUM", "visits": 41, "lifetime_spend_cents": 920000, "enrolled_at": "2024-01-05T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "David Azzopardi",
         "guest_email": "david.azz@hotmail.com", "guest_phone": "+35679678901", "points_balance": 11500, "points_redeemed": 2000,
         "tier": "SILVER", "visits": 22, "lifetime_spend_cents": 330000, "enrolled_at": "2024-09-12T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Lisa Galea",
         "guest_email": "lisa.galea@gmail.com", "guest_phone": "+35679789012", "points_balance": 800, "points_redeemed": 0,
         "tier": "BRONZE", "visits": 2, "lifetime_spend_cents": 48000, "enrolled_at": "2026-01-20T10:00:00Z", "last_activity": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "guest_name": "Mark Spiteri",
         "guest_email": "mark.spiteri@business.mt", "guest_phone": "+35679890123", "points_balance": 35000, "points_redeemed": 5000,
         "tier": "PLATINUM", "visits": 15, "lifetime_spend_cents": 680000, "enrolled_at": "2024-04-01T10:00:00Z", "last_activity": NOW},
    ]
    await db.loyalty_accounts.insert_many(accounts)
    print(f"[OK] Loyalty: 1 program + {len(accounts)} accounts seeded")


async def seed_voice_ai():
    """Voice AI Receptionist — 1 persona config + 3 call logs"""
    await db.voice_configs.delete_many({"venue_id": VENUE_ID})
    await db.call_logs.delete_many({"venue_id": VENUE_ID})

    config = {
        "id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
        "persona_name": "Sofia", "language": "en-MT",
        "greeting": "Good evening, thank you for calling Caviar and Bull. This is Sofia, how may I help you?",
        "voice_provider": "GOOGLE", "voice_id": "en-US-Studio-O",
        "knowledge_base": [
            "Opening hours: Tuesday to Sunday, 18:30 - 23:00. Closed Mondays.",
            "Dress code: Smart casual. No shorts or flip-flops.",
            "Parking: Valet parking available, EUR 5 per vehicle.",
            "Private dining: Seats up to 16 guests. Minimum spend EUR 1,500.",
        ],
        "tools": ["checkAvailability", "createReservation", "queryMenu", "transferToManager"],
        "max_call_duration_sec": 300, "is_active": True, "created_at": NOW,
    }
    await db.voice_configs.insert_one(config)

    call_logs = [
        {"id": uid(), "venue_id": VENUE_ID, "config_id": config["id"],
         "caller_phone": "+35679111222", "duration_sec": 94, "status": "completed",
         "transcript_summary": "Caller booked a table for 4 on Saturday at 20:00. Confirmed window seat preference.",
         "action_taken": "createReservation", "ai_cost_cents": 12, "created_at": "2026-02-17T14:22:00Z"},
        {"id": uid(), "venue_id": VENUE_ID, "config_id": config["id"],
         "caller_phone": "+35679333444", "duration_sec": 45, "status": "completed",
         "transcript_summary": "Caller asked about gluten-free options. Sofia listed 8 GF items from menu.",
         "action_taken": "queryMenu", "ai_cost_cents": 8, "created_at": "2026-02-17T18:05:00Z"},
        {"id": uid(), "venue_id": VENUE_ID, "config_id": config["id"],
         "caller_phone": "+35679555666", "duration_sec": 128, "status": "transferred",
         "transcript_summary": "Caller wanted to discuss a private event for 20 guests. Transferred to manager.",
         "action_taken": "transferToManager", "ai_cost_cents": 18, "created_at": "2026-02-18T10:30:00Z"},
    ]
    await db.call_logs.insert_many(call_logs)
    print(f"[OK] Voice AI: 1 persona + {len(call_logs)} call logs seeded")


async def seed_content_studio():
    """Content Studio — 6 media assets"""
    await db.media_assets.delete_many({"venue_id": VENUE_ID})

    assets = [
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Wagyu Ribeye Hero Shot", "type": "image", "format": "webp",
         "size_kb": 420, "width": 1200, "height": 800,
         "url": "/uploads/wagyu-ribeye-hero.webp", "category": "food",
         "tags": ["signature", "steak", "hero"], "ai_generated": False, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Valentine's Day Social Post", "type": "image", "format": "webp",
         "size_kb": 380, "width": 1080, "height": 1080,
         "url": "/uploads/valentines-social.webp", "category": "social",
         "tags": ["valentines", "instagram", "promo"], "ai_generated": True, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Restaurant Interior Panorama", "type": "image", "format": "webp",
         "size_kb": 890, "width": 2400, "height": 1200,
         "url": "/uploads/interior-panorama.webp", "category": "ambiance",
         "tags": ["interior", "website", "hero"], "ai_generated": False, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Oscietra Caviar Close-Up", "type": "image", "format": "webp",
         "size_kb": 310, "width": 1200, "height": 800,
         "url": "/uploads/caviar-closeup.webp", "category": "food",
         "tags": ["caviar", "luxury", "detail"], "ai_generated": False, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Weekend Brunch Menu Video", "type": "video", "format": "mp4",
         "size_kb": 12400, "width": 1920, "height": 1080,
         "url": "/uploads/brunch-promo.mp4", "category": "promo",
         "tags": ["video", "brunch", "weekend"], "ai_generated": False, "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Chef Portrait — Marco", "type": "image", "format": "webp",
         "size_kb": 280, "width": 800, "height": 1200,
         "url": "/uploads/chef-marco.webp", "category": "team",
         "tags": ["chef", "team", "about"], "ai_generated": False, "created_at": NOW},
    ]
    await db.media_assets.insert_many(assets)
    print(f"[OK] Content Studio: {len(assets)} media assets seeded")


async def seed_web_architect():
    """Web Architect — 1 marketing site with 4 sections"""
    await db.web_sites.delete_many({"venue_id": VENUE_ID})

    site = {
        "id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
        "domain": "caviarandbull.com", "status": "published",
        "theme": {"primary_color": "#C9A84C", "font": "Playfair Display", "dark_mode": True},
        "seo": {
            "title": "Caviar & Bull | Fine Dining Malta",
            "description": "Award-winning fine dining restaurant in Valletta, Malta. Wagyu, caviar, and the finest wines.",
            "keywords": ["fine dining malta", "valletta restaurant", "wagyu malta", "caviar restaurant"],
        },
        "sections": [
            {"id": uid(), "type": "hero", "order": 1, "title": "Where Elegance Meets Flavor",
             "subtitle": "Award-winning fine dining in the heart of Valletta",
             "cta_text": "Reserve a Table", "cta_link": "/reserve",
             "background_image": "/uploads/interior-panorama.webp"},
            {"id": uid(), "type": "menu_preview", "order": 2, "title": "Our Menu",
             "subtitle": "Crafted with the finest ingredients from around the world",
             "linked_category_ids": ["cat-cb-starters", "cat-cb-mains", "cat-cb-desserts"],
             "show_prices": True},
            {"id": uid(), "type": "about", "order": 3, "title": "Our Story",
             "body": "Founded in 2018, Caviar & Bull has become Malta's premier fine dining destination. Chef Marco brings 20 years of Michelin-starred experience to every plate.",
             "image": "/uploads/chef-marco.webp"},
            {"id": uid(), "type": "contact", "order": 4, "title": "Visit Us",
             "address": "137 Archbishop Street, Valletta VLT 1444, Malta",
             "phone": "+356 2124 5678", "email": "reservations@caviarandbull.com",
             "opening_hours": {"tue_sun": "18:30 - 23:00", "mon": "Closed"},
             "map_embed": "https://maps.google.com/?q=Caviar+Bull+Valletta"},
        ],
        "created_at": NOW,
    }
    await db.web_sites.insert_one(site)
    print(f"[OK] Web Architect: 1 site with {len(site['sections'])} sections seeded")


async def seed_marketing():
    """Marketing Automations — 3 campaigns"""
    await db.marketing_campaigns.delete_many({"venue_id": VENUE_ID})

    campaigns = [
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Welcome Series", "type": "automated", "status": "active",
         "trigger": "new_customer", "channel": "email",
         "subject": "Welcome to Caviar & Bull - Your First Visit Deserves a Toast",
         "body_template": "Dear {{name}}, thank you for dining with us! As a welcome gift, enjoy a complimentary glass of champagne on your next visit. Show this email to your server. See you soon!",
         "discount_code": "WELCOME10", "discount_pct": 10,
         "sent_count": 42, "open_rate": 0.68, "click_rate": 0.34, "conversion_rate": 0.22,
         "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Birthday Special", "type": "automated", "status": "active",
         "trigger": "birthday_7d_before", "channel": "sms",
         "subject": None,
         "body_template": "Happy Birthday {{name}}! Celebrate with us and enjoy a complimentary dessert. Book now: caviarandbull.com/reserve",
         "discount_code": None, "discount_pct": 0,
         "sent_count": 18, "open_rate": None, "click_rate": 0.45, "conversion_rate": 0.38,
         "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "name": "Win-Back Campaign", "type": "automated", "status": "active",
         "trigger": "no_visit_60d", "channel": "email",
         "subject": "We Miss You at Caviar & Bull",
         "body_template": "Dear {{name}}, it's been a while since your last visit. We'd love to welcome you back with 15% off your next dining experience. Use code COMEBACK15 when booking.",
         "discount_code": "COMEBACK15", "discount_pct": 15,
         "sent_count": 8, "open_rate": 0.55, "click_rate": 0.28, "conversion_rate": 0.15,
         "created_at": NOW},
    ]
    await db.marketing_campaigns.insert_many(campaigns)
    print(f"[OK] Marketing: {len(campaigns)} campaigns seeded")


async def seed_payroll():
    """Payroll Malta — 5 employee payroll entries for Jan 2026"""
    await db.payroll_records.delete_many({"venue_id": VENUE_ID})

    records = [
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "employee_name": "Marco Rossi", "employee_id": "emp-chef-marco",
         "role": "Head Chef", "period": "2026-01", "status": "paid",
         "gross_salary_cents": 380000, "ssc_employee_cents": 38000, "ssc_employer_cents": 38000,
         "tax_cents": 52000, "net_salary_cents": 290000,
         "bonus_cents": 20000, "overtime_hours": 12, "overtime_rate_cents": 2500,
         "payment_date": "2026-01-28T10:00:00Z", "payment_method": "bank_transfer",
         "iban": "MT84MALT011000012345MTLCAST001S", "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "employee_name": "Sarah Zammit", "employee_id": "emp-sarah-z",
         "role": "Restaurant Manager", "period": "2026-01", "status": "paid",
         "gross_salary_cents": 320000, "ssc_employee_cents": 32000, "ssc_employer_cents": 32000,
         "tax_cents": 42000, "net_salary_cents": 246000,
         "bonus_cents": 15000, "overtime_hours": 8, "overtime_rate_cents": 2200,
         "payment_date": "2026-01-28T10:00:00Z", "payment_method": "bank_transfer",
         "iban": "MT84MALT011000012345MTLCAST002S", "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "employee_name": "Luca Bonnici", "employee_id": "emp-luca-b",
         "role": "Sommelier", "period": "2026-01", "status": "paid",
         "gross_salary_cents": 260000, "ssc_employee_cents": 26000, "ssc_employer_cents": 26000,
         "tax_cents": 32000, "net_salary_cents": 202000,
         "bonus_cents": 0, "overtime_hours": 4, "overtime_rate_cents": 1800,
         "payment_date": "2026-01-28T10:00:00Z", "payment_method": "bank_transfer",
         "iban": "MT84MALT011000012345MTLCAST003S", "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "employee_name": "Anna Farrugia", "employee_id": "emp-anna-f",
         "role": "Server", "period": "2026-01", "status": "paid",
         "gross_salary_cents": 180000, "ssc_employee_cents": 18000, "ssc_employer_cents": 18000,
         "tax_cents": 18000, "net_salary_cents": 144000,
         "bonus_cents": 5000, "overtime_hours": 16, "overtime_rate_cents": 1200,
         "payment_date": "2026-01-28T10:00:00Z", "payment_method": "bank_transfer",
         "iban": "MT84MALT011000012345MTLCAST004S", "created_at": NOW},
        {"id": uid(), "venue_id": VENUE_ID, "tenant_id": TENANT_ID,
         "employee_name": "Daniel Pace", "employee_id": "emp-daniel-p",
         "role": "Bartender", "period": "2026-01", "status": "paid",
         "gross_salary_cents": 190000, "ssc_employee_cents": 19000, "ssc_employer_cents": 19000,
         "tax_cents": 20000, "net_salary_cents": 151000,
         "bonus_cents": 8000, "overtime_hours": 10, "overtime_rate_cents": 1300,
         "payment_date": "2026-01-28T10:00:00Z", "payment_method": "bank_transfer",
         "iban": "MT84MALT011000012345MTLCAST005S", "created_at": NOW},
    ]
    await db.payroll_records.insert_many(records)
    print(f"[OK] Payroll Malta: {len(records)} records for Jan 2026 seeded")


async def main():
    print("=" * 60)
    print("  RESTIN.AI - 7 Module Seed Data")
    print("=" * 60)

    await seed_crm()
    await seed_loyalty()
    await seed_voice_ai()
    await seed_content_studio()
    await seed_web_architect()
    await seed_marketing()
    await seed_payroll()

    print("\n" + "=" * 60)
    print("  ALL 7 MODULES SEEDED SUCCESSFULLY")
    print("=" * 60)
    print("\nCollections populated:")
    print("  - guest_profiles (8 records)")
    print("  - loyalty_programs (1 record)")
    print("  - loyalty_accounts (8 records)")
    print("  - voice_configs (1 record)")
    print("  - call_logs (3 records)")
    print("  - media_assets (6 records)")
    print("  - web_sites (1 record)")
    print("  - marketing_campaigns (3 records)")
    print("  - payroll_records (5 records)")


if __name__ == "__main__":
    asyncio.run(main())
