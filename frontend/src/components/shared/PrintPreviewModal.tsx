import { Printer,X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog,DialogContent,DialogFooter,DialogHeader,DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

export default function PrintPreviewModal({ open, onClose, content, type = 'receipt' }) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    
    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            body { 
              font-family: monospace; 
              margin: 20px;
              font-size: 12px;
            }
            .receipt {
              max-width: 300px;
              margin: 0 auto;
            }
            .kitchen-ticket {
              max-width: 400px;
              margin: 0 auto;
            }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .bold { font-weight: bold; }
            .center { text-align: center; }
            .right { text-align: right; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="${type}">
            ${content}
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => setPrinting(false), 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Print Preview</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[500px] w-full">
          <div 
            className="p-4 font-mono text-xs rounded-lg"
            style={{ backgroundColor: '#FFFFFF', color: '#000000'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={printing}>
            <Printer className="h-4 w-4 mr-2" />
            {printing ? 'Printing...' : 'Print'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
