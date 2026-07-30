"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserMinus, Link2Off, UserPlus, Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RestorationModal({ isOpen, onClose, data, onRefresh }: { isOpen: boolean, onClose: () => void, data: any, onRefresh: () => void }) {
    const [activeTab, setActiveTab] = useState<'faculty' | 'scholars' | 'parents'>('faculty');
    const [absorbing, setAbsorbing] = useState<string | null>(null);

    const handleAbsorbTeacher = async (teacherId: string) => {
        setAbsorbing(teacherId);
        try {
            const res = await fetch('/api/school/diagnostics/connectivity/absorb-teacher', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId })
            });
            if (res.ok) {
                onRefresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setAbsorbing(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-900 p-0 overflow-hidden rounded-[2rem]">
                <div className="p-8 border-b border-slate-200/50 dark:border-zinc-900/50 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl relative">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-medium tracking-tighter text-slate-900 dark:text-white">
                            Restoration Protocols
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 dark:text-zinc-500 font-medium uppercase tracking-[0.2em] text-[10px] mt-2">
                            Resolve architectural synchronization gaps
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex h-[500px]">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-slate-200/50 dark:border-zinc-900/50 p-6 space-y-2 bg-slate-50/50 dark:bg-zinc-950/30">
                        <TabButton 
                            isActive={activeTab === 'faculty'} 
                            onClick={() => setActiveTab('faculty')} 
                            icon={UserMinus} 
                            label="Orphaned Faculty" 
                            count={data?.orphanedTeachers?.length || 0} 
                            color="text-amber-600 dark:text-amber-500"
                        />
                        <TabButton 
                            isActive={activeTab === 'scholars'} 
                            onClick={() => setActiveTab('scholars')} 
                            icon={Link2Off} 
                            label="Unmapped Scholars" 
                            count={data?.unmappedStudents?.length || 0}
                            color="text-red-600 dark:text-red-500"
                        />
                        <TabButton 
                            isActive={activeTab === 'parents'} 
                            onClick={() => setActiveTab('parents')} 
                            icon={UserPlus} 
                            label="Disconnected Parents" 
                            count={data?.disconnectedParents?.length || 0}
                            color="text-orange-500"
                        />
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-50 dark:bg-zinc-950/10 p-6 relative">
                        <div className="h-full pr-4 overflow-y-auto">
                            {activeTab === 'faculty' && (
                                <div className="space-y-4">
                                    <h3 className="text-slate-900 dark:text-white font-medium mb-4">Faculty Awaiting School Placement</h3>
                                    {data?.orphanedTeachers?.length === 0 ? (
                                        <EmptyState message="All faculty mapped successfully." />
                                    ) : (
                                        data?.orphanedTeachers?.map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{t.name}</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">{t.email}</div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => handleAbsorbTeacher(t.id)}
                                                    disabled={absorbing === t.id}
                                                    className="h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 hover:text-amber-600 dark:text-amber-400 text-xs font-medium"
                                                >
                                                    {absorbing === t.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Absorb"}
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'scholars' && (
                                <div className="space-y-4">
                                    <h3 className="text-slate-900 dark:text-white font-medium mb-4">Students Missing Parent Connections</h3>
                                    {data?.unmappedStudents?.length === 0 ? (
                                        <EmptyState message="All students have parent connections." />
                                    ) : (
                                        data?.unmappedStudents?.map((s: any) => (
                                            <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{s.firstName} {s.lastName}</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">Provide this code to parent</div>
                                                </div>
                                                <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-mono text-xs text-eduGreen-500 tracking-widest select-all">
                                                    {s.studentCode}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {activeTab === 'parents' && (
                                <div className="space-y-4">
                                    <h3 className="text-slate-900 dark:text-white font-medium mb-4">Parents Without Child Connections</h3>
                                    {data?.disconnectedParents?.length === 0 ? (
                                        <EmptyState message="All parents mapped successfully." />
                                    ) : (
                                        data?.disconnectedParents?.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/50 hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</div>
                                                    <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">{p.email}</div>
                                                </div>
                                                <div className="text-[10px] uppercase tracking-widest text-orange-500/70 font-medium">
                                                    Awaiting Child Code
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TabButton({ isActive, onClick, icon: Icon, label, count, color }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl transition-all border",
                isActive 
                    ? "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-xl" 
                    : "bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-zinc-900/50"
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", isActive ? color : "text-slate-400 dark:text-zinc-600")} />
                <span className={cn("text-[10px] font-medium uppercase tracking-widest", isActive ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-zinc-500")}>
                    {label}
                </span>
            </div>
            {count > 0 && (
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", isActive ? "bg-slate-200 dark:bg-zinc-800 text-slate-900 dark:text-white" : "bg-slate-100 dark:bg-zinc-900 text-slate-500 dark:text-zinc-600")}>
                    {count}
                </span>
            )}
        </button>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="py-12 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-900/50 rounded-3xl bg-slate-50 dark:bg-zinc-950/20">
            <Check className="w-8 h-8 text-eduGreen-500/50 mb-4" />
            <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-widest">{message}</p>
        </div>
    );
}
