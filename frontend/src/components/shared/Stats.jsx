import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '@/lib/utils';

export function StatCard({ title, value, icon: Icon, trend, description, className }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4" style={{ color: '#71717A' }} />}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black text-white font-heading tracking-tight">
          {value}
        </div>
        {description && (
          <p className="text-[10px] mt-1 font-medium text-zinc-500 uppercase tracking-widest">
            {description}
          </p>
        )}
        {trend && (
          <p className="text-xs mt-1" style={{
            color: trend.positive ? '#4ADE80' : '#EF4444'
          }}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatsGrid({ children, columns = 4 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {children}
    </div>
  );
}

export default function Stats({ title, value, icon: Icon, trend, className }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium" style={{ color: '#A1A1AA' }}>
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4" style={{ color: '#71717A' }} />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>
          {value}
        </div>
        {trend && (
          <p className="text-xs mt-1" style={{
            color: trend.startsWith('+') ? '#4ADE80' : '#EF4444'
          }}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
