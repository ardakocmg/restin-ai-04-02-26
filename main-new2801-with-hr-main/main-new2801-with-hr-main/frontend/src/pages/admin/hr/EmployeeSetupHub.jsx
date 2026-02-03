import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, DollarSign, Settings, UserPlus, Database, Globe, MapPin, Briefcase, Award, Building2, Clock, Target, XCircle } from 'lucide-react';

const modules = [
  { id: 'employees', title: 'Employees', icon: Users, path: '/admin/hr-setup/employees', color: 'blue' },
  { id: 'calendar', title: 'Calendar', icon: Calendar, path: '/admin/hr-setup/calendar', color: 'green' },
  { id: 'salary', title: 'Salary Package', icon: DollarSign, path: '/admin/hr-setup/salary', color: 'yellow' },
  { id: 'custom', title: 'Custom Fields', icon: Settings, path: '/admin/hr-setup/custom', color: 'purple' },
  { id: 'applicants', title: 'Applicants', icon: UserPlus, path: '/admin/hr-setup/applicants', color: 'pink' },
  { id: 'settings', title: 'Settings', icon: Settings, path: '/admin/hr-setup/settings', color: 'gray' },
  { id: 'banks', title: 'Banks', icon: Database, path: '/admin/hr-setup/banks', color: 'blue', highlight: true },
  { id: 'citizenship', title: 'Citizenship', icon: Globe, path: '/admin/hr-setup/citizenship', color: 'indigo' },
  { id: 'countries', title: 'Countries', icon: Globe, path: '/admin/hr-setup/countries', color: 'cyan' },
  { id: 'locations', title: 'Locations', icon: MapPin, path: '/admin/hr-setup/locations', color: 'red' },
  { id: 'occupations', title: 'Occupations', icon: Briefcase, path: '/admin/hr-setup/occupations', color: 'orange' },
  { id: 'grades', title: 'Grades', icon: Award, path: '/admin/hr-setup/grades', color: 'amber' },
  { id: 'departments', title: 'Departments', icon: Building2, path: '/admin/hr-setup/departments', color: 'emerald' },
  { id: 'employment-types', title: 'Employment Types', icon: Briefcase, path: '/admin/hr-setup/employment-types', color: 'teal' },
  { id: 'work-schedules', title: 'Work Schedule Profiles', icon: Clock, path: '/admin/hr-setup/work-schedules', color: 'violet' },
  { id: 'cost-centres', title: 'Cost Centres', icon: Target, path: '/admin/hr-setup/cost-centres', color: 'fuchsia' },
  { id: 'organisation', title: 'Organisation', icon: Building2, path: '/admin/hr-setup/organisation', color: 'rose' },
  { id: 'termination', title: 'Termination Reasons', icon: XCircle, path: '/admin/hr-setup/termination', color: 'slate' },
];

export default function EmployeeSetupHub() {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Employee Setup</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Configure employee data and organizational structure</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card
              key={module.id}
              className={`cursor-pointer hover:shadow-lg transition-all ${
                module.highlight ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => navigate(module.path)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <Icon className={`h-12 w-12 mb-3 text-${module.color}-500`} />
                <h3 className="font-semibold text-slate-900 dark:text-slate-50">{module.title}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}