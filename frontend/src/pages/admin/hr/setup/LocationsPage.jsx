
import React from 'react';
import GenericSetupPage from '../../../../components/admin/hr/GenericSetupPage';
import { MapPin } from 'lucide-react';

export default function LocationsPage() {
  return (
    <GenericSetupPage
      title="Locations"
      type="locations"
      description="Manage physical locations or branches for your organization."
      icon={MapPin}
    />
  );
}
