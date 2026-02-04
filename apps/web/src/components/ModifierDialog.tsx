'use client';
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@antigravity/ui';

export default function ModifierDialog({ open, onClose, item, onConfirm }: any) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle>Customize {item?.name}</DialogTitle>
                </DialogHeader>
                <div className="py-8 text-center text-zinc-400">
                    <p>Modifiers would appear here.</p>
                </div>
                <Button onClick={() => onConfirm(item)} className="w-full bg-blue-600">Add to Order</Button>
            </DialogContent>
        </Dialog>
    );
}
