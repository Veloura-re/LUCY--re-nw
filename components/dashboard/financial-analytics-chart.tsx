"use client";

import React, { useState, useEffect } from 'react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

export function FinancialAnalyticsChart() {
    const [mounted, setMounted] = useState(false);
    
    // Mock data for immediate visual impact (in a real app, this would fetch from /api/school/finance)
    const data = [
        { month: 'Jan', revenue: 12000, projected: 10000 },
        { month: 'Feb', revenue: 15000, projected: 12000 },
        { month: 'Mar', revenue: 14000, projected: 15000 },
        { month: 'Apr', revenue: 22000, projected: 18000 },
        { month: 'May', revenue: 28000, projected: 24000 },
        { month: 'Jun', revenue: 32000, projected: 30000 },
    ];

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return (
        <Card className="h-[400px] bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-3xl animate-pulse" />
    );

    return (
        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-t-zinc-800/20">
            <CardHeader className="p-3.5 sm:p-8 pb-2 sm:pb-4 border-b border-zinc-200 dark:border-zinc-900/50">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base sm:text-lg md:text-2xl font-medium text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-3">
                            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-eduGreen-500" />
                            Revenue Ledger
                        </CardTitle>
                        <p className="text-[8px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-[0.15em] sm:tracking-[0.2em] mt-0.5 sm:mt-1 ml-6 sm:ml-8">6-Month Fiscal Trajectory</p>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-4">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-eduGreen-500 shadow-[0_0_8px_#10b981]" />
                            <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Actual</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                            <span className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Projected</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-8 h-[220px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800/50" />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#71717a' }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#71717a' }}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(9, 9, 11, 0.9)', 
                                border: '1px solid rgba(63, 63, 70, 0.5)',
                                borderRadius: '8px',
                                fontSize: '10px',
                                color: '#fff'
                            }} 
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="projected" 
                            stroke="#71717a" 
                            strokeDasharray="4 4"
                            fillOpacity={1} 
                            fill="url(#colorProjected)" 
                        />
                        <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
