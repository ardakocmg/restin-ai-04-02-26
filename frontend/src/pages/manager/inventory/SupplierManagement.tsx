/**
 * SupplierManagement — Full Supplier Directory with CRUD
 * Apicbase parity: contacts, certifications, min order, delivery schedule, performance scores
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Truck, Plus, Search, Phone, Mail, MapPin, FileText, Star,
    Shield, Clock, Package, DollarSign, RefreshCw, Loader2,
    Edit, Trash2, CheckCircle2, AlertTriangle, Globe, Filter,
    Award, Calendar, TrendingUp, Building2, MoreHorizontal,
    ChevronDown, X, Copy, ExternalLink,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* ────────────────────────────────────────── Types ────────────────── */
interface SupplierContact {
    name: string;
    role: string;
    phone: string;
    email: string;
}

interface SupplierCertification {
    name: string;
    expiry: string;
    status: 'valid' | 'expiring' | 'expired';
}

interface DeliverySchedule {
    day: string;
    cutoffTime: string;
    leadTimeDays: number;
}

interface Supplier {
    _id: string;
    name: string;
    code: string;
    category: string;
    status: 'active' | 'inactive' | 'on_hold' | 'blocked';
    contacts: SupplierContact[];
    certifications: SupplierCertification[];
    deliverySchedule: DeliverySchedule[];
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    taxId: string;
    currency: string;
    paymentTerms: string;
    minOrderValue: number;
    rating: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
    itemCount: number;
    totalSpendYTD: number;
    lastOrderDate: string;
    notes: string;
    createdAt: string;
}

/* ────────────────────────────────────── Constants ────────────────── */
const CATEGORIES = [
    'Produce', 'Meat & Poultry', 'Seafood', 'Dairy', 'Bakery',
    'Beverages', 'Dry Goods', 'Frozen', 'Cleaning & Chemical',
    'Packaging', 'Equipment', 'Other',
];

