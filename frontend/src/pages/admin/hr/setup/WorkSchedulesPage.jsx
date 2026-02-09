
import React from 'react';
import GenericSetupPage from '../../../components/admin/hr/GenericSetupPage';
import { CalendarClock } from 'lucide-react';

export default function WorkSchedulesPage() {
  return (
    <GenericSetupPage
      title="Work Schedules"
      type="schedules"
      description="Manage standard working patterns (e.g. Mon-Fri 9-5, Shift A)."
      icon={CalendarClock}
    />
  );
}
