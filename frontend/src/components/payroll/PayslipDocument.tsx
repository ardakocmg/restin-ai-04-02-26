import { QRCodeCanvas } from 'qrcode.react';

/**
 * PayslipDocument - Malta payslip design (Restin.ai format)
 * This component renders a payslip matching the Malta HR payroll standard
 */
export default function PayslipDocument({ payslipData }) {
    const {
        employee,
        period,
        basicSalary,
        adjustments = [],
        grossTotal,
        tax,
        socialSecurity,
        netPay,
        totalsToDate = {},
        benefits = {},
        leaveType = '',
        remarks = '',
        employmentDate = ''
    } = payslipData;

    return (
        <div id="payslip-to-export" className="payslip-document !bg-white !text-black p-10 max-w-[210mm] mx-auto border border-border shadow-sm" style={{ fontFamily: 'Arial, sans-serif'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
            {/* Header Section */}
            <div className="flex justify-between items-start mb-10 pb-2 border-b-2 border-gray-300">
                {/* Logo / Title Area */}
                <div className="flex flex-col items-start">
                    <div className="flex items-center gap-4 mb-2">
                        <svg width="60" height="40" viewBox="0 0 100 60" className="fill-black">
                            {/* Stylized Bull outline matching Caviar & Bull logo */}
                            <path d="M10,30 Q30,10 50,30 T90,30 M20,35 Q40,55 60,35 T80,35" fill="none" stroke="black" strokeWidth="2" />
                            <circle cx="25" cy="25" r="2" />
                            <path d="M70,25 L85,15 M70,35 L85,45" stroke="black" strokeWidth="2" />
                        </svg>
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold tracking-tighter leading-none" style={{ fontFamily: 'Georgia, serif'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                CAVIAR & BULL
                            </h1>
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-800" style={{ fontFamily: 'Arial, sans-serif'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                MALTA
                            </span>
                        </div>
                    </div>
                </div>

                {/* QR Code linking to Employee Portal */}
                <div className="flex flex-col items-end gap-2">
                    <div className="p-1 border-2 border-black bg-white">
                        <QRCodeCanvas
                            value={`https://restin.ai/portal/employee/${employee.id || employee.id_number || 'KOC'}`}
                            size={72}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-tighter text-black">Scan for Digital Portal</span>
                </div>
            </div>

            {/* Combined Information Section */}
            <div className="grid grid-cols-2 gap-x-12 mb-8 items-start">
                {/* Left Information Column */}
                <div className="space-y-4 text-[13px]">
                    <div className="grid grid-cols-[100px_1fr] items-start">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Name</span>
                        <span className="font-bold">{employee.name} ({employee.id_number || employee.id})</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-start">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Address</span>
                        <div className="flex flex-col">
                            <span>{employee.address?.line1 || '23,'}</span>
                            <span>{employee.address?.line2 || 'Triq In-Noxagha,'}</span>
                            <span>{employee.address?.city || 'Mellieha, Malta'}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">ID No.</span>
                        <span className="font-medium">{employee.id_number || '0307741A'}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center mt-4">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Department</span>
                        <span className="uppercase">{employee.department || 'OTHER'}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Unit</span>
                        <span>{employee.unit || '-'}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Occupation</span>
                        <span className="uppercase font-medium">{employee.occupation || 'IN HOUSE STRATEGIST'}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Roll(s)</span>
                        <span className="font-medium">{employee.occupation_roll || 'Dec 25 (2025-5/12)'}</span>
                    </div>
                </div>

                {/* Right Information Column */}
                <div className="space-y-4 text-[13px]">
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">SS No.</span>
                        <span className="font-medium">{employee.ss_number || ''}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center mt-[104px]">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Section</span>
                        <span>{employee.section || ''}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Grade</span>
                        <span>{employee.grade || ''}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Pay Date</span>
                        <span className="font-medium">{period.pay_date}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] items-center">
                        <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Roll Period</span>
                        <span className="font-medium">{period.start} - {period.end}</span>
                    </div>
                    {employmentDate && (
                        <div className="grid grid-cols-[100px_1fr] items-center">
                            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Employment</span>
                            <span className="font-medium">{employmentDate}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Benefits Section */}
            <div className="mb-6 pb-4 border-b border-gray-300">
                <div className="text-sm font-bold mb-2">Benefits to Date</div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="flex justify-between">
                        <span>Category 1</span>
                        <span>{benefits.category_1?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Category 2</span>
                        <span>{benefits.category_2?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Category 3</span>
                        <span>{benefits.category_3?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>ShareOpt</span>
                        <span>{benefits.share_opt?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>
            </div>

            {/* Main Payslip Content - Two Columns */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                {/* Left Column - Totals to Date & Leave */}
                <div className="space-y-8">
                    <div>
                        <div className="text-sm font-bold mb-4 pb-1 border-b border-gray-400 uppercase tracking-tighter">Totals to Date</div>
                        <div className="space-y-2 text-[13px]">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Gross</span>
                                <span className="font-mono">{totalsToDate.gross?.toFixed(2) || '9987.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">OT Con. Gross</span>
                                <span className="font-mono">{totalsToDate.ot_con_gross?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">OT Con. Hours</span>
                                <span className="font-mono">{totalsToDate.ot_con_hours?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Social Security</span>
                                <span className="font-mono">{totalsToDate.social_security?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 font-bold">Tax (FS5)</span>
                                <span className="font-mono font-bold">{totalsToDate.tax_fs5?.toFixed(2) || '999.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tax (OT Con.)</span>
                                <span className="font-mono">{totalsToDate.tax_ot_con?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tax (Arrears)</span>
                                <span className="font-mono">{totalsToDate.tax_arrears?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tax (ShareOpt)</span>
                                <span className="font-mono">{totalsToDate.tax_share_opt?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-sm font-bold mb-3 pb-1 border-b border-gray-400 uppercase tracking-tighter">Leave Type</div>
                        <div className="text-xs text-muted-foreground font-medium italic">{leaveType || '-'}</div>
                    </div>
                </div>

                {/* Right Column - Current Period Calc */}
                <div className="space-y-6">
                    {/* Basic Section */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold uppercase tracking-tight">Basic</span>
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500">x {basicSalary.rate.toFixed(7)}</div>
                                <div className="text-md font-bold">{basicSalary.amount.toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium -mt-1">Salary</div>
                        <div className="text-center py-4 bg-background border border-border rounded-lg shadow-inner">
                            <div className="text-4xl font-black tracking-tighter">{basicSalary.hours.toFixed(2)}</div>
                            <div className="text-[10px] uppercase font-black tracking-widest text-gray-400">Hours Processed</div>
                        </div>
                    </div>

                    {/* Adjustment Section */}
                    <div className="space-y-3">
                        <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Adjustment</div>
                        <div className="p-4 bg-background border border-border rounded-lg space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-800">Government Bonus</span>
                                    <span className="text-[10px] text-gray-400">{adjustments[0]?.date || '1.00 December'} x 25.0000000</span>
                                </div>
                                <span className="font-bold text-sm">25.00</span>
                            </div>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="pt-4 border-t-2 border-dashed border-border space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-sm font-black uppercase">Gross Total</span>
                            <span className="text-lg font-black">{grossTotal.toFixed(2)}</span>
                        </div>

                        <div className="space-y-1 px-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-bold text-gray-600">Tax ({tax.type || 'Part Time Special Rate'})</span>
                                <span className="font-bold">{tax.amount.toFixed(2)}</span>
                            </div>
                            <div className="text-[9px] text-muted-foreground italic font-medium tracking-tight">Tax Rate)</div>
                        </div>

                        <div className="flex justify-between text-xs px-1 border-b border-border pb-2">
                            <span className="font-bold text-gray-600">Social Security</span>
                            <span className="font-bold">{socialSecurity.toFixed(2)}</span>
                        </div>

                        {/* Net Pay Box - High Impact */}
                        <div className="relative group overflow-hidden">
                            <div className="absolute inset-0 bg-card rounded-xl transform transition-transform group-hover:scale-105" />
                            <div className="relative bg-muted p-6 rounded-xl border-2 border-black flex justify-between items-center shadow-lg">
                                <span className="text-xl font-black uppercase text-black tracking-tighter">Net</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-muted-foreground">€</span>
                                    <span className="text-4xl font-black tracking-tight text-black">{netPay.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Remarks Section */}
            {(remarks || true) && (
                <div className="mt-8 pt-4 border-t border-gray-200">
                    <div className="text-[11px] font-bold uppercase text-muted-foreground mb-2 tracking-wider">Remarks</div>
                    <div className="p-4 bg-background border border-border rounded-lg text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                        {remarks || `SKILLS PASS - Should you fail your third attempt for the Skills Pass, the portal will automatically block you for a period of 3 months before you can try again so kindly start your skills pass process as soon as possible so you have sufficient time to complete the necessary attempts considering the three month suspension period after the third failure.\n\nADVANCES - Any request for a salary advance is to be submitted via email to the HR Department on hr@marvingauci.com. The HR Department will then seek authorization to issue the advance. Requests must reach the HR Department three working days before the funds are needed. Note that Saturdays and Sundays are not counted as working days. No requests will be accepted two days prior to the end of the month and five days after the first of the month. Advances should only be requested in case of emergencies. These requests should not become a regular monthly occurrence and should only be made in situation of extreme need.`}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-300">
                <div className="flex justify-between items-center text-xs text-gray-600">
                    <div>
                        <span>* Includes all future dated approved applications</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-sm">Restin.ai</span>
                        <span>Printed on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
