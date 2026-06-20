"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Book,
    Download,
    Plus,
    Trash2,
    Search,
    Filter,
    BookOpen,
    GraduationCap,
    Layers,
    FileText,
    ExternalLink,
    Zap,
    X,
    Upload
} from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { LibraryPrint } from "@/components/dashboard/library-print";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { Printer } from "lucide-react";

interface BooksViewProps {
    user: any;
    school: any;
    children?: any[];
}

const parseBookMeta = (desc: string | null) => {
    if (!desc) return { text: "", coverUrl: "" };
    try {
        if (desc.startsWith('{') && desc.includes('coverUrl')) {
            const parsed = JSON.parse(desc);
            return { text: parsed.text || "", coverUrl: parsed.coverUrl || "" };
        }
    } catch { }
    return { text: desc, coverUrl: "" };
};

export function BooksView({ user, school, children = [] }: BooksViewProps) {
    const [books, setBooks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [progress, setProgress] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [gradeFilter, setGradeFilter] = useState("ALL");
    const [activeTab, setActiveTab] = useState<'library' | 'units' | 'requests'>('library');
    const [requestModal, setRequestModal] = useState(false);
    const [unitModal, setUnitModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('studentId');
        }
        return null;
    });

    const [statusLoading, setStatusLoading] = useState<string | null>(null);
    const [deletingUnit, setDeletingUnit] = useState<string | null>(null);
    const [togglingProgress, setTogglingProgress] = useState<string | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Library_Inventory_${format(new Date(), 'yyyy-MM-dd')}`,
    });

    const updateRequestStatus = async (id: string, status: string) => {
        setStatusLoading(id);
        try {
            const res = await fetch('/api/school/books/requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) {
                toast.success(`Request ${status.toLowerCase()}ed`);
                fetchBooks();
            }
        } catch (e) {
            toast.error("Status update protocol synchronization failure");
        } finally {
            setStatusLoading(null);
        }
    };

    const handleDeleteUnit = async (id: string) => {
        setDeletingUnit(id);
        try {
            const res = await fetch(`/api/school/books/units/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Unit pack decommissioned");
                fetchBooks();
            }
        } catch (e) {
            toast.error("Decommissioning protocol error");
        } finally {
            setDeletingUnit(null);
        }
    };

    // Metadata for dropdowns
    const [grades, setGrades] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    useEffect(() => {
        fetchInitialData();
        fetchBooks();
    }, [selectedStudentId]);

    const fetchInitialData = async () => {
        try {
            const [classesRes, sRes] = await Promise.all([
                fetch('/api/school/classes'),
                fetch('/api/school/subjects')
            ]);
            const classesData = await classesRes.json() as any;
            const subjectsData = await sRes.json() as any;
            // Grades are nested inside the classes response
            setGrades(classesData.grades || []);
            // Subjects API returns { subjects: [...] }
            setSubjects(subjectsData.subjects || subjectsData || []);
        } catch (e) {
            console.error("Data uplink failed:", e);
        }
    };

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const queryParams = selectedStudentId ? `?studentId=${selectedStudentId}` : '';
            const res = await fetch(`/api/school/books${queryParams}`);
            const data = await res.json() as any;
            setBooks(data);

            // Parallel fetch of other components relative to student context
            Promise.all([
                fetch(`/api/school/books/units${queryParams}`).then(r => r.json()).then(setUnits),
                fetch(`/api/school/books/requests${queryParams}`).then(r => r.json()).then(setRequests),
                fetch(`/api/school/books/progress${queryParams}`).then(r => r.json()).then(setProgress)
            ].map(p => p.catch(console.error)));
        } catch (e) {
            toast.error("Failed to retrieve library records");
        } finally {
            setLoading(false);
        }
    };

    const toggleProgress = async (bookId: string, currentStatus: boolean) => {
        setTogglingProgress(bookId);
        try {
            const res = await fetch('/api/school/books/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId,
                    completed: !currentStatus,
                    ...(selectedStudentId && { studentId: selectedStudentId })
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setProgress(prev => {
                    const exists = prev.find(p => p.bookId === bookId);
                    if (exists) return prev.map(p => p.bookId === bookId ? updated : p);
                    return [...prev, updated];
                });
                toast.success(!currentStatus ? "Mastery recorded" : "Progress reset");
            }
        } catch (e) {
            toast.error("Failed to update progress protocol");
        } finally {
            setTogglingProgress(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/school/books/${deleteId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Resource decommissioned successfully");
                fetchBooks();
            }
        } catch (e) {
            toast.error("Decommissioning failed");
        } finally {
            setLoading(false);
            setDeleteId(null);
        }
    };


    const filteredBooks = books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (book.author?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesGrade = gradeFilter === "ALL" || book.gradeId === gradeFilter;
        return matchesSearch && matchesGrade;
    });

    const isDirector = ['PRINCIPAL', 'SUPERADMIN', 'OWNER'].includes(user.role);

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <SpringingLoader message="Accessing Institutional Library" />
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-white uppercase italic">
                        Learning <span className="text-eduGreen-500 not-italic">Nexus</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">Centralized Academic Resource Repository</p>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {user.role === 'PARENT' && children.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Select Student:</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setSelectedStudentId(null)}
                                    className={cn(
                                        "h-14 px-6 rounded-2xl border transition-all font-medium text-[10px] uppercase tracking-widest",
                                        !selectedStudentId ? "bg-white text-black border-white" : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white"
                                    )}
                                >
                                    All Library
                                </Button>
                                {children.map(child => (
                                    <Button
                                        key={child.id}
                                        variant="ghost"
                                        onClick={() => setSelectedStudentId(child.id)}
                                        className={cn(
                                            "h-14 px-6 rounded-2xl border transition-all font-medium text-[10px] uppercase tracking-widest",
                                            selectedStudentId === child.id ? "bg-eduGreen-600 text-white border-eduGreen-600" : "bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-white"
                                        )}
                                    >
                                        {child.firstName}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => handlePrint()}
                            variant="outline"
                            className="h-14 px-6 rounded-2xl border-eduGreen-600 bg-zinc-950 text-white hover:text-white transition-all font-medium text-[10px] uppercase tracking-widest hidden md:flex shadow-lg shadow-eduGreen-900/20"
                        >
                            <Printer className="mr-2 h-4 w-4 text-eduGreen-500" /> Export PDF Registry
                        </Button>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <Input
                                placeholder="Find Resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-64 pl-12 bg-zinc-950 border-zinc-900 rounded-2xl focus:border-eduGreen-500 transition-all font-medium text-xs"
                            />
                        </div>
                        {isDirector ? (
                            <Button
                                onClick={() => setIsUploading(true)}
                                className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-14 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 shadow-eduGreen-900/20"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Deploy Material
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setRequestModal(true)}
                                className="bg-zinc-900 hover:bg-zinc-800 text-white h-14 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest transition-all"
                            >
                                <Zap className="mr-2 h-4 w-4 text-eduGreen-500" /> Request Resource
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Sub-Hub Navigation */}
            <div className="flex items-center gap-8 border-b border-zinc-900/50 pb-6">
                {[
                    { id: 'library', label: 'Institutional Library', icon: Book },
                    { id: 'units', label: 'Unit Bundles', icon: Layers },
                    { id: 'requests', label: 'Resource Wishes', icon: FileText }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-3 transition-all relative group",
                            activeTab === tab.id ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                        )}
                    >
                        <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-eduGreen-500" : "")} />
                        <span className="text-[10px] font-medium uppercase tracking-[0.2em]">{tab.label}</span>
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTab" className="absolute -bottom-6 left-0 w-full h-[2px] bg-eduGreen-500" />
                        )}
                    </button>
                ))}
            </div>

            {/* Quick Filters - Only for Library */}
            {activeTab === 'library' && (
                <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <Button
                        variant="ghost"
                        onClick={() => setGradeFilter("ALL")}
                        className={cn(
                            "rounded-xl h-10 px-6 font-medium text-[9px] uppercase tracking-widest border transition-all whitespace-nowrap",
                            gradeFilter === "ALL" ? "bg-white text-black border-white" : "border-zinc-900 text-zinc-600 hover:text-white"
                        )}
                    >
                        All Grades
                    </Button>
                    {grades.map(grade => (
                        <Button
                            key={grade.id}
                            variant="ghost"
                            onClick={() => setGradeFilter(grade.id)}
                            className={cn(
                                "rounded-xl h-10 px-6 font-medium text-[9px] uppercase tracking-widest border transition-all whitespace-nowrap",
                                gradeFilter === grade.id ? "bg-eduGreen-600 text-white border-eduGreen-600" : "border-zinc-900 text-zinc-600 hover:text-white"
                            )}
                        >
                            Grade {grade.level}
                        </Button>
                    ))}
                </div>
            )}

            {/* Active Section Content */}
            {activeTab === 'library' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {filteredBooks.map((book, i) => {
                            const isCompleted = progress.find(p => p.bookId === book.id)?.completed;
                            const isLocked = book.prerequisiteId && !progress.find(p => p.bookId === book.prerequisiteId)?.completed;
                            const isExpired = book.expiresAt && new Date(book.expiresAt) < new Date();

                            return (
                                <motion.div
                                    key={book.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.2, delay: i * 0.05 }}
                                >
                                    <Card className={cn(
                                        "group relative bg-zinc-950/60 backdrop-blur-3xl border-zinc-900/50 rounded-[3rem] overflow-hidden hover:border-eduGreen-500/40 transition-all duration-300 border-t-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-full flex flex-col",
                                        isLocked ? "opacity-60 grayscale scale-[0.98]" : "hover:scale-[1.02]",
                                        isExpired ? "border-red-900/30" : ""
                                    )}>
                                        {/* Magical Corner Accents */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-eduGreen-500/10 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* 3D Book Cover / Spine */}
                                        <div className="absolute -right-16 -top-12 w-48 h-64 rotate-12 opacity-80 group-hover:rotate-0 group-hover:-right-4 group-hover:-top-4 group-hover:opacity-100 transition-all duration-700 ease-in-out z-0 pointer-events-none perspective-[1000px]">
                                            <div className="w-full h-full relative preserve-3d group-hover:rotate-y-[-15deg] transition-all duration-700">
                                                {(() => {
                                                    const meta = parseBookMeta(book.description);
                                                    if (meta.coverUrl) {
                                                        return (
                                                            <div 
                                                                className="absolute inset-0 rounded-l-md shadow-2xl border-l border-zinc-700/50"
                                                                style={{ backgroundImage: `url(${meta.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                                            >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-l-md shadow-2xl border-l border-white/10 flex flex-col items-start p-4">
                                                            <div className="w-full h-1 bg-white/5 mb-4" />
                                                            <h4 className="text-[10px] font-bold text-white uppercase tracking-widest break-words w-full text-left opacity-30">{book.title}</h4>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        <CardHeader className="p-8 pb-4 relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={cn(
                                                    "p-3 rounded-xl border transition-all",
                                                    isCompleted ? "bg-eduGreen-500/10 border-eduGreen-500/20 text-eduGreen-500" : "bg-zinc-900/50 border-zinc-800 text-eduGreen-500"
                                                )}>
                                                    {isLocked ? <Zap className="w-6 h-6 text-zinc-700" /> : <BookOpen className="w-6 h-6" />}
                                                </div>
                                                <div className="px-2 py-1 bg-eduGreen-500/10 border border-eduGreen-500/20 rounded-lg">
                                                    <span className="text-[8px] font-medium text-eduGreen-500 uppercase tracking-widest italic">
                                                        {book.subject.name}
                                                    </span>
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-medium text-white leading-tight tracking-tight group-hover:text-eduGreen-500 transition-colors">
                                                {book.title}
                                            </CardTitle>
                                            {isLocked ? (
                                                <div className="flex items-center gap-2 mt-4 text-red-500">
                                                    <X className="w-3 h-3" />
                                                    <span className="text-[8px] font-medium uppercase tracking-widest">Locked: Complete Prerequisite</span>
                                                </div>
                                            ) : isExpired ? (
                                                <div className="flex items-center gap-2 mt-4 text-zinc-600">
                                                    <X className="w-3 h-3" />
                                                    <span className="text-[8px] font-medium uppercase tracking-widest">Seasonal Availability Expired</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 mt-4">
                                                    <span className="text-[8px] font-medium text-zinc-500 uppercase tracking-widest px-2 py-1 bg-zinc-900 rounded-md border border-zinc-800">
                                                        Grade {book.grade.level}
                                                    </span>
                                                    <span className="text-[8px] font-medium text-eduGreen-900 uppercase tracking-tighter">
                                                        Section: {book.class.name}
                                                    </span>
                                                </div>
                                            )}
                                        </CardHeader>

                                        <CardContent className="px-8 flex-1 relative z-10">
                                            <p className="text-xs text-zinc-400 font-medium line-clamp-2 leading-relaxed">
                                                {parseBookMeta(book.description).text || "Comprehensive academic resource for institutional mastery."}
                                            </p>

                                            {book.teacherNote && (
                                                <div className="mt-6 p-4 bg-eduGreen-500/5 border border-eduGreen-500/10 rounded-2xl relative overflow-hidden group/note">
                                                    <div className="absolute top-0 right-0 p-2 opacity-20"><Zap className="w-3 h-3 text-eduGreen-500" /></div>
                                                    <p className="text-[9px] font-medium text-eduGreen-500 uppercase tracking-widest mb-1">Pedagogical Note</p>
                                                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">{book.teacherNote}</p>
                                                </div>
                                            )}

                                            <div className="mt-6 flex flex-wrap gap-4">
                                                {book.author && (
                                                    <div className="flex items-center gap-2 text-[9px] font-medium text-zinc-700 uppercase tracking-widest">
                                                        <Layers className="w-3 h-3" />
                                                        <span>{book.author}</span>
                                                    </div>
                                                )}
                                                {book.edition && (
                                                    <div className="flex items-center gap-2 text-[9px] font-medium text-zinc-700 uppercase tracking-widest">
                                                        <Zap className="w-3 h-3" />
                                                        <span>{book.edition}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>

                                        <CardFooter className="px-8 pb-8 pt-6 flex justify-between items-center bg-zinc-900/20">
                                            <div className="flex gap-2">
                                                <Button
                                                    disabled={isLocked || isExpired}
                                                    onClick={() => window.open(book.fileUrl, '_blank')}
                                                    className="h-12 px-6 bg-zinc-900 hover:bg-eduGreen-600 text-white rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                                >
                                                    <BookOpen className="w-4 h-4" /> Start Reading
                                                </Button>
                                                {!isDirector && (
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => toggleProgress(book.id, isCompleted)}
                                                        isLoading={togglingProgress === book.id}
                                                        className={cn(
                                                            "h-12 w-12 p-0 rounded-xl transition-all",
                                                            isCompleted ? "bg-eduGreen-500 text-white" : "bg-zinc-950 text-zinc-600 hover:text-white border border-zinc-900"
                                                        )}
                                                    >
                                                        <Zap className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            {isDirector && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(book.id)}
                                                    className="w-12 h-12 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    <ConfirmationModal
                        isOpen={!!deleteId}
                        onClose={() => setDeleteId(null)}
                        onConfirm={handleDelete}
                        isLoading={loading}
                        title="Resource Decommissioning"
                        description="Are you sure you want to permanently remove this scholar resource from the institutional library? This action cannot be reversed."
                        confirmText="Decommission"
                        variant="danger"
                    />

                    {filteredBooks.length === 0 && (
                        <div className="col-span-full py-32 text-center">
                            <div className="w-24 h-24 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-900 mx-auto mb-6 opacity-30">
                                <Book className="w-12 h-12 text-zinc-500" />
                            </div>
                            <h3 className="text-zinc-600 font-medium uppercase tracking-[0.4em] text-xs">Library records not found</h3>
                            <p className="text-zinc-800 text-[10px] font-medium uppercase mt-2">No scholarly resources available for selected parameters</p>
                        </div>
                    )}
                </div>
            )}

            {/* Units Section */}
            {activeTab === 'units' && (
                <div className="space-y-8">
                    {isDirector && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => setUnitModal(true)}
                                className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-6 rounded-xl font-medium text-[10px] uppercase tracking-widest shadow-lg transition-all"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Synthesize Unit Pack
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {units.map((unit) => (
                            <Card key={unit.id} className="bg-zinc-950/40 border-zinc-900 rounded-[3rem] overflow-hidden p-8 flex flex-col gap-6 group hover:border-eduGreen-900/30 transition-all shadow-2xl relative">
                                {isDirector && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteUnit(unit.id)}
                                        isLoading={deletingUnit === unit.id}
                                        className="absolute top-6 right-6 w-10 h-10 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 text-eduGreen-500">
                                            <Layers className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-medium text-white group-hover:text-eduGreen-500 transition-colors uppercase">{unit.title}</h3>
                                            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">Institutional Learning Bundle</p>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-medium text-zinc-800 uppercase px-3 py-1 bg-zinc-900 rounded-lg">{unit.resources.length} Materials</span>
                                </div>

                                <p className="text-xs text-zinc-500 font-medium leading-relaxed italic">{unit.description || "Synthesized academic pathway for streamlined mastery."}</p>

                                <div className="space-y-3">
                                    {unit.resources.map((res: any, idx: number) => (
                                        <div key={res.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-900 rounded-2xl group/item hover:bg-zinc-900 transition-all">
                                            <div className="flex items-center gap-4">
                                                <span className="text-[10px] font-medium text-zinc-700 uppercase">#{idx + 1}</span>
                                                <span className="text-xs font-medium text-zinc-400 group-hover/item:text-white transition-colors">{res.book.title}</span>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => window.open(res.book.fileUrl, '_blank')} className="text-zinc-700 hover:text-eduGreen-500"><Zap className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))}
                        {units.length === 0 && (
                            <div className="col-span-full py-32 text-center border-2 border-dashed border-zinc-900 rounded-[3rem]">
                                <Layers className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">No integrated unit packs detected in local cloud</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Requests Section */}
            {activeTab === 'requests' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requests.map((req) => (
                            <Card key={req.id} className="bg-zinc-950/40 border-zinc-900 rounded-[2.5rem] p-8 space-y-4 relative overflow-hidden group">
                                <div className={cn(
                                    "absolute top-0 right-0 px-4 py-2 text-[8px] font-medium uppercase tracking-widest rounded-bl-2xl border-l border-b border-zinc-900",
                                    req.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" :
                                        req.status === 'APPROVED' ? "bg-eduGreen-500/10 text-eduGreen-500" :
                                            "bg-red-500/10 text-red-500"
                                )}>
                                    {req.status}
                                </div>
                                <h4 className="text-lg font-medium text-white uppercase pr-16">{req.title}</h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest px-2 py-1 bg-zinc-900 rounded">{req.subject || "General"}</span>
                                    <span className="text-[8px] font-medium text-zinc-600 uppercase tracking-widest px-2 py-1 bg-zinc-900 rounded">{req.grade || "All"}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{req.reason || "No context provided."}</p>

                                {isDirector && req.status === 'PENDING' && (
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            onClick={() => updateRequestStatus(req.id, 'APPROVED')}
                                            isLoading={statusLoading === req.id}
                                            disabled={statusLoading === req.id}
                                            className="h-10 flex-1 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest"
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => updateRequestStatus(req.id, 'REJECTED')}
                                            variant="ghost"
                                            isLoading={statusLoading === req.id}
                                            disabled={statusLoading === req.id}
                                            className="h-10 flex-1 bg-zinc-900 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl font-medium text-[9px] uppercase tracking-widest"
                                        >
                                            Reject
                                        </Button>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-zinc-900 flex justify-between items-center text-[8px] font-medium text-zinc-700 uppercase">
                                    <span>Requested By: {req.user.name}</span>
                                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {isUploading && (
                    <BookUploadModal
                        onClose={() => setIsUploading(false)}
                        onSuccess={() => {
                            fetchBooks();
                            setIsUploading(false);
                        }}
                        grades={grades}
                        subjects={subjects}
                        books={books} // For prerequisites
                    />
                )}
                {requestModal && (
                    <BookRequestModal
                        onClose={() => setRequestModal(false)}
                        onSuccess={() => {
                            fetchBooks(); // Refresh requests
                            setRequestModal(false);
                        }}
                        selectedStudentId={selectedStudentId}
                        children={children}
                    />
                )}
                {unitModal && (
                    <UnitPackModal
                        onClose={() => setUnitModal(false)}
                        onSuccess={() => {
                            fetchBooks();
                            setUnitModal(false);
                        }}
                        books={books}
                    />
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="Decommission Resource"
                description="This action will permanently remove this material from the institutional library. Scholars will lose instant access."
                confirmText="Decommission"
                variant="danger"
            />

            {/* Hidden Print Template */}
            <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                <LibraryPrint
                    ref={printRef}
                    books={filteredBooks.map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        isbn: b.isbn || 'N/A',
                        subject: b.subject.name,
                        category: `Grade ${b.grade.level}`,
                        totalCopies: b.class.name // re-using totalCopies for class in the library component context
                    }))}
                />
            </div>
        </div>
    );
}

function UnitPackModal({ onClose, onSuccess, books }: any) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        resourceIds: [] as string[]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.resourceIds.length === 0) {
            toast.error("Cluster required: Select at least one resource");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/school/books/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Learning Unit synthesized and deployed");
                onSuccess();
            }
        } catch (e) {
            toast.error("Synthesis protocol failure");
        } finally {
            setLoading(false);
        }
    };

    const toggleResource = (id: string) => {
        setFormData(prev => ({
            ...prev,
            resourceIds: prev.resourceIds.includes(id)
                ? prev.resourceIds.filter(i => i !== id)
                : [...prev.resourceIds, id]
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-[3.5rem] overflow-hidden shadow-2xl"
            >
                <div className="p-10 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
                    <div>
                        <h2 className="text-3xl font-medium text-white tracking-tighter uppercase">Unit Synthesizer</h2>
                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1 italic">Bundling institutional intelligence packs</p>
                    </div>
                    <Button variant="ghost" onClick={onClose} size="icon" className="text-zinc-600 hover:text-white rounded-full">
                        <X className="w-6 h-6" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
                    <div className="space-y-4">
                        <Input
                            placeholder="Unit Title (e.g., Quantum Mechanics Fundamentals)"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="h-16 bg-zinc-900 border-zinc-800 rounded-2xl font-medium text-lg"
                        />
                        <textarea
                            placeholder="Unit Description / Objectives..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-sm font-medium focus:border-eduGreen-500 outline-none text-white resize-none"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest ml-1">Select Instructional Resources</label>
                        <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                            {books.map((book: any) => (
                                <button
                                    key={book.id}
                                    type="button"
                                    onClick={() => toggleResource(book.id)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                        formData.resourceIds.includes(book.id)
                                            ? "bg-eduGreen-500/10 border-eduGreen-500 text-white"
                                            : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                            formData.resourceIds.includes(book.id) ? "bg-eduGreen-500 border-eduGreen-500" : "border-zinc-700"
                                        )}>
                                            {formData.resourceIds.includes(book.id) && <Zap className="w-3 h-3 text-black" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium leading-none">{book.title}</p>
                                            <p className="text-[8px] font-medium uppercase tracking-widest text-zinc-600 mt-1">{book.subject.name} • Grade {book.grade.level}</p>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-medium uppercase text-zinc-800 italic">{book.author || "Institutional"}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-20 bg-white text-black hover:bg-eduGreen-600 hover:text-white rounded-[2rem] font-medium text-xs uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <><span className="w-5 h-5 border-2 border-zinc-400 border-t-black rounded-full animate-spin" /> Synthesizing Pack...</>
                        ) : (
                            "Authorize Unit Deployment"
                        )}
                    </Button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function BookRequestModal({ onClose, onSuccess, selectedStudentId, children }: any) {
    const [loading, setLoading] = useState(false);

    const selectedChild = children?.find((c: any) => c.id === selectedStudentId);

    const [formData, setFormData] = useState({
        title: "",
        subject: "",
        grade: selectedChild ? `Grade ${selectedChild.class?.level || selectedChild.grade?.level || ''}` : "",
        reason: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/school/books/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                toast.success("Resource wish broadasted to Directors");
                onSuccess();
            }
        } catch (e) {
            toast.error("Subspace transmission failure");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl"
            >
                <div className="p-10 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40">
                    <div>
                        <h2 className="text-2xl font-medium text-white tracking-tight uppercase">Request Resource</h2>
                        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1 italic">Submit pedagogical requirements</p>
                    </div>
                    <Button variant="ghost" onClick={onClose} size="icon" className="text-zinc-600 hover:text-white rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <Input
                        placeholder="Desired Material Title"
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        className="h-14 bg-zinc-900 border-zinc-900 rounded-2xl font-medium"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            placeholder="Subject"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            className="h-14 bg-zinc-900 border-zinc-900 rounded-2xl font-medium"
                        />
                        <Input
                            placeholder="Grade Level"
                            value={formData.grade}
                            onChange={e => setFormData({ ...formData, grade: e.target.value })}
                            className="h-14 bg-zinc-900 border-zinc-900 rounded-2xl font-medium"
                        />
                    </div>
                    <textarea
                        placeholder="Reason for request / Pedagogical context..."
                        value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })}
                        className="w-full h-32 bg-zinc-900 border border-zinc-900 rounded-3xl p-6 text-sm font-medium focus:border-eduGreen-500 outline-none text-white resize-none"
                    />
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-16 bg-white text-black hover:bg-eduGreen-600 hover:text-white rounded-2xl font-medium text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><span className="w-4 h-4 border-2 border-zinc-400 border-t-black rounded-full animate-spin" /> Transmitting...</>
                        ) : (
                            "Authorize Request"
                        )}
                    </Button>
                </form>
            </motion.div>
        </motion.div>
    );
}



function BookUploadModal({ onClose, onSuccess, grades, subjects, books }: any) {
    const [loading, setLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [payloadSource, setPayloadSource] = useState<'file' | 'link'>('file');
    const [classes, setClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        fileUrl: '',
        gradeId: '',
        classId: '',
        subjectId: '',
        author: '',
        academicYear: new Date().getFullYear().toString(),
        edition: '',
        description: '',
        coverUrl: '',
        teacherNote: '',
        expiresAt: '',
        prerequisiteId: ''
    });

    useEffect(() => {
        if (!formData.gradeId) { setClasses([]); return; }
        setLoadingClasses(true);
        fetch(`/api/school/classes?gradeId=${formData.gradeId}`)
            .then(r => r.json())
            .then((data: any) => setClasses(data.classes || []))
            .catch(console.error)
            .finally(() => setLoadingClasses(false));
    }, [formData.gradeId]);

    const handleFileUpload = async (file: File, type: 'pdf' | 'cover' = 'pdf') => {
        if (!file) return;
        setUploadingFile(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('type', type);
        try {
            const res = await fetch('/api/school/books/upload', { method: 'POST', body: uploadData });
            if (res.ok) {
                const data = await res.json() as any;
                if (type === 'cover') {
                    setFormData(prev => ({ ...prev, coverUrl: data.url }));
                    toast.success('Cover image applied');
                } else {
                    setFormData(prev => ({ ...prev, fileUrl: data.url, title: prev.title || file.name.replace(/\.[^.]+$/, '') }));
                    toast.success('Book file uploaded successfully');
                }
            } else {
                const err = await res.json() as any;
                toast.error(err.error || 'Upload failed');
            }
        } catch { toast.error('Network error during upload'); }
        finally { setUploadingFile(false); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileUpload(file, 'pdf');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fileUrl) { toast.error('Please upload a file or provide a link'); return; }
        if (!formData.gradeId) { toast.error('Please select a grade'); return; }
        if (!formData.classId) { toast.error('Please select a class section'); return; }
        if (!formData.subjectId) { toast.error('Please select a subject'); return; }
        setLoading(true);
        try {
            const finalFormData = { ...formData };
            if (formData.coverUrl || formData.description) {
                finalFormData.description = JSON.stringify({
                    text: formData.description,
                    coverUrl: formData.coverUrl
                });
            }

            const res = await fetch('/api/school/books', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalFormData)
            });
            if (res.ok) { toast.success('Book deployed to library'); onSuccess(); }
            else { const msg = await res.text(); toast.error(msg || 'Failed to deploy book'); }
        } catch { toast.error('Server error'); }
        finally { setLoading(false); }
    };

    const fileReady = !!formData.fileUrl && !uploadingFile;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.92, y: 24, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 24, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                className="w-full max-w-3xl bg-zinc-950 border border-zinc-800/60 rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-900 bg-gradient-to-r from-zinc-950 to-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                            <Book className="w-5 h-5 text-eduGreen-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white tracking-tight">Add New Book</h2>
                            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Deploy to institutional library</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-zinc-900">

                        {/* Left Panel — File + Title + Description */}
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Book Title</label>
                                <input
                                    required placeholder="e.g. Mathematics Grade 10"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none transition-all"
                                />
                            </div>

                            {/* Source toggle */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">File Source</label>
                                <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 gap-1 mb-4">
                                    {(['file', 'link'] as const).map(mode => (
                                        <button key={mode} type="button" onClick={() => setPayloadSource(mode)}
                                            className={cn('flex-1 py-2 rounded-lg text-[9px] font-semibold uppercase tracking-widest transition-all',
                                                payloadSource === mode ? 'bg-zinc-800 text-white shadow' : 'text-zinc-600 hover:text-zinc-400'
                                            )}>
                                            {mode === 'file' ? 'Upload File' : 'External Link'}
                                        </button>
                                    ))}
                                </div>

                                {payloadSource === 'file' ? (
                                    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                                        className={cn('relative flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-3xl transition-all cursor-pointer group',
                                            dragOver ? 'border-eduGreen-500 bg-eduGreen-500/5' :
                                                fileReady ? 'border-eduGreen-600/50 bg-eduGreen-500/5' :
                                                    'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/70'
                                        )}>
                                        <input type="file" accept=".pdf,.epub,.docx,.txt"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'pdf'); }}
                                            disabled={uploadingFile} />
                                        {uploadingFile ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-eduGreen-500 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[10px] font-semibold text-eduGreen-400 uppercase tracking-widest">Uploading...</span>
                                            </div>
                                        ) : fileReady ? (
                                            <div className="flex flex-col items-center gap-2 text-eduGreen-500">
                                                <div className="w-10 h-10 rounded-2xl bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center">
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-semibold uppercase tracking-widest">File Ready</span>
                                                <span className="text-[8px] text-zinc-600 max-w-[180px] truncate">{formData.fileUrl.split('/').pop()}</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                                                <Upload className="w-7 h-7" />
                                                <span className="text-[10px] font-semibold uppercase tracking-widest">Drop or click to upload</span>
                                                <span className="text-[9px] text-zinc-700">PDF, EPUB, DOCX</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <input placeholder="https://drive.google.com/..." value={formData.fileUrl}
                                        onChange={e => setFormData({ ...formData, fileUrl: e.target.value })}
                                        className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none transition-all" />
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Cover Image <span className="text-zinc-700">(optional)</span></label>
                                    <div className="relative flex flex-col items-center justify-center h-20 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-eduGreen-500 transition-colors cursor-pointer group">
                                        <input type="file" accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'cover'); }}
                                        />
                                        {formData.coverUrl ? (
                                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${formData.coverUrl})` }}>
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-[8px] text-white uppercase tracking-widest font-bold">Change Cover</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">Upload Cover</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Description <span className="text-zinc-700">(optional)</span></label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief description of this book..."
                                    className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none resize-none transition-all" />
                            </div>
                        </div>

                        {/* Right Panel — custom dropdowns */}
                        <div className="p-8 space-y-5">

                            {/* Grade */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">
                                    Grade <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.gradeId}
                                    onValueChange={(v: string) => setFormData({ ...formData, gradeId: v, classId: '' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Grade..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {grades.map((g: any) => (
                                            <SelectItem key={g.id} value={g.id}>Grade {g.level}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Section / Class — cascading */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">
                                    Section <span className="text-red-500">*</span>
                                    {loadingClasses && <span className="ml-2 inline-block w-3 h-3 border border-eduGreen-500 border-t-transparent rounded-full animate-spin" />}
                                </label>
                                <Select
                                    value={formData.classId}
                                    onValueChange={(v: string) => setFormData({ ...formData, classId: v })}
                                    disabled={!formData.gradeId || loadingClasses}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!formData.gradeId ? 'Select grade first' : loadingClasses ? 'Loading sections...' : `Choose section (${classes.length})`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <Select
                                    value={formData.subjectId}
                                    onValueChange={(v: string) => setFormData({ ...formData, subjectId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Author + Year */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Author</label>
                                    <input placeholder="Author name" value={formData.author}
                                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                                        className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Year</label>
                                    <input placeholder="2024" value={formData.academicYear}
                                        onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                                        className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none transition-all" />
                                </div>
                            </div>

                            {/* Teacher Note */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Teacher Note <span className="text-zinc-700">(optional)</span></label>
                                <textarea value={formData.teacherNote} onChange={e => setFormData({ ...formData, teacherNote: e.target.value })}
                                    placeholder="Instructions visible to students..."
                                    className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm font-medium text-white placeholder:text-zinc-700 focus:border-eduGreen-600 focus:outline-none resize-none transition-all" />
                            </div>

                            {/* Expiry */}
                            <div>
                                <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.25em] block mb-3">Expiry Date <span className="text-zinc-700">(optional)</span></label>
                                <input type="date" value={formData.expiresAt}
                                    onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                                    className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 text-sm font-medium text-white focus:border-eduGreen-600 focus:outline-none transition-all" />
                            </div>
                        </div>
                    </div>

                    {/* Footer CTA */}
                    <div className="px-8 py-6 border-t border-zinc-900 bg-zinc-950/80 shrink-0">
                        <div className="flex items-center gap-4">
                            {/* Live validation dots */}
                            <div className="flex-1 flex items-center gap-3 flex-wrap">
                                {[
                                    { done: !!formData.fileUrl, label: 'File' },
                                    { done: !!formData.title, label: 'Title' },
                                    { done: !!formData.gradeId, label: 'Grade' },
                                    { done: !!formData.classId, label: 'Class' },
                                    { done: !!formData.subjectId, label: 'Subject' },
                                ].map(({ done, label }) => (
                                    <div key={label} className={cn('flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-widest transition-all', done ? 'text-eduGreen-500' : 'text-zinc-700')}>
                                        <div className={cn('w-1.5 h-1.5 rounded-full transition-all', done ? 'bg-eduGreen-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-zinc-800')} />
                                        {label}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || uploadingFile || !formData.fileUrl || !formData.gradeId || !formData.classId || !formData.subjectId}
                                className="flex items-center gap-3 px-8 py-4 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-2xl font-semibold text-sm uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_20px_-4px_rgba(20,122,82,0.4)]"
                            >
                                {loading ? (
                                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deploying...</>
                                ) : (
                                    <><Upload className="w-4 h-4" /> Deploy Book</>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
