
import { Award } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

export default function GradesPage() {
  return (
    <GenericSetupPage
      title="Pay Grades"
      type="grades"
      description="Manage employment grades and salary bands."
      icon={Award}
    />
  );
}
