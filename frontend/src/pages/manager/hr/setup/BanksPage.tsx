
import { Landmark } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

export default function BanksPage() {
  return (
    <GenericSetupPage
      title="Banks"
      type="banks"
      description="Manage bank list for SEPA payments."
      icon={Landmark}
    />
  );
}
