
import React from 'react';
import GenericSetupPage from '../../../../components/admin/hr/GenericSetupPage';
import { Flag } from 'lucide-react';

export default function CitizenshipPage() {
  return (
    <GenericSetupPage
      title="Citizenship / Nationalities"
      type="citizenships"
      description="Manage list of recognized nationalities for compliance."
      icon={Flag}
    />
  );
}
