
import { Globe } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

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
