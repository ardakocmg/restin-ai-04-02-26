
"""
Centralized Mock Data Store for Human Resources
Ensures consistency across Scheduler, Employee Detail, Clocking Data, and Payroll.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
import random

# -----------------------------------------------------------------------------
# CONSTANTS
# -----------------------------------------------------------------------------
VENDORS = ["Don Royale", "Caviar and Bull", "Sole by Tarragon"]
GLOBAL_VENUE = "Marvin Gauci Group"

# -----------------------------------------------------------------------------
# EMPLOYEE DATABASE (The core source of truth)
# -----------------------------------------------------------------------------
# Pre-defined employees with random vendors from the list
MOCK_EMPLOYEES: Dict[str, Dict[str, Any]] = {
    "1001": {
        "code": "1001",
        "name": "DONALD AGIUS",
        "surname": "AGIUS",
        "full_name": "DONALD AGIUS",
        "occupation": "RESTAURANT MANAGER",
        "cost_centre": "DON FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "123456M",
        "address": "12, Main Street, Sliema",
        "mobile": "99123456",
        "email": "donald.agius@example.com",
        "punch_card": "1001",
        "venue": GLOBAL_VENUE,
        "vendor": "Don Royale",
        "hourly_rate": 18.50,
        "gender": "Male",
        "dob": "1985-05-15",
        "employment_date": "2018-01-10"
    },
    "1002": {
        "code": "1002",
        "name": "ANNE FAITH ALINAN",
        "surname": "ALINAN",
        "full_name": "ANNE FAITH ALINAN",
        "occupation": "HOSTESS",
        "cost_centre": "C&B FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "654321A",
        "address": "Flat 5, Tower Road, St Julians",
        "mobile": "99654321",
        "email": "anne.alinan@example.com",
        "punch_card": "1002",
        "venue": GLOBAL_VENUE,
        "vendor": "Caviar and Bull",
        "hourly_rate": 12.50,
        "gender": "Female",
        "dob": "1994-11-20",
        "employment_date": "2020-03-15"
    },
    "1003": {
        "code": "1003",
        "name": "MARC ALPHONSI",
        "surname": "ALPHONSI",
        "full_name": "MARC ALPHONSI",
        "occupation": "CHEF DE RANG",
        "cost_centre": "C&B FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "789012L",
        "address": "22, Republic Street, Valletta",
        "mobile": "99789012",
        "email": "marc.alphonsi@example.com",
        "punch_card": "1003",
        "venue": GLOBAL_VENUE,
        "vendor": "Sole by Tarragon",
        "hourly_rate": 13.00,
        "gender": "Male",
        "dob": "1991-02-28",
        "employment_date": "2021-06-01"
    },
    "1004": {
        "code": "1004",
        "name": "BRANKO ANASTASOV",
        "surname": "ANASTASOV",
        "full_name": "BRANKO ANASTASOV",
        "occupation": "CHEF DE RANG",
        "cost_centre": "C&B FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "345678B",
        "address": "15, Sea View, Gzira",
        "mobile": "99345678",
        "email": "branko.anastasov@example.com",
        "punch_card": "1004",
        "venue": GLOBAL_VENUE,
        "vendor": "Don Royale",
        "hourly_rate": 13.00,
        "gender": "Male",
        "dob": "1989-07-12",
        "employment_date": "2022-01-15"
    },
    "1005": {
        "code": "1005",
        "name": "MARAM BEN ARBIA",
        "surname": "BEN ARBIA",
        "full_name": "MARAM BEN ARBIA",
        "occupation": "HOSTESS",
        "cost_centre": "C&B FOH",
        "department": "Front of House",
        "employment_type": "Part Time",
        "id_number": "901234T",
        "address": "8, Church Street, Mosta",
        "mobile": "99901234",
        "email": "maram.benarbia@example.com",
        "punch_card": "1005",
        "venue": GLOBAL_VENUE,
        "vendor": "Caviar and Bull",
        "hourly_rate": 11.50,
        "gender": "Female",
        "dob": "1998-12-05",
        "employment_date": "2023-09-10"
    },
    "HEMIDA": {
        "code": "HEMIDA",
        "name": "(HAMU) MOHAMED HASSAN MABRO",
        "surname": "HEMIDA",
        "full_name": "(HAMU) MOHAMED HASSAN MABRO",
        "occupation": "COMMIS CHEF",
        "cost_centre": "C&B KTCH",
        "department": "Kitchen",
        "employment_type": "Full Time Regular",
        "id_number": "198310A",
        "address": "Trio Il-Qanpiena, Swatar",
        "mobile": "9935-2936",
        "email": "mhhs1800@gmail.com",
        "punch_card": "1009",
        "venue": GLOBAL_VENUE,
        "vendor": "Sole by Tarragon",
        "hourly_rate": 14.50,
        "gender": "Male",
        "dob": "1983-10-25",
        "employment_date": "2019-11-20"
    },
    "1006": {
        "code": "1006",
        "name": "AMAL ASHOKAN",
        "surname": "ASHOKAN",
        "full_name": "AMAL ASHOKAN",
        "occupation": "F&B SERVER",
        "cost_centre": "DON FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "567890X",
        "address": "1, High St, Hamrun",
        "mobile": "99567890",
        "email": "amal.ashokan@example.com",
        "punch_card": "1006",
        "venue": GLOBAL_VENUE,
        "vendor": "Don Royale",
        "hourly_rate": 11.00,
        "gender": "Male",
        "dob": "1995-04-18",
        "employment_date": "2020-05-22"
    },
    "1007": {
        "code": "1007",
        "name": "NIKOL AVGUSTOVA",
        "surname": "AVGUSTOVA",
        "full_name": "NIKOL AVGUSTOVA",
        "occupation": "KITCHEN INTERN",
        "cost_centre": "C&B KTCH",
        "department": "Kitchen",
        "employment_type": "Internship",
        "id_number": "112233K",
        "address": "St Pauls Bay",
        "mobile": "99112233",
        "email": "nikol.avgustova@example.com",
        "punch_card": "1007",
        "venue": GLOBAL_VENUE,
        "vendor": "Caviar and Bull",
        "hourly_rate": 9.00,
        "gender": "Female",
        "dob": "2004-08-30",
        "employment_date": "2024-01-15"
    },
    "1008": {
        "code": "1008",
        "name": "BHIM BAHADUR",
        "surname": "BAHADUR",
        "full_name": "BHIM BAHADUR",
        "occupation": "CLEANER",
        "cost_centre": "DON KTCH",
        "department": "Kitchen",
        "employment_type": "Full Time",
        "id_number": "778899N",
        "address": "Qormi",
        "mobile": "99778899",
        "email": "bhim.bahadur@example.com",
        "punch_card": "1008",
        "venue": GLOBAL_VENUE,
        "vendor": "Sole by Tarragon",
        "hourly_rate": 10.50,
        "gender": "Male",
        "dob": "1992-06-21",
        "employment_date": "2022-08-10"
    },
    "1009": {
        "code": "1009",
        "name": "MAHESH PRASAD BHATTARAI",
        "surname": "BHATTARAI",
        "full_name": "MAHESH PRASAD BHATTARAI",
        "occupation": "F&B SERVER",
        "cost_centre": "C&B FOH",
        "department": "Front of House",
        "employment_type": "Full Time",
        "id_number": "334455P",
        "address": "Msida",
        "mobile": "99334455",
        "email": "mahesh.prasad@example.com",
        "punch_card": "1009",
        "venue": GLOBAL_VENUE,
        "vendor": "Don Royale",
        "hourly_rate": 11.00,
        "gender": "Male",
        "dob": "1996-01-30",
        "employment_date": "2021-10-12"
    }
}

# -----------------------------------------------------------------------------
# CLOCKING DATA (Calculated operational history)
# -----------------------------------------------------------------------------
def generate_mock_clocking(num_days: int = 90) -> List[Dict[str, Any]]:
    records = []
    # Start date: 90 days before 26/01/2026 for a rich history
    base_date = datetime(2026, 1, 26) - timedelta(days=num_days - 7)
    
    for i in range(num_days): 
        current_date = base_date + timedelta(days=i)
        date_str = current_date.strftime("%d/%m/%Y")
        day_name = current_date.strftime("%A")
        
        for code, emp in MOCK_EMPLOYEES.items():
            # Skip some days randomly for realism (e.g., weekends or random days off)
            if current_date.weekday() >= 6 and random.random() > 0.2: continue # Weekend
            if random.random() < 0.1: continue # Random skip
            
            # Use employee specific rates and slightly varied hours
            start_hour = 8 + random.randint(0, 2)
            end_hour = 16 + random.randint(0, 2)
            
            hours = end_hour - start_hour
            cost = hours * emp["hourly_rate"]
            
            records.append({
                "id": f"clk_{code}_{i}",
                "employee_code": code,
                "employee_name": emp["full_name"],
                "date": date_str,
                "day_of_week": day_name,
                "clock_in": f"{start_hour:02d}:{random.randint(0, 59):02d}",
                "clock_out": f"{end_hour:02d}:{random.randint(0, 59):02d}",
                "hours_worked": hours,
                "total_cost": cost,
                "venue": emp["venue"],
                "vendor": emp["vendor"],
                "status": "APPROVED",
                "remarks": "Regular Duty"
            })
    
    return records

MOCK_CLOCKING = generate_mock_clocking(90) # Generates ~900 entries
