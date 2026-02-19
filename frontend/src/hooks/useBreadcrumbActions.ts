import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Download,
    Plus,
    RefreshCw,
    Printer,
    FileSpreadsheet,
    Filter,
    Settings,
    Calendar,
    type LucideIcon,
} from 'lucide-react';

export interface BreadcrumbAction {
    id: string;
    label: string;
    icon: LucideIcon;
    /** If set, clicking navigates to this href */
    href?: string;
    /** Visual variant */
    variant: 'default' | 'primary' | 'ghost';
}

/**
 * Returns a list of contextual quick-action buttons based on the current route.
 *
 * These appear in the breadcrumb strip as small pill buttons.
 * Each route pattern can define its own relevant actions.
 */
export function useBreadcrumbActions(): BreadcrumbAction[] {
    const location = useLocation();

    return useMemo(() => {
        const path = location.pathname;

        // ─── Reports Pages: Export + Print ───
        if (path.includes('/reports/') || path.includes('/hr-reports/')) {
            return [
                { id: 'export-csv', label: 'Export CSV', icon: FileSpreadsheet, variant: 'default' },
                { id: 'export-pdf', label: 'Export PDF', icon: Download, variant: 'default' },
                { id: 'print', label: 'Print', icon: Printer, variant: 'ghost' },
            ];
        }

        // ─── HR People/Directory: Add Employee ───
        if (path === '/manager/hr/people' || path === '/manager/hr') {
            return [
                { id: 'add-employee', label: 'Add Employee', icon: Plus, variant: 'primary' },
                { id: 'export-csv', label: 'Export', icon: Download, variant: 'default' },
                { id: 'filter', label: 'Filter', icon: Filter, variant: 'ghost' },
            ];
        }

        // ─── Clocking Data ───
        if (path.includes('/hr/clocking')) {
            return [
                { id: 'add-entry', label: 'Add Entry', icon: Plus, variant: 'primary', href: '/manager/hr/clocking/add' },
                { id: 'export-csv', label: 'Export', icon: Download, variant: 'default' },
                { id: 'date-range', label: 'Date Range', icon: Calendar, variant: 'ghost' },
            ];
        }

        // ─── Leave Management ───
        if (path.includes('/hr/leave')) {
            return [
                { id: 'request-leave', label: 'Request Leave', icon: Plus, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
            ];
        }

        // ─── Payroll ───
        if (path.includes('/hr/payroll') || path.includes('/payroll')) {
            return [
                { id: 'run-payroll', label: 'Run Payroll', icon: RefreshCw, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
                { id: 'print', label: 'Print All', icon: Printer, variant: 'ghost' },
            ];
        }

        // ─── Scheduler ───
        if (path.includes('/hr/scheduler') || path.includes('/hr/shifts')) {
            return [
                { id: 'add-shift', label: 'Add Shift', icon: Plus, variant: 'primary' },
                { id: 'date-range', label: 'Week View', icon: Calendar, variant: 'ghost' },
            ];
        }

        // ─── Products ───
        if (path === '/manager/products') {
            return [
                { id: 'add-product', label: 'Add Product', icon: Plus, variant: 'primary' },
                { id: 'import', label: 'Import', icon: FileSpreadsheet, variant: 'default' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
            ];
        }

        // ─── Inventory Items ───
        if (path.includes('/inventory-items')) {
            return [
                { id: 'add-item', label: 'Add Item', icon: Plus, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
                { id: 'stock-count', label: 'Stock Count', icon: RefreshCw, variant: 'ghost', href: '/manager/inventory-stock-count' },
            ];
        }

        // ─── Inventory Recipes ── (actions are in the page command row)
        // Intentionally empty – New Recipe & Import live in the compact command bar

        // ─── Suppliers ───
        if (path.includes('/suppliers') || path.includes('/inventory-suppliers')) {
            return [
                { id: 'add-supplier', label: 'Add Supplier', icon: Plus, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
            ];
        }

        // ─── Purchase Orders ───
        if (path.includes('/purchase-orders')) {
            return [
                { id: 'create-po', label: 'New PO', icon: Plus, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
            ];
        }

        // ─── Reservations ───
        if (path === '/manager/reservations') {
            return [
                { id: 'add-reservation', label: 'New Booking', icon: Plus, variant: 'primary' },
                { id: 'date-range', label: 'Date Range', icon: Calendar, variant: 'ghost' },
            ];
        }

        // ─── CRM & Guests ───
        if (path === '/manager/crm' || path === '/manager/guest-profiles') {
            return [
                { id: 'add-guest', label: 'Add Guest', icon: Plus, variant: 'primary' },
                { id: 'export', label: 'Export', icon: Download, variant: 'default' },
            ];
        }

        // ─── Settings Pages ───
        if (path.includes('/settings') || path.includes('/hr-setup')) {
            return [
                { id: 'save', label: 'Save', icon: Settings, variant: 'primary' },
            ];
        }

        // ─── Dashboard pages: just refresh ───
        if (path.includes('dashboard') || path === '/manager') {
            return [
                { id: 'refresh', label: 'Refresh', icon: RefreshCw, variant: 'ghost' },
            ];
        }

        // Default: no actions
        return [];
    }, [location.pathname]);
}
