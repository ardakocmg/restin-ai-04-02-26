import { Download } from 'lucide-react';

export default function PDFExportButton({ title, content, className = '' }) {
  const handleExport = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #3b82f6; margin-top: 30px; }
            h3 { color: #60a5fa; }
            pre { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
            code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${content}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <button
      onClick={handleExport}
      className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition ${className}`}
    >
      <Download className="h-4 w-4" />
      Export PDF
    </button>
  );
}
