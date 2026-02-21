
import { Flag } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

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
