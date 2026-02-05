
import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { TrendingUp, Users, CloudRain } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

export default function ForecastingDashboard() {
    // Phase 5: Simulated Forecast Data
    const [data] = useState([
        { date: 'Mon', actual: 4000, forecast: 4200 },
        { date: 'Tue', actual: 3500, forecast: 3600 },
        { date: 'Wed', actual: 5000, forecast: 4800 },
        { date: 'Thu', actual: 5500, forecast: 5900 },
        { date: 'Fri', actual: 8000, forecast: 8200 },
        { date: 'Sat', actual: 9500, forecast: 9800 },
        { date: 'Sun', actual: 7000, forecast: 7100 },
    ]);

    return (
        <PageContainer
            title="Demand Forecasting"
            description="AI-Driven Sales Predictions"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Predicted Revenue (Next 7 Days)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /> $48,250</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">Staffing Requirement</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-500" /> +2 Servers (Fri/Sat)</div></CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-zinc-400">External Factors</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-white flex items-center gap-2"><CloudRain className="w-5 h-5 text-zinc-500" /> Rain Forecast</div></CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Actual vs Forecasted Sales</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#666" />
                            <YAxis stroke="#666" />
                            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#333' }} />
                            <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorForecast)" name="AI Forecast" />
                            <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" name="Actual Sales" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
