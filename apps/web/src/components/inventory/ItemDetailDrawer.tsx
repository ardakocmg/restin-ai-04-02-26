'use client';
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@antigravity/ui';

export default function ItemDetailDrawer({ open, onClose, skuId }: any) {
    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Item Details (SKU: {skuId})</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                    <p className="text-zinc-400">Detailed item view coming soon.</p>
                </div>
            </SheetContent>
        </Sheet>
    );
}
