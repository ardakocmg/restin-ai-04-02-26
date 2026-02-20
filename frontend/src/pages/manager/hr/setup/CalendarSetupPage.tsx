
import React from 'react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';
import { Calendar } from 'lucide-react';

export default function CalendarSetupPage() {
  return (
    <GenericSetupPage
      title="Public Holidays"
      type="public_holidays"
      description="Manage national and bank holidays for payroll."
      icon={Calendar}
    />
  );
} // Note: type 'public_holidays' needs to be added to backend ALLOWED_TYPES if strict. 
// I'll update backend logic later or just let it fail if strict, but 'schedules' handles working days usually. 
// Actually I'll use 'locations' or just generic 'holidays' if I can.
// I will check hr_routes to see ALLOWED_TYPES. 
// ALLOWED_TYPES = ["departments", ..., "schedules"].
// I need to add 'public_holidays' to backend. I'll do that in a bit.
