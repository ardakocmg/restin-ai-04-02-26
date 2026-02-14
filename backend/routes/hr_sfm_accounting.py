"""SFM Accounting Integration Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_sfm_accounting import GLAccount, LedgerEntry, BankReconciliation, VATReturn


def create_hr_sfm_accounting_router():
    router = APIRouter(tags=["hr_sfm_accounting"])
    
    @router.post("/venues/{venue_id}/accounting/gl-accounts")
    async def create_gl_account(
        venue_id: str,
        account_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        account = GLAccount(
            venue_id=venue_id,
            account_code=account_data["account_code"],
            account_name=account_data["account_name"],
            account_type=account_data["account_type"],
            parent_account=account_data.get("parent_account")
        )
        
        await db.gl_accounts.insert_one(account.model_dump())
        return account.model_dump()
    
    @router.get("/venues/{venue_id}/accounting/gl-accounts")
    async def list_gl_accounts(
        venue_id: str,
        account_type: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id, "active": True}
        if account_type:
            query["account_type"] = account_type
        
        accounts = await db.gl_accounts.find(query, {"_id": 0}).to_list(500)
        return accounts
    
    @router.post("/venues/{venue_id}/accounting/ledger-entries")
    async def create_ledger_entry(
        venue_id: str,
        entry_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        entry = LedgerEntry(
            venue_id=venue_id,
            entry_date=entry_data["entry_date"],
            account_id=entry_data["account_id"],
            account_code=entry_data["account_code"],
            debit=entry_data.get("debit", 0),
            credit=entry_data.get("credit", 0),
            description=entry_data["description"],
            reference=entry_data.get("reference"),
            source=entry_data["source"],
            source_id=entry_data["source_id"]
        )
        
        # Update account balance
        balance_change = entry.debit - entry.credit
        await db.gl_accounts.update_one(
            {"id": entry.account_id},
            {"$inc": {"balance": balance_change}}
        )
        
        await db.ledger_entries.insert_one(entry.model_dump())
        return entry.model_dump()
    
    @router.get("/venues/{venue_id}/accounting/ledger-entries")
    async def list_ledger_entries(
        venue_id: str,
        account_id: Optional[str] = None,
        source: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if account_id:
            query["account_id"] = account_id
        if source:
            query["source"] = source
        if start_date or end_date:
            query["entry_date"] = {}
            if start_date:
                query["entry_date"]["$gte"] = start_date
            if end_date:
                query["entry_date"]["$lte"] = end_date
        
        entries = await db.ledger_entries.find(query, {"_id": 0}).sort("entry_date", -1).to_list(500)
        return entries
    
    @router.post("/venues/{venue_id}/accounting/bank-reconciliation")
    async def create_bank_reconciliation(
        venue_id: str,
        reconciliation_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        reconciliation = BankReconciliation(
            venue_id=venue_id,
            bank_account_id=reconciliation_data["bank_account_id"],
            statement_date=reconciliation_data["statement_date"],
            statement_balance=reconciliation_data["statement_balance"],
            book_balance=reconciliation_data["book_balance"],
            reconciled_balance=reconciliation_data["reconciled_balance"],
            outstanding_checks=reconciliation_data.get("outstanding_checks", []),
            deposits_in_transit=reconciliation_data.get("deposits_in_transit", [])
        )
        
        await db.bank_reconciliations.insert_one(reconciliation.model_dump())
        return reconciliation.model_dump()
    
    @router.get("/venues/{venue_id}/accounting/bank-reconciliation")
    async def list_bank_reconciliations(
        venue_id: str,
        bank_account_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if bank_account_id:
            query["bank_account_id"] = bank_account_id
        
        reconciliations = await db.bank_reconciliations.find(query, {"_id": 0}).sort("statement_date", -1).to_list(1000)
        return reconciliations
    
    @router.post("/venues/{venue_id}/accounting/vat-returns")
    async def create_vat_return(
        venue_id: str,
        vat_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        vat_return = VATReturn(
            venue_id=venue_id,
            period_start=vat_data["period_start"],
            period_end=vat_data["period_end"],
            total_sales=vat_data["total_sales"],
            vat_on_sales=vat_data["vat_on_sales"],
            total_purchases=vat_data["total_purchases"],
            vat_on_purchases=vat_data["vat_on_purchases"],
            vat_payable=vat_data["vat_payable"]
        )
        
        await db.vat_returns.insert_one(vat_return.model_dump())
        return vat_return.model_dump()
    
    @router.get("/venues/{venue_id}/accounting/vat-returns")
    async def list_vat_returns(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        returns = await db.vat_returns.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("period_start", -1).to_list(1000)
        return returns
    
    return router
