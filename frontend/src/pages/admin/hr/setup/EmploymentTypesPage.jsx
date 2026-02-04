import React from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Construction } from 'lucide-react';

const EmploymentTypesPage = () => {
  return (
    <PageContainer title="Employment Types " description="Manage configuration and settings.">
      <Card className="max-w-4xl mx-auto mt-8 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <Construction className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold tracking-tight">Under Construction</h3>
            <p className="text-muted-foreground max-w-sm">
              The <strong>Employment Types </strong> module is currently in development. 
              Check back soon for updates.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default EmploymentTypesPage;
