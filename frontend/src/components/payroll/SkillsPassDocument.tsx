import React from 'react';
import { Card } from '@/components/ui/card';

/**
 * SkillsPassDocument - Exact replica of the Malta Skills Pass Certificate
 * Supporting both the Certificate view and the Verification Batch view.
 */
export default function SkillsPassDocument({ data, view = 'certificate' }) {
    const {
        fullName = 'ARDA KOC',
        candidateNumber = '40379',
        jobFamily = 'Revenue Analyst',
        level = 'RED',
        issuanceDate = '07-Aug-2025',
        batchNumber = '69',
        publicKey = '0x646f8870fbbfef4eab416e8ed46e787a842f98c4',
        issuer = 'Skills Pass Malta',
        issuerPosition = 'Senior Manager',
        issuerName = 'Martina Vella Montebello'
    } = data;

    if (view === 'batch') {
        return (
            <div id="skillspass-batch-to-export" className="bg-white text-black p-12 max-w-[210mm] mx-auto text-center" style={{ fontFamily: 'Arial, sans-serif'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                <div className="flex justify-center mb-16">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border-4 border-orange-500 rotate-45 flex items-center justify-center">
                            <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Skills Pass</span>
                    </div>
                </div>

                <h1 className="text-2xl font-bold mb-16">2025 August 07 Skills Pass Full Batch {batchNumber}</h1>

                <div className="space-y-8 mb-16">
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Issue Date</div>
                        <div className="text-lg font-bold">{issuanceDate}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Recipient</div>
                        <div className="text-lg font-bold">{fullName}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Issuer</div>
                        <div className="text-lg font-bold">{issuer}</div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Issuer Information</div>
                        <div className="text-xs break-all max-w-md mx-auto">Public Key: {publicKey}</div>
                        <div className="text-blue-600 underline text-xs mt-1">certificates.skillspass.org.mt</div>
                    </div>
                </div>

                <div className="mb-16 flex flex-col items-center">
                    <p className="text-xs mb-4">Scan the QR code to verify the document.</p>
                    <div className="w-32 h-32 border-2 border-black p-1">
                        <div className="w-full h-full bg-black flex items-center justify-center">
                            <div className="grid grid-cols-10 gap-[1px]">
                                {Array.from({ length: 100 }).map((_, i) => (
                                    <div key={i} className={`w-2 h-2 ${Math.random() > 0.4 ? 'bg-white' : 'bg-black'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-2 mt-auto grayscale opacity-50">
                    <div className="h-6 w-px bg-gray-400 mx-2" />
                    <span className="text-xs font-bold tracking-tighter">BLOCKCERTS</span>
                    <div className="text-[8px] leading-tight text-left">The Open Standard For <br /> Blockchain Credentials</div>
                </div>
            </div>
        );
    }

    return (
        <div id="skillspass-cert-to-export" className="bg-white text-black p-0 max-w-[210mm] mx-auto relative min-h-[297mm] flex flex-col" style={{ fontFamily: 'Arial, sans-serif'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
            {/* Top Border */}
            <div className="h-3 bg-orange-600 w-full" />

            <div className="p-12 flex-1 flex flex-col items-center">
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-12">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 border-[12px] border-orange-600 rotate-45 flex items-center justify-center relative shadow-sm">
                            <div className="absolute top-1 right-1 w-4 h-4 bg-orange-600" />
                        </div>
                        <div className="text-left">
                            <div className="text-6xl font-black tracking-tighter leading-none mb-1">Skills Pass</div>
                            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 tracking-tight leading-none">Tourism & Hospitality</div>
                        </div>
                    </div>
                </div>

                <div className="text-center w-full space-y-10">
                    <h2 className="text-xl font-bold tracking-wide uppercase italic text-gray-700">Certificate of Skills Pass Achievement</h2>

                    <div className="space-y-6">
                        <div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Full Name</div>
                            <div className="text-3xl font-bold uppercase">{fullName}</div>
                        </div>

                        <div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Candidate Number</div>
                            <div className="text-2xl font-bold">{candidateNumber}</div>
                        </div>

                        <div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Job Family</div>
                            <div className="text-xl font-bold">{jobFamily}</div>
                        </div>

                        <div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Level</div>
                            <div className="text-2xl font-black tracking-widest">{level}</div>
                        </div>
                    </div>

                    <div className="pt-12">
                        <p className="text-lg max-w-lg mx-auto leading-tight">
                            This certificate acknowledges completion of the full Skills Pass process.
                        </p>
                    </div>

                    {/* Signature Section */}
                    <div className="flex flex-col items-center pt-8">
                        <div className="mb-2 italic text-3xl font-serif text-foreground tracking-wider">
                            {/* Placeholder for Signature Image */}
                            <span style={{ fontFamily: 'cursive'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{issuerName}</span>
                        </div>
                        <div className="w-48 h-px bg-black mb-2" />
                        <div className="text-sm font-bold leading-tight">{issuerName}</div>
                        <div className="text-xs text-gray-600">Senior Manager</div>
                        <div className="text-xs text-gray-600">Institute of Tourism Studies - Malta</div>
                    </div>

                    <div className="pt-6">
                        <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">Issuance Date</div>
                        <div className="text-lg font-bold">{issuanceDate}</div>
                    </div>

                    {/* Bottom QR Code */}
                    <div className="flex flex-col items-center py-6">
                        <div className="w-24 h-24 border-2 border-black p-1">
                            <div className="w-full h-full bg-black flex items-center justify-center">
                                <div className="grid grid-cols-8 gap-[1px]">
                                    {Array.from({ length: 64 }).map((_, i) => (
                                        <div key={i} className={`w-2 h-2 ${Math.random() > 0.4 ? 'bg-white' : 'bg-black'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Border */}
            <div className="h-3 bg-orange-600 w-full mt-auto" />
        </div>
    );
}
