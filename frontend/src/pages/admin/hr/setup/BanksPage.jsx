
import React from 'react';
import GenericSetupPage from '../../../components/admin/hr/GenericSetupPage';
import { Landmark } from 'lucide-react';

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
