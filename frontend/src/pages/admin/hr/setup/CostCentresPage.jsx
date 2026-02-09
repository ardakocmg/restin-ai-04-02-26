
import React from 'react';
import GenericSetupPage from '../../../../components/admin/hr/GenericSetupPage';
import { PieChart } from 'lucide-react';

export default function CostCentresPage() {
  return (
    <GenericSetupPage
      title="Cost Centres"
      type="cost_centres"
      description="Manage accounting cost centres for detailed financial reporting."
      icon={PieChart}
    />
  );
}
