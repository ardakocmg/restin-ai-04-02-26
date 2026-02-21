// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Building2, Code, FileText, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { logger } from '@/lib/logger';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../../components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";

/**
 * Generic Setup Page for HR Dictionaries
 * @param {string} title - Page Title (e.g. "Departments")
 * @param {string} type - Dictionary Type (e.g. "departments") matches backend
 * @param {string} description - Helper text
 * @param {string} icon - Lucide icon name (optional)
 */
export default function GenericSetupPage({ title, type, description, icon: Icon = Building2 }) {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({ name: "", code: "", description: "" });

    useEffect(() => {
        loadData();
    }, [type]);

    const loadData = async () => {
        try {
            setLoading(true);
            const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull"; // Fallback for dev
            const response = await api.get(`/hr/dictionaries/${type}`, {
                params: { venue_id: venueId }
            });
            setItems(response.data || []);
        } catch (error: any) {
            logger.error(`Failed to load ${type}:`, error);
            toast.error(`Failed to load ${title}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";

            await api.post(`/hr/dictionaries/${type}`, {
                venue_id: venueId,
                ...formData
            });

            toast.success(`${formData.name} added successfully`);
            setIsAddOpen(false);
            setFormData({ name: "", code: "", description: "" });
            loadData();
        } catch (error: any) {
            logger.error("Create failed:", error);
            toast.error(error.response?.data?.detail || "Failed to create item");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
            await api.delete(`/hr/dictionaries/${type}/${id}`, {
                params: { venue_id: venueId }
            });
            toast.success("Item deleted");
            loadData();
        } catch (error: any) {
            logger.error("Delete failed:", error);
            toast.error("Failed to delete item");
        }
    };

    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.code?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl">
                        <Icon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                        <p className="text-muted-foreground">{description}</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add {title.slice(0, -1)} {/* Remove plural s usually */}
                </Button>
            </div>

            {/* Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-card border-border w-full max-w-sm"
                />
            </div>

            {/* List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-secondary/50">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground">Name</TableHead>
                            <TableHead className="text-muted-foreground">Code</TableHead>
                            <TableHead className="text-muted-foreground">Description</TableHead>
                            <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    No items found. Click "Add" to create one.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredItems.map((item) => (
                                <TableRow key={item.id} className="border-border hover:bg-white/5">
                                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                                    <TableCell>
                                        {item.code ? (
                                            <span className="px-2 py-1 bg-secondary rounded text-xs font-mono text-secondary-foreground">
                                                {item.code}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                                        {item.description || "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Add New {title.slice(0, -1)}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Name <span className="text-red-500">*</span></label>
                            <Input
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Kitchen, Standard Rate, Full Time"
                                className="bg-card border-border"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Code</label>
                                <Input
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="Optional (e.g. KIT-01)"
                                    className="bg-card border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Description</label>
                                <Input
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional details"
                                    className="bg-card border-border"
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
