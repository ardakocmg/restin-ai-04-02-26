from xml.etree.ElementTree import Element, SubElement, tostring
from datetime import datetime
import uuid

class SEPAService:
    def __init__(self, company_name: str, iban: str, bic: str):
        self.company_name = company_name
        self.iban = iban
        self.bic = bic

    def generate_bulk_payment_xml(self, payments: list, execution_date: str = None) -> bytes:
        """
        Generates a SEPA pain.001.001.03 XML string.
        payments: list of dicts with {'name', 'iban', 'amount', 'reference'}
        """
        if not execution_date:
            execution_date = datetime.now().strftime("%Y-%m-%d")

        msg_id = f"PAY-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        total_amount = sum(p['amount'] for p in payments)
        num_tx = len(payments)

        # Root
        root = Element("Document")
        root.set("xmlns", "urn:iso:std:iso:20022:tech:xsd:pain.001.001.03")
        
        cstmr_pmt_initn = SubElement(root, "CstmrPmtInitn")
        
        # Group Header
        grp_hdr = SubElement(cstmr_pmt_initn, "GrpHdr")
        SubElement(grp_hdr, "MsgId").text = msg_id
        SubElement(grp_hdr, "CreDtTm").text = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        SubElement(grp_hdr, "NbOfTxs").text = str(num_tx)
        SubElement(grp_hdr, "CtrlSum").text = f"{total_amount:.2f}"
        
        initg_pty = SubElement(grp_hdr, "InitgPty")
        SubElement(initg_pty, "Nm").text = self.company_name
        
        # Payment Information
        pmt_inf = SubElement(cstmr_pmt_initn, "PmtInf")
        SubElement(pmt_inf, "PmtInfId").text = f"INF-{msg_id}"
        SubElement(pmt_inf, "PmtMtd").text = "TRF"
        SubElement(pmt_inf, "NbOfTxs").text = str(num_tx)
        SubElement(pmt_inf, "CtrlSum").text = f"{total_amount:.2f}"
        
        # Debtor
        dbtr = SubElement(pmt_inf, "Dbtr")
        SubElement(dbtr, "Nm").text = self.company_name
        
        dbtr_acct = SubElement(pmt_inf, "DbtrAcct")
        id_acct = SubElement(dbtr_acct, "Id")
        SubElement(id_acct, "IBAN").text = self.iban
        
        dbtr_agt = SubElement(pmt_inf, "DbtrAgt")
        fin_instn_id = SubElement(dbtr_agt, "FinInstnId")
        SubElement(fin_instn_id, "BIC").text = self.bic

        # Transactions
        for pmt in payments:
            cdt_trf_tx_inf = SubElement(pmt_inf, "CdtTrfTxInf")
            
            pmt_id = SubElement(cdt_trf_tx_inf, "PmtId")
            SubElement(pmt_id, "EndToEndId").text = f"E2E-{str(uuid.uuid4())[:8].upper()}"
            
            amt = SubElement(cdt_trf_tx_inf, "Amt")
            instd_amt = SubElement(amt, "InstdAmt")
            instd_amt.set("Ccy", "EUR")
            instd_amt.text = f"{pmt['amount']:.2f}"
            
            cdtr_acct = SubElement(cdt_trf_tx_inf, "CdtrAcct")
            id_cdtr = SubElement(cdtr_acct, "Id")
            SubElement(id_cdtr, "IBAN").text = pmt['iban']
            
            cdtr = SubElement(cdt_trf_tx_inf, "Cdtr")
            SubElement(cdtr, "Nm").text = pmt['name']
            
            rmt_inf = SubElement(cdt_trf_tx_inf, "RmtInf")
            SubElement(rmt_inf, "Ustrd").text = pmt.get('reference', 'Payroll Payment')

        return tostring(root, encoding='utf-8')
