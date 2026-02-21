
import { UserMinus } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

export default function TerminationReasonsPage() {
  return (
    <GenericSetupPage
      title="Termination Reasons"
      type="termination_reasons"
      description="Manage standard reasons for employee exit (e.g. Resignation, Dismissal)."
      icon={UserMinus}
    />
  );
}
