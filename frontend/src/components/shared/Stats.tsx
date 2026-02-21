import React, { ElementType } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatTrend {
  value: string;
  positive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ElementType;
  trend?: StatTrend;
  description?: string;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, description, className }: StatCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}> /* keep-inline */ /* keep-inline */
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4" style={{ color: '#71717A' }} />} /* keep-inline */ /* keep-inline */
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-foreground font-heading tracking-tight">
          {value}
        </div>
        {description && (
          <p className="text-[10px] mt-1 font-medium text-muted-foreground uppercase tracking-widest">
            {description}
          </p>
        )}
        {trend && (
          <p className="text-xs mt-1" style={{ /* keep-inline */ /* keep-inline */
            color: trend.positive ? '#4ADE80' : '#EF4444'
          }}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: number;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {children}
    </div>
  );
}

interface DefaultStatsProps {
  title: string;
  value: string | number;
  icon?: ElementType;
  trend?: string;
  className?: string;
}

export default function Stats({ title, value, icon: Icon, trend, className }: DefaultStatsProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}> /* keep-inline */ /* keep-inline */
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4" style={{ color: '#71717A' }} />} /* keep-inline */ /* keep-inline */
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}> /* keep-inline */ /* keep-inline */
          {value}
        </div>
        {trend && (
          <p className="text-xs mt-1" style={{ /* keep-inline */ /* keep-inline */
            color: trend.startsWith('+') ? '#4ADE80' : '#EF4444'
          }}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
