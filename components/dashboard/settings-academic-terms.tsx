"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Trash2, Lock, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { CachedSyncBadge } from "@/components/ui/cached-sync-badge";
import { invalidateClientCache } from "@/lib/cache-client";

interface TermsPayload {
    school: any;
    terms: any[];
}

export function SettingsAcademicTerms() {
    const [creating, setCreating] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [autoGenerating, setAutoGenerating] = useState(false);
    const [updatingTermId, setUpdatingTermId] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false
    });

    const [settingsData, setSettingsData] = useState({
        termStructure: "QUARTERS",
        termStructureLocked: false,
        defaultBillingCycle: "MONTHLY"
    });

    // Cache-first query with background SWR sync
    const { 
        data, 
        loading, 
        isRevalidating, 
        isOffline, 
        isFromCache, 
        error, 
        refetch, 
        mutate 
    } = useCachedQuery<TermsPayload>({
        key: 'academic_terms_and_settings',
        fetcher: async (signal) => {
            const [schoolRes, termsRes] = await Promise.all([
                fetch("/api/school/settings", { signal }),
                fetch("/api/school/terms", { signal })
            ]);

            const schoolJson = schoolRes.ok ? ((await schoolRes.json()) as any) : { school: null };
            const termsJson = termsRes.ok ? ((await termsRes.json()) as any) : { terms: [] };

            return {
                school: schoolJson.school,
                terms: termsJson.terms || []
            };
        },
        onSuccess: (freshData) => {
            if (freshData.school) {
                setSettingsData({
                    termStructure: freshData.school.termStructure || "QUARTERS",
                    termStructureLocked: freshData.school.termStructureLocked || false,
                    defaultBillingCycle: freshData.school.defaultBillingCycle || "MONTHLY"
                });
            }
        }
    });

    const school = data?.school;
    const terms = data?.terms || [];

    const handleUpdateSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch("/api/school/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settingsData)
            });
            const json = (await res.json()) as any;
            if (res.ok) {
                toast.success("Institutional parameters synchronized successfully.");
                invalidateClientCache('academic_terms_and_settings');
                mutate(prev => prev ? { ...prev, school: json.school } : { school: json.school, terms: [] });
            } else {
                toast.error(json.error || "Failed to update settings.");
                if (school) {
                    setSettingsData({
                        termStructure: school.termStructure || "QUARTERS",
                        termStructureLocked: school.termStructureLocked || false,
                        defaultBillingCycle: school.defaultBillingCycle || "MONTHLY"
                    });
                }
            }
        } catch (e) {
            toast.error("Network error during connection.");
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCreateTerm = async () => {
        setCreating(true);
        try {
            const res = await fetch("/api/school/terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const termJson = await res.json() as any;
                toast.success("Term created successfully.");
                setFormData({ name: "", startDate: "", endDate: "", isActive: false });
                
                invalidateClientCache('academic_terms_and_settings');
                invalidateClientCache('school-terms');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('academic-terms-updated'));
                }

                if (termJson.term) {
                    mutate(prev => {
                        if (!prev) return { school: null, terms: [termJson.term] };
                        const updatedTerms = termJson.term.isActive
                            ? [termJson.term, ...prev.terms.map(t => ({ ...t, isActive: false }))]
                            : [termJson.term, ...prev.terms];
                        return { ...prev, terms: updatedTerms };
                    }, true);
                } else {
                    refetch(true);
                }
            } else {
                const err = await res.json() as any;
                toast.error(err.error || "Failed to create term.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to create term.");
        } finally {
            setCreating(false);
        }
    };

    const handleSetActiveTerm = async (id: string) => {
        setUpdatingTermId(id);
        try {
            const res = await fetch("/api/school/terms", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isActive: true })
            });
            if (res.ok) {
                toast.success("Active academic term updated.");
                invalidateClientCache('academic_terms_and_settings');
                invalidateClientCache('school-terms');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('academic-terms-updated'));
                }
                mutate(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        terms: prev.terms.map(t => ({
                            ...t,
                            isActive: t.id === id
                        }))
                    };
                }, true);
            } else {
                const err: any = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to switch active term.");
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to switch active term.");
        } finally {
            setUpdatingTermId(null);
        }
    };

    const handleDeleteTerm = async (id: string) => {
        try {
            const res = await fetch(`/api/school/terms?id=${id}`, {
                method: "DELETE"
            });
            const resData = (await res.json().catch(() => ({}))) as any;
            if (res.ok) {
                toast.success("Academic period deleted successfully.");
                invalidateClientCache('academic_terms_and_settings');
                invalidateClientCache('school-terms');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('academic-terms-updated'));
                }
                mutate(prev => prev ? { ...prev, terms: prev.terms.filter(t => t.id !== id) } : prev);
            } else {
                toast.error(resData.error || "Failed to delete academic term.", {
                    description: resData.details || "Check if any active marklists or exams depend on this term."
                });
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to delete academic term.");
        }
    };

    const handleAutoGenerate = async () => {
        setAutoGenerating(true);
        toast.info("Auto-generation protocol initiated...");
        try {
            const now = new Date();
            const currentMonth = now.getMonth(); // 0-indexed: Jan=0, Aug=7, Sep=8
            // Academic year begins August/September
            const startYear = currentMonth >= 7 ? now.getFullYear() : now.getFullYear() - 1;
            const endYear = startYear + 1;
            const todayStr = now.toISOString().split('T')[0];

            let generatedTerms: Array<{ name: string; startDate: string; endDate: string; isActive?: boolean }> = [];

            if (settingsData.termStructure === 'QUARTERS') {
                generatedTerms = [
                    { name: `Q1 ${startYear}`, startDate: `${startYear}-09-01`, endDate: `${startYear}-11-15` },
                    { name: `Q2 ${startYear}-${endYear}`, startDate: `${startYear}-11-16`, endDate: `${endYear}-01-31` },
                    { name: `Q3 ${endYear}`, startDate: `${endYear}-02-01`, endDate: `${endYear}-04-15` },
                    { name: `Q4 ${endYear}`, startDate: `${endYear}-04-16`, endDate: `${endYear}-06-30` },
                ];
            } else if (settingsData.termStructure === 'SEMESTERS') {
                generatedTerms = [
                    { name: `Semester 1 ${startYear}-${endYear}`, startDate: `${startYear}-09-01`, endDate: `${endYear}-01-31` },
                    { name: `Semester 2 ${endYear}`, startDate: `${endYear}-02-01`, endDate: `${endYear}-06-30` },
                ];
            } else if (settingsData.termStructure === 'TRIMESTERS') {
                generatedTerms = [
                    { name: `Trimester 1 ${startYear}`, startDate: `${startYear}-09-01`, endDate: `${startYear}-12-15` },
                    { name: `Trimester 2 ${endYear}`, startDate: `${endYear}-01-05`, endDate: `${endYear}-04-10` },
                    { name: `Trimester 3 ${endYear}`, startDate: `${endYear}-04-20`, endDate: `${endYear}-07-15` },
                ];
            } else {
                // CUSTOM fallback
                generatedTerms = [
                    { name: `Term 1 ${startYear}-${endYear}`, startDate: `${startYear}-09-01`, endDate: `${endYear}-01-31` },
                    { name: `Term 2 ${endYear}`, startDate: `${endYear}-02-01`, endDate: `${endYear}-06-30` },
                ];
            }

            // Determine active term based on today's date
            let activeIndex = generatedTerms.findIndex(t => todayStr >= t.startDate && todayStr <= t.endDate);
            if (activeIndex === -1) activeIndex = 0; // Default to first term

            const finalTerms = generatedTerms.map((t, idx) => ({
                ...t,
                isActive: idx === activeIndex
            }));

            // Send batch creation to backend
            const res = await fetch("/api/school/terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ terms: finalTerms })
            });

            if (!res.ok) {
                const errData: any = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to auto-generate academic terms.");
            }

            const data: any = await res.json();
            toast.success(`Generated ${data.count || finalTerms.length} academic periods successfully.`);

            invalidateClientCache('academic_terms_and_settings');
            invalidateClientCache('school-terms');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('academic-terms-updated'));
            }

            await refetch(true);
        } catch (err: any) {
            console.error("Auto-generate error:", err);
            toast.error(err?.message || "Failed to auto-generate academic terms.");
        } finally {
            setAutoGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-medium text-zinc-900 dark:text-white tracking-tight">Academic &amp; Financial Cycles</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-1 uppercase tracking-widest">Manage quarters, semesters, and billing periods</p>
                </div>
                <CachedSyncBadge 
                    isRevalidating={isRevalidating} 
                    isOffline={isOffline} 
                    isFromCache={isFromCache} 
                    error={error} 
                    onSync={() => refetch(true)} 
                />
            </div>

            {/* Structure Settings */}
            <Card className="bg-white dark:bg-[#050505] border-zinc-200 dark:border-white/5 shadow-2xl relative overflow-hidden">
                {school?.termStructureLocked && (
                    <div className="absolute top-0 right-0 p-4 flex items-center gap-2 text-eduGreen-500">
                        <Lock className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Locked</span>
                    </div>
                )}
                
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">System Architecture</CardTitle>
                    <CardDescription className="text-xs text-zinc-600 dark:text-zinc-500 max-w-2xl">
                        Define the primary structure for your academic year. This controls how report cards and student rankings are generated.
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {!school?.termStructureLocked && (
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex gap-3">
                            <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-orange-300">Warning: Structural Implications</h4>
                                <p className="text-xs text-orange-300/80 mt-1 leading-relaxed">
                                    Changing the academic structure will impact how existing assessments and marklists are grouped. 
                                    Once your academic year begins and assessments are logged, you should <strong>lock</strong> these settings.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Academic Structure</Label>
                            <Select 
                                value={settingsData.termStructure} 
                                onValueChange={v => setSettingsData({...settingsData, termStructure: v})}
                                disabled={school?.termStructureLocked}
                            >
                                <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white h-12 rounded-xl">
                                    <SelectValue placeholder="Select Structure" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                    <SelectItem value="QUARTERS">Quarterly (4 Terms)</SelectItem>
                                    <SelectItem value="SEMESTERS">Semesterly (2 Terms)</SelectItem>
                                    <SelectItem value="TRIMESTERS">Trimesters (3 Terms)</SelectItem>
                                    <SelectItem value="CUSTOM">Custom Schedule</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Default Billing Cycle</Label>
                            <Select 
                                value={settingsData.defaultBillingCycle} 
                                onValueChange={v => setSettingsData({...settingsData, defaultBillingCycle: v})}
                            >
                                <SelectTrigger className="w-full bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white h-12 rounded-xl">
                                    <SelectValue placeholder="Select Cycle" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white">
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="TERM">Academic Term</SelectItem>
                                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                    <SelectItem value="SEMESTERLY">Semesterly</SelectItem>
                                    <SelectItem value="ANNUAL">Full Academic Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-white/5">
                        <div className="flex items-center gap-4">
                            <Switch 
                                checked={settingsData.termStructureLocked} 
                                onCheckedChange={c => setSettingsData({...settingsData, termStructureLocked: c})}
                            />
                            <Label className="text-xs text-zinc-600 dark:text-zinc-400">Lock Structural Settings</Label>
                        </div>
                        
                        <Button 
                            onClick={handleUpdateSettings} 
                            disabled={savingSettings}
                            className="bg-white text-black hover:bg-zinc-200 h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest"
                        >
                            {savingSettings ? "Synchronizing..." : "Save Configuration"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="h-4"></div>

            {/* Manual Term Creation */}
            <Card className="bg-white dark:bg-[#050505] border-zinc-200 dark:border-white/5 shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-medium text-zinc-900 dark:text-white">Periods Timeline</CardTitle>
                        <CardDescription className="text-xs text-zinc-600 dark:text-zinc-500">Define the actual dates for your grading periods.</CardDescription>
                    </div>
                    {terms.length === 0 && !loading && (
                        <Button 
                            onClick={handleAutoGenerate}
                            disabled={autoGenerating}
                            variant="outline" 
                            className="border-eduGreen-500/30 text-eduGreen-500 bg-eduGreen-500/10 hover:bg-eduGreen-500/20 text-[10px] font-bold uppercase tracking-widest gap-2"
                        >
                            <Sparkles className="w-3 h-3" /> {autoGenerating ? "Generating..." : "Auto-Generate Dates"}
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Term Name</Label>
                            <Input 
                                placeholder="e.g. Q1 2026, Semester 1, Trimester 1"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white h-12 rounded-xl"
                            />
                        </div>
                        <div className="flex items-center justify-between px-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-xl h-12 mt-6">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Set as Active Term</Label>
                            <Switch checked={formData.isActive} onCheckedChange={c => setFormData({ ...formData, isActive: c })} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Start Date</Label>
                            <Input 
                                type="date"
                                value={formData.startDate}
                                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white h-12 rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">End Date</Label>
                            <Input 
                                type="date"
                                value={formData.endDate}
                                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                className="bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white h-12 rounded-xl"
                            />
                        </div>
                    </div>
                    
                    <Button 
                        onClick={handleCreateTerm}
                        disabled={creating || !formData.name || !formData.startDate || !formData.endDate}
                        className="w-full bg-eduGreen-600 hover:bg-eduGreen-700 text-white dark:text-zinc-900 h-12 rounded-xl text-xs font-bold uppercase tracking-widest mt-4"
                    >
                        {creating ? "Processing..." : "Register Period"}
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {loading && terms.length === 0 ? (
                    <div className="h-20 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-xl animate-pulse" />
                ) : terms.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-white dark:bg-[#050505] border border-zinc-200 dark:border-white/5 rounded-2xl group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                    {t.name}
                                    {t.isActive && (
                                        <span className="px-2 py-0.5 rounded-full bg-eduGreen-500/20 text-eduGreen-400 text-[9px] uppercase tracking-widest">Active</span>
                                    )}
                                </h3>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mt-1">
                                    {new Date(t.startDate).toLocaleDateString()} — {new Date(t.endDate).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {!t.isActive && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={updatingTermId === t.id}
                                    onClick={() => handleSetActiveTerm(t.id)}
                                    className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500 hover:text-eduGreen-500 transition-colors"
                                >
                                    {updatingTermId === t.id ? "Activating..." : "Set Active"}
                                </Button>
                            )}
                            <div className="text-right mr-2">
                                <p className="text-zinc-900 dark:text-white text-xs font-medium">{t._count?.marklists || 0}</p>
                                <p className="text-[9px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Marklists</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteTerm(t.id)}
                                className="text-zinc-600 dark:text-zinc-500 hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-full"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
