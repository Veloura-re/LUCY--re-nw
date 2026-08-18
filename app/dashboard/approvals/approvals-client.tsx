"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, X, ShieldAlert, Loader2, AlertCircle } from "lucide-react";
import { AlertModal } from "@/components/ui/confirmation-modal";

export default function ApprovalsClient() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/school/approvals");
            const data = (await res.json()) as any;
            if (data.requests) {
                setRequests(data.requests);
            }
        } catch (error) {
            console.error("Failed to fetch approvals:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleResolve = async (requestId: string, resolution: 'APPROVED' | 'REJECTED') => {
        setActionLoading(requestId);
        try {
            const res = await fetch("/api/school/approvals/resolve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, resolution, reason: resolution === 'REJECTED' ? "Rejected by Owner" : "" })
            });

            const data = (await res.json()) as any;

            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
                setAlertConfig({ 
                    title: `Action ${resolution === 'APPROVED' ? 'Approved' : 'Rejected'}`, 
                    message: resolution === 'APPROVED' ? "The requested action has been executed successfully." : "The request was rejected and will not be executed.", 
                    isOpen: true, 
                    variant: resolution === 'APPROVED' ? "success" : "info" 
                });
            } else {
                setAlertConfig({ title: "Resolution Failed", message: data.error || "An error occurred while resolving this request.", isOpen: true, variant: "error" });
            }
        } catch (error) {
            console.error("Resolution error:", error);
        } finally {
            setActionLoading(null);
        }
    };

    const formatActionType = (type: string) => {
        switch(type) {
            case 'DELETE_STAFF': return 'Terminate Faculty Access';
            case 'DELETE_STUDENT': return 'Archive Student Record';
            case 'DELETE_MARKLIST': return 'Delete Marklist Configuration';
            default: return type.replace(/_/g, ' ');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Action <span className="text-eduGreen-500 italic">Approvals</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Review & Authorize Critical System Actions</p>
                </div>
            </div>

            {loading ? (
                <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem] bg-white/20 dark:bg-zinc-950/20">
                    <Loader2 className="w-10 h-10 animate-spin text-zinc-700 mb-6" />
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.4em] text-[10px]">Loading Security Queue</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem] bg-white/20 dark:bg-zinc-950/20">
                    <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center opacity-20 mb-8 border border-zinc-300 dark:border-zinc-800">
                        <ShieldAlert className="w-10 h-10 text-zinc-900 dark:text-white" />
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-[0.4em] text-xs">Queue Clear</p>
                    <p className="text-zinc-700 text-[10px] font-medium uppercase tracking-widest mt-3">No pending actions require authorization.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {requests.map((request: any) => (
                        <Card key={request.id} className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-3xl overflow-hidden shadow-2xl">
                            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                <div className="space-y-4 flex-1">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center">
                                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-medium tracking-tight text-zinc-900 dark:text-white">{formatActionType(request.actionType)}</h3>
                                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Requested by {request.requester?.name} ({request.requester?.role})</p>
                                        </div>
                                    </div>
                                    <div className="bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-300 dark:border-zinc-800/50">
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                            <span className="text-zinc-600 dark:text-zinc-500 uppercase tracking-wider text-[9px] mr-2">Target Data:</span>
                                            {JSON.stringify(request.payload)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                    <Button
                                        onClick={() => handleResolve(request.id, 'REJECTED')}
                                        disabled={actionLoading === request.id}
                                        className="flex-1 md:flex-none h-14 px-8 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-950/30 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800 hover:border-red-200 dark:border-red-900/50 hover:text-red-600 dark:text-red-400 rounded-2xl font-medium text-xs uppercase tracking-widest transition-all"
                                    >
                                        {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() => handleResolve(request.id, 'APPROVED')}
                                        disabled={actionLoading === request.id}
                                        className="flex-1 md:flex-none h-14 px-8 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-2xl font-medium text-xs uppercase tracking-widest shadow-xl shadow-eduGreen-900/20 transition-all"
                                    >
                                        {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Authorize
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} title={alertConfig.title} message={alertConfig.message} variant={alertConfig.variant} />
        </div>
    );
}
