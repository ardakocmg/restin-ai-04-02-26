
import React from 'react';
import GenericSetupPage from '../../../components/admin/hr/GenericSetupPage';
import { Building } from 'lucide-react';

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
