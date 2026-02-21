
import { Building } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

export default function DepartmentsPage() {
  return (
    <GenericSetupPage
      title="Departments"
      type="departments"
      description="Manage your organizational departments (e.g. Kitchen, Front of House, Admin)."
      icon={Building}
    />
  );
}
