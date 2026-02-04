'use client';

import { POSLayout } from '../../features/pos/components/POSLayout';
import { usePOS } from '../../features/pos/logic/usePOS';

export default function POSPage() {
    // Determine input mode based on device? For now defaults.
    return (
        <div className="h-screen w-screen bg-black overflow-hidden">
            <POSLayout />
        </div>
    );
}
