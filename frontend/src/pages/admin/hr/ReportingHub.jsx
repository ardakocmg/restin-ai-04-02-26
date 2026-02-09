import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, TrendingDown, Calendar, Cake, Award } from 'lucide-react';

const reports = [
  { id: 'employee-details', title: 'Employee Details', icon: Users, path: '/admin/hr-reports/employee-details' },
  { id: 'headcount', title: 'Head Count', icon: Users, path: '/admin/hr-reports/headcount' },
  { id: 'turnover', title: 'Staff Turnover', icon: TrendingDown, path: '/admin/hr-reports/turnover' },
  { id: 'employment-termination', title: 'Employment & Termination Dates', icon: Calendar, path: '/admin/hr-reports/employment-dates' },
  { id: 'birthdays', title: 'Birthdays & Anniversaries', icon: Cake, path: '/admin/hr-reports/birthdays' },
  { id: 'training-expiring', title: 'Training & Certifications Expiring Soon', icon: Award, path: '/admin/hr-reports/training-expiring' },
  { id: 'training-starting', title: 'Training & Certifications Starting Soon', icon: Award, path: '/admin/hr-reports/training-starting' },
  { id: 'training-ongoing', title: 'Ongoing Training & Certifications', icon: Award, path: '/admin/hr-reports/training-ongoing' },
];

export default function ReportingHub() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground dark:text-slate-50">Reporting</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">HR Analytics & Reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.id}
              className="cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate(report.path)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Icon className="h-12 w-12 text-blue-500 mb-3" />
                <h3 className="font-semibold text-foreground dark:text-slate-50 text-sm">{report.title}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
