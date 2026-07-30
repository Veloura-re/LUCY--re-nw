"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Trash2, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function SettingsAcademicTerms() {
    const [terms, setTerms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [school, setSchool] = useState<any>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch school settings
            const schoolRes = await fetch("/api/school/settings");
            const schoolJson = (await schoolRes.json()) as any;
            if (schoolJson.school) {
                setSchool(schoolJson.school);
                setSettingsData({
                    termStructure: schoolJson.school.termStructure || "QUARTERS",
                    termStructureLocked: schoolJson.school.termStructureLocked || false,
                    defaultBillingCycle: schoolJson.school.defaultBillingCycle || "MONTHLY"
                });
            }

            // Fetch terms
            const termsRes = await fetch("/api/school/terms");
            const termsJson = await termsRes.json() as { terms: any[] };
            if (termsJson.terms) setTerms(termsJson.terms);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

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
                setSchool(json.school);
            } else {
                toast.error(json.error || "Failed to update settings.");
                // Revert settings state
                if (school) {
                    setSettingsData({
                        termStructure: school.termStructure || "QUARTERS",
                        termStructureLocked: school.termStructureLocked || false,
                        defaultBillingCycle: school.defaultBillingCycle || "MONTHLY"
                    });
                }
            }
        } catch (e) {
            toast.error("Network error during uplink.");
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
                toast.success("Term created successfully.");
                setFormData({ name: "", startDate: "", endDate: "", isActive: false });
                fetchData();
            } else {
                toast.error("Failed to create term.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const handleAutoGenerate = async () => {
        toast.info("Auto-generation protocol initiated...");
        // This is a placeholder for auto-generation logic
        // We'll simulate creating Q1, Q2, Q3, Q4 for QUARTERS
        const currentYear = new Date().getFullYear();
        let generatedTerms = [];
        if (settingsData.termStructure === 'QUARTERS') {
            generatedTerms = [
                { name: `Q1 ${currentYear}`, startDate: `${currentYear}-09-01`, endDate: `${currentYear}-11-15`, isActive: true },
                { name: `Q2 ${currentYear}`, startDate: `${currentYear}-11-16`, endDate: `${currentYear+1}-01-31`, isActive: false },
                { name: `Q3 ${currentYear}`, startDate: `${currentYear+1}-02-01`, endDate: `${currentYear+1}-04-15`, isActive: false },
                { name: `Q4 ${currentYear}`, startDate: `${currentYear+1}-04-16`, endDate: `${currentYear+1}-06-30`, isActive: false },
            ];
        } else if (settingsData.termStructure === 'SEMESTERS') {
            generatedTerms = [
                { name: `Semester 1 ${currentYear}`, startDate: `${currentYear}-09-01`, endDate: `${currentYear+1}-01-31`, isActive: true },
                { name: `Semester 2 ${currentYear}`, startDate: `${currentYear+1}-02-01`, endDate: `${currentYear+1}-06-30`, isActive: false },
            ];
        }

        for (const t of generatedTerms) {
            await fetch("/api/school/terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(t)
            });
        }
        
        toast.success("Academic periods auto-generated successfully.");
        fetchData();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-medium text-zinc-900 dark:text-white tracking-tight">Academic & Financial Cycles</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-500 mt-1 uppercase tracking-widest">Manage quarters, semesters, and billing periods</p>
                </div>
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
                    {terms.length === 0 && (
                        <Button 
                            onClick={handleAutoGenerate}
                            variant="outline" 
                            className="border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-widest gap-2"
                        >
                            <Sparkles className="w-3 h-3" /> Auto-Generate Dates
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-500">Term Name</Label>
                            <Input 
                                placeholder="e.g. Q1 2026, Semester 1"
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
                        className="w-full bg-eduGreen-600 hover:bg-eduGreen-700 text-zinc-900 dark:text-white h-12 rounded-xl text-xs font-bold uppercase tracking-widest mt-4"
                    >
                        {creating ? "Processing..." : "Register Period"}
                    </Button>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {loading ? (
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
                        <div className="flex items-center gap-2">
                            <div className="text-right mr-4">
                                <p className="text-zinc-900 dark:text-white text-xs font-medium">{t._count?.marklists || 0}</p>
                                <p className="text-[9px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Marklists</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-zinc-600 dark:text-zinc-500 hover:text-red-600 dark:text-red-400 hover:bg-red-500/10 h-8 w-8 rounded-full">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
