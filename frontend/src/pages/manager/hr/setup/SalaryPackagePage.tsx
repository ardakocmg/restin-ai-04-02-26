
import { DollarSign } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

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
