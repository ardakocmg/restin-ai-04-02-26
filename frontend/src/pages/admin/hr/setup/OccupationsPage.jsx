
import React from 'react';
import GenericSetupPage from '../../../components/admin/hr/GenericSetupPage';
import { Hammer } from 'lucide-react';

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
