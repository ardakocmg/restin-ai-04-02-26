
import React from 'react';
import GenericSetupPage from '../../../../components/admin/hr/GenericSetupPage';
import { UserMinus } from 'lucide-react';

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
