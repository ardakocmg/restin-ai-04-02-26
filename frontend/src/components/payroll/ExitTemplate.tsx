import React from 'react';

/**
 * ExitTemplate - Employee Termination/Resignation Settlement Form
 * Replicates the standard Maltese "Quick Exit" summary.
 */
export default function ExitTemplate({ data }) {
    const {
        employeeName = 'Arda Koc',
        employeeId = 'emp-40379',
        exitDate = '31st January 2026',
        reason = 'Resignation',
        noticePeriod = '1 month',
        noticeServed = 'Yes',
        finalWage = '746.99',
        leaveBalance = '12.5 days',
        settlementStatus = 'Final Settlement Pending',
        hrManager = 'Jacqueline Portelli',
        venue = null
    } = data;

    const displayEmployer = venue?.legal_info?.registered_name || "CAVIAR & BULL";
    const displayHR = venue?.legal_info?.hr_manager_name || hrManager;
    const displayLogo = venue?.branding?.logo_url || null;

    const pageClass = "bg-[#ffffff] !text-[#000000] p-[20mm] max-w-[210mm] mx-auto shadow-md min-h-[297mm] flex flex-col text-[12px] leading-relaxed border border-gray-100";

    return (
        <div id="exit-to-export" className={pageClass}>
            {/* Header */}
            <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-zinc-200">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase">Quick Exit</h1>
                    <p className="!text-[#6b7280] font-bold uppercase tracking-widest text-[10px]">Employee Termination Record</p>
                </div>
                <div className="text-right">
                    {displayLogo ? (
                        <img src={displayLogo} alt="Logo" className="max-h-12 object-contain ml-auto mb-1" />
                    ) : (
                        <div className="font-bold text-lg mb-1">{displayEmployer}</div>
                    )}
                    <div className="text-[10px] !text-[#9ca3af]">Human Resources Department</div>
                </div>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="space-y-3">
                    <h3 className="text-muted-foreground font-bold uppercase text-[10px] border-b border-border pb-1">Personel Details</h3>
                    <div className="grid grid-cols-[100px_1fr] flex-none">
                        <span className="font-bold">Full Name:</span> <span>{employeeName}</span>
                        <span className="font-bold">Employee ID:</span> <span>{employeeId}</span>
                        <span className="font-bold">Notice Period:</span> <span>{noticePeriod}</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <h3 className="text-muted-foreground font-bold uppercase text-[10px] border-b border-border pb-1">Exit Information</h3>
                    <div className="grid grid-cols-[100px_1fr]">
                        <span className="font-bold">Last Day:</span> <span>{exitDate}</span>
                        <span className="font-bold">Exit Reason:</span> <span>{reason}</span>
                        <span className="font-bold">Notice Served:</span> <span>{noticeServed}</span>
                    </div>
                </div>
            </div>

            {/* Settlement Table */}
            <div className="mb-12">
                <h3 className="text-muted-foreground font-bold uppercase text-[10px] mb-4">Final Settlement Summary</h3>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-zinc-50 text-[10px] font-bold uppercase">
                            <th className="border border-border p-3 text-left">Description</th>
                            <th className="border border-border p-3 text-right">Amount / Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-border p-3 font-medium">Final Month's Net Salary</td>
                            <td className="border border-border p-3 text-right font-mono">€ {finalWage}</td>
                        </tr>
                        <tr>
                            <td className="border border-border p-3 font-medium">Accumulated Leave Entitlement</td>
                            <td className="border border-border p-3 text-right font-mono text-blue-600">{leaveBalance}</td>
                        </tr>
                        <tr>
                            <td className="border border-border p-3 font-medium">Notice Period Pay (if applicable)</td>
                            <td className="border border-border p-3 text-right font-mono">€ 0.00</td>
                        </tr>
                        <tr className="bg-zinc-50 font-bold">
                            <td className="border border-border p-3 uppercase">Total Settlement Status</td>
                            <td className="border border-border p-3 text-right text-orange-600 dark:text-orange-400 italic">{settlementStatus}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Legal Statement */}
            <div className="bg-zinc-50 p-6 rounded-lg mb-12 border border-zinc-100">
                <h4 className="font-bold uppercase text-[10px] mb-2">Notice of Compliance</h4>
                <p className="text-[10px] text-muted-foreground italic">
                    This document confirms that the employment relationship between the aforementioned employee and {displayEmployer} has been terminated in accordance with the Laws of Malta.
                    All parties agree that the notice periods have been observed or waived as per mutual agreement. The employee acknowledges the receipt of all final dues as outlined in the FS3 for the terminal year.
                </p>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-end mt-auto pt-12">
                <div className="w-64">
                    <div className="border-b-2 border-border mb-2 h-16"></div>
                    <div className="text-[10px] font-bold uppercase">{employeeName}</div>
                    <div className="text-[10px] text-muted-foreground">Employee Signature</div>
                </div>
                <div className="text-center px-8 pb-4">
                    <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center grayscale opacity-30">
                        <span className="text-[8px] font-black tracking-tighter uppercase">OFFICIAL SEAL</span>
                    </div>
                </div>
                <div className="w-64 text-right">
                    <div className="mb-2 italic text-2xl" style={{ fontFamily: 'cursive' }}>JPortelli</div> /* keep-inline */ /* keep-inline */
                    <div className="border-b-2 border-border mb-2"></div>
                    <div className="text-[10px] font-bold uppercase">{displayHR}</div>
                    <div className="text-[10px] !text-[#9ca3af]">HR Manager</div>
                </div>
            </div>

            {/* Print Footer */}
            <div className="mt-8 pt-4 border-t border-border flex justify-between items-center text-[8px] text-muted-foreground uppercase tracking-widest">
                <span>Document ID: RESTIN-EXIT-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                <span>Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}</span>
            </div>
        </div>
    );
}
