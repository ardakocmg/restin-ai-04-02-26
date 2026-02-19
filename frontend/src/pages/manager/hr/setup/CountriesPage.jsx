
import React from 'react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';
import { Globe } from 'lucide-react';

export default function CountriesPage() {
  return (
    <GenericSetupPage
      title="Countries"
      type="countries"
      description="Manage supported countries."
      icon={Globe}
    />
  );
}
