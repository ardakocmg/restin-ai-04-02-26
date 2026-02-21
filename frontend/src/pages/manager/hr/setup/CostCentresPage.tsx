
import { PieChart } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

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
