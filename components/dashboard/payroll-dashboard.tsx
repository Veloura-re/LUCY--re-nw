"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowUpCircle, Activity, ChevronDown, ChevronUp, History, User } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function PayrollDashboard({ staff, payrollHistory, handleIssuePayment, isPaying }: any) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyExpenditure = Array.isArray(payrollHistory)
        ? payrollHistory.filter(p => p && p.createdAt && new Date(p.createdAt).getMonth() === currentMonth && new Date(p.createdAt).getFullYear() === currentYear)
            .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
        : 0;

    const previousMonthExpenditure = Array.isArray(payrollHistory)
        ? payrollHistory.filter(p => p && p.createdAt && new Date(p.createdAt).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1))
            .reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
        : 0;

    const delta = previousMonthExpenditure > 0 ? ((monthlyExpenditure - previousMonthExpenditure) / previousMonthExpenditure) * 100 : 0;

    const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

    return (
        <div className="space-y-3.5 sm:space-y-6 md:space-y-12 animate-in fade-in duration-500">
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-6">
                <Card className="bg-gradient-to-br from-amber-950/40 to-zinc-950/40 border-amber-900/30 rounded-xl sm:rounded-3xl lg:rounded-[2.5rem] p-3.5 sm:p-8 backdrop-blur-xl relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-amber-500/10 rounded-full blur-[30px] sm:blur-[40px] -mr-6 -mt-6 sm:-mr-10 sm:-mt-10 transition-all duration-500 group-hover:bg-amber-500/20" />
                    <h3 className="text-[8px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-500/80 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <Wallet className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Monthly Expenditure
                    </h3>
                    <p className="text-xl sm:text-4xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                        ${monthlyExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-2 sm:mt-4">
                        <div className={cn("px-1.5 sm:px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] font-bold uppercase tracking-widest", delta > 0 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs Last Mth
                        </div>
                    </div>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl lg:rounded-[2.5rem] p-3.5 sm:p-8 backdrop-blur-xl hover:border-zinc-800 transition-colors shadow-sm">
                    <h3 className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Active Nodes
                    </h3>
                    <p className="text-xl sm:text-4xl font-semibold text-zinc-900 dark:text-white tracking-tight">{staff?.length || 0}</p>
                    <p className="text-[7px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-2 sm:mt-4">Synchronization Active</p>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl lg:rounded-[2.5rem] p-3.5 sm:p-8 backdrop-blur-xl hover:border-zinc-800 transition-colors shadow-sm">
                    <h3 className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                        <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Avg Disbursement
                    </h3>
                    <p className="text-xl sm:text-4xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                        ${staff?.length > 0 ? (monthlyExpenditure / staff.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </p>
                    <p className="text-[7px] sm:text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-2 sm:mt-4">Per Node (30d trailing)</p>
                </Card>
            </div>

            <div className="space-y-3.5 sm:space-y-6">
                <div className="flex items-center gap-2.5 sm:gap-4 border-b border-zinc-200 dark:border-zinc-900 pb-3 sm:pb-6">
                    <div className="p-2 sm:p-3 bg-amber-500/10 rounded-lg sm:rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-500 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]">
                        <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight uppercase italic">Tactical <span className="text-amber-600 dark:text-amber-500 not-italic">Roster</span></h2>
                        <p className="text-[8px] sm:text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-0.5 sm:mt-1">Authorize disbursement</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:gap-4">
                    {Array.isArray(staff) && staff.length > 0 ? staff.map((member, idx) => {
                        const memberHistory = Array.isArray(payrollHistory) 
                            ? payrollHistory.filter(p => p.userId === member.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            : [];
                        const lastPay = memberHistory[0];
                        const isExpanded = expandedStaff === member.id;

                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={member.id} 
                                className="bg-white/40 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-3xl overflow-hidden hover:border-amber-300 dark:hover:border-amber-900/40 transition-all duration-300 shadow-sm"
                            >
                                <div className="p-3.5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-6 relative z-10">
                                    <div className="flex items-center gap-3 sm:gap-6">
                                        <div className="w-9 h-9 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center font-bold text-xs sm:text-lg text-zinc-700 dark:text-zinc-300 shadow-inner">
                                            {member.name[0]}
                                        </div>
                                        <div>
                                            <div className="text-xs sm:text-base font-semibold text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2 sm:gap-3">
                                                {member.name}
                                                {lastPay && new Date(lastPay.createdAt).getMonth() === currentMonth && (
                                                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[7px] sm:text-[8px] tracking-widest">CLEARED</span>
                                                )}
                                            </div>
                                            <div className="text-[8px] sm:text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5 sm:mt-1">{member.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 md:gap-12">
                                        <div className="text-left md:text-right">
                                            <div className="text-[7px] sm:text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-0.5 sm:mb-1">Last Authorized</div>
                                            <div className="text-[10px] sm:text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5 sm:gap-2 justify-start md:justify-end">
                                                {lastPay ? `$${Number(lastPay.amount).toLocaleString()} ` : '---'}
                                                <span className="text-[8px] sm:text-[10px] text-zinc-600 dark:text-zinc-500 font-normal">
                                                    {lastPay ? format(new Date(lastPay.createdAt), 'dd MMM yy') : ''}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setExpandedStaff(isExpanded ? null : member.id)}
                                                className="h-8 w-8 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl border border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white text-zinc-600 dark:text-zinc-500 p-0"
                                            >
                                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                            </Button>
                                            <Button
                                                onClick={() => handleIssuePayment(member.id)}
                                                isLoading={isPaying === member.id}
                                                className="h-8 sm:h-12 px-3 sm:px-6 bg-amber-600 hover:bg-amber-500 text-zinc-900 dark:text-white rounded-lg sm:rounded-xl font-medium text-[8px] sm:text-[10px] uppercase tracking-widest transition-all shadow-[0_0_15px_-3px_rgba(217,119,6,0.4)] hover:shadow-[0_0_25px_-3px_rgba(217,119,6,0.6)] flex items-center gap-1.5 sm:gap-2 group"
                                            >
                                                <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-y-0.5 transition-transform" /> 
                                                <span>Authorize</span>
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-zinc-200 dark:border-zinc-900/50 bg-white/20 dark:bg-zinc-950/20"
                                        >
                                            <div className="p-3.5 sm:p-6">
                                                <h4 className="text-[8px] sm:text-[10px] font-medium text-amber-600 dark:text-amber-500/70 uppercase tracking-widest mb-2 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
                                                    <History className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Historical Disbursements
                                                </h4>
                                                
                                                {memberHistory.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                                                        {memberHistory.slice(0, 4).map((pay: any, i: number) => (
                                                            <div key={pay.id || i} className="p-2.5 sm:p-4 rounded-lg sm:rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800/50 flex flex-col gap-1 sm:gap-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[7px] sm:text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">{format(new Date(pay.createdAt), 'MMM yyyy')}</span>
                                                                    <span className="text-[7px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">{pay.method || 'BANK'}</span>
                                                                </div>
                                                                <div className="text-sm sm:text-lg font-semibold text-zinc-900 dark:text-white">${Number(pay.amount).toLocaleString()}</div>
                                                                {pay.notes && <div className="text-[8px] sm:text-[10px] text-zinc-600 dark:text-zinc-500 truncate mt-0.5 sm:mt-1">"{pay.notes}"</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-4 sm:py-8 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg sm:rounded-2xl text-[8px] sm:text-[10px] uppercase tracking-widest text-zinc-600">
                                                        No previous disbursements found for this node.
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    }) : (
                        <div className="py-10 sm:py-20 text-center border border-zinc-200 dark:border-zinc-900/50 rounded-xl sm:rounded-[2.5rem] text-[8px] sm:text-[10px] uppercase tracking-[0.15em] sm:tracking-[0.2em] text-zinc-600 font-medium">
                            No active personnel detected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
