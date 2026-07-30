"use client";

import { useEffect, useState } from "react";
import { format, differenceInMinutes, addMinutes, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    PlayCircle, Clock, Calendar, CheckCircle2, ChevronRight,
    BookOpen, BrainCircuit, Sparkles, ArrowRight, CreditCard, Camera,
    Zap, ClipboardCheck
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { IDCardModal } from "@/components/dashboard/id-card-modal";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";

export default function StudentDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showIDCard, setShowIDCard] = useState(false);
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [photoUrl, setPhotoUrl] = useState("");
    const [savingPhoto, setSavingPhoto] = useState(false);

    useRealtimeDashboard(data?.student?.schoolId);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch('/api/student/dashboard');
                const result = await res.json() as any;
                setData(result);
                setPhotoUrl(result?.student?.photoUrl || "");
            } catch (error) {
                console.error("Dashboard Sync Failed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    const handleSavePhoto = async () => {
        setSavingPhoto(true);
        try {
            const res = await fetch('/api/student/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoUrl })
            });
            if (res.ok) {
                setData((prev: any) => ({ ...prev, student: { ...prev.student, photoUrl } }));
                toast.success("Photo updated successfully");
                setShowPhotoUpload(false);
            } else {
                toast.error("Failed to update photo");
            }
        } catch (e) {
            toast.error("Connection error");
        } finally {
            setSavingPhoto(false);
        }
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    if (loading) return <SpringingLoader />;

    const activeLesson = data?.currentLesson;
    const stats = { attendance: data?.attendance };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <IDCardModal
                isOpen={showIDCard}
                onClose={() => setShowIDCard(false)}
                user={data?.student ? { ...data.student, photoUrl } : null}
                type="STUDENT"
                schoolName={data?.student?.school?.name}
                schoolAddress={data?.student?.school?.address}
                schoolLogo={data?.student?.school?.logoUrl}
            />

            {/* Photo Upload Dialog */}
            <Dialog open={showPhotoUpload} onOpenChange={setShowPhotoUpload}>
                <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 text-zinc-900 dark:text-white max-w-sm rounded-[2.5rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic">Update ID Photo</DialogTitle>
                        <DialogDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">This photo will appear on your ID card</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-6">
                        <ImageUpload value={photoUrl} onChange={setPhotoUrl} bucket="avatars" />
                        <Button
                            onClick={handleSavePhoto}
                            isLoading={savingPhoto}
                            disabled={!photoUrl}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl px-8 h-12 w-full"
                        >
                            Save Photo
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dynamic Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <DashboardGreeting
                    name={data?.studentName || 'Student'}
                    role="STUDENT"
                    gender={data?.student?.gender}
                />
                <div className="flex items-center gap-3">
                    {/* Avatar Photo Upload */}
                    <button
                        onClick={() => setShowPhotoUpload(true)}
                        className="relative w-12 h-12 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500 transition-all group shrink-0"
                        title="Update your ID photo"
                    >
                        {photoUrl ? (
                            <Image src={photoUrl} alt="" fill sizes="48px" className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-black text-zinc-700 group-hover:text-zinc-500">
                                {data?.student?.firstName?.[0] || '?'}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-4 h-4 text-zinc-900 dark:text-white" />
                        </div>
                    </button>
                    <Button
                        onClick={() => setShowIDCard(true)}
                        className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800 rounded-2xl h-12 px-6 font-medium uppercase text-[10px] tracking-widest gap-2"
                    >
                        <CreditCard className="w-4 h-4" /> My Digital ID
                    </Button>
                    <div className="px-5 py-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-900 rounded-2xl flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-eduGreen-500 animate-pulse" />
                        <span className="text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">Live: {activeLesson?.subject || "Standby Mode"}</span>
                    </div>
                </div>
            </div>

            {/* Live Lesson/Next Up Billboard */}
            {activeLesson ? (
                <Card className="relative  bg-eduGreen-600 border-eduGreen-500 rounded-[3rem] shadow-2xl shadow-eduGreen-900/40 border-t-white/10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-300" />

                    <CardContent className="p-12 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 text-[10px] font-medium text-zinc-900 dark:text-white uppercase tracking-widest">
                                <PlayCircle className="w-3 h-3" /> Session In Progress
                            </div>
                            <div>
                                <h2 className="text-5xl font-medium text-zinc-900 dark:text-white tracking-tighter italic uppercase">{activeLesson.subject}</h2>
                                <p className="text-eduGreen-100 font-medium text-sm mt-2 uppercase tracking-[0.3em]">{activeLesson.period} • {activeLesson.teacher}</p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="space-y-1">
                                    <p className="text-zinc-900 dark:text-white/60 text-[8px] font-medium uppercase tracking-widest">Ends At</p>
                                    <p className="text-zinc-900 dark:text-white font-medium text-xl">{activeLesson.endTime ? format(new Date(activeLesson.endTime), 'HH:mm') : "--:--"}</p>
                                </div>
                                <div className="h-10 w-[1px] bg-white/20" />
                                <div className="space-y-1">
                                    <p className="text-zinc-900 dark:text-white/60 text-[8px] font-medium uppercase tracking-widest">Current Topic</p>
                                    <p className="text-zinc-900 dark:text-white font-medium text-xl">{activeLesson.topic}</p>
                                </div>
                            </div>
                        </div>
                        <Button className="bg-white hover:bg-zinc-100 text-eduGreen-700 h-20 px-12 rounded-[2rem] font-medium text-xs uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-2xl">
                            Enter Session
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card className="relative  bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-800 rounded-[3rem] shadow-2xl border-t-zinc-700/20 group backdrop-blur-3xl">
                    <CardContent className="p-12 text-center space-y-6">
                        <div className="w-20 h-20 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-4 group-hover:border-eduGreen-500 transition-colors">
                            <Clock className="w-10 h-10 text-zinc-800 group-hover:text-eduGreen-500 transition-colors" />
                        </div>
                        <h2 className="text-3xl font-medium text-zinc-900 dark:text-white tracking-tight uppercase italic">Transit Interval</h2>
                        <p className="text-zinc-500 font-medium text-xs uppercase tracking-[0.4em]">Next Class Begins Soon</p>
                    </CardContent>
                </Card>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Link href="/dashboard/student/assignments" className="block">
                    <Card className="bg-gradient-to-br from-eduGreen-600 to-emerald-800 border-zinc-300 dark:border-white/10 hover:border-white/20 transition-all group relative h-full overflow-hidden shadow-2xl border-t-white/20">
                        <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:opacity-100 transition-opacity">
                            <Zap className="w-5 h-5 text-zinc-900 dark:text-white animate-pulse" />
                        </div>
                        <CardContent className="p-8 flex items-center gap-6 relative z-10">
                            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 group-hover:scale-110 transition-transform">
                                <ClipboardCheck className="w-6 h-6 text-zinc-900 dark:text-white" />
                            </div>
                            <div>
                                <p className="text-zinc-900 dark:text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] italic">Task Matrix</p>
                                <h4 className="text-zinc-900 dark:text-white font-black text-2xl italic uppercase tracking-tight">Academic Planner</h4>
                                <p className="text-eduGreen-100/70 text-[10px] font-medium mt-1 uppercase tracking-widest flex items-center gap-2">
                                    Execute Coursework <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/dashboard/student/exams" className="block">
                    <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 hover:border-eduGreen-500/30 transition-all group  relative h-full">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-4 h-4 text-eduGreen-500 animate-pulse" />
                        </div>
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl group-hover:bg-eduGreen-900/20 transition-colors">
                                <BrainCircuit className="w-5 h-5 text-eduGreen-500" />
                            </div>
                            <div>
                                <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">Cognitive Feed</p>
                                <h4 className="text-zinc-900 dark:text-white font-medium text-lg">Neural Insights</h4>
                                <p className="text-eduGreen-500 text-[10px] font-medium mt-1 uppercase tracking-widest flex items-center gap-1">
                                    Check AI Feedback <ArrowRight className="w-3 h-3" />
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 hover:border-eduGreen-500/30 transition-all group ">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl group-hover:bg-eduGreen-900/20 transition-colors">
                            <CheckCircle2 className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-eduGreen-400" />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">Attendance</p>
                            <h4 className="text-zinc-900 dark:text-white font-medium text-lg">{stats?.attendance ? stats.attendance.toFixed(1) : "100"}%</h4>
                            <p className="text-zinc-500 text-xs font-medium mt-1 uppercase tracking-widest">Elite Standing</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white/40 dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-900 hover:border-eduGreen-500/30 transition-all group ">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl group-hover:bg-eduGreen-900/20 transition-colors">
                            <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-eduGreen-400" />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-medium uppercase tracking-widest">Next Exam</p>
                            <h4 className="text-zinc-900 dark:text-white font-medium text-lg">{data?.nextExam ? data.nextExam.subject : "Standby"}</h4>
                            <div className="text-eduGreen-500 text-[10px] font-medium mt-1 uppercase tracking-widest flex items-center gap-1">
                                {data?.nextExam ? `${data.nextExam.title} • ${format(new Date(data.nextExam.date), 'MMM dd')}` : "All Clear"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

