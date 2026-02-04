const fs = require('fs');
const path = require('path');

const reportsDir = path.join(__dirname, 'frontend/src/pages/admin/hr/reports');
const setupDir = path.join(__dirname, 'frontend/src/pages/admin/hr/setup');

const reportsFiles = [
    'EmployeeDetailsReport',
    'HeadcountReport',
    'TurnoverReport',
    'EmploymentDatesReport',
    'BirthdaysAnniversariesReport',
    'TrainingExpiringReport',
    'TrainingStartingReport',
    'TrainingOngoingReport'
];

const setupFiles = [
    'BanksPage',
    'DepartmentsPage',
    'LocationsPage',
    'OccupationsPage',
    'CountriesPage',
    'EmploymentTypesPage',
    'WorkSchedulesPage',
    'CostCentresPage',
    'TerminationReasonsPage',
    'GradesPage',
    'CitizenshipPage',
    'OrganisationPage',
    'EmployeesSetupPage',
    'CalendarSetupPage',
    'SalaryPackagePage',
    'CustomFieldsPage',
    'ApplicantsPage',
    'SettingsSetupPage'
];

// Helper to check if file exists
const fileExists = (filePath) => {
    return fs.existsSync(filePath);
};

// Component Template
const getTemplate = (componentName, type) => {
    // Determine title from PascalCase
    const title = componentName.replace(/([A-Z])/g, ' $1').trim().replace('Page', '').replace('Report', ' Report');
    const description = type === 'report'
        ? 'Generate and view detailed reports.'
        : 'Manage configuration and settings.';

    return `import React from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Construction } from 'lucide-react';

const ${componentName} = () => {
  return (
    <PageContainer title="${title}" description="${description}">
      <Card className="max-w-4xl mx-auto mt-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Construction className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Under Construction</h3>
            <p className="text-muted-foreground max-w-sm">
              The <strong>${title}</strong> module is currently in development. 
              Check back soon for updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
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
        const filePath = path.join(dir, `${file}.jsx`); // Using .jsx per project standard
        if (fileExists(filePath)) {
            console.log(`Skipping existing file: ${file}`);
        } else {
            console.log(`Generating: ${file}`);
            fs.writeFileSync(filePath, getTemplate(file, type));
        }
    });
};

console.log('Starting scaffolding...');
generate(reportsDir, reportsFiles, 'report');
generate(setupDir, setupFiles, 'setup');
console.log('Scaffolding complete.');
