// Rule #54: RegTech - Legislative Changes
export const TaxRules = {
    malta: {
        vat: {
            standard: 18,
            catering: 18, // Check latest legislation
        },
        socialSecurity: {
            // Simplified logic
            employeeShare: 10,
            employerShare: 10
        }
    }
};

export function calculatePayrollTax(grossSalaryDetails: any) {
    // Placeholder for complex Engine
    return {
        fss: 0,
        ssc: 0
    };
}
