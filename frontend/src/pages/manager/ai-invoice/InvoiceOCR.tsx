import { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Upload, Loader } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';

export default function InvoiceOCR() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPO, setSelectedPO] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        const venueId = localStorage.getItem('currentVenueId');

        const response = await api.post(`/venues/${venueId}/invoices/ocr`, {
          venue_id: venueId,
          image_base64: base64,
          po_id: selectedPO || null
        });

        setResult(response.data);
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('OCR failed:', error);
      toast.error('Failed to process invoice');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageContainer title="Invoice OCR" description="Upload and process invoices with AI">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Upload Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Match to PO (Optional)</label>
                <select value={selectedPO} onChange={(e) => setSelectedPO(e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded">
                  <option value="">No PO</option>
                </select>
              </div>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <label className="cursor-pointer">
                  <span className="text-blue-400 hover:text-blue-300">Choose file</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-sm text-slate-400 mt-2">PNG, JPG, WEBP</p>
              </div>
              {processing && (
                <div className="flex items-center justify-center gap-2 text-blue-400">
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Processing with AI...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Extracted Data</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400">Invoice Number</p>
                  <p className="font-medium">{result.invoice_number || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400">Supplier</p>
                  <p className="font-medium">{result.supplier_name || 'N/A'}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400">Total Amount</p>
                  <p className="font-medium text-green-400">${result.total_amount || 0}</p>
                </div>
                <div className="p-3 bg-slate-800 rounded">
                  <p className="text-sm text-slate-400">Line Items</p>
                  <p className="font-medium">{result.line_items?.length || 0} items</p>
                </div>
                {result.variances && result.variances.length > 0 && (
                  <div className="p-3 bg-red-900/20 border border-red-500/30 rounded">
                    <p className="text-sm text-red-400 font-medium mb-2">Variances Detected ({result.variances.length})</p>
                    {result.variances.slice(0, 3).map((v, i) => (
                      <p key={i} className="text-sm text-red-300">• {v.type}: {v.item_description}</p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
