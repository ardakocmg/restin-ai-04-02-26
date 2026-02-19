"""
Seed script for all empty collections.
Targets: haccp_templates, haccp_logs, kds_stations, tasks (hive),
         timesheets, leave_requests, leave_balances, payroll_profiles
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

VENUE = "venue-caviar-bull"
NOW = datetime.now(timezone.utc)


def ts(days_ago: int = 0, hours_ago: int = 0) -> str:
    return (NOW - timedelta(days=days_ago, hours=hours_ago)).isoformat()


def uid() -> str:
    return str(uuid4())


# ─────────────────────────────────────────────
# Employee IDs (must match seeded employees)
# ─────────────────────────────────────────────
EMP_CHEF = "emp-chef-001"
EMP_SOUS = "emp-sous-002"
EMP_WAITER1 = "emp-waiter-003"
EMP_WAITER2 = "emp-waiter-004"
EMP_BARTENDER = "emp-bartender-005"
EMP_HOST = "emp-host-006"
EMP_MANAGER = "emp-manager-007"


async def seed():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.environ.get("DB_NAME", "restinai")]

    # Get real employee IDs from DB
    employees = await db.employees.find({"venue_id": VENUE}, {"_id": 0, "id": 1, "name": 1}).to_list(20)
    emp_ids = [e["id"] for e in employees] if employees else [EMP_CHEF, EMP_SOUS, EMP_WAITER1, EMP_WAITER2]
    emp_names = {e["id"]: e.get("name", "Staff") for e in employees} if employees else {}
    print(f"  Found {len(emp_ids)} employees in DB")

    # ═══════════════════════════════════════════
    # 1. HACCP TEMPLATES
    # ═══════════════════════════════════════════
    print("\n[1/7] HACCP Templates...")
    tpl_morning_id = uid()
    tpl_delivery_id = uid()
    tpl_closing_id = uid()

    haccp_templates = [
        {
            "id": tpl_morning_id, "venue_id": VENUE, "name": "Morning Opening Checks",
            "category": "temperature", "frequency": "daily", "is_active": True,
            "items": [
                {"id": "1", "label": "Walk-in fridge temperature <= 5C", "type": "temp_check", "target_min": 0, "target_max": 5},
                {"id": "2", "label": "Freezer temperature <= -18C", "type": "temp_check", "target_min": -25, "target_max": -18},
                {"id": "3", "label": "Hot hold unit >= 63C", "type": "temp_check", "target_min": 63, "target_max": 100},
                {"id": "4", "label": "Hand wash stations stocked", "type": "yes_no"},
                {"id": "5", "label": "Pest control bait stations checked", "type": "yes_no"},
            ],
            "created_by": emp_ids[0], "created_at": ts(30)
        },
        {
            "id": tpl_delivery_id, "venue_id": VENUE, "name": "Delivery Inspection",
            "category": "receiving", "frequency": "per_delivery", "is_active": True,
            "items": [
                {"id": "1", "label": "Supplier temperature log present", "type": "yes_no"},
                {"id": "2", "label": "Chilled goods <= 5C on arrival", "type": "temp_check", "target_min": 0, "target_max": 5},
                {"id": "3", "label": "Packaging intact and labels correct", "type": "yes_no"},
                {"id": "4", "label": "Use-by dates acceptable", "type": "yes_no"},
            ],
            "created_by": emp_ids[0], "created_at": ts(28)
        },
        {
            "id": tpl_closing_id, "venue_id": VENUE, "name": "Closing Cleaning Schedule",
            "category": "cleaning", "frequency": "daily", "is_active": True,
            "items": [
                {"id": "1", "label": "All surfaces sanitised", "type": "yes_no"},
                {"id": "2", "label": "Floors swept and mopped", "type": "yes_no"},
                {"id": "3", "label": "Waste bins emptied", "type": "yes_no"},
                {"id": "4", "label": "Equipment cleaned and stored", "type": "yes_no"},
                {"id": "5", "label": "Dishwasher deep clean cycle run", "type": "yes_no"},
            ],
            "created_by": emp_ids[0], "created_at": ts(25)
        },
    ]

    await db.haccp_templates.delete_many({"venue_id": VENUE})
    await db.haccp_templates.insert_many(haccp_templates)
    print(f"  +{len(haccp_templates)} HACCP templates")

    # ═══════════════════════════════════════════
    # 2. HACCP LOGS
    # ═══════════════════════════════════════════
    print("[2/7] HACCP Logs...")
    haccp_logs = [
        {
            "id": uid(), "venue_id": VENUE, "template_id": tpl_morning_id,
            "template_name": "Morning Opening Checks",
            "items": [
                {"label": "Walk-in fridge temperature <= 5C", "passed": True, "value": "3.8C"},
                {"label": "Freezer temperature <= -18C", "passed": True, "value": "-20.1C"},
                {"label": "Hot hold unit >= 63C", "passed": True, "value": "65.2C"},
                {"label": "Hand wash stations stocked", "passed": True, "value": "Yes"},
                {"label": "Pest control bait stations checked", "passed": True, "value": "Yes"},
            ],
            "total_items": 5, "passed_items": 5, "compliance_score": 100.0,
            "status": "pass", "completed_by": emp_ids[0], "completed_at": ts(0, 6)
        },
        {
            "id": uid(), "venue_id": VENUE, "template_id": tpl_morning_id,
            "template_name": "Morning Opening Checks",
            "items": [
                {"label": "Walk-in fridge temperature <= 5C", "passed": True, "value": "4.2C"},
                {"label": "Freezer temperature <= -18C", "passed": True, "value": "-19.0C"},
                {"label": "Hot hold unit >= 63C", "passed": False, "value": "58.3C"},
                {"label": "Hand wash stations stocked", "passed": True, "value": "Yes"},
                {"label": "Pest control bait stations checked", "passed": True, "value": "Yes"},
            ],
            "total_items": 5, "passed_items": 4, "compliance_score": 80.0,
            "status": "fail", "notes": "Hot hold not at temp - engineer called",
            "completed_by": emp_ids[1] if len(emp_ids) > 1 else emp_ids[0], "completed_at": ts(1, 6)
        },
        {
            "id": uid(), "venue_id": VENUE, "template_id": tpl_delivery_id,
            "template_name": "Delivery Inspection",
            "items": [
                {"label": "Supplier temperature log present", "passed": True, "value": "Yes"},
                {"label": "Chilled goods <= 5C on arrival", "passed": False, "value": "8.3C"},
                {"label": "Packaging intact and labels correct", "passed": True, "value": "Yes"},
                {"label": "Use-by dates acceptable", "passed": True, "value": "Yes"},
            ],
            "total_items": 4, "passed_items": 3, "compliance_score": 75.0,
            "status": "fail", "notes": "Salmon delivery too warm - rejected batch",
            "completed_by": emp_ids[0], "completed_at": ts(2, 4)
        },
        {
            "id": uid(), "venue_id": VENUE, "template_id": tpl_closing_id,
            "template_name": "Closing Cleaning Schedule",
            "items": [
                {"label": "All surfaces sanitised", "passed": True, "value": "Yes"},
                {"label": "Floors swept and mopped", "passed": True, "value": "Yes"},
                {"label": "Waste bins emptied", "passed": True, "value": "Yes"},
                {"label": "Equipment cleaned and stored", "passed": True, "value": "Yes"},
                {"label": "Dishwasher deep clean cycle run", "passed": True, "value": "Yes"},
            ],
            "total_items": 5, "passed_items": 5, "compliance_score": 100.0,
            "status": "pass", "completed_by": emp_ids[1] if len(emp_ids) > 1 else emp_ids[0], "completed_at": ts(0, 2)
        },
        {
            "id": uid(), "venue_id": VENUE, "template_id": tpl_delivery_id,
            "template_name": "Delivery Inspection",
            "items": [
                {"label": "Supplier temperature log present", "passed": True, "value": "Yes"},
                {"label": "Chilled goods <= 5C on arrival", "passed": True, "value": "3.1C"},
                {"label": "Packaging intact and labels correct", "passed": True, "value": "Yes"},
                {"label": "Use-by dates acceptable", "passed": True, "value": "Yes"},
            ],
            "total_items": 4, "passed_items": 4, "compliance_score": 100.0,
            "status": "pass", "completed_by": emp_ids[0], "completed_at": ts(3, 5)
        },
    ]

    await db.haccp_logs.delete_many({"venue_id": VENUE})
    await db.haccp_logs.insert_many(haccp_logs)
    print(f"  +{len(haccp_logs)} HACCP logs")

    # ═══════════════════════════════════════════
    # 3. KDS STATIONS
    # ═══════════════════════════════════════════
    print("[3/7] KDS Stations...")
    kds_stations = [
        {
            "id": "st_grill_001", "venue_id": VENUE, "station_key": "GRILL",
            "name": "Grill Station", "enabled": True,
            "routing_rules": [{"type": "category", "values": ["Steaks", "Burgers", "BBQ"]}],
            "created_at": ts(60), "created_by": "system", "updated_at": ts(0), "updated_by": "system"
        },
        {
            "id": "st_cold_001", "venue_id": VENUE, "station_key": "COLD",
            "name": "Cold Station", "enabled": True,
            "routing_rules": [{"type": "category", "values": ["Salads", "Appetizers", "Desserts"]}],
            "created_at": ts(60), "created_by": "system", "updated_at": ts(0), "updated_by": "system"
        },
        {
            "id": "st_fry_001", "venue_id": VENUE, "station_key": "FRY",
            "name": "Fry Station", "enabled": True,
            "routing_rules": [{"type": "category", "values": ["Sides", "Fried"]}],
            "created_at": ts(60), "created_by": "system", "updated_at": ts(0), "updated_by": "system"
        },
        {
            "id": "st_bar_001", "venue_id": VENUE, "station_key": "BAR",
            "name": "Bar / Drinks", "enabled": True,
            "routing_rules": [{"type": "category", "values": ["Cocktails", "Wine", "Beer", "Beverages"]}],
            "created_at": ts(60), "created_by": "system", "updated_at": ts(0), "updated_by": "system"
        },
    ]

    await db.kds_stations.delete_many({"venue_id": VENUE})
    await db.kds_stations.insert_many(kds_stations)
    print(f"  +{len(kds_stations)} KDS stations")

    # ═══════════════════════════════════════════
    # 4. HIVE TASKS
    # ═══════════════════════════════════════════
    print("[4/7] Hive Tasks...")
    tasks = [
        {
            "id": uid(), "venue_id": VENUE, "title": "Prep station mise en place",
            "description": "Complete all prep for dinner service: sauces, garnishes, portioned proteins",
            "status": "in_progress", "priority": "high",
            "assigned_to": emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[0], "Chef"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(0, 8), "due_date": ts(0, 0),
            "tags": ["prep", "kitchen"]
        },
        {
            "id": uid(), "venue_id": VENUE, "title": "Deep clean walk-in fridge",
            "description": "Remove all items, wipe shelves, check seals, reorganise by FIFO",
            "status": "todo", "priority": "medium",
            "assigned_to": emp_ids[1] if len(emp_ids) > 1 else emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[1] if len(emp_ids) > 1 else emp_ids[0], "Sous Chef"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(1, 2), "due_date": ts(-1, 0),
            "tags": ["cleaning", "haccp"]
        },
        {
            "id": uid(), "venue_id": VENUE, "title": "Restock bar garnishes",
            "description": "Cut limes, lemons, oranges. Refill olives, cherries, mint",
            "status": "done", "priority": "low",
            "assigned_to": emp_ids[2] if len(emp_ids) > 2 else emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[2] if len(emp_ids) > 2 else emp_ids[0], "Bartender"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(2, 4), "due_date": ts(1, 0),
            "completed_at": ts(1, 3),
            "tags": ["bar", "prep"]
        },
        {
            "id": uid(), "venue_id": VENUE, "title": "Update specials board",
            "description": "Write today's specials on the chalkboard: Catch of the Day, Soup du Jour",
            "status": "todo", "priority": "high",
            "assigned_to": emp_ids[3] if len(emp_ids) > 3 else emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[3] if len(emp_ids) > 3 else emp_ids[0], "Staff"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(0, 3), "due_date": ts(0, 0),
            "tags": ["front-of-house", "daily"]
        },
        {
            "id": uid(), "venue_id": VENUE, "title": "Order wine delivery for weekend",
            "description": "Contact Marsovin and Meridiana for weekend stock. Min 6 cases each red/white",
            "status": "in_progress", "priority": "medium",
            "assigned_to": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0], "Manager"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(1, 6), "due_date": ts(-2, 0),
            "tags": ["procurement", "beverage"]
        },
        {
            "id": uid(), "venue_id": VENUE, "title": "Train new waiter on POS system",
            "description": "Show table assignment, order entry, modifiers, split bill, and payment flow",
            "status": "todo", "priority": "medium",
            "assigned_to": emp_ids[3] if len(emp_ids) > 3 else emp_ids[0],
            "assigned_to_name": emp_names.get(emp_ids[3] if len(emp_ids) > 3 else emp_ids[0], "Staff"),
            "created_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "created_at": ts(0, 1), "due_date": ts(-3, 0),
            "tags": ["training", "onboarding"]
        },
    ]

    await db.tasks.delete_many({"venue_id": VENUE})
    await db.tasks.insert_many(tasks)
    print(f"  +{len(tasks)} Hive tasks")

    # ═══════════════════════════════════════════
    # 5. TIMESHEETS
    # ═══════════════════════════════════════════
    print("[5/7] Timesheets...")
    timesheets = []
    for week_offset in [0, 1]:  # Current week and last week
        week_start = NOW - timedelta(days=NOW.weekday() + 7 * week_offset)
        for i, eid in enumerate(emp_ids[:4]):
            hours = [8, 7.5, 9, 8.5][i % 4]
            timesheets.append({
                "id": uid(), "venue_id": VENUE,
                "employee_id": eid,
                "employee_name": emp_names.get(eid, f"Employee {i+1}"),
                "week_start": week_start.strftime("%Y-%m-%d"),
                "week_end": (week_start + timedelta(days=6)).strftime("%Y-%m-%d"),
                "total_hours": hours * 5,
                "overtime_hours": max(0, hours * 5 - 40),
                "entries": [
                    {
                        "date": (week_start + timedelta(days=d)).strftime("%Y-%m-%d"),
                        "clock_in": "09:00", "clock_out": f"{9 + int(hours)}:{int((hours % 1)*60):02d}",
                        "break_minutes": 30, "total_hours": hours
                    }
                    for d in range(5)  # Mon-Fri
                ],
                "status": "approved" if week_offset == 1 else "submitted",
                "submitted_at": ts(7 * week_offset),
                "approved_at": ts(7 * week_offset - 1) if week_offset == 1 else None,
                "approved_by": emp_ids[-1] if week_offset == 1 else None,
                "created_at": ts(7 * week_offset + 5),
            })

    await db.timesheets.delete_many({"venue_id": VENUE})
    await db.timesheets.insert_many(timesheets)
    print(f"  +{len(timesheets)} timesheets")

    # ═══════════════════════════════════════════
    # 6. LEAVE REQUESTS + BALANCES
    # ═══════════════════════════════════════════
    print("[6/7] Leave Requests & Balances...")

    leave_requests = [
        {
            "id": uid(), "venue_id": VENUE,
            "employee_id": emp_ids[0],
            "employee_name": emp_names.get(emp_ids[0], "Chef"),
            "type": "annual", "start_date": "2026-03-01", "end_date": "2026-03-05",
            "days": 5, "reason": "Family holiday in Sicily",
            "status": "approved",
            "approved_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "approved_at": ts(10),
            "created_at": ts(14)
        },
        {
            "id": uid(), "venue_id": VENUE,
            "employee_id": emp_ids[1] if len(emp_ids) > 1 else emp_ids[0],
            "employee_name": emp_names.get(emp_ids[1] if len(emp_ids) > 1 else emp_ids[0], "Sous Chef"),
            "type": "sick", "start_date": "2026-02-10", "end_date": "2026-02-11",
            "days": 2, "reason": "Flu - doctor cert provided",
            "status": "approved",
            "approved_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "approved_at": ts(5),
            "created_at": ts(5)
        },
        {
            "id": uid(), "venue_id": VENUE,
            "employee_id": emp_ids[2] if len(emp_ids) > 2 else emp_ids[0],
            "employee_name": emp_names.get(emp_ids[2] if len(emp_ids) > 2 else emp_ids[0], "Waiter"),
            "type": "annual", "start_date": "2026-04-14", "end_date": "2026-04-18",
            "days": 5, "reason": "Easter break",
            "status": "pending",
            "created_at": ts(3)
        },
        {
            "id": uid(), "venue_id": VENUE,
            "employee_id": emp_ids[3] if len(emp_ids) > 3 else emp_ids[0],
            "employee_name": emp_names.get(emp_ids[3] if len(emp_ids) > 3 else emp_ids[0], "Staff"),
            "type": "personal", "start_date": "2026-02-20", "end_date": "2026-02-20",
            "days": 1, "reason": "Personal appointment",
            "status": "pending",
            "created_at": ts(1)
        },
        {
            "id": uid(), "venue_id": VENUE,
            "employee_id": emp_ids[0],
            "employee_name": emp_names.get(emp_ids[0], "Chef"),
            "type": "sick", "start_date": "2026-01-15", "end_date": "2026-01-16",
            "days": 2, "reason": "Back pain",
            "status": "approved",
            "approved_by": emp_ids[-1] if len(emp_ids) > 1 else emp_ids[0],
            "approved_at": ts(30),
            "created_at": ts(31)
        },
    ]

    leave_balances = []
    for i, eid in enumerate(emp_ids[:4]):
        leave_balances.append({
            "id": uid(), "venue_id": VENUE,
            "employee_id": eid,
            "employee_name": emp_names.get(eid, f"Employee {i+1}"),
            "year": 2026,
            "annual": {"entitled": 26, "used": [7, 2, 0, 0][i % 4], "remaining": [19, 24, 26, 26][i % 4]},
            "sick": {"entitled": 15, "used": [2, 2, 0, 0][i % 4], "remaining": [13, 13, 15, 15][i % 4]},
            "personal": {"entitled": 3, "used": [0, 0, 0, 1][i % 4], "remaining": [3, 3, 3, 2][i % 4]},
            "updated_at": ts(0)
        })

    await db.leave_requests.delete_many({"venue_id": VENUE})
    await db.leave_requests.insert_many(leave_requests)
    await db.leave_balances.delete_many({"venue_id": VENUE})
    await db.leave_balances.insert_many(leave_balances)
    print(f"  +{len(leave_requests)} leave requests, +{len(leave_balances)} leave balances")

    # ═══════════════════════════════════════════
    # 7. PAYROLL PROFILES
    # ═══════════════════════════════════════════
    print("[7/7] Payroll Profiles...")
    roles = ["Head Chef", "Sous Chef", "Waiter", "Bartender", "Host", "Manager", "Cleaner", "Line Cook", "Sommelier"]
    payroll_profiles = []
    for i, eid in enumerate(emp_ids[:min(len(emp_ids), 9)]):
        base_rates = [2800, 2200, 1400, 1600, 1300, 2500, 1100, 1800, 1900]
        payroll_profiles.append({
            "id": uid(), "venue_id": VENUE,
            "employee_id": eid,
            "employee_name": emp_names.get(eid, roles[i % len(roles)]),
            "role": roles[i % len(roles)],
            "employment_type": "full_time" if i < 6 else "part_time",
            "pay_frequency": "monthly",
            "base_salary_cents": base_rates[i % len(base_rates)] * 100,
            "hourly_rate_cents": int(base_rates[i % len(base_rates)] * 100 / 173),  # ~173 hrs/month
            "overtime_rate_multiplier": 1.5,
            "tax_bracket": "standard",
            "ni_number": f"PE{10000 + i}M",
            "bank_iban": f"MT84MALT0110000000000000000{i:04d}",
            "start_date": "2024-06-01" if i < 5 else "2025-01-15",
            "is_active": True,
            "updated_at": ts(0)
        })

    await db.payroll_profiles.delete_many({"venue_id": VENUE})
    await db.payroll_profiles.insert_many(payroll_profiles)
    print(f"  +{len(payroll_profiles)} payroll profiles")

    # ═══════════════════════════════════════════
    # SUMMARY
    # ═══════════════════════════════════════════
    print("\n" + "=" * 50)
    print("  SEED COMPLETE")
    print("=" * 50)
    counts = {
        "haccp_templates": len(haccp_templates),
        "haccp_logs": len(haccp_logs),
        "kds_stations": len(kds_stations),
        "tasks (hive)": len(tasks),
        "timesheets": len(timesheets),
        "leave_requests": len(leave_requests),
        "leave_balances": len(leave_balances),
        "payroll_profiles": len(payroll_profiles),
    }
    total = sum(counts.values())
    for name, count in counts.items():
        print(f"  {name}: {count}")
    print(f"  TOTAL: {total} documents")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