const PAYMENT_TERMS = [
    'COD', 'Net 7', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Prepaid',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ──────────────────────────── Helper Components ─────────────────── */
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: {
    icon: React.ElementType; label: string; value: string | number; subtext?: string; color?: string;
}) {
    return (
        <Card className="border-white/5 bg-zinc-900/40">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-white/5', color)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn('text-lg font-bold', color)}>{value}</p>
                        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: Supplier['status'] }) {
    const config = {
        active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
        inactive: { label: 'Inactive', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30' },
        on_hold: { label: 'On Hold', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
        blocked: { label: 'Blocked', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
    }[status];
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
    const s = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <Star
                    key={i}
                    className={cn(s, i <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-600')}
                />
            ))}
        </div>
    );
}

function CertBadge({ cert }: { cert: SupplierCertification }) {
    const colors = {
        valid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        expiring: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        expired: 'bg-red-500/10 text-red-400 border-red-500/30',
    }[cert.status];
    return (
        <Badge variant="outline" className={cn('text-[10px]', colors)}>
            <Shield className="h-2.5 w-2.5 mr-1" />
            {cert.name}
        </Badge>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  SUPPLIER MANAGEMENT PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function SupplierManagement() {
    const { t } = useTranslation();
    const { selectedVenue } = useVenue();

    /* ── State ── */
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState<Supplier | null>(null);
    const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    /* ── Form State ── */
    const emptyForm: Partial<Supplier> = {
        name: '', code: '', category: 'Produce', status: 'active',
        address: '', city: '', country: '', phone: '', email: '', website: '',
        taxId: '', currency: 'EUR', paymentTerms: 'Net 30', minOrderValue: 0,
        rating: 3, notes: '', contacts: [], certifications: [], deliverySchedule: [],
    };
    const [form, setForm] = useState<Partial<Supplier>>(emptyForm);

    /* ── Load Data ── */
    const loadData = useCallback(async () => {
        if (!selectedVenue?._id) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/suppliers?venue_id=${selectedVenue._id}`);
            setSuppliers(res.data?.suppliers || res.data || []);
        } catch (err) {
            logger.error('Failed to load suppliers', err);
            // Seed demo data for development
            setSuppliers(getDemoSuppliers());
        } finally {
            setLoading(false);
        }
    }, [selectedVenue?._id]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Demo Data ── */
    function getDemoSuppliers(): Supplier[] {
        return [
            {
                _id: 's1', name: 'Fresh Fields Produce', code: 'FFP-001',
                category: 'Produce', status: 'active',
                contacts: [
                    { name: 'Marco Vella', role: 'Account Manager', phone: '+356 2123 4567', email: 'marco@freshfields.mt' },
                    { name: 'Sarah Borg', role: 'Logistics', phone: '+356 2123 4568', email: 'sarah@freshfields.mt' },
                ],
                certifications: [
                    { name: 'ISO 22000', expiry: '2026-08-15', status: 'valid' },
                    { name: 'Organic EU', expiry: '2026-03-01', status: 'expiring' },
                ],
                deliverySchedule: [
                    { day: 'Monday', cutoffTime: '14:00', leadTimeDays: 1 },
                    { day: 'Wednesday', cutoffTime: '14:00', leadTimeDays: 1 },
                    { day: 'Friday', cutoffTime: '12:00', leadTimeDays: 1 },
                ],
                address: '12 Industrial Estate', city: 'Marsa', country: 'Malta',
                phone: '+356 2123 4567', email: 'orders@freshfields.mt', website: 'freshfields.mt',
                taxId: 'MT12345678', currency: 'EUR', paymentTerms: 'Net 30',
                minOrderValue: 50, rating: 5, onTimeDeliveryRate: 96.5,
                qualityScore: 98, itemCount: 47, totalSpendYTD: 18450,
                lastOrderDate: '2026-02-18', notes: 'Premium local produce supplier',
                createdAt: '2025-01-15',
            },
            {
                _id: 's2', name: 'Mediterranean Meats', code: 'MM-002',
                category: 'Meat & Poultry', status: 'active',
                contacts: [
                    { name: 'Joe Camilleri', role: 'Sales Director', phone: '+356 2134 5678', email: 'joe@medmeats.mt' },
                ],
                certifications: [
                    { name: 'HACCP', expiry: '2026-12-31', status: 'valid' },
                    { name: 'Halal Certified', expiry: '2026-09-15', status: 'valid' },
                ],
                deliverySchedule: [
                    { day: 'Tuesday', cutoffTime: '10:00', leadTimeDays: 2 },
                    { day: 'Thursday', cutoffTime: '10:00', leadTimeDays: 2 },
                ],
                address: '45 Abattoir Road', city: 'Marsa', country: 'Malta',
                phone: '+356 2134 5678', email: 'orders@medmeats.mt', website: 'medmeats.mt',
                taxId: 'MT23456789', currency: 'EUR', paymentTerms: 'Net 15',
                minOrderValue: 100, rating: 4, onTimeDeliveryRate: 91.2,
                qualityScore: 95, itemCount: 32, totalSpendYTD: 24800,
                lastOrderDate: '2026-02-17', notes: 'Best angus beef supplier',
                createdAt: '2025-03-20',
            },
            {
                _id: 's3', name: 'Ocean Harvest Seafood', code: 'OHS-003',
                category: 'Seafood', status: 'active',
                contacts: [
                    { name: 'Peter Grech', role: 'Owner', phone: '+356 2145 6789', email: 'peter@oceanharvest.mt' },
                ],
                certifications: [
                    { name: 'MSC Certified', expiry: '2025-11-30', status: 'expired' },
                ],
                deliverySchedule: [
                    { day: 'Monday', cutoffTime: '06:00', leadTimeDays: 0 },
                    { day: 'Wednesday', cutoffTime: '06:00', leadTimeDays: 0 },
                    { day: 'Friday', cutoffTime: '06:00', leadTimeDays: 0 },
                ],
                address: 'Fishmarket Wharf', city: 'Valletta', country: 'Malta',
                phone: '+356 2145 6789', email: 'orders@oceanharvest.mt', website: '',
                taxId: 'MT34567890', currency: 'EUR', paymentTerms: 'COD',
                minOrderValue: 75, rating: 4, onTimeDeliveryRate: 88.0,
                qualityScore: 92, itemCount: 21, totalSpendYTD: 12300,
                lastOrderDate: '2026-02-19', notes: 'Daily fresh catch — same day delivery',
                createdAt: '2025-02-10',
            },
            {
                _id: 's4', name: 'Gozitan Dairy Co', code: 'GDC-004',
                category: 'Dairy', status: 'on_hold',
                contacts: [
                    { name: 'Anna Xuereb', role: 'Sales', phone: '+356 2156 7890', email: 'anna@gozitandairy.mt' },
                ],
                certifications: [
                    { name: 'ISO 9001', expiry: '2026-06-30', status: 'valid' },
                ],
                deliverySchedule: [
                    { day: 'Tuesday', cutoffTime: '16:00', leadTimeDays: 2 },
                ],
                address: '3 Cheesery Lane', city: 'Victoria', country: 'Malta',
                phone: '+356 2156 7890', email: 'sales@gozitandairy.mt', website: 'gozitandairy.mt',
                taxId: 'MT45678901', currency: 'EUR', paymentTerms: 'Net 30',
                minOrderValue: 30, rating: 3, onTimeDeliveryRate: 78.5,
                qualityScore: 85, itemCount: 15, totalSpendYTD: 6200,
                lastOrderDate: '2026-01-28', notes: 'On hold — quality issue with last batch',
                createdAt: '2025-04-01',
            },
            {
                _id: 's5', name: 'CleanPro Supplies', code: 'CPS-005',
                category: 'Cleaning & Chemical', status: 'active',
                contacts: [
                    { name: 'David Farrugia', role: 'Account Rep', phone: '+356 2167 8901', email: 'david@cleanpro.mt' },
                ],
                certifications: [],
                deliverySchedule: [
                    { day: 'Wednesday', cutoffTime: '12:00', leadTimeDays: 3 },
                ],
                address: '78 Industrial Park', city: 'Mosta', country: 'Malta',
                phone: '+356 2167 8901', email: 'orders@cleanpro.mt', website: 'cleanpro.mt',
                taxId: 'MT56789012', currency: 'EUR', paymentTerms: 'Net 45',
                minOrderValue: 200, rating: 3, onTimeDeliveryRate: 82.0,
                qualityScore: 88, itemCount: 28, totalSpendYTD: 3400,
                lastOrderDate: '2026-02-10', notes: '',
                createdAt: '2025-06-15',
            },
        ];
    }

    /* ── Filters ── */
    const filtered = useMemo(() => {
        let result = [...suppliers];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.code.toLowerCase().includes(q) ||
                s.email.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q)
            );
        }
        if (categoryFilter !== 'all') result = result.filter(s => s.category === categoryFilter);
        if (statusFilter !== 'all') result = result.filter(s => s.status === statusFilter);
        return result;
    }, [suppliers, search, categoryFilter, statusFilter]);

    /* ── Stats ── */
    const stats = useMemo(() => {
        const active = suppliers.filter(s => s.status === 'active').length;
        const totalItems = suppliers.reduce((sum, s) => sum + s.itemCount, 0);
        const totalSpend = suppliers.reduce((sum, s) => sum + s.totalSpendYTD, 0);
        const avgOnTime = suppliers.length
            ? suppliers.reduce((sum, s) => sum + s.onTimeDeliveryRate, 0) / suppliers.length
            : 0;
        const expiringCerts = suppliers
            .flatMap(s => s.certifications)
            .filter(c => c.status === 'expiring' || c.status === 'expired').length;
        return { active, totalItems, totalSpend, avgOnTime, expiringCerts };
    }, [suppliers]);

    /* ── Form Field Update ── */
    const updateForm = (field: string, value: unknown) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    /* ── Save ── */
    const handleSave = async () => {
        if (!form.name?.trim()) {
            toast.error('Supplier name is required');
            return;
        }
        try {
            if (editingSupplier?._id) {
                await api.put(`/api/inventory/suppliers/${editingSupplier._id}`, {
                    ...form, venue_id: selectedVenue?._id,
                });
                toast.success('Supplier updated');
            } else {
                await api.post('/api/inventory/suppliers', {
                    ...form, venue_id: selectedVenue?._id,
                });
                toast.success('Supplier created');
            }
            setDialogOpen(false);
            setEditingSupplier(null);
            setForm(emptyForm);
            loadData();
        } catch (err) {
            logger.error('Save supplier failed', err);
            toast.error('Failed to save supplier');
        }
    };

    /* ── Delete ── */
    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/api/inventory/suppliers/${id}`);
            toast.success('Supplier deleted');
            setDeleteConfirm(null);
            loadData();
        } catch (err) {
            logger.error('Delete supplier failed', err);
            toast.error('Failed to delete supplier');
        }
    };

    /* ── Open Edit ── */
    const openEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setForm({ ...supplier });
        setDialogOpen(true);
    };

    /* ── Contact Management ── */
    const addContact = () => {
        const contacts = [...(form.contacts || []), { name: '', role: '', phone: '', email: '' }];
        updateForm('contacts', contacts);
    };
    const removeContact = (idx: number) => {
        const contacts = (form.contacts || []).filter((_, i) => i !== idx);
        updateForm('contacts', contacts);
    };
    const updateContact = (idx: number, field: string, value: string) => {
        const contacts = [...(form.contacts || [])];
        contacts[idx] = { ...contacts[idx], [field]: value };
        updateForm('contacts', contacts);
    };

    /* ── Certification Management ── */
    const addCert = () => {
        const certs = [...(form.certifications || []), { name: '', expiry: '', status: 'valid' as const }];
        updateForm('certifications', certs);
    };
    const removeCert = (idx: number) => {
        const certs = (form.certifications || []).filter((_, i) => i !== idx);
        updateForm('certifications', certs);
    };
    const updateCert = (idx: number, field: string, value: string) => {
        const certs = [...(form.certifications || [])];
        certs[idx] = { ...certs[idx], [field]: value };
        updateForm('certifications', certs);
    };

    /* ── Delivery Schedule Management ── */
    const addSchedule = () => {
        const sched = [...(form.deliverySchedule || []), { day: 'Monday', cutoffTime: '12:00', leadTimeDays: 1 }];
        updateForm('deliverySchedule', sched);
    };
    const removeSchedule = (idx: number) => {
        const sched = (form.deliverySchedule || []).filter((_, i) => i !== idx);
        updateForm('deliverySchedule', sched);
    };
    const updateSchedule = (idx: number, field: string, value: string | number) => {
        const sched = [...(form.deliverySchedule || [])];
        sched[idx] = { ...sched[idx], [field]: value };
        updateForm('deliverySchedule', sched);
    };

    /* ═══════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════ */
    return (
        <PageContainer
            title="Supplier Management"
            subtitle="Manage your supplier directory, contacts, certifications & delivery schedules"
            icon={<Truck className="h-5 w-5 text-blue-400" />}
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                        {t('common.refresh', 'Refresh')}
                    </Button>
                    <Button size="sm" onClick={() => { setEditingSupplier(null); setForm(emptyForm); setDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Supplier
                    </Button>
                </div>
            }
        >
            {/* ── KPI Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <StatCard icon={Truck} label="Active Suppliers" value={stats.active} color="text-blue-400" />
                <StatCard icon={Package} label="Total Items" value={stats.totalItems} color="text-emerald-400" />
                <StatCard icon={DollarSign} label="YTD Spend" value={`€${stats.totalSpend.toLocaleString()}`} color="text-amber-400" />
                <StatCard icon={Clock} label="Avg On-Time" value={`${stats.avgOnTime.toFixed(1)}%`} color="text-purple-400" />
                <StatCard icon={Shield} label="Cert Alerts" value={stats.expiringCerts} subtext="expiring/expired" color={stats.expiringCerts > 0 ? 'text-red-400' : 'text-emerald-400'} />
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 bg-zinc-900/50 border-white/10"
                        placeholder="Search suppliers..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] bg-zinc-900/50 border-white/10">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-zinc-900/50 border-white/10">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                </Select>
                <Badge variant="outline" className="text-muted-foreground border-white/10">
                    {filtered.length} supplier{filtered.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* ── Supplier Cards Grid ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Truck className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-lg font-medium">No suppliers found</p>
                    <p className="text-sm">Create your first supplier to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(supplier => (
                        <Card
                            key={supplier._id}
                            className="border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-white/10 transition-all cursor-pointer group"
                            onClick={() => setDetailOpen(supplier)}
                        >
                            <CardContent className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
                                            <StatusBadge status={supplier.status} />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="outline" className="text-[10px] border-white/10">{supplier.code}</Badge>
                                            <span>{supplier.category}</span>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); openEdit(supplier); }}>
                                                <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(supplier.email); toast.success('Email copied'); }}>
                                                <Copy className="h-3.5 w-3.5 mr-2" /> Copy Email
                                            </DropdownMenuItem>
                                            {supplier.website && (
                                                <DropdownMenuItem onClick={e => { e.stopPropagation(); window.open(`https://${supplier.website}`, '_blank'); }}>
                                                    <ExternalLink className="h-3.5 w-3.5 mr-2" /> Website
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-400"
                                                onClick={e => { e.stopPropagation(); setDeleteConfirm(supplier._id); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Rating & Performance */}
                                <div className="flex items-center gap-4 mb-3">
                                    <RatingStars rating={supplier.rating} />
                                    <div className="flex items-center gap-1 text-xs">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className={cn(
                                            supplier.onTimeDeliveryRate >= 90 ? 'text-emerald-400' :
                                                supplier.onTimeDeliveryRate >= 80 ? 'text-amber-400' : 'text-red-400'
                                        )}>
                                            {supplier.onTimeDeliveryRate}% on-time
                                        </span>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3 w-3" /> <span className="truncate">{supplier.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3 w-3" /> <span>{supplier.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3 w-3" /> <span>{supplier.city}, {supplier.country}</span>
                                    </div>
                                </div>

                                {/* Certifications */}
                                {supplier.certifications.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {supplier.certifications.map((cert, i) => (
                                            <CertBadge key={i} cert={cert} />
                                        ))}
                                    </div>
                                )}

                                {/* Footer Stats */}
                                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-muted-foreground">
                                    <span>{supplier.itemCount} items</span>
                                    <span>€{supplier.totalSpendYTD.toLocaleString()} YTD</span>
                                    <span>{supplier.paymentTerms}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ═══════════ SUPPLIER DETAIL SHEET ═══════════ */}
            <Dialog open={!!detailOpen} onOpenChange={() => setDetailOpen(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-blue-400" />
                            {detailOpen?.name}
                        </DialogTitle>
                        <DialogDescription>
                            {detailOpen?.code} · {detailOpen?.category}
                        </DialogDescription>
                    </DialogHeader>

                    {detailOpen && (
                        <div className="space-y-6">
                            {/* Performance */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Rating</p>
                                    <RatingStars rating={detailOpen.rating} size="md" />
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">On-Time</p>
                                    <p className={cn('text-lg font-bold',
                                        detailOpen.onTimeDeliveryRate >= 90 ? 'text-emerald-400' : 'text-amber-400'
                                    )}>{detailOpen.onTimeDeliveryRate}%</p>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                                    <p className={cn('text-lg font-bold',
                                        detailOpen.qualityScore >= 90 ? 'text-emerald-400' : 'text-amber-400'
                                    )}>{detailOpen.qualityScore}%</p>
                                </div>
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">YTD Spend</p>
                                    <p className="text-lg font-bold text-amber-400">€{detailOpen.totalSpendYTD.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-blue-400" /> Contact Information
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {detailOpen.email}</div>
                                    <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {detailOpen.phone}</div>
                                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {detailOpen.address}, {detailOpen.city}</div>
                                    {detailOpen.website && <div className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> {detailOpen.website}</div>}
                                </div>
                            </div>

                            {/* Contacts */}
                            {detailOpen.contacts.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-purple-400" /> Key Contacts
                                    </h4>
                                    <div className="space-y-2">
                                        {detailOpen.contacts.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-white/5 text-sm">
                                                <div>
                                                    <p className="font-medium">{c.name}</p>
                                                    <p className="text-xs text-muted-foreground">{c.role}</p>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <p>{c.phone}</p>
                                                    <p>{c.email}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Delivery Schedule */}
                            {detailOpen.deliverySchedule.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-emerald-400" /> Delivery Schedule
                                    </h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {detailOpen.deliverySchedule.map((s, i) => (
                                            <div key={i} className="p-2 rounded-lg bg-zinc-900/50 border border-white/5 text-center text-xs">
                                                <p className="font-medium">{s.day}</p>
                                                <p className="text-muted-foreground">Cut-off: {s.cutoffTime}</p>
                                                <p className="text-muted-foreground">Lead: {s.leadTimeDays}d</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Certifications */}
                            {detailOpen.certifications.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-amber-400" /> Certifications
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {detailOpen.certifications.map((cert, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/50 border border-white/5 text-xs">
                                                <CertBadge cert={cert} />
                                                <span className="text-muted-foreground">exp. {cert.expiry}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Order Details */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div className="p-2 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <p className="text-muted-foreground">Min Order</p>
                                    <p className="font-semibold">€{detailOpen.minOrderValue}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <p className="text-muted-foreground">Payment</p>
                                    <p className="font-semibold">{detailOpen.paymentTerms}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <p className="text-muted-foreground">Tax ID</p>
                                    <p className="font-semibold">{detailOpen.taxId}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900/50 border border-white/5">
                                    <p className="text-muted-foreground">Last Order</p>
                                    <p className="font-semibold">{detailOpen.lastOrderDate}</p>
                                </div>
                            </div>

                            {/* Notes */}
                            {detailOpen.notes && (
                                <div className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 text-sm">
                                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                    <p>{detailOpen.notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailOpen(null)}>Close</Button>
                        <Button onClick={() => { if (detailOpen) { openEdit(detailOpen); setDetailOpen(null); } }}>
                            <Edit className="h-4 w-4 mr-1" /> Edit Supplier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ CREATE / EDIT DIALOG ═══════════ */}
            <Dialog open={dialogOpen} onOpenChange={v => { if (!v) { setDialogOpen(false); setEditingSupplier(null); } }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSupplier ? 'Edit Supplier' : 'New Supplier'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingSupplier ? 'Update supplier details' : 'Add a new supplier to your directory'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Supplier Name *</Label>
                                <Input value={form.name || ''} onChange={e => updateForm('name', e.target.value)} placeholder="Fresh Fields Produce" />
                            </div>
                            <div>
                                <Label>Supplier Code</Label>
                                <Input value={form.code || ''} onChange={e => updateForm('code', e.target.value)} placeholder="FFP-001" />
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={form.category || 'Produce'} onValueChange={v => updateForm('category', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Status</Label>
                                <Select value={form.status || 'active'} onValueChange={v => updateForm('status', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                        <SelectItem value="on_hold">On Hold</SelectItem>
                                        <SelectItem value="blocked">Blocked</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Email</Label>
                                <Input value={form.email || ''} onChange={e => updateForm('email', e.target.value)} placeholder="orders@supplier.com" />
                            </div>
                            <div>
                                <Label>Phone</Label>
                                <Input value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} placeholder="+356 2123 4567" />
                            </div>
                            <div>
                                <Label>Website</Label>
                                <Input value={form.website || ''} onChange={e => updateForm('website', e.target.value)} placeholder="supplier.mt" />
                            </div>
                            <div>
                                <Label>Tax ID</Label>
                                <Input value={form.taxId || ''} onChange={e => updateForm('taxId', e.target.value)} placeholder="MT12345678" />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Address</Label>
                                <Input value={form.address || ''} onChange={e => updateForm('address', e.target.value)} />
                            </div>
                            <div>
                                <Label>City</Label>
                                <Input value={form.city || ''} onChange={e => updateForm('city', e.target.value)} />
                            </div>
                            <div>
                                <Label>Country</Label>
                                <Input value={form.country || ''} onChange={e => updateForm('country', e.target.value)} />
                            </div>
                        </div>

                        {/* Commercial */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Payment Terms</Label>
                                <Select value={form.paymentTerms || 'Net 30'} onValueChange={v => updateForm('paymentTerms', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_TERMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Min Order (€)</Label>
                                <Input type="number" value={form.minOrderValue || 0} onChange={e => updateForm('minOrderValue', Number(e.target.value))} />
                            </div>
                            <div>
                                <Label>Currency</Label>
                                <Select value={form.currency || 'EUR'} onValueChange={v => updateForm('currency', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Key Contacts */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Key Contacts</Label>
                                <Button variant="ghost" size="sm" onClick={addContact}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Contact
                                </Button>
                            </div>
                            {(form.contacts || []).map((c, i) => (
                                <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                                    <Input placeholder="Name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)} />
                                    <Input placeholder="Role" value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} />
                                    <Input placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} />
                                    <Input placeholder="Email" value={c.email} onChange={e => updateContact(i, 'email', e.target.value)} />
                                    <Button variant="ghost" size="icon" onClick={() => removeContact(i)}>
                                        <X className="h-4 w-4 text-red-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Certifications */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Certifications</Label>
                                <Button variant="ghost" size="sm" onClick={addCert}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Certification
                                </Button>
                            </div>
                            {(form.certifications || []).map((c, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                                    <Input placeholder="Cert name (e.g. ISO 22000)" value={c.name} onChange={e => updateCert(i, 'name', e.target.value)} />
                                    <Input type="date" value={c.expiry} onChange={e => updateCert(i, 'expiry', e.target.value)} />
                                    <Select value={c.status} onValueChange={v => updateCert(i, 'status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="valid">Valid</SelectItem>
                                            <SelectItem value="expiring">Expiring</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" onClick={() => removeCert(i)}>
                                        <X className="h-4 w-4 text-red-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Delivery Schedule */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Delivery Schedule</Label>
                                <Button variant="ghost" size="sm" onClick={addSchedule}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Day
                                </Button>
                            </div>
                            {(form.deliverySchedule || []).map((s, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                                    <Select value={s.day} onValueChange={v => updateSchedule(i, 'day', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="time" value={s.cutoffTime} onChange={e => updateSchedule(i, 'cutoffTime', e.target.value)} />
                                    <Input type="number" placeholder="Lead days" value={s.leadTimeDays} onChange={e => updateSchedule(i, 'leadTimeDays', Number(e.target.value))} />
                                    <Button variant="ghost" size="icon" onClick={() => removeSchedule(i)}>
                                        <X className="h-4 w-4 text-red-400" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Notes */}
                        <div>
                            <Label>Notes</Label>
                            <Textarea value={form.notes || ''} onChange={e => updateForm('notes', e.target.value)} rows={3} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingSupplier(null); }}>Cancel</Button>
                        <Button onClick={handleSave}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {editingSupplier ? 'Update' : 'Create'} Supplier
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══════════ DELETE CONFIRM ═══════════ */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-400" /> Delete Supplier
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently delete the supplier. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
