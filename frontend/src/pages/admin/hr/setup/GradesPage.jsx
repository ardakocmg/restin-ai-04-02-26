
import React from 'react';
import GenericSetupPage from '../../../../components/admin/hr/GenericSetupPage';
import { Award } from 'lucide-react';

export default function GradesPage() {
  return (
    <GenericSetupPage
      title="Pay Grades"
      type="grades"
      description="Manage employment grades and salary bands."
      icon={Award}
    />
  );
}
