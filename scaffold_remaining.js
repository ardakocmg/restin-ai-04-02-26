const fs = require('fs');
const path = require('path');

const dirs = {
    inventory: path.join(__dirname, 'frontend/src/pages/admin/inventory'),
    hrReports: path.join(__dirname, 'frontend/src/pages/admin/hr/reports'),
    hrMain: path.join(__dirname, 'frontend/src/pages/admin/hr')
};

const inventoryFiles = [
    'InventoryItemsNew',
    'InventoryItems',
    'PurchaseOrdersNew',
    'StockCount',
    'WasteLog',
    'RecipeManagement',
    'ProductionManagement',
    'StockTransfers',
    'StockAdjustments',
    'RecipeManagementComplete',
    'ProductionManagementComplete',
    'StockTransfersComplete'
];

const reportFiles = ['KDSPerformance'];
const hrFiles = ['PayrollMalta', 'AccountingMalta'];

// Helper to check if file exists
const fileExists = (filePath) => {
    return fs.existsSync(filePath);
};

// Component Template
const getTemplate = (componentName, type) => {
    const title = componentName.replace(/([A-Z])/g, ' $1').trim();
    return `import React from 'react';
import PageContainer from '../../../../layouts/PageContainer'; // Adjust depth dynamically in real app, hardcoded for now
import { Card, CardContent } from '../../../../components/ui/card';
import { Construction } from 'lucide-react';

const ${componentName} = () => {
  return (
    <div className="p-6">
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Construction className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Under Construction</h3>
            <p className="text-muted-foreground">
              The <strong>${title}</strong> module is coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ${componentName};
`;
};

// Generate Files
const generate = (dir, files, type) => {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }

    files.forEach(file => {
        const filePath = path.join(dir, `${file}.jsx`);
        if (fileExists(filePath) || fileExists(filePath.replace('.jsx', '.js'))) {
            console.log(`Skipping existing file: ${file}`);
        } else {
            console.log(`Generating: ${file}`);
            fs.writeFileSync(filePath, getTemplate(file, type));
        }
    });
};

console.log('Starting remaining scaffolding...');
generate(dirs.inventory, inventoryFiles, 'inventory');
generate(dirs.hrReports, reportFiles, 'report'); // Correct path for KDSPerformance
generate(dirs.hrMain, hrFiles, 'hr');
console.log('Scaffolding complete.');
