import React from 'react';

/**
 * EngagementLetter - 4-page Malta Employment Contract (Letter of Engagement)
 * Replicating official Caviar & Bull / Marvin Gauci standards.
 */
export default function EngagementLetter({ data }) {
    const {
        employeeName = 'Arda Koc',
        address = '23, Triq In-Nixxiegha, Mellieha',
        date = '22nd August 2024',
        idNumber = '0307741A',
        ssNumber = 'D70158083',
        jobTitle = 'In House Strategist',
        employerName = 'Marvin Gauci',
        probationPeriod = '6 months',
        hourlyRate = '25.00',
        businessName = 'Caviar & Bull',
        location = 'Corinthia Hotel, St. Georges Bay, St. Julians',
        hrManager = 'Jacqueline Portelli',
        venue = null
    } = data;

    // Override defaults with venue data if provided
    const displayEmployer = venue?.legal_info?.registered_name || employerName;
    const displayBusiness = venue?.name || businessName;
    const displayLocation = venue?.legal_info?.registered_address || location;
    const displayHR = venue?.legal_info?.hr_manager_name || hrManager;
    const displayLogo = venue?.branding?.logo_url || null;
    const primaryColor = venue?.branding?.primary_color || "#000000";

    const pageClass = "bg-[#ffffff] !text-[#000000] p-[20mm] max-w-[210mm] mx-auto mb-8 shadow-md relative min-h-[297mm] flex flex-col text-[11px] leading-relaxed border border-gray-100";
    const headerLogo = (
        <div className="flex justify-center mb-12">
            <div className="text-center">
                {displayLogo ? (
                    <img src={displayLogo} alt="Logo" className="max-h-20 object-contain mx-auto" />
                ) : (
                    <svg width="400" height="80" viewBox="0 0 400 80" style={{ color: primaryColor }}> /* keep-inline */ /* keep-inline */
                        <path d="M120 10 Q150 5, 180 30 T220 40" fill="none" stroke="currentColor" strokeWidth="1" />
                        <text x="10" y="45" fontSize="28" fontWeight="bold" fontFamily="Georgia, serif">
                            {displayBusiness.toUpperCase()}
                        </text>
                        <path d="M320 40 L330 35 M320 40 L325 50" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                )}
            </div>
        </div>
    );

    const footerPage = (num) => (
        <div className="mt-auto pt-8 text-center text-[10px] font-bold">
            Page {num} of 4
        </div>
    );

    return (
        <div id="contract-to-export" className="engagement-letter space-y-4">

            {/* PAGE 1 */}
            <div className={pageClass}>
                {headerLogo}

                <div className="grid grid-cols-[100px_1fr] gap-y-2 mb-8">
                    <span className="font-bold">Name:</span> <span>{employeeName}</span>
                    <span className="font-bold">Address:</span> <span>{address}</span>
                    <span className="font-bold">Date:</span> <span>{date}</span>
                    <span className="font-bold">ID no:</span> <span>{idNumber}</span>
                    <span className="font-bold">National Insurance:</span> <span>{ssNumber}</span>
                </div>

                <h3 className="text-center font-bold underline text-sm mb-6 uppercase">Letter of Engagement</h3>

                <p className="mb-4">
                    It is our pleasure that you are engaged as an <span className="font-bold">{jobTitle}</span> with <span className="font-bold">{displayEmployer}</span> (referred to as the employer) on Part Time basis,
                    with effect from <span className="font-bold">{date}</span>. In the execution of your duties you shall report to {displayEmployer} or such other person or persons
                    designated by the Employer from time to time.
                </p>

                <p className="mb-6">
                    In order to comply with the provisions of the Maltese Law, this statement gives particulars of your terms of employment with the
                    Employer and regulates other matters connected with your employment therewith.
                </p>

                <table className="w-full border-collapse border border-gray-400 text-left">
                    <tbody>
                        <tr>
                            <td className="border border-gray-400 p-2 w-40 font-bold uppercase align-top">1. Place of Work</td>
                            <td className="border border-gray-400 p-2 italic leading-snug">
                                {displayBusiness}, {displayLocation} or such other location as may be indicated by Employer.<br />
                                You agree that during the term of your employment, the Employer may at its sole discretion second you to another business unit or operation...
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">2. Probation</td>
                            <td className="border border-gray-400 p-2">{probationPeriod}</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">3. Rate of Wage</td>
                            <td className="border border-gray-400 p-2">The gross hourly pay is € {hourlyRate}.</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">4. Hours of Work</td>
                            <td className="border border-gray-400 p-2">
                                The Employee shall work flexible part time hours which due to the business's nature may be between Monday to Sunday without any specifically stipulated working timeframe hours.
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">5. Confidentiality</td>
                            <td className="border border-gray-400 p-2 text-[10px]">
                                The employee shall not, either during the continuance of his/her appointment hereunder (except in the performance of his/her duties) or, after the termination thereof, make use of or divulge...
                            </td>
                        </tr>
                    </tbody>
                </table>
                {footerPage(1)}
            </div>

            {/* PAGE 2 */}
            <div className={pageClass}>
                {headerLogo}

                <table className="w-full border-collapse border border-gray-400">
                    <tbody>
                        <tr>
                            <td className="p-2 text-[9px] italic" colSpan={2}>
                                Notwithstanding anything contained in this agreement to the contrary... an addition to any other remedies provided for in this Agreement... a penalty for mere default of the obligations... amounting to ten thousand Euro (Eur10,000)...
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 w-40 font-bold uppercase align-top">6. Periodicity of Wage Payments</td>
                            <td className="border border-gray-400 p-2">Monthly in arrears on the 5th day of the month</td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">7. Vacation/ Sick</td>
                            <td className="border border-gray-400 p-2 text-[10px]">
                                Vacation leave and sick leave in line with Maltese legislation. Absence for sickness is to be supported by presentation of a Medical Certificate...<br /><br />
                                Vacation Leave is to be used in accordance with the exigencies of the Employer and must be approved by {displayEmployer} using the Employee Portal...
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">8. Notice Periods</td>
                            <td className="border border-gray-400 p-2 text-[10px]">
                                According to the governing law:<br />
                                For more than one month but not more than six months - one week;<br />
                                For more than six months but not more than two years - two weeks...
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">9. Other Benefits</td>
                            <td className="border border-gray-400 p-2">
                                All statutory Bonuses, Allowances and other Supplements including cost of living increases declared by the Government of Malta to be of general application...
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-gray-400 p-2 font-bold uppercase align-top">10. Other Conditions</td>
                            <td className="border border-gray-400 p-2 text-[10px]">
                                The Employer has and will continue to develop policies and procedures on such matters as discipline, privacy, behavior, standards, ethics, health and safety...
                            </td>
                        </tr>
                    </tbody>
                </table>
                {footerPage(2)}
            </div>

            {/* PAGE 3 */}
            <div className={pageClass}>
                {headerLogo}
                <div className="border border-gray-400 p-4">
                    <h4 className="font-bold uppercase mb-4">11. DATA PROTECTION</h4>
                    <div className="space-y-3 text-[10px]">
                        <p>1. Data of the Employee where:</p>
                        <p className="pl-4">a. processing is necessary for the performance of the Contract to which the data subject is a party to;</p>
                        <p className="pl-4">b. processing is necessary for compliance with a legal obligation to which the controller is subject; or</p>
                        <p className="pl-4">c. processing is necessary in order to protect the vital interests of the data subject or of another natural person;</p>

                        <p>2. Furthermore, the Employee gives his consent to the Company to process his / her personal and/or sensitive data relating to benefits to which the Employee is entitled to.</p>

                        <p>3. In addition, the personal data of persons appertaining to the Employee may be processed in the following cases:</p>
                        <p className="pl-4">a. details of the next of kin of the Employee; and</p>
                        <p className="pl-4">b. management of benefits afforded to the Employee according to the Contract.</p>

                        <p>4. Consequently, by signing this Contract, the Employee hereby confirms that the relevant terms of this Contract have been or will be, as the case may be, brought to the attention of such persons...</p>

                        <p>5. Where it is acting as a Controller in relation to Employee personal data, the Company shall process personal data in line with the Data Protection Legislation...</p>
                    </div>
                </div>
                {footerPage(3)}
            </div>

            {/* PAGE 4 */}
            <div className={pageClass}>
                {headerLogo}

                <div className="grid grid-cols-[120px_1fr] border border-gray-400 mb-8">
                    <div className="bg-gray-100 p-2 border-r border-gray-400 font-bold uppercase text-[9px]">12. GOVERNING LAW / JURISDICTION</div>
                    <div className="p-2 text-[10px]">
                        Your whole employment relationship with the Employer shall be governed and construed in accordance with the Laws of Malta, and any dispute shall be subject to the exclusive jurisdiction of the Maltese Courts.
                    </div>
                </div>

                <p className="mb-6 text-[10px]">
                    This Letter of Engagement sets forth the entire agreement and understanding between you and the Employer relating to your employment with the Employer
                    and supersedes all prior discussions or representations...
                </p>

                <div className="mt-12 space-y-12">
                    <div>
                        <p className="mb-1">Yours sincerely,</p>
                        <div className="mb-2 italic text-2xl" style={{ fontFamily: 'cursive' }}>JPortelli</div> /* keep-inline */ /* keep-inline */
                        <div className="font-bold underline">{displayHR} – HR Manager</div>
                    </div>

                    <div className="border-t-2 border-black pt-4">
                        <p className="font-bold mb-4 italic">
                            I, <span className="underline">{employeeName}</span>, have read and understood this Engagement Letter and accept the offer of employment from {displayEmployer}, on the terms and conditions set out in the said Engagement Letter.
                        </p>

                        <div className="grid grid-cols-[100px_1fr] gap-y-4">
                            <span className="font-bold">Dated:</span> <span className="border-b border-gray-400"></span>
                            <span className="font-bold">Signed:</span> <span className="border-b border-gray-400 h-10"></span>
                            <span className="font-bold">Name:</span> <span>{employeeName} (Employee)</span>
                        </div>
                    </div>
                </div>
                {footerPage(4)}
            </div>
        </div>
    );
}
