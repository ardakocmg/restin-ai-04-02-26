
import { Hammer } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

export default function OccupationsPage() {
  return (
    <GenericSetupPage
      title="Occupations"
      type="occupations"
      description="Manage job titles and occupation codes."
      icon={Hammer}
    />
  );
}
