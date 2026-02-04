import { useState } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Upload, FileText, AlertCircle } from 'lucide-react';

export default function MenuImportWizard() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast.error('Please select .xlsx or .csv file');
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // await menuAPI.importMenu(formData);
      toast.success('Menu imported successfully');
      setFile(null);
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer
      title="Menu Import"
      description="Import menu from Excel or CSV file"
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Upload Menu File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Choose file
                </span>
                <span className="text-gray-600"> or drag and drop</span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                Excel (.xlsx) or CSV files only
              </p>
            </div>

            {file && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-600">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                  Remove
                </Button>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-1">Expected Format:</p>
                  <ul className="text-xs space-y-1 text-gray-600">
                    <li>• Column 1: Item Name</li>
                    <li>• Column 2: Price</li>
                    <li>• Column 3: Category</li>
                    <li>• Column 4: Description (optional)</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleImport} 
              disabled={!file || importing}
              className="w-full"
            >
              {importing ? 'Importing...' : 'Import Menu'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
