import { Card,CardContent } from '@/components/ui/card';
import { Award,Cake,Calendar,TrendingDown,Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const reports = [
  { id: 'employee-details', title: 'Employee Details', icon: Users, path: '/manager/hr-reports/employee-details' },
  { id: 'headcount', title: 'Head Count', icon: Users, path: '/manager/hr-reports/headcount' },
  { id: 'turnover', title: 'Staff Turnover', icon: TrendingDown, path: '/manager/hr-reports/turnover' },
  { id: 'employment-termination', title: 'Employment & Termination Dates', icon: Calendar, path: '/manager/hr-reports/employment-dates' },
  { id: 'birthdays', title: 'Birthdays & Anniversaries', icon: Cake, path: '/manager/hr-reports/birthdays' },
  { id: 'training-expiring', title: 'Training & Certifications Expiring Soon', icon: Award, path: '/manager/hr-reports/training-expiring' },
  { id: 'training-starting', title: 'Training & Certifications Starting Soon', icon: Award, path: '/manager/hr-reports/training-starting' },
  { id: 'training-ongoing', title: 'Ongoing Training & Certifications', icon: Award, path: '/manager/hr-reports/training-ongoing' },
];

export default function ReportingHub() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground dark:text-slate-50">Reporting</h1>
        <p className="text-muted-foreground mt-1">HR Analytics & Reports</p>
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
                <Icon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-3" />
                <h3 className="font-semibold text-foreground dark:text-slate-50 text-sm">{report.title}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
