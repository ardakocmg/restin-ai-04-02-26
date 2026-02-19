
import React from 'react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';
import { Briefcase } from 'lucide-react';

export default function EmploymentTypesPage() {
  return (
    <GenericSetupPage
      title="Employment Types"
      type="employment_types"
      description="Manage employment categories (e.g. Full-Time, Part-Time, Casual)."
      icon={Briefcase}
    />
  );
}
