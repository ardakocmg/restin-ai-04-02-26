import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

/**
 * FS3Document - Exact replica of the Maltese FS3 (Final Settlement System)
 * Payee Statement of Earnings as per the Malta FSS standard.
 */
export default function FS3Document({ fs3Data, venue = null }) {
    const { payee, payer, period, emoluments, deductions, sscTable, year } = fs3Data;

    // Use venue branding if available
    const displayPayerName = venue?.legal_info?.registered_name || payer.name;
    const displayPayerAddress = venue?.legal_info?.registered_address || `${payer.address}, ${payer.locality}`;
    const displayPayerPE = venue?.legal_info?.pe_number || payer.peNumber;
    const displayPrincipal = venue?.legal_info?.principal_name || payer.principalName;
    const displayPosition = venue?.legal_info?.principal_position || payer.principalPosition;
    const displayLogo = venue?.branding?.logo_url || null;
    const primaryColor = venue?.branding?.primary_color || "#000000";

    const rowStyle = "border-b border-border py-1 flex justify-between items-center";
    const labelStyle = "text-[10px] font-medium text-foreground uppercase";
    const valueStyle = "text-[12px] font-bold text-black font-mono";
    const sectionTitleStyle = "bg-gray-800 text-foreground px-2 py-0.5 text-[11px] font-bold uppercase mb-2";

    return (
        <div id="fs3-to-export" className="fs3-document !bg-white !text-black p-6 max-w-[210mm] mx-auto border border-border shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* Top Header */}
            <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                <div className="flex items-baseline gap-4">
                    <h1 className="text-4xl font-black tracking-tighter">FS3</h1>
                    <div className="leading-tight">
                        <h2 className="text-xl font-bold uppercase">Final Settlement System (FSS)</h2>
                        <h3 className="text-lg font-medium">Payee Statement of Earnings</h3>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold uppercase">{payee.surname}</div>
                    <div className="text-[8px] text-muted-foreground italic">Restin.ai Payroll</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">

                {/* SECTION A: Payee Information */}
                <div className="col-span-8">
                    <div className={sectionTitleStyle}>A  Payee Information</div>
                    <div className="space-y-1">
                        <div className={rowStyle}>
                            <span className={labelStyle}>Surname</span>
                            <span className={valueStyle}>{payee.surname}</span>
                        </div>
                        <div className={rowStyle}>
                            <span className={labelStyle}>First Name</span>
                            <span className={valueStyle}>{payee.firstName}</span>
                        </div>
                        <div className={rowStyle}>
                            <span className={labelStyle}>Address</span>
                            <span className={valueStyle}>{payee.address}</span>
                        </div>
                        <div className={rowStyle}>
                            <div></div>
                            <span className={valueStyle}>{payee.locality}</span>
                        </div>
                        <div className={rowStyle}>
                            <span className={labelStyle}>Post Code</span>
                            <span className={valueStyle}>{payee.postCode}</span>
                        </div>
                        <div className={rowStyle}>
                            <span className={labelStyle}>Telephone Number</span>
                            <span className={valueStyle}>{payee.telephone}</span>
                        </div>
                    </div>
                </div>

                {/* SECTION A Continued (Right Side) */}
                <div className="col-span-4 space-y-4">
                    <div>
                        <div className="flex justify-between items-center border border-black p-1">
                            <span className="text-[9px] font-bold">A1</span>
                            <div className="text-center">
                                <div className="text-[8px] uppercase">For year ended 31st December</div>
                                <div className="text-xl font-bold">{year}</div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <span className="text-[9px] font-bold bg-muted px-1">A2</span>
                            <div className="flex-1">
                                <div className="text-[8px] uppercase">Payee's ID Card / IT Reg. No.</div>
                                <div className="border border-black p-1 text-center font-bold text-sm">{payee.idNumber}</div>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-[9px] font-bold bg-muted px-1">A3</span>
                            <div className="flex-1">
                                <div className="text-[8px] uppercase">Payee's Social Security No.</div>
                                <div className="border border-black p-1 text-center font-bold text-sm">{payee.ssNumber}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION B: Period */}
                <div className="col-span-12">
                    <div className="flex items-center gap-4 border-t-2 border-black pt-2">
                        <div className={sectionTitleStyle.replace('mb-2', 'mb-0')}>B  Period</div>
                        <div className="flex gap-4 items-center flex-1 justify-center">
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold">From B1</span>
                                <span className="border border-black px-4 py-0.5 font-bold">{period.start}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold">To B2</span>
                                <span className="border border-black px-4 py-0.5 font-bold">{period.end}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION C & D: Gross Emoluments & Tax */}
                <div className="col-span-12 grid grid-cols-2 gap-8 mt-4 border-t-2 border-black pt-4">
                    {/* Section C */}
                    <div>
                        <div className={sectionTitleStyle}>C  Gross Emoluments</div>
                        <div className="space-y-0.5">
                            {[
                                { label: "Gross Emoluments (FSS Main or FSS Other applies)", code: "C1", value: emoluments.c1 },
                                { label: "Overtime (Eligible for 15% tax deduction)", code: "C1A", value: emoluments.c1a },
                                { label: "Director's Fees", code: "C1B", value: emoluments.c1b },
                                { label: "Gross Emoluments (FSS Part-time method applies)", code: "C2", value: emoluments.c2 },
                                { label: "Fringe Benefits - excl. Share Options", code: "C3", value: emoluments.c3 },
                                { label: "Share Options fringe benefits taxed at 15%", code: "C3a", value: emoluments.c3a }
                            ].map(item => (
                                <div key={item.code} className="flex justify-between items-center text-[10px]">
                                    <span className="flex-1">{item.label}</span>
                                    <span className="w-10 text-center font-bold bg-muted mr-2">{item.code}</span>
                                    <span className="w-20 border border-black px-1 text-right font-mono">{item.value.toFixed(0)}</span>
                                </div>
                            ))}

                            {/* Fringe Benefits breakdown (Right side align) */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="space-y-1">
                                    {['Cat 1 C5', 'Cat 2 C6', 'Cat 3 C7'].map((label, i) => (
                                        <div key={label} className="flex justify-between items-center text-[9px]">
                                            <span className="font-bold underline italic mr-2">{label}</span>
                                            <span className="w-16 border border-black px-1 text-right">{emoluments[`c${5 + i}`] || 0}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex flex-col justify-end">
                                    <div className="flex justify-between items-start text-[8px] leading-tight">
                                        <span className="uppercase text-muted-foreground mr-1">Non Taxable Car Cash Allowance (50% of Allowance up to a maximum of € 1170)</span>
                                        <span className="font-bold bg-muted px-1">C8</span>
                                        <span className="w-16 border border-black px-1 text-right">{emoluments.c8 || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[11px] font-bold mt-2 pt-1 border-t border-gray-400">
                                <span>Total Gross Emoluments & Fringe Benefits</span>
                                <span className="w-10 text-center bg-gray-800 text-foreground mr-2">C4</span>
                                <span className="w-20 border border-black px-1 text-right font-mono italic">€ {emoluments.c4.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section D */}
                    <div>
                        <div className={sectionTitleStyle}>D  Tax Deductions</div>
                        <div className="space-y-0.5">
                            {[
                                { label: "Tax Deductions (FSS Main or FSS Other applies)", code: "D1", value: deductions.d1 },
                                { label: "Tax Deductions (Eligible Overtime)", code: "D1A", value: deductions.d1a },
                                { label: "Tax Deductions (FSS Part-time method applies)", code: "D2", value: deductions.d2 },
                                { label: "Tax Arrears Deductions", code: "D3", value: deductions.d3 },
                                { label: "15% tax on Share Options", code: "D3a", value: deductions.d3a }
                            ].map(item => (
                                <div key={item.code} className="flex justify-between items-center text-[10px]">
                                    <span className="flex-1">{item.label}</span>
                                    <span className="w-10 text-center font-bold bg-muted mr-2">{item.code}</span>
                                    <span className="w-20 border border-black px-1 text-right font-mono">{item.value.toFixed(0)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center text-[11px] font-bold mt-2 pt-1 border-t border-gray-400">
                                <span>Total Tax Deductions</span>
                                <span className="w-10 text-center bg-gray-800 text-foreground mr-2">D4</span>
                                <span className="w-20 border border-black px-1 text-right font-mono bg-gray-100">€ {deductions.d4.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION E: Social Security table */}
                <div className="col-span-12 mt-4 border-t-2 border-black pt-4">
                    <div className={sectionTitleStyle}>E  Social Security and Maternity Fund Information</div>
                    <table className="w-full text-[10px] border-collapse border border-gray-300">
                        <thead>
                            <tr className="bg-gray-100 text-center font-bold">
                                <td colSpan={3} className="border border-border py-1">Basic Weekly Wage</td>
                                <td colSpan={3} className="border border-gray-300">Social Security Contributions</td>
                                <td className="border border-gray-300">Maternity Fund</td>
                                <td colSpan={3} className="border border-gray-300">Weeks without pay</td>
                            </tr>
                            <tr className="text-[8px] text-center uppercase">
                                <td className="border border-gray-300">€</td>
                                <td className="border border-gray-300">Number</td>
                                <td className="border border-gray-300">Category</td>
                                <td className="border border-gray-300">Payee €</td>
                                <td className="border border-gray-300">Payer €</td>
                                <td className="border border-border font-bold bg-gray-200">Total SSC €</td>
                                <td className="border border-gray-300">Payer €</td>
                                <td className="border border-gray-300">From</td>
                                <td className="border border-gray-300">To</td>
                                <td className="border border-gray-300">Number</td>
                            </tr>
                        </thead>
                        <tbody>
                            {sscTable.map((row, idx) => (
                                <tr key={idx} className="text-right font-mono">
                                    <td className="border border-border pr-1">{row.wage.toFixed(2)}</td>
                                    <td className="border border-border pr-1">{row.number.toFixed(2)}</td>
                                    <td className="border border-border text-center font-sans">{row.category}</td>
                                    <td className="border border-border pr-1">{row.payee.toFixed(2)}</td>
                                    <td className="border border-border pr-1">{row.payer.toFixed(2)}</td>
                                    <td className="border border-border pr-1 bg-gray-50">{row.total.toFixed(2)}</td>
                                    <td className="border border-border pr-1">{row.maternity.toFixed(2)}</td>
                                    <td className="border border-gray-300"></td>
                                    <td className="border border-gray-300"></td>
                                    <td className="border border-gray-300"></td>
                                </tr>
                            ))}
                            <tr className="font-bold bg-gray-100">
                                <td colSpan={3} className="border border-border text-right pr-2 uppercase font-sans">Total</td>
                                <td className="border border-border text-right pr-1 font-mono">0.00</td>
                                <td className="border border-border text-right pr-1 font-mono">0.00</td>
                                <td className="border border-border text-right pr-1 font-mono bg-gray-200">0.00</td>
                                <td className="border border-border text-right pr-1 font-mono">25.40</td>
                                <td colSpan={3} className="border-none text-left bg-white text-black font-sans px-2">E1</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* SECTION F: Payer Information */}
                <div className="col-span-12 mt-6 border-t-2 border-black pt-4 mb-4">
                    <div className="grid grid-cols-12 gap-8">
                        <div className="col-span-8 border border-border p-2">
                            <div className={sectionTitleStyle}>F  Payer Information</div>
                            <div className="text-[10px] space-y-1">
                                <div className="flex gap-4">
                                    <span className="w-24 uppercase text-gray-500">Business Name</span>
                                    <span className="font-bold">{displayPayerName}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="w-24 uppercase text-gray-500">Address</span>
                                    <div>
                                        <p>{displayPayerAddress}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="w-24 uppercase text-gray-500">Telephone</span>
                                    <span>{payer.telephone}</span>
                                </div>
                                <div className="flex gap-4 pt-2">
                                    <span className="w-24 uppercase text-gray-500">Principal's Name</span>
                                    <span className="font-bold">{displayPrincipal}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="w-24 uppercase text-gray-500">Principal's Position</span>
                                    <span className="italic">{displayPosition}</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-4 space-y-4">
                            <div className="flex gap-2 items-center">
                                <span className="text-[9px] font-bold bg-muted px-1">F1</span>
                                <div className="flex-1">
                                    <div className="text-[8px] uppercase">Payer P.E. Number</div>
                                    <div className="border border-black p-1 text-center font-bold text-sm tracking-widest">{displayPayerPE}</div>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="text-[9px] font-bold bg-muted px-1">F2</span>
                                <div className="flex-1">
                                    <div className="text-[8px] uppercase">Date</div>
                                    <div className="border border-black p-1 text-center font-bold text-sm">{new Date().toLocaleDateString('en-GB')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Logo */}
            <div className="mt-8 pt-4 border-t border-border flex items-center gap-2">
                <div className="text-sm font-black text-foreground tracking-tighter">RESTIN.AI</div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-widest">Payroll Services</div>
            </div>
        </div>
    );
}
