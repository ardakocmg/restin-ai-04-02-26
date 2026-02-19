from fastapi import APIRouter, Depends, HTTPException, Response
from core.dependencies import get_current_user, get_database
from models.payroll import PayrollRun
import xml.etree.ElementTree as ET
from datetime import datetime

router = APIRouter(prefix="/hr/payroll/banking", tags=["Payroll Banking"])

@router.get("/runs/{run_id}/sepa-xml")
async def generate_sepa_xml(
    run_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Generates a SEPA Credit Transfer (pain.001.001.03) XML file compliant with 
    Malta Banking Rules (SEPA Rulebook).
    """
    
    # 1. Find the run
    run_data = await db["payroll_runs"].find_one({"id": run_id})
    if not run_data:
        raise HTTPException(404, "Payroll run not found")
    
    run = PayrollRun(**run_data)

    # 2. SEPA XML Structure Construction
    # Namespace for ISO 20022
    NS = "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"
    ET.register_namespace("", NS)
    
    root = ET.Element(f"{{{NS}}}Document")
    cstmr_cdt_trf_initn = ET.SubElement(root, "CstmrCdtTrfInitn")
    
    # --- Group Header ---
    grp_hdr = ET.SubElement(cstmr_cdt_trf_initn, "GrpHdr")
    ET.SubElement(grp_hdr, "MsgId").text = f"RUN-{run_id}-{datetime.now().strftime('%Y%m%d%H%M')}"
    ET.SubElement(grp_hdr, "CreDtTm").text = datetime.now().isoformat()
    ET.SubElement(grp_hdr, "NbOfTxs").text = str(len(run.payslips))
    ET.SubElement(grp_hdr, "CtrlSum").text = f"{run.total_net:.2f}"
    
    initg_pty = ET.SubElement(grp_hdr, "InitgPty")
    ET.SubElement(initg_pty, "Nm").text = "RESTIN HOTEL OPERATIONS LTD" # Mock Company Name
    
    # --- Payment Information ---
    pmt_inf = ET.SubElement(cstmr_cdt_trf_initn, "PmtInf")
    ET.SubElement(pmt_inf, "PmtInfId").text = f"SALARY-{run.run_name}"
    ET.SubElement(pmt_inf, "PmtMtd").text = "TRF" # Transfer
    ET.SubElement(pmt_inf, "ReqdExctnDt").text = datetime.now().strftime("%Y-%m-%d")
    
    # Debtor (Employer)
    dbtr = ET.SubElement(pmt_inf, "Dbtr")
    ET.SubElement(dbtr, "Nm").text = "RESTIN HOTEL OPERATIONS LTD"
    
    dbtr_acct = ET.SubElement(pmt_inf, "DbtrAcct")
    id_tag = ET.SubElement(dbtr_acct, "Id")
    ET.SubElement(id_tag, "IBAN").text = "MT99VALL9999999999999999999999" # Mock BOV IBAN
    
    dbtr_agt = ET.SubElement(pmt_inf, "DbtrAgt")
    fin_inst = ET.SubElement(dbtr_agt, "FinInstnId")
    ET.SubElement(fin_inst, "BIC").text = "VALLMTMT" # Mock BOV BIC
    
    # --- Credit Transfer Transaction Information (Per Employee) ---
    for slip in run.payslips:
        txn = ET.SubElement(pmt_inf, "CdtTrfTxInf")
        
        # Payment ID
        pmt_id = ET.SubElement(txn, "PmtId")
        ET.SubElement(pmt_id, "EndToEndId").text = f"SALARY-{slip.employee_code}"
        
        # Amount
        amt = ET.SubElement(txn, "Amt")
        ET.SubElement(amt, "InstdAmt", Ccy="EUR").text = f"{slip.net_pay:.2f}"
        
        # Creditor (Employee)
        cdtr = ET.SubElement(txn, "Cdtr")
        ET.SubElement(cdtr, "Nm").text = slip.employee_name
        
        # Creditor Account
        cdtr_acct = ET.SubElement(txn, "CdtrAcct")
        id_tag_c = ET.SubElement(cdtr_acct, "Id")
        # Mocking generic MT IBANs for employees if real ones missing
        ET.SubElement(id_tag_c, "IBAN").text = "MT55HSBC8888888888888888888888" 
        
        # Remittance Info
        rmt_inf = ET.SubElement(txn, "RmtInf")
        ET.SubElement(rmt_inf, "Ustrd").text = f"Salary {run.period_start} - {run.period_end}"

    # Generate XML string
    xml_str = ET.tostring(root, encoding="utf-8", method="xml")
    
    return Response(content=xml_str, media_type="application/xml", headers={
        "Content-Disposition": f"attachment; filename=SEPA_PAYROLL_{run_id}.xml"
    })
