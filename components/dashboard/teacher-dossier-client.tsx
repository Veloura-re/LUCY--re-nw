"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Shield, Star, FileText, AlertTriangle, Sparkles, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TeacherDossierClient({ teacher, initialRemarks }: { teacher: any, initialRemarks: any[] }) {
    const router = useRouter();
    const [remarks, setRemarks] = useState(initialRemarks);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [remarkType, setRemarkType] = useState<'POSITIVE' | 'NEGATIVE' | 'REVIEW'>('REVIEW');
    const [content, setContent] = useState("");
    const [rating, setRating] = useState<number>(5);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/school/teachers/${teacher.id}/remarks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: remarkType,
                    content,
                    rating: remarkType === 'REVIEW' ? rating : null
                })
            });

            if (res.ok) {
                const data: any = await res.json();
                toast.success("Dossier Entry Synthesized");
                setContent("");
                setRating(5);
                setRemarkType('REVIEW');
                // Optimistically add to top
                setRemarks([{...data.remark, author: { name: 'Admin', role: 'PRINCIPAL' }}, ...remarks]);
            } else {
                toast.error("Failed to add entry");
            }
        } catch (error) {
            console.error(error);
            toast.error("Signal Lost");
        } finally {
            setIsSubmitting(false);
        }
    };

    const getIconForType = (type: string) => {
        switch(type) {
            case 'POSITIVE': return <Sparkles className="w-4 h-4 text-emerald-500" />;
            case 'NEGATIVE': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
            case 'REVIEW': return <Star className="w-4 h-4 text-amber-500" />;
            default: return <FileText className="w-4 h-4 text-zinc-500" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300 pb-20">
            <Button
                onClick={() => router.back()}
                variant="ghost"
                className="text-zinc-600 hover:text-white font-black uppercase tracking-widest text-[10px] gap-2"
            >
                <ArrowLeft className="w-4 h-4" /> Return to Registry
            </Button>

            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-32 h-32 rounded-3xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                    <User className="w-12 h-12 text-zinc-700" />
                </div>
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eduGreen-950/30 border border-eduGreen-500/20 text-[9px] font-medium text-eduGreen-400 uppercase tracking-widest mb-3">
                        <Shield className="w-3 h-3" />
                        <span>{teacher.role} Clearance</span>
                    </div>
                    <h1 className="text-4xl font-medium tracking-tight text-white">{teacher.name || "Awaiting Setup"}</h1>
                    <p className="text-zinc-500 text-xs font-mono mt-2">{teacher.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="bg-zinc-950/40 backdrop-blur-xl border-zinc-900 rounded-3xl overflow-hidden">
                        <CardHeader className="border-b border-zinc-900/50 pb-6">
                            <CardTitle className="text-lg font-medium text-white">New Entry</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Entry Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button type="button" onClick={() => setRemarkType('POSITIVE')} className={cn("py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border", remarkType === 'POSITIVE' ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-white")}>Good</button>
                                        <button type="button" onClick={() => setRemarkType('NEGATIVE')} className={cn("py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border", remarkType === 'NEGATIVE' ? "bg-rose-500/10 border-rose-500/50 text-rose-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-white")}>Infraction</button>
                                        <button type="button" onClick={() => setRemarkType('REVIEW')} className={cn("py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border", remarkType === 'REVIEW' ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-white")}>Review</button>
                                    </div>
                                </div>

                                {remarkType === 'REVIEW' && (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Rating (1-5)</label>
                                        <div className="flex gap-2">
                                            {[1,2,3,4,5].map(num => (
                                                <button key={num} type="button" onClick={() => setRating(num)} className={cn("flex-1 py-2 rounded-xl transition-all border", rating === num ? "bg-amber-500/20 border-amber-500 text-amber-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:border-zinc-600")}>
                                                    <Star className={cn("w-4 h-4 mx-auto", rating === num ? "fill-amber-400" : "")} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Observation</label>
                                    <Textarea 
                                        value={content}
                                        onChange={e => setContent(e.target.value)}
                                        placeholder="Enter details..."
                                        className="bg-zinc-900/50 border-zinc-800 rounded-xl resize-none h-32 focus:border-eduGreen-500 text-xs"
                                    />
                                </div>

                                <Button disabled={isSubmitting || !content.trim()} type="submit" className="w-full bg-white text-black hover:bg-zinc-200 h-12 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-3 h-3 mr-2" /> Log Entry</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline Section */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-medium text-white tracking-tight px-2">Dossier Timeline</h2>
                    <div className="space-y-4">
                        {remarks.length === 0 ? (
                            <div className="p-12 text-center rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/20">
                                <p className="text-xs text-zinc-500 font-mono">No entries found in registry.</p>
                            </div>
                        ) : (
                            remarks.map((remark) => (
                                <div key={remark.id} className="p-6 rounded-3xl bg-zinc-950/40 border border-zinc-900 backdrop-blur-md relative overflow-hidden group">
                                    <div className={cn("absolute left-0 top-0 bottom-0 w-1", 
                                        remark.type === 'POSITIVE' ? "bg-emerald-500" :
                                        remark.type === 'NEGATIVE' ? "bg-rose-500" : "bg-amber-500"
                                    )} />
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-xl bg-zinc-900 border",
                                                remark.type === 'POSITIVE' ? "border-emerald-900/50" :
                                                remark.type === 'NEGATIVE' ? "border-rose-900/50" : "border-amber-900/50"
                                            )}>
                                                {getIconForType(remark.type)}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                                                    {remark.type} {remark.rating ? `- ${remark.rating}/5 STARS` : ''}
                                                </p>
                                                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">{format(new Date(remark.createdAt), 'MMM dd, yyyy - HH:mm')}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                                        "{remark.content}"
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
