"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Wallet, Calendar, CheckCircle2, Clock, ArrowDownCircle, Download, FileText, Printer } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function StaffPaycheckView({ user }: { user: any }) {
    const [paychecks, setPaychecks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaychecks();
    }, []);

    const fetchPaychecks = async () => {
        try {
            const res = await fetch('/api/school/finance/payroll');
            const data = await res.json();
            setPaychecks(data.paychecks || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-[40vh] flex items-center justify-center"><SpringingLoader message="Decrypting Payroll Data" /></div>;

    const totalEarned = paychecks.reduce((acc, curr) => acc + Number(curr.amount), 0);
    const lastPayment = paychecks[0];

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Neural <span className="text-eduGreen-500 italic">Ledger</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Personal Remuneration History</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-zinc-950 px-6 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-900 flex flex-col items-end">
                        <span className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Total Accumulated</span>
                        <span className="text-2xl font-medium text-eduGreen-500">${totalEarned.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  border-t-zinc-800/20 shadow-2xl overflow-hidden">
                    <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/80">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-eduGreen-950/20 rounded-2xl border border-eduGreen-900/30">
                                    <Wallet className="w-5 h-5 text-eduGreen-500" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight">Payment Stream</CardTitle>
                                    <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Verified Institutional Disbursements</CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-zinc-950">
                            {paychecks.length === 0 ? (
                                <div className="p-20 text-center flex flex-col items-center gap-4 opacity-40">
                                    <Clock className="w-12 h-12 text-zinc-700" />
                                    <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-700">No disbursements recorded in current node.</p>
                                </div>
                            ) : (
                                paychecks.map((pay) => (
                                    <div key={pay.id} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-eduGreen-900/5 transition-all group/row">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center group-hover/row:border-eduGreen-900/30 transition-all shadow-2xl relative overflow-hidden">
                                                <Calendar className="w-6 h-6 text-zinc-800 dark:text-zinc-200 group-hover/row:text-eduGreen-500" />
                                                <div className="absolute inset-x-0 bottom-0 h-1 bg-eduGreen-500/20" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-xl text-zinc-900 dark:text-white dark:text-zinc-100 group-hover/row:text-zinc-900 dark:text-white transition-colors tracking-tight">
                                                    {format(new Date(pay.periodStart), 'MMM yyyy')} Disbursement
                                                </h4>
                                                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mt-1">
                                                    {format(new Date(pay.periodStart), 'dd MMM')} — {format(new Date(pay.periodEnd), 'dd MMM yyyy')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-12 text-right">
                                            <div>
                                                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Status</p>
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-2",
                                                    pay.status === 'COMPLETED' ? "bg-eduGreen-900/20 text-eduGreen-500" : "bg-amber-900/20 text-amber-600 dark:text-amber-500"
                                                )}>
                                                    {pay.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                    {pay.status}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mb-1">Amount</p>
                                                <p className="text-2xl font-medium text-zinc-900 dark:text-white">${Number(pay.amount).toLocaleString()}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl text-zinc-800 dark:text-zinc-200 hover:text-eduGreen-500 hover:bg-eduGreen-900/10 transition-all border border-transparent hover:border-eduGreen-900/30">
                                                <FileText className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  p-10 space-y-8 shadow-2xl">
                        <div className="space-y-2">
                            <h3 className="text-zinc-600 font-medium uppercase tracking-widest text-[10px]">Active Protocol</h3>
                            <h2 className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight italic">Financial <span className="text-eduGreen-500">Stability</span></h2>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 space-y-3">
                                <ArrowDownCircle className="w-5 h-5 text-eduGreen-500" />
                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Automatic Uplink</h4>
                                <p className="text-[10px] text-zinc-600 font-medium leading-relaxed uppercase">Your payments are automatically synchronized with the institutional bank node.</p>
                            </div>

                            <div className="p-6 rounded-2xl bg-zinc-100/40 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 space-y-3">
                                <Download className="w-5 h-5 text-zinc-700" />
                                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Export Capability</h4>
                                <p className="text-[10px] text-zinc-600 font-medium leading-relaxed uppercase">Download verified pay-slips as institutional data containers (PDF).</p>
                            </div>
                        </div>

                        <Button className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl font-medium text-xs uppercase tracking-[0.2em] border border-zinc-300 dark:border-zinc-800 transition-all gap-3">
                            <Printer className="w-4 h-4" />
                            Print Summary
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
