import { logger } from '@/lib/logger';
import { BookOpen,FileSpreadsheet } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function AccountingMaltaPage() {
  const { activeVenue } = useVenue();
  const [accounts, setAccounts] = useState([]);
  const [journals, setJournals] = useState([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadAccounting();
    }
  }, [activeVenue?.id]);

  const loadAccounting = async () => {
    try {
      const [accRes, jrnRes] = await Promise.all([
        api.get(`/accounting-mt/accounts?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/accounting-mt/journals?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);
      
      setAccounts(accRes.data?.data || []);
      setJournals(jrnRes.data?.data || []);
    } catch (error) {
      logger.error('Accounting error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Accounting (Malta)" description="General ledger and financial accounting">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Chart of Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{accounts.length} accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Journal Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{journals.length} entries</p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
