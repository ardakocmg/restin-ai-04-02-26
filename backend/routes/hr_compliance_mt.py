import logging
logger = logging.getLogger(__name__)

"""
Malta Payroll Compliance Routes
Handles FS3, FS5, FS7 and SEPA XML Generation
"""
from fastapi import APIRouter, Depends, HTTPException, Response
from typing import List, Dict
import xml.etree.ElementTree as ET
from datetime import datetime
from pydantic import BaseModel

from core.dependencies import get_current_user, check_venue_access, get_database
from core.database import db # Direct import for some queries if needed, but dependency is better
from models.hr_payroll_advanced import PayrollRun

router = APIRouter(tags=["hr_compliance_mt"])

# --- Models ---

class FS5Data(BaseModel):
    month: str
    year: str
    number_of_payees: int
    total_gross_emoluments: float
    total_fss_tax: float
    total_ssc_employee: float
    total_ssc_employer: float
    total_maternity_fund: float
    total_payment_due: float

class FS3Data(BaseModel):
    year: str
    employee_code: str
    employee_name: str
    id_card: str
    gross_emoluments: float
    fss_tax_deducted: float
    ssc_employee: float
    maternity_fund: float = 0
    fringe_benefits: float = 0

class FS7Data(BaseModel):
    year: str
    total_sheets_attached: int
    total_gross_emoluments: float
    total_fss_tax: float
    total_ssc: float
    total_maternity_fund: float
    total_due: float

def extract_component_amount(components: list, name_match: str) -> float:
    """Helper to extract amount from components list based on name substring"""
    total = 0.0
    for comp in components:
        if name_match.lower() in comp['component_name'].lower():
            total += comp['amount']
    return total

def get_month_year_from_period(period_end: str):
    # Assumes DD/MM/YYYY format or similar
    try:
        parts = period_end.split('/')
        if len(parts) == 3:
            return parts[1], parts[2]
        return "01", datetime.now().strftime("%Y")
    except Exception as e:
        logger.warning(f"Silenced error: {e}")
        return "01", datetime.now().strftime("%Y")


# --- Endpoints ---

