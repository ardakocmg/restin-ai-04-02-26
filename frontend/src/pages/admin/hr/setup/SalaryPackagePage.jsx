
import React from 'react';
import GenericSetupPage from '../../../components/admin/hr/GenericSetupPage';
import { DollarSign } from 'lucide-react';

export default function SalaryPackagePage() {
  return (
    <GenericSetupPage
      title="Salary Packages"
      type="salary_packages"
      description="Standard compensation templates (e.g. Junior Dev Package, Senior Chef)."
      icon={DollarSign}
    />
  );
}
