import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button'; // Verified import
import { ArrowLeft, Construction, ChevronRight } from 'lucide-react';
import PageContainer from '@/layouts/PageContainer';
import { logger } from '@/lib/logger';

export default function HRModulePlaceholder() {
    const { moduleName } = useParams();
    const navigate = useNavigate();

    const displayTitle = moduleName ? moduleName.replace(/-/g, ' ').toUpperCase() : 'HR MODULE';

    useEffect(() => {
        logger.debug('HRModulePlaceholder mounted');
    }, []);

    return (
        <PageContainer title={displayTitle} description="Advanced Indigo Module Architecture">
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative">
                    <div className="h-32 w-32 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 animate-pulse">
                        <Construction className="h-12 w-12 text-blue-400" />
                    </div>
                    <div className="absolute -inset-4 bg-blue-500/5 rounded-full blur-2xl -z-10" />
                </div>

                <div className="space-y-4 max-w-md">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{displayTitle}</h2>
                    <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed">
                        This module is part of the "Ultimate Package" synchronization.
                        The backend engine is currently preparing the high-fidelity data structures required for this specific Indigo parity layer.
                    </p>
                </div>

                <div className="flex gap-4">
                    <Button
                        onClick={() => navigate('/admin/hr')}
                        variant="outline"
                        className="border-white/10 bg-zinc-900/50 hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest h-12 px-8 rounded-xl"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Return to Hub
                    </Button>
                    <Button
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        Sync Status
                    </Button>
                </div>

                <div className="pt-12 flex items-center gap-2 text-[9px] text-zinc-700 font-bold uppercase tracking-[0.3em]">
                    <span>Indigo Parity</span>
                    <ChevronRight className="h-2 w-2" />
                    <span>Module v1.0</span>
                    <ChevronRight className="h-2 w-2" />
                    <span>Draft State</span>
                </div>
            </div>
        </PageContainer>
    );
}
