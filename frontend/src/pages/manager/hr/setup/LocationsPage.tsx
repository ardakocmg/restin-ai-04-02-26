
import { MapPin } from 'lucide-react';
import GenericSetupPage from '../../../../components/manager/hr/GenericSetupPage';

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
