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
        <div className="space-y-12 animate-in fade-in duration-500">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-amber-950/40 to-zinc-950/40 border-amber-900/30 rounded-[2.5rem] p-8 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] -mr-10 -mt-10 transition-all duration-500 group-hover:bg-amber-500/20" />
                    <h3 className="text-[10px] font-medium text-amber-500/80 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Wallet className="w-3 h-3" /> Total Monthly Expenditure
                    </h3>
                    <p className="text-4xl font-semibold text-white tracking-tight">
                        ${monthlyExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                        <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest", delta > 0 ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400")}>
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs Last Mth
                        </div>
                    </div>
                </Card>

                <Card className="bg-zinc-950/40 border-zinc-900/50 rounded-[2.5rem] p-8 backdrop-blur-xl hover:border-zinc-800 transition-colors">
                    <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-3 h-3" /> Active Personnel Nodes
                    </h3>
                    <p className="text-4xl font-semibold text-white tracking-tight">{staff?.length || 0}</p>
                    <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-4">Awaiting Synchronization</p>
                </Card>

                <Card className="bg-zinc-950/40 border-zinc-900/50 rounded-[2.5rem] p-8 backdrop-blur-xl hover:border-zinc-800 transition-colors">
                    <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> Average Disbursement
                    </h3>
                    <p className="text-4xl font-semibold text-white tracking-tight">
                        ${staff?.length > 0 ? (monthlyExpenditure / staff.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </p>
                    <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-widest mt-4">Per Node (30d trailing)</p>
                </Card>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-zinc-900 pb-6">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-white tracking-tight uppercase italic">Tactical <span className="text-amber-500 not-italic">Roster</span></h2>
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Select node to authorize disbursement</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
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
                                className="bg-zinc-950/40 border border-zinc-900/50 rounded-3xl overflow-hidden hover:border-amber-900/40 transition-all duration-300"
                            >
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-300 shadow-inner">
                                            {member.name[0]}
                                        </div>
                                        <div>
                                            <div className="text-base font-semibold text-white uppercase tracking-tight flex items-center gap-3">
                                                {member.name}
                                                {lastPay && new Date(lastPay.createdAt).getMonth() === currentMonth && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] tracking-widest">CLEARED</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">{member.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-12">
                                        <div className="hidden md:block text-right">
                                            <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Last Authorized</div>
                                            <div className="text-xs font-semibold text-white flex items-center gap-2 justify-end">
                                                {lastPay ? `$${Number(lastPay.amount).toLocaleString()} ` : '---'}
                                                <span className="text-[10px] text-zinc-500 font-normal">
                                                    {lastPay ? format(new Date(lastPay.createdAt), 'dd MMM yy') : ''}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setExpandedStaff(isExpanded ? null : member.id)}
                                                className="h-12 w-12 rounded-xl border border-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-500"
                                            >
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                onClick={() => handleIssuePayment(member.id)}
                                                isLoading={isPaying === member.id}
                                                className="h-12 px-6 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all shadow-[0_0_15px_-3px_rgba(217,119,6,0.4)] hover:shadow-[0_0_25px_-3px_rgba(217,119,6,0.6)] flex items-center gap-2 group"
                                            >
                                                <ArrowUpCircle className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> 
                                                <span className="hidden sm:inline">Authorize</span>
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
                                            className="border-t border-zinc-900/50 bg-zinc-950/20"
                                        >
                                            <div className="p-6">
                                                <h4 className="text-[10px] font-medium text-amber-500/70 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                    <History className="w-3 h-3" /> Historical Disbursements
                                                </h4>
                                                
                                                {memberHistory.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {memberHistory.slice(0, 4).map((pay: any, i: number) => (
                                                            <div key={pay.id || i} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 flex flex-col gap-2">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-widest">{format(new Date(pay.createdAt), 'MMM yyyy')}</span>
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest">{pay.method || 'BANK'}</span>
                                                                </div>
                                                                <div className="text-lg font-semibold text-white">${Number(pay.amount).toLocaleString()}</div>
                                                                {pay.notes && <div className="text-[10px] text-zinc-500 truncate mt-1">"{pay.notes}"</div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl text-[10px] uppercase tracking-widest text-zinc-600">
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
                        <div className="py-20 text-center border border-zinc-900/50 rounded-[2.5rem] text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
                            No active personnel nodes detected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
