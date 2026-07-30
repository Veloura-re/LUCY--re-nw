"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, GripVertical, Save, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ColumnConfig {
    id?: string;
    title: string;
    maxMarks: number;
    order: number;
    isOptional: boolean;
}

export default function MarklistConfigPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Selection State
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [terms, setTerms] = useState<any[]>([]);

    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");

    // Config State
    const [configId, setConfigId] = useState<string | null>(null);
    const [columns, setColumns] = useState<ColumnConfig[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load Metadata
    useEffect(() => {
        fetchClasses();
        fetchSubjects();
        fetchTerms();
    }, []);

    // Check for search params after options load
    useEffect(() => {
        const initialClassId = searchParams.get('classId');
        const initialSubjectId = searchParams.get('subjectId');
        const initialTermId = searchParams.get('termId');

        if (initialClassId && classes.some(c => c.id === initialClassId)) setSelectedClassId(initialClassId);
        if (initialSubjectId && subjects.some(s => s.id === initialSubjectId)) setSelectedSubjectId(initialSubjectId);
        if (initialTermId && terms.some(t => t.id === initialTermId)) setSelectedTermId(initialTermId);
    }, [searchParams, classes, subjects, terms]);

    const fetchClasses = async () => {
        try {
            const res = await fetch("/api/school/classes");
            if (res.ok) {
                const data = await res.json();
                const flatClasses = data.grades?.flatMap((g: any) => g.classes) || [];
                setClasses(flatClasses);
            }
        } catch (e) { console.error("Classes fetch failed", e); }
    };

    const fetchSubjects = async () => {
        try {
            const res = await fetch("/api/school/subjects");
            if (res.ok) {
                const data = await res.json();
                setSubjects(data.subjects || []);
            }
        } catch (e) { console.error("Subjects fetch failed", e); }
    };

    const fetchTerms = async () => {
        try {
            const res = await fetch("/api/school/terms");
            if (res.ok) {
                const data = await res.json();
                setTerms(data.terms || []);
                const active = (data.terms || []).find((t: any) => t.isActive);
                if (active && !selectedTermId) setSelectedTermId(active.id);
            }
        } catch (e) { console.error("Terms fetch failed", e); }
    };

    // Fetch Config when selection changes
    const loadConfig = async () => {
        if (!selectedClassId || !selectedSubjectId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/marklist/config?classId=${selectedClassId}&subjectId=${selectedSubjectId}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.columns) {
                    setConfigId(data.id);
                    if (data.termId && !selectedTermId) setSelectedTermId(data.termId);
                    setColumns(data.columns.map((c: any) => ({
                        id: c.id,
                        title: c.title,
                        maxMarks: c.maxMarks,
                        order: c.order,
                        isOptional: c.isOptional
                    })));
                } else {
                    // Reset if no config found (New)
                    setConfigId(null);
                    setColumns([
                        { title: "Quiz 1", maxMarks: 20, order: 0, isOptional: false },
                        { title: "Mid Term", maxMarks: 50, order: 1, isOptional: false }
                    ]);
                }
            }
        } catch (e) {
            toast.error("Failed to load configuration");
        } finally {
            setIsLoading(false);
        }
    };

    const addColumn = () => {
        setColumns([...columns, {
            title: "New Assessment",
            maxMarks: 10,
            order: columns.length,
            isOptional: false
        }]);
    };

    const updateColumn = (index: number, field: keyof ColumnConfig, value: any) => {
        const newCols = [...columns];
        newCols[index] = { ...newCols[index], [field]: value };
        setColumns(newCols);
    };

    const removeColumn = (index: number) => {
        setColumns(columns.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!selectedClassId || !selectedSubjectId) {
            toast.error("Please select Class and Subject");
            return;
        }

        // Validate
        if (columns.length === 0) {
            toast.error("At least one assessment column is required");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                // Need to get schoolId from context or fetch. 
                // For MVP, passing a placeholder or relying on server to infer/fetch if token has it.
                // Or we pass the first class's schoolId if available.
                // Let's assume the API/Auth handles user's school context, 
                // BUT the API requires schoolId. 
                // We will pick it from the selected class object if possible.
                schoolId: classes.find(c => c.id === selectedClassId)?.schoolId,
                classId: selectedClassId,
                subjectId: selectedSubjectId,
                termId: selectedTermId || undefined,
                columns: columns.map((c, i) => ({ ...c, order: i })) // Ensure order
            };

            const res = await fetch("/api/marklist/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setConfigId(data.id);
                toast.success("Design Saved Successfully");
            } else {
                toast.error("Failed to save design");
            }
        } catch (e) {
            console.error(e);
            toast.error("Error saving");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-medium uppercase tracking-tight">Marklist Designer</h1>
                    <p className="text-muted-foreground font-medium">Configure Dynamic Assessment Logic</p>
                </div>
                {configId && (
                    <Button
                        variant="outline"
                        className="gap-2 border-primary/20 hover:bg-primary/10 text-primary font-medium"
                        onClick={() => router.push(`/dashboard/marklist/view?configId=${configId}`)}
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Open Live Marklist
                    </Button>
                )}
            </div>

            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem]  shadow-none">
                <CardHeader className="p-10 border-b border-zinc-200 dark:border-zinc-900/30 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-tight">Context Selection</CardTitle>
                        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] mt-1">Define Academic Parameters</p>
                    </div>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-2">
                        <Label>Class / Section</Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Subject</Label>
                        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Subject" />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Academic Term</Label>
                        <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Term (Optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-zinc-600 dark:text-zinc-500 italic">No Term (General)</SelectItem>
                                {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name} {t.isActive && "(Active)"}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        onClick={loadConfig}
                        disabled={!selectedClassId || !selectedSubjectId || isLoading}
                        className="font-medium uppercase tracking-wide"
                    >
                        {isLoading ? "Loading..." : "Load Configuration"}
                    </Button>
                </CardContent>
            </Card>

            {(selectedClassId && selectedSubjectId) && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                    <div className="grid gap-4">
                        {columns.map((col, idx) => (
                            <Card key={idx} className="group relative  border-zinc-200 dark:border-zinc-900/50 bg-white/20 dark:bg-zinc-950/20 hover:bg-zinc-200 dark:hover:bg-zinc-900/10 transition-all rounded-[1.5rem] shadow-none">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-100 dark:bg-zinc-900 group-hover:bg-eduGreen-600 transition-colors" />
                                <CardContent className="p-6 flex items-center gap-6">
                                    <div className="text-muted-foreground cursor-grab active:cursor-grabbing">
                                        <GripVertical className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                        <div className="md:col-span-5 space-y-1">
                                            <Label className="text-xs uppercase text-muted-foreground font-medium">Assessment Name</Label>
                                            <Input
                                                value={col.title}
                                                onChange={(e) => updateColumn(idx, "title", e.target.value)}
                                                className="font-medium text-lg border-transparent hover:border-input focus:border-primary transition-all bg-transparent px-0"
                                                placeholder="e.g. Quiz 1"
                                            />
                                        </div>

                                        <div className="md:col-span-3 space-y-1">
                                            <Label className="text-xs uppercase text-muted-foreground font-medium">Max Marks</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={col.maxMarks === 0 ? '' : col.maxMarks}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                        updateColumn(idx, "maxMarks", isNaN(val) ? 0 : val);
                                                    }}
                                                    className="font-mono font-medium"
                                                />
                                                <span className="text-xs font-medium text-muted-foreground">PTS</span>
                                            </div>
                                        </div>

                                        <div className="md:col-span-3 flex items-center gap-2">
                                            <Switch
                                                checked={col.isOptional}
                                                onCheckedChange={(c) => updateColumn(idx, "isOptional", c)}
                                            />
                                            <Label className="text-sm font-medium">Optional (Not counted if empty)</Label>
                                        </div>

                                        <div className="md:col-span-1 flex justify-end">
                                            <Button variant="ghost" size="icon" onClick={() => removeColumn(idx)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={addColumn} variant="outline" className="h-14 flex-1 border-dashed border-2 hover:border-primary hover:text-primary transition-all font-medium uppercase tracking-widest text-muted-foreground">
                            <Plus className="w-5 h-5 mr-2" /> Add Assessment Column
                        </Button>
                    </div>

                    <div className="flex justify-end pt-8 border-t">
                        <Button size="lg" onClick={handleSave} disabled={isSaving} className="px-12 h-14 text-lg font-medium uppercase tracking-widest shadow-xl shadow-primary/20">
                            {isSaving ? "Saving..." : "Save Chart Logic"}
                        </Button>
                    </div>

                </div>
            )}
        </div>
    );
}

