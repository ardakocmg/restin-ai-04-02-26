import { logger } from '@/lib/logger';
import { FileDown } from 'lucide-react';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import PermissionedTable from '../../components/PermissionedTable';
import { Button } from '../../components/ui/button';
import { Card,CardContent } from '../../components/ui/card';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function AccountingHub() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [canExport, setCanExport] = useState(false);

  const venueId = user?.venueId || localStorage.getItem('restin_venue');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/policy/effective`);
      const userRole = user?.role;
      const permissions = response.data.roles?.[userRole] || [];
      setCanExport(permissions.includes('FINANCE_EXPORT') || permissions.includes('CHECKS_EXPORT'));
    } catch (error) {
      logger.error('Failed to check permissions:', error);
    }
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  return (
    <PageContainer
      title="Accounting"
      description="General ledger and financial records"
      actions={
        canExport && (
          <Button onClick={handleExport} size="sm">
            <FileDown className="w-4 h-4 mr-2" />
            Export
          </Button>
        )
      }
    >
      <Card>
        <Tabs defaultValue="journal" className="w-full">
          <CardContent className="pt-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="journal">Journal Entries</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="journal">
              <PermissionedTable
                venueId={venueId}
                tableKey="accounting_journal"
                dataEndpoint="/api/v1/accounting/journal"
              />
            </TabsContent>

            <TabsContent value="summary">
              <div className="text-center py-12 text-gray-500">
                <p>Summary view coming soon</p>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </PageContainer>
  );
}