@router.get("/venues/{venue_id}/hr/payroll/runs/{run_id}/sepa-xml")
async def generate_sepa_xml(
    venue_id: str,
    run_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a SEPA Credit Transfer (pain.001.001.03) XML file.
    """
    await check_venue_access(current_user, venue_id)
    
    # 1. Find the run
    run_data = await db["payroll_runs"].find_one({"id": run_id, "venue_id": venue_id})
    if not run_data:
        raise HTTPException(404, "Payroll run not found")
    
    # Adapt to Pydantic model (handle potential field mismatches gracefully)
    # We use validation=False or manual dict access if needed, but let's try strict first
    try:
        run = PayrollRun.model_validate(run_data)
    except Exception as e:
        # Fallback if DB schema drifted
        print(f"Schema validation warning: {e}")
        run = run_data # Treat as dict
        
    payslips = run.payslips if hasattr(run, 'payslips') else run_data.get('payslips', [])
    run_name = run.run_name if hasattr(run, 'run_name') else run_data.get('run_name', '')
    total_net = run.total_net if hasattr(run, 'total_net') else run_data.get('total_net', 0.0)
    period_start = run.period_start if hasattr(run, 'period_start') else run_data.get('period_start', '')
    period_end = run.period_end if hasattr(run, 'period_end') else run_data.get('period_end', '')

    # 2. Get Venue Data for Metadata
    venue = await db["venues"].find_one({"id": venue_id})
    legal = venue.get("legal_info", {}) if venue else {}
    
    comp_name = legal.get("registered_name", "RESTIN HOTEL OPERATIONS LTD")
    comp_iban = legal.get("iban", "MT99VALL9999999999999999999999")
    comp_bic = legal.get("bic", "VALLMTMT")

    # 3. SEPA XML Structure Construction
    NS = "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
    ET.register_namespace("", NS)
    
    root = ET.Element(f"{{{NS}}}Document")
    cstmr_cdt_trf_initn = ET.SubElement(root, "CstmrCdtTrfInitn")
    
    # --- Group Header ---
    grp_hdr = ET.SubElement(cstmr_cdt_trf_initn, "GrpHdr")
    ET.SubElement(grp_hdr, "MsgId").text = f"RUN-{run_id[-8:]}-{datetime.now().strftime('%H%M')}"
    ET.SubElement(grp_hdr, "CreDtTm").text = datetime.now().isoformat()
    ET.SubElement(grp_hdr, "NbOfTxs").text = str(len(payslips))
    ET.SubElement(grp_hdr, "CtrlSum").text = f"{total_net:.2f}"
    
    initg_pty = ET.SubElement(grp_hdr, "InitgPty")
    ET.SubElement(initg_pty, "Nm").text = comp_name
    
    # --- Payment Information ---
    pmt_inf = ET.SubElement(cstmr_cdt_trf_initn, "PmtInf")
    ET.SubElement(pmt_inf, "PmtInfId").text = f"SALARY-{run_name[:10]}"
    ET.SubElement(pmt_inf, "PmtMtd").text = "TRF"
    ET.SubElement(pmt_inf, "ReqdExctnDt").text = datetime.now().strftime("%Y-%m-%d")
    
    # Debtor (Employer)
    dbtr = ET.SubElement(pmt_inf, "Dbtr")
    ET.SubElement(dbtr, "Nm").text = comp_name
    
    dbtr_acct = ET.SubElement(pmt_inf, "DbtrAcct")
    id_tag = ET.SubElement(dbtr_acct, "Id")
    ET.SubElement(id_tag, "IBAN").text = comp_iban
    
    dbtr_agt = ET.SubElement(pmt_inf, "DbtrAgt")
    fin_inst = ET.SubElement(dbtr_agt, "FinInstnId")
    ET.SubElement(fin_inst, "BIC").text = comp_bic
    
    # --- Credit Transfer Transaction Information ---
    for slip in payslips:
        # Pydantic or Dict
        if isinstance(slip, dict):
             net_pay = slip.get('net_pay', 0)
             emp_name = slip.get('employee_name', 'Unknown')
             emp_code = slip.get('employee_id', '000')
        else:
             net_pay = slip.net_pay
             emp_name = slip.employee_name
             emp_code = slip.employee_id
             
        txn = ET.SubElement(pmt_inf, "CdtTrfTxInf")
        
        pmt_id = ET.SubElement(txn, "PmtId")
        ET.SubElement(pmt_id, "EndToEndId").text = f"SALARY-{emp_code}"
        
        amt = ET.SubElement(txn, "Amt")
        ET.SubElement(amt, "InstdAmt", Ccy="EUR").text = f"{net_pay:.2f}"
        
        cdtr = ET.SubElement(txn, "Cdtr")
        ET.SubElement(cdtr, "Nm").text = emp_name
        
        cdtr_acct = ET.SubElement(txn, "CdtrAcct")
        id_tag_c = ET.SubElement(cdtr_acct, "Id")
        ET.SubElement(id_tag_c, "IBAN").text = "MT55HSBC8888888888888888888888" # Mock - Need Employee Bank Info
        
        rmt_inf = ET.SubElement(txn, "RmtInf")
        ET.SubElement(rmt_inf, "Ustrd").text = f"Salary {period_start} - {period_end}"

    xml_str = ET.tostring(root, encoding="utf-8", method="xml")
    
    return Response(content=xml_str, media_type="application/xml", headers={
        "Content-Disposition": f"attachment; filename=SEPA_PAYROLL_{run_id}.xml"
    })

@router.get("/venues/{venue_id}/hr/payroll/reports/fs5/{run_id}", response_model=FS5Data)
async def get_fs5_report(
    venue_id: str,
    run_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate FS5 Monthly Return data"""
    await check_venue_access(current_user, venue_id)
    
    run_data = await db["payroll_runs"].find_one({"id": run_id, "venue_id": venue_id})
    if not run_data:
        raise HTTPException(404, "Payroll run not found")
    
    # Manual extraction to ensure component logic works
    payslips = run_data.get('payslips', [])
    total_gross = run_data.get('total_gross', 0)
    total_tax = run_data.get('total_tax', 0)
    
    total_ssc_emp = 0.0
    
    for slip in payslips:
        comps = slip.get('components', [])
        # Extract fields directly from components if we can identify them
        # Or if the payslip object has them (PayslipData usually sums them up but maybe not strictly SSC separate)
        
        # Try finding SSC in components
        total_ssc_emp += extract_component_amount(comps, "Social Security")
        
    employer_ssc = total_ssc_emp # Mock 1:1 match
    maternity = total_gross * 0.003
    
    month, year = get_month_year_from_period(run_data.get('period_end', ''))
    
    return FS5Data(
        month=month,
        year=year,
        number_of_payees=len(payslips),
        total_gross_emoluments=total_gross,
        total_fss_tax=total_tax,
        total_ssc_employee=total_ssc_emp,
        total_ssc_employer=employer_ssc,
        total_maternity_fund=maternity,
        total_payment_due=total_tax + total_ssc_emp + employer_ssc + maternity
    )

@router.get("/venues/{venue_id}/hr/payroll/reports/fs5/{run_id}/pdf")
async def get_fs5_pdf(
    venue_id: str,
    run_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate FS5 PDF for a specific payroll run"""
    await check_venue_access(current_user, venue_id)
    
    # 1. Get Data
    data = await get_fs5_report(venue_id, run_id, current_user)
    venue = await db["venues"].find_one({"id": venue_id})
    legal = venue.get("legal_info", {}) if venue else {}
    
    # 2. Prepare PDF data
    pdf_payload = data.model_dump()
    pdf_payload['employer_name'] = legal.get('registered_name', venue.get('name'))
    pdf_payload['pe_number'] = legal.get('pe_number', 'N/A')
    
    # 3. Generate
    from services.pdf_generation_service import pdf_service
    pdf_bytes = pdf_service.generate_fs5_pdf(pdf_payload)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=FS5_{pdf_payload['month']}_{pdf_payload['year']}.pdf"}
    )

@router.get("/venues/{venue_id}/hr/payroll/reports/fs3/{year}", response_model=List[FS3Data])
async def get_fs3_annual(
    venue_id: str,
    year: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate Annual FS3 data"""
    await check_venue_access(current_user, venue_id)
    
    # Filter runs for year
    cursor = db["payroll_runs"].find({
        "venue_id": venue_id,
        "period_end": {"$regex": f"{year}$"},
        "state": {"$in": ["approved", "locked", "dispatched", "validated"]} # Only committed runs
    })
    runs = await cursor.to_list(1000)
    
    employee_totals: Dict[str, FS3Data] = {}
    
    for run in runs:
        for slip in run.get('payslips', []):
            emp_id = slip.get('employee_id')
            if not emp_id: continue
            
            if emp_id not in employee_totals:
                employee_totals[emp_id] = FS3Data(
                    year=year,
                    employee_code=slip.get('employee_number', '000'),
                    employee_name=slip.get('employee_name', 'Unknown'),
                    id_card="MockID",
                    gross_emoluments=0,
                    fss_tax_deducted=0,
                    ssc_employee=0
                )
            
            data = employee_totals[emp_id]
            data.gross_emoluments += slip.get('gross_pay', 0)
            data.fss_tax_deducted += slip.get('tax_amount', 0)
            data.ssc_employee += extract_component_amount(slip.get('components', []), "Social Security")
            
    return list(employee_totals.values())

@router.get("/venues/{venue_id}/hr/payroll/reports/fs3/{year}/pdf")
async def get_fs3_annual_pdf_pack(
    venue_id: str,
    year: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate a ZIP containing individual FS3 PDFs for all employees"""
    await check_venue_access(current_user, venue_id)
    
    fs3_data_list = await get_fs3_annual(venue_id, year, current_user)
    
    import io
    import zipfile
    from services.pdf_generation_service import pdf_service
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for emp_data in fs3_data_list:
            pdf_bytes = pdf_service.generate_fs3_pdf(emp_data.model_dump())
            filename = f"FS3_{year}_{emp_data.employee_name.replace(' ', '_')}.pdf"
            zip_file.writestr(filename, pdf_bytes)
            
    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.read(),
        media_type="application/x-zip-compressed",
        headers={"Content-Disposition": f"attachment; filename=FS3_Pack_{year}.zip"}
    )

@router.get("/venues/{venue_id}/hr/payroll/reports/fs7/{year}", response_model=FS7Data)
async def get_fs7_annual(
    venue_id: str,
    year: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate FS7 Annual Reconciliation"""
    await check_venue_access(current_user, venue_id)
    
    cursor = db["payroll_runs"].find({
        "venue_id": venue_id,
        "period_end": {"$regex": f"{year}$"},
         "state": {"$in": ["approved", "locked", "dispatched", "validated"]}
    })
    runs = await cursor.to_list(1000)
    
    total_gross = 0
    total_tax = 0
    total_ssc_emp = 0
    employees = set()
    
    for run in runs:
        for slip in run.get('payslips', []):
            employees.add(slip.get('employee_id'))
            total_gross += slip.get('gross_pay', 0)
            total_tax += slip.get('tax_amount', 0)
            total_ssc_emp += extract_component_amount(slip.get('components', []), "Social Security")
            
    total_ssc = total_ssc_emp * 2
    total_maternity = total_gross * 0.003
    
    return FS7Data(
        year=year,
        total_sheets_attached=len(employees),
        total_gross_emoluments=total_gross,
        total_fss_tax=total_tax,
        total_ssc=total_ssc,
        total_maternity_fund=total_maternity,
        total_due=total_tax + total_ssc + total_maternity
    )

def create_hr_compliance_mt_router():
    return router
