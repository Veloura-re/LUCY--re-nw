"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Calendar,
    ArrowRight,
    Search,
    Shield,
    GraduationCap,
    UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export default function StaffAuthorizationsPage() {
    const [authorizations, setAuthorizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("PENDING");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    useEffect(() => {
        fetchAuthorizations();
    }, [statusFilter, page]);

    const fetchAuthorizations = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                page: page.toString(),
                limit: limit.toString()
            });
            const res = await fetch(`/api/school/authorizations?${params.toString()}`);
            const data = await res.json() as any;
            if (data.authorizations) {
                setAuthorizations(data.authorizations);
                if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
            } else {
                setAuthorizations(data);
            }
        } catch (error) {
            toast.error("Failed to sync authorization matrix");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessingId(id);
        try {
            const res = await fetch('/api/school/authorizations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });

            if (res.ok) {
                toast.success(`Authorization ${status.toLowerCase()}`);
                fetchAuthorizations();
            } else {
                const data = await res.json() as any;
                toast.error(data.error || "Action failed");
            }
        } catch (error) {
            toast.error("Neural uplink failure");
        } finally {
            setProcessingId(null);
        }
    };

    // Determine if a record is a staff leave vs student absence
    const isStaffLeave = (auth: any) => !!auth.user && !auth.student;

    // Get a display name and label for any authorization type
    const getDisplayInfo = (auth: any) => {
        if (isStaffLeave(auth)) {
            return {
                name: auth.user?.name || auth.requestor?.name || "Unknown Staff",
                code: auth.user?.role || "STAFF",
                type: "Staff Leave",
                icon: UserCheck,
                color: "text-blue-400",
                bgColor: "bg-blue-500/10",
                borderColor: "border-blue-500/20",
            };
        }
        return {
            name: auth.student
                ? `${auth.student.firstName} ${auth.student.lastName}`
                : auth.requestor?.name || "Unknown",
            code: auth.student?.studentCode || "",
            type: "Student Absence",
            icon: GraduationCap,
            color: "text-eduGreen-500",
            bgColor: "bg-eduGreen-500/10",
            borderColor: "border-eduGreen-500/20",
        };
    };

    const filteredAuths = authorizations.filter(auth => {
        const info = getDisplayInfo(auth);
        const matchesSearch = info.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType =
            typeFilter === "ALL" ||
            (typeFilter === "STAFF" && isStaffLeave(auth)) ||
            (typeFilter === "STUDENT" && !isStaffLeave(auth));
        return matchesSearch && matchesType;
    });

    if (loading && authorizations.length === 0) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-eduGreen-500 animate-spin mb-4" />
            <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px]">Filtering Authorization Signals...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-10">
                <div>
                    <h1 className="text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white">
                        Review <span className="text-eduGreen-500 italic">Authorizations</span>
                    </h1>
                    <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-xs mt-3">
                        Staff Leave &amp; Student Absence — Institutional Verification
                    </p>
                </div>

                {/* Status Filter */}
                <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-900 shadow-2xl">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
                        <Button
                            key={s}
                            variant="ghost"
                            onClick={() => setStatusFilter(s)}
                            className={cn(
                                "h-12 px-6 rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all",
                                statusFilter === s ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800 shadow-xl" : "text-zinc-600 hover:text-zinc-300"
                            )}
                        >
                            {s}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar: Search + Type Filter + Info */}
                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-eduGreen-500 transition-all" />
                        <Input
                            placeholder="Search by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-14 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 pl-12 rounded-2xl text-zinc-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-eduGreen-500 transition-all"
                        />
                    </div>

                    {/* Type Toggle */}
                    <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-900 gap-1">
                        {[
                            { label: "All", value: "ALL" },
                            { label: "Staff", value: "STAFF" },
                            { label: "Students", value: "STUDENT" },
                        ].map(({ label, value }) => (
                            <Button
                                key={value}
                                variant="ghost"
                                onClick={() => setTypeFilter(value)}
                                className={cn(
                                    "flex-1 h-10 rounded-xl font-medium text-[10px] uppercase tracking-widest transition-all",
                                    typeFilter === value ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800" : "text-zinc-600 hover:text-zinc-300"
                                )}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>

                    {/* Stats */}
                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[2rem] shadow-2xl">
                        <CardHeader className="p-5 pb-2">
                            <CardTitle className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-4 h-4 text-eduGreen-500" /> Queue Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-600 dark:text-zinc-500 flex items-center gap-2"><UserCheck className="w-3.5 h-3.5 text-blue-400" /> Staff Leave</span>
                                <span className="font-bold text-zinc-900 dark:text-white">{authorizations.filter(a => isStaffLeave(a)).length}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-zinc-600 dark:text-zinc-500 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-eduGreen-500" /> Student Absence</span>
                                <span className="font-bold text-zinc-900 dark:text-white">{authorizations.filter(a => !isStaffLeave(a)).length}</span>
                            </div>
                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-900 flex justify-between items-center text-[11px]">
                                <span className="text-zinc-600 dark:text-zinc-500">Total</span>
                                <span className="font-bold text-zinc-900 dark:text-white">{authorizations.length}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900 rounded-[2rem] shadow-2xl">
                        <CardContent className="p-5 italic text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-500">
                            Approved permits sync automatically with the daily attendance registries. Teachers will see a "Verified Permit" indicator.
                        </CardContent>
                    </Card>
                </div>

                {/* Main Ledger */}
                <div className="lg:col-span-3 space-y-4">
                    {filteredAuths.length > 0 ? (
                        filteredAuths.map((auth) => {
                            const info = getDisplayInfo(auth);
                            const IconComp = info.icon;
                            return (
                                <Card
                                    key={auth.id}
                                    className="group relative bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 rounded-[2.5rem] overflow-hidden hover:border-zinc-800 transition-all shadow-2xl"
                                >
                                    <CardContent className="p-7">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            {/* Identity */}
                                            <div className="flex items-center gap-5">
                                                <div className={cn(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center border relative overflow-hidden transition-all",
                                                    info.bgColor, info.borderColor
                                                )}>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                                    <IconComp className={cn("w-6 h-6 relative z-10", info.color)} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">{info.name}</h3>
                                                        <Badge className={cn(
                                                            "font-mono text-[8px] uppercase tracking-widest border",
                                                            info.bgColor, info.color, info.borderColor
                                                        )}>
                                                            {info.type}
                                                        </Badge>
                                                        {info.code && (
                                                            <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-500 border-zinc-300 dark:border-zinc-800 font-mono text-[8px] uppercase tracking-widest">
                                                                {info.code}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-2 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
                                                        <Calendar className="w-3.5 h-3.5 text-zinc-700" />
                                                        {new Date(auth.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        <ArrowRight className="w-3 h-3 text-zinc-800 dark:text-zinc-200" />
                                                        {new Date(auth.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    {auth.requestor && (
                                                        <p className="text-[9px] text-zinc-700 mt-1 uppercase tracking-widest">
                                                            Submitted by: <span className="text-zinc-600 dark:text-zinc-500">{auth.requestor.name}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reason */}
                                            <div className="flex-1 max-w-xs p-4 bg-zinc-100/40 dark:bg-zinc-900/40 rounded-2xl border border-zinc-200 dark:border-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-400 italic">
                                                "{auth.reason || 'No reason provided'}"
                                            </div>

                                            {/* Action or Status */}
                                            <div className="flex items-center gap-3">
                                                {auth.status === 'PENDING' ? (
                                                    <>
                                                        <Button
                                                            onClick={() => handleAction(auth.id, 'REJECTED')}
                                                            disabled={processingId === auth.id}
                                                            variant="ghost"
                                                            className="h-12 w-12 rounded-xl bg-red-950/10 text-red-600 dark:text-red-500 hover:bg-red-500 hover:text-white border border-red-900/20 transition-all"
                                                        >
                                                            {processingId === auth.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAction(auth.id, 'APPROVED')}
                                                            disabled={processingId === auth.id}
                                                            className="h-12 px-6 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium uppercase tracking-widest text-[10px] shadow-xl"
                                                        >
                                                            {processingId === auth.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Badge className={cn(
                                                        "h-10 px-6 rounded-xl border font-bold uppercase tracking-[0.2em] text-[8px]",
                                                        auth.status === 'APPROVED'
                                                            ? "bg-eduGreen-500/10 text-eduGreen-500 border-eduGreen-500/20"
                                                            : "bg-red-500/10 text-red-600 dark:text-red-500 border-red-200 dark:border-red-500/20"
                                                    )}>
                                                        {auth.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                                                        {auth.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>

                                    {/* Bottom color bar */}
                                    <div className={cn(
                                        "absolute bottom-0 left-0 h-[2px] transition-all duration-300 group-hover:w-full w-16",
                                        auth.status === 'APPROVED' ? "bg-eduGreen-500/40" :
                                            auth.status === 'REJECTED' ? "bg-red-500/40" : "bg-blue-500/40"
                                    )} />
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[3rem]">
                            <Clock className="w-12 h-12 text-zinc-900 dark:text-white mx-auto mb-6" />
                            <div className="text-zinc-700 font-medium uppercase tracking-[0.5em] text-sm italic">Queue Synced</div>
                            <p className="text-zinc-800 dark:text-zinc-200 mt-2 text-xs font-medium uppercase tracking-widest">
                                No signals in the {statusFilter} {typeFilter !== 'ALL' ? typeFilter.toLowerCase() + ' ' : ''}nexus.
                            </p>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white/40 dark:bg-zinc-950/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-900/50 backdrop-blur-md mt-8">
                            <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-800 hover:text-white"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
