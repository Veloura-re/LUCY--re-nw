"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Shield, Zap, LogOut, Lock, MapPin, Sliders, Trophy, Briefcase, Plus, Search, Trash2, Bell, LayoutGrid, Volume2, Calendar } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import SpringingLoader from "@/components/dashboard/springing-loader";
import { AlertModal } from "@/components/ui/confirmation-modal";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { SettingsAcademicTerms } from "@/components/dashboard/settings-academic-terms";

export default function SettingsPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [schoolData, setSchoolData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'school' | 'preferences' | 'family' | 'workload' | 'communications' | 'academic'>('profile');
    const [formData, setFormData] = useState({
        name: "",
        bio: "",
        preferences: {
            immersiveVisuals: true,
            smartSync: true,
            analyticExport: false,
            emailAlerts: true,
            pushSignals: true,
            chatSounds: true
        }
    });

    // Parent Linking State
    const [studentCode, setStudentCode] = useState("");
    const [linkingStudent, setLinkingStudent] = useState(false);
    const [verifiedStudent, setVerifiedStudent] = useState<any>(null);

    const [schoolForm, setSchoolForm] = useState({
        name: "",
        schoolCode: "",
        logoUrl: "",
        address: "",
        locations: [] as { name: string, address: string }[],
        communicationsConfig: {
            sendInvites: true,
            sendReports: true,
            sendInvoices: true,
            replyTo: ""
        }
    });

    const [passwordData, setPasswordData] = useState({
        current: "",
        new: "",
        confirm: ""
    });
    const [diagnosing, setDiagnosing] = useState(false);
    const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });

    const isResetMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'reset';

    useEffect(() => {
        fetchSettings();
        if (isResetMode) {
            setActiveTab('security');
        }
    }, [isResetMode]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/user/settings');
            const data = await res.json() as any;
            if (data.user) {
                setUserData(data.user);
                setFormData({
                    name: data.user.name || "",
                    bio: data.user.bio || "",
                    preferences: data.user.preferences || {
                        immersiveVisuals: true,
                        smartSync: true,
                        analyticExport: false,
                        emailAlerts: true,
                        pushSignals: true,
                        chatSounds: true
                    }
                });

                if (data.user.school) {
                    setSchoolData(data.user.school);
                    setSchoolForm({
                        name: data.user.school.name || "",
                        schoolCode: data.user.school.schoolCode || "",
                        logoUrl: data.user.school.logoUrl || "",
                        address: data.user.school.address || "",
                        locations: data.user.school.locations || [],
                        communicationsConfig: data.user.school.communicationsConfig || {
                            sendInvites: true,
                            sendReports: true,
                            sendInvoices: true,
                            replyTo: ""
                        }
                    });
                }

                // Fetch full school settings for everyone (principals can edit, others read)
                fetchSchoolSettings();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolSettings = async () => {
        try {
            const res = await fetch('/api/school/settings');
            const data = await res.json() as any;
            if (data.school) {
                setSchoolData(data.school);
                setSchoolForm({
                    name: data.school.name,
                    schoolCode: data.school.schoolCode,
                    logoUrl: data.school.logoUrl || "",
                    address: data.school.address || "",
                    locations: data.school.locations || [],
                    communicationsConfig: data.school.communicationsConfig || {
                        sendInvites: true,
                        sendReports: true,
                        sendInvoices: true,
                        replyTo: ""
                    }
                });
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'logos');

            const uploadRes = await fetch('/api/school/upload', {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json() as any;
                throw new Error(errData.error || 'Failed to upload logo');
            }

            const uploadData = await uploadRes.json() as any;
            const publicUrl = uploadData.url;

            setSchoolForm(prev => ({ ...prev, logoUrl: publicUrl }));
            setSchoolData((prev: any) => ({ ...prev, logoUrl: publicUrl }));
            
            // Also trigger a save automatically for the logo
            await fetch('/api/school/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...schoolForm, logoUrl: publicUrl })
            });

            setAlertConfig({
                title: "Logo Updated",
                message: "School logo successfully updated and deployed across all dashboards.",
                isOpen: true,
                variant: "success"
            });
        } catch (e: any) {
            console.error(e);
            setAlertConfig({
                title: "Upload Failed",
                message: e.message || "Verify image format and network connection.",
                isOpen: true,
                variant: "error"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleVerifyStudent = async () => {
        if (!studentCode.trim()) return;
        setLinkingStudent(true);
        try {
            const res = await fetch('/api/parent/link-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentCode: studentCode.trim() })
            });
            const data = await res.json() as any;
            if (data.success) {
                setVerifiedStudent(data.student);
            } else {
                setAlertConfig({ title: "Identification Failed", message: data.error, isOpen: true, variant: "error" });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLinkingStudent(false);
        }
    };

    const handleConfirmLink = async () => {
        setLinkingStudent(true);
        try {
            const res = await fetch('/api/parent/link-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentCode: studentCode.trim(), confirm: true })
            });
            const data = await res.json() as any;
            if (data.success) {
                setAlertConfig({ title: "Link Established", message: "Family protocols successfully synchronized.", isOpen: true, variant: "success" });
                setVerifiedStudent(null);
                setStudentCode("");
                fetchSettings(); // Refresh student list
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLinkingStudent(false);
        }
    };

    const handlePrefToggle = (key: keyof typeof formData.preferences) => {
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                [key]: !prev.preferences[key]
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save User Settings
            const userRes = await fetch('/api/user/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            // Refresh preferences globally if body class needs it
            if (typeof document !== 'undefined') {
                const body = document.body;
                if (!formData.preferences.immersiveVisuals) body.classList.add('hide-immersive-visuals');
                else body.classList.remove('hide-immersive-visuals');

                if (!formData.preferences.smartSync) body.classList.add('reduce-motion');
                else body.classList.remove('reduce-motion');
            }

            // Save School Settings if user is Principal, Superadmin, or Owner
            if ((activeTab === 'school' || activeTab === 'communications') && isPrincipal) {
                const schoolRes = await fetch('/api/school/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(schoolForm)
                });
                if (schoolRes.ok) {
                    const data = await schoolRes.json() as any;
                    if (data.school) {
                        setSchoolData(data.school);
                    }
                }
                fetchSchoolSettings();
            }

            if (userRes.ok) {
                setAlertConfig({
                    title: "Settings Synchronized",
                    message: "Identity and institutional protocols updated successfully.",
                    isOpen: true,
                    variant: "success"
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setSaving(false), 1000);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.new !== passwordData.confirm) {
            setAlertConfig({
                title: "Password Mismatch",
                message: "New passwords do not match.",
                isOpen: true,
                variant: "error"
            });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/user/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: isResetMode ? undefined : passwordData.current,
                    newPassword: passwordData.new
                })
            });
            const data = await res.json() as any;
            if (res.ok) {
                setAlertConfig({
                    title: "Password Updated",
                    message: "Your password has been successfully updated.",
                    isOpen: true,
                    variant: "success"
                });
                setPasswordData({ current: "", new: "", confirm: "" });
            } else {
                setAlertConfig({
                    title: "Connection Failed",
                    message: data.error || "Communication with the identity server was interrupted.",
                    isOpen: true,
                    variant: "error"
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const runDiagnostics = async () => {
        setDiagnosing(true);
        setDiagnosticResult(null);
        try {
            const res = await fetch('/api/diagnostic');
            const data = await res.json() as any;
            setDiagnosticResult(data);
            if (data.success) {
                setAlertConfig({
                    title: "Diagnostic Pass",
                    message: "Core database and authentication systems are synchronized and operational.",
                    isOpen: true,
                    variant: "success"
                });
            } else {
                setAlertConfig({
                    title: "Diagnostic Failure",
                    message: data.error || "A critical fault was detected in the smart grid.",
                    isOpen: true,
                    variant: "error"
                });
            }
        } catch (e) {
            console.error(e);
            setAlertConfig({ title: "Connection Error", message: "Failed to run diagnostic service.", isOpen: true, variant: "error" });
        } finally {
            setDiagnosing(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <SpringingLoader message="Retrieving Institutional Configurations" />
            </div>
        );
    }

    const isPrincipal = userData?.role === 'PRINCIPAL' || userData?.role === 'SUPERADMIN' || userData?.role === 'OWNER';

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-300 relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200 dark:border-zinc-900 pb-6 md:pb-10">
                <div className="flex items-center gap-4 sm:gap-6 group min-w-0">
                    <label className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center p-2 shadow-2xl relative transition-all ${isPrincipal ? 'cursor-pointer hover:border-eduGreen-500' : ''}`}>
                        {schoolData?.logoUrl ? (
                            <Image unoptimized src={schoolData.logoUrl} alt="School Logo" width={64} height={64} className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center">
                                <Zap className="w-6 h-6 text-zinc-700 group-hover:text-eduGreen-500 transition-colors" />
                            </div>
                        )}
                        {isPrincipal && (
                            <>
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-eduGreen-600 rounded-full w-5 h-5 flex items-center justify-center">
                                        <span className="text-[10px] text-zinc-900 dark:text-white font-bold">+</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </label>
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-4xl md:text-5xl font-medium tracking-tighter text-zinc-900 dark:text-white flex items-center gap-2 sm:gap-4 truncate">
                            System <span className="text-eduGreen-500 italic">Configuration</span>
                        </h1>
                        <p className="text-zinc-600 font-medium uppercase tracking-[0.2em] text-[10px] sm:text-xs mt-1 sm:mt-3 truncate">Advanced Institutional Protocols</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    isLoading={saving}
                    className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-11 sm:h-14 px-6 sm:px-10 rounded-xl sm:rounded-2xl font-medium text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-eduGreen-900/20 transition-all active:scale-95 mb-1 w-full sm:w-auto shrink-0"
                >
                    {saving ? "Synchronizing..." : "Commit Protocol"}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3">
                    <div className="flex flex-row lg:flex-col overflow-x-auto scrollbar-none gap-2 pb-2 lg:pb-0 -mx-1 px-1">
                        {[
                            { id: 'profile', icon: User, label: "Profile Identity" },
                            { id: 'security', icon: Shield, label: "Security Layer" },
                            { id: 'preferences', icon: Sliders, label: "App Experience" },
                            ...(userData?.role === 'PARENT' ? [{ id: 'family', icon: Trophy, label: "Family Hub" }] : []),
                            ...(userData?.role === 'TEACHER' || userData?.role === 'HOMEROOM' ? [{ id: 'workload', icon: Briefcase, label: "Teaching Load" }] : []),
                            { id: 'school', icon: Zap, label: "Institutional Hub" },
                            ...(isPrincipal ? [{ id: 'academic', icon: Calendar, label: "Academic Terms" }, { id: 'communications', icon: Bell, label: "Communications" }] : [])
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`flex items-center gap-2.5 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-all font-medium text-[10px] uppercase tracking-widest shrink-0 whitespace-nowrap ${activeTab === item.id ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800 shadow-xl' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-950/50'}`}
                            >
                                <item.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === item.id ? 'text-eduGreen-500' : 'text-zinc-800 dark:text-zinc-200'}`} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                        <div className="hidden lg:block pt-6">
                            <Button
                                variant="ghost"
                                onClick={handleLogout}
                                disabled={loggingOut}
                                isLoading={loggingOut}
                                className="w-full justify-start gap-4 px-6 py-4 h-auto rounded-2xl text-red-900 hover:text-red-600 dark:text-red-500 hover:bg-red-950/10 transition-all font-medium text-[10px] uppercase tracking-widest border-transparent"
                            >
                                <LogOut className="w-4 h-4" />
                                Terminate Session
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <div className="lg:col-span-9 space-y-8">
                    {activeTab === 'profile' && (
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Profile Overview</CardTitle>
                                <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Global administrative parameters</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8 pt-6 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Profile Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Communications Node</Label>
                                        <Input
                                            disabled
                                            value={userData?.email || ""}
                                            className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white/50 h-14 rounded-2xl border-2 font-medium cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Professional Summary</Label>
                                        <textarea
                                            className="w-full bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white p-6 rounded-[2rem] focus:border-eduGreen-600 transition-all border-2 font-medium text-sm min-h-[120px] resize-none outline-none"
                                            value={formData.bio}
                                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                            placeholder="Enter your professional summary..."
                                        ></textarea>
                                    </div>

                                    {isPrincipal && (
                                        <div className="space-y-3 pt-6 border-t border-zinc-200 dark:border-zinc-900/50">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Institutional Brand Logo</Label>
                                            <div className="flex items-center gap-6 p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-900 rounded-2xl">
                                                {schoolForm.logoUrl ? (
                                                    <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden border border-zinc-300 dark:border-zinc-800 p-2">
                                                        <Image unoptimized src={schoolForm.logoUrl} alt="Logo" width={64} height={64} className="w-full h-full object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-300 dark:border-zinc-800">
                                                        <Zap className="w-6 h-6 text-zinc-700" />
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-1">
                                                    <h4 className="text-sm font-medium text-zinc-900 dark:text-white tracking-tight">School Logo</h4>
                                                    <p className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Supports PNG, JPG, WebP</p>
                                                </div>
                                                <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-800 transition-all font-medium text-[10px] uppercase tracking-widest text-center flex items-center justify-center">
                                                    Upload Image
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Security</CardTitle>
                                <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Password and access</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-6 space-y-8">
                                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                                    {!isResetMode && (
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Current Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordData.current}
                                                onChange={e => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-medium"
                                            />
                                        </div>
                                    )}
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">New Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordData.new}
                                                onChange={e => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-medium"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Confirm New Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordData.confirm}
                                                onChange={e => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-medium"
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        type="submit"
                                        isLoading={saving}
                                        className="w-full bg-zinc-100 dark:bg-zinc-900 hover:bg-eduGreen-600 text-white h-14 rounded-2xl font-medium text-[10px] uppercase tracking-[0.2em] border border-zinc-300 dark:border-zinc-800 transition-all"
                                    >
                                        Update Password
                                    </Button>
                                </form>

                                <div className="pt-6 border-t border-zinc-200 dark:border-zinc-900">
                                    <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mb-4">Active Session Logs</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-4 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-4 h-4 text-eduGreen-500" />
                                                <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Windows PC • Chrome</div>
                                            </div>
                                            <div className="text-[9px] font-medium text-eduGreen-500 uppercase">Current Node</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'preferences' && (
                        <Card className="bg-white/90 dark:bg-zinc-950/40 backdrop-blur-xl border-slate-200/80 dark:border-zinc-900/50 hover:border-emerald-500/30 dark:hover:border-eduGreen-900/30 transition-all rounded-[2.5rem] group shadow-xl dark:shadow-2xl border-t-slate-200 dark:border-t-zinc-800/20">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-medium text-slate-900 dark:text-zinc-100 tracking-tight leading-tight">App Experience</CardTitle>
                                <CardDescription className="text-slate-500 dark:text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Personalization and interface protocols</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-6 space-y-8">
                                <div className="space-y-6">
                                    {/* Theme Protocol Selector */}
                                    <div className="p-6 bg-slate-50 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-900 rounded-[2rem] space-y-4">
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Interface Theme Protocol</h4>
                                            <p className="text-[10px] text-slate-500 dark:text-zinc-600 font-medium uppercase tracking-widest">Select your preferred system color aesthetics</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    document.documentElement.classList.remove('dark');
                                                    localStorage.setItem('theme', 'light');
                                                }}
                                                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-400 hover:border-emerald-500 transition-all font-medium text-xs uppercase tracking-widest shadow-sm"
                                            >
                                                <span className="w-3 h-3 rounded-full bg-amber-500" />
                                                White Mode (Light)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    document.documentElement.classList.add('dark');
                                                    localStorage.setItem('theme', 'dark');
                                                }}
                                                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white dark:bg-zinc-950 border-2 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white hover:border-emerald-500 transition-all font-medium text-xs uppercase tracking-widest shadow-sm"
                                            >
                                                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                                Cyber Mode (Dark)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-zinc-900/20 border border-slate-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-slate-100 dark:hover:bg-zinc-900/40">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4 text-emerald-600 dark:text-eduGreen-500" />
                                                <h4 className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Immersive Visuals</h4>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-zinc-600 font-medium uppercase tracking-widest">Enable vibrant background effects and glassmorphism</p>
                                        </div>
                                        <Switch
                                            checked={formData.preferences.immersiveVisuals}
                                            onCheckedChange={() => handlePrefToggle('immersiveVisuals')}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-eduGreen-500" />
                                                <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Smart Sync</h4>
                                            </div>
                                            <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Enable high-performance micro-animations and transitions</p>
                                        </div>
                                        <Switch
                                            checked={formData.preferences.smartSync}
                                            onCheckedChange={() => handlePrefToggle('smartSync')}
                                        />
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Bell className="w-4 h-4 text-eduGreen-500" />
                                                    <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Email Alerts</h4>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={formData.preferences.emailAlerts}
                                                onCheckedChange={() => handlePrefToggle('emailAlerts')}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Volume2 className="w-4 h-4 text-eduGreen-500" />
                                                    <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Chat Sounds</h4>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={formData.preferences.chatSounds}
                                                onCheckedChange={() => handlePrefToggle('chatSounds')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'family' && (
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Family Hub</CardTitle>
                                <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Student links and lineage verification</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-6 space-y-10">
                                {/* Linked Students List */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Currently Linked Students</h4>
                                    <div className="grid gap-4">
                                        {userData?.parentLinks?.length > 0 ? (
                                            userData.parentLinks.map((link: any) => (
                                                <div key={link.id} className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem]">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-eduGreen-950/30 border border-eduGreen-900/50 flex items-center justify-center">
                                                            <User className="w-6 h-6 text-eduGreen-500" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white">{link.student.firstName} {link.student.lastName}</h5>
                                                            <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest">{link.student.grade?.name} • {link.student.class?.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-[9px] font-mono text-zinc-600 dark:text-zinc-500 p-2 bg-white dark:bg-zinc-950 rounded-lg">{link.student.studentCode}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 flex flex-col items-center justify-center text-zinc-800 dark:text-zinc-200 bg-zinc-100/10 dark:bg-zinc-900/10 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-900">
                                                <Search className="w-8 h-8 mb-4 opacity-20" />
                                                <p className="text-[10px] font-medium uppercase tracking-widest">No active student links detected</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Link New Student */}
                                <div className="p-8 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800 rounded-[2rem] space-y-6">
                                    <h4 className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Link Student Profile</h4>
                                    {!verifiedStudent ? (
                                        <div className="flex gap-4">
                                            <Input
                                                placeholder="ENTER STUDENT CODE (e.g. STU-12345)"
                                                value={studentCode}
                                                onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                                                className="bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl font-mono tracking-widest flex-1 pl-6"
                                            />
                                            <Button
                                                onClick={handleVerifyStudent}
                                                isLoading={linkingStudent}
                                                disabled={linkingStudent || !studentCode}
                                                className="h-14 px-8 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 hover:bg-eduGreen-600 text-white transition-all uppercase text-[10px] tracking-widest"
                                            >
                                                Verify Code
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                            <div className="p-6 bg-white dark:bg-zinc-950 border border-eduGreen-900/30 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-[8px] text-eduGreen-500 font-medium uppercase tracking-widest mb-1">Student Identified</p>
                                                    <h5 className="text-lg font-medium text-zinc-900 dark:text-white">{verifiedStudent.firstName} {verifiedStudent.lastName}</h5>
                                                    <p className="text-[10px] text-zinc-600">{verifiedStudent.schoolName} • {verifiedStudent.gradeLevel}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => setVerifiedStudent(null)}
                                                        className="h-10 px-4 rounded-xl text-zinc-600 hover:text-zinc-900 dark:hover:text-white uppercase text-[8px] tracking-widest"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={handleConfirmLink}
                                                        isLoading={linkingStudent}
                                                        className="h-10 px-6 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white uppercase text-[8px] tracking-widest"
                                                    >
                                                        Confirm Identity
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {activeTab === 'workload' && (
                        <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                            <CardHeader className="p-8 pb-4">
                                <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Teaching Load</CardTitle>
                                <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Academic assignments and workload sync</CardDescription>
                            </CardHeader>
                            <CardContent className="p-8 pt-6">
                                <div className="grid gap-4">
                                    {userData?.teacherAssignments?.length > 0 ? (
                                        userData.teacherAssignments.map((assignment: any) => (
                                            <div key={assignment.id} className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] hover:bg-zinc-200 dark:hover:bg-zinc-900/40 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center">
                                                        <Briefcase className="w-5 h-5 text-eduGreen-500" />
                                                    </div>
                                                    <div>
                                                        <h5 className="text-sm font-medium text-zinc-900 dark:text-white">{assignment.subject.name}</h5>
                                                        <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest">{assignment.class.grade?.name} • Class {assignment.class.name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest bg-white dark:bg-zinc-950 px-4 py-2 rounded-xl">Authorized Educator</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center justify-center text-zinc-800 dark:text-zinc-200 bg-zinc-100/10 dark:bg-zinc-900/10 rounded-[2.5rem] border border-dashed border-zinc-200 dark:border-zinc-900">
                                            <Briefcase className="w-8 h-8 mb-4 opacity-20" />
                                            <p className="text-[10px] font-medium uppercase tracking-widest">No active academic assignments detected</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {activeTab === 'school' && (
                        <div className="space-y-8">
                            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Zap className="w-4 h-4 text-eduGreen-500" />
                                        <span className="text-[10px] font-medium text-eduGreen-500 uppercase tracking-[0.3em]">Institutional Core</span>
                                    </div>
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Workspace Identity</CardTitle>
                                    <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Foundational parameters for {schoolData?.name}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-6 space-y-10">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">School Branding Name</Label>
                                            <Input
                                                disabled={!isPrincipal}
                                                value={schoolForm.name}
                                                onChange={(e) => setSchoolForm(prev => ({ ...prev, name: e.target.value }))}
                                                className={`bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl transition-all border-2 font-medium ${!isPrincipal ? 'opacity-60 cursor-not-allowed' : 'focus:border-eduGreen-600'}`}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Internal Organization Code</Label>
                                            <div className="relative group">
                                                <Input
                                                    disabled
                                                    value={schoolForm.schoolCode}
                                                    className="bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 border-zinc-300 dark:border-zinc-800 text-eduGreen-500 h-14 rounded-2xl border-2 font-mono tracking-[0.2em] font-medium cursor-not-allowed opacity-60 pl-12"
                                                />
                                                <Lock className="w-4 h-4 text-zinc-700 absolute left-4 top-1/2 -translate-y-1/2 group-hover:text-eduGreen-500 transition-colors" />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-800">
                                                    Immutable
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-8">
                                        <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Physical Headquarters Address</Label>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Supports Address or GPS Coordinates (Lat,Lng)</p>
                                                    {schoolForm.address && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(schoolForm.address)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] font-medium text-eduGreen-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                                                        >
                                                            <MapPin className="w-3 h-3" />
                                                            Open Satellite View
                                                        </a>
                                                    )}
                                                </div>
                                                <textarea
                                                    disabled={!isPrincipal}
                                                    className={`w-full bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white p-6 rounded-[2rem] transition-all border-2 font-medium text-sm min-h-[100px] resize-none outline-none ${!isPrincipal ? 'opacity-60 cursor-not-allowed' : 'focus:border-eduGreen-600'}`}
                                                    value={schoolForm.address}
                                                    onChange={(e) => setSchoolForm(prev => ({ ...prev, address: e.target.value }))}
                                                    placeholder={isPrincipal ? "Enter institutional address or coordinates..." : "No institutional address configured"}
                                                ></textarea>
                                            </div>

                                            <div className="w-full h-72 rounded-[2rem] overflow-hidden border-2 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 relative shadow-2xl group transition-all hover:border-eduGreen-900/30">
                                                {schoolForm.address ? (
                                                    <>
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            className="w-full h-full invert grayscale opacity-60 group-hover:invert-0 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 ease-out scale-100 group-hover:scale-105"
                                                            frameBorder="0"
                                                            scrolling="no"
                                                            marginHeight={0}
                                                            marginWidth={0}
                                                            src={`https://maps.google.com/maps?q=${encodeURIComponent(schoolForm.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                                        ></iframe>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80 pointer-events-none" />
                                                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-800 text-[9px] font-medium uppercase tracking-widest text-eduGreen-500 shadow-xl pointer-events-none flex items-center gap-2 z-10">
                                                            <span className="relative flex h-2 w-2">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eduGreen-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-eduGreen-500"></span>
                                                            </span>
                                                            Live Feed
                                                        </div>
                                                        <div className="absolute bottom-6 left-6 z-10">
                                                            <div className="flex items-center gap-3 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-xl">
                                                                <div className="w-10 h-10 rounded-xl bg-eduGreen-950/30 border border-eduGreen-900/50 flex items-center justify-center">
                                                                    <MapPin className="w-5 h-5 text-eduGreen-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-0.5">Verified Location</p>
                                                                    <p className="text-xs font-medium text-zinc-900 dark:text-white tracking-tight max-w-[200px] truncate">{schoolForm.address}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-800 dark:text-zinc-200 space-y-4">
                                                        <div className="w-16 h-16 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-center animate-pulse">
                                                            <MapPin className="w-8 h-8 text-zinc-800 dark:text-zinc-200" />
                                                        </div>
                                                        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">Awaiting Geo-Coordinates</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 mt-12 pt-10 border-t border-zinc-200 dark:border-zinc-900/50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Institutional Nodes</h3>
                                                <p className="text-[9px] text-zinc-600 font-medium uppercase tracking-widest ml-2">Manage secondary campuses and facility divisions</p>
                                            </div>
                                            {isPrincipal && (
                                                <Button
                                                    onClick={() => setSchoolForm(prev => ({
                                                        ...prev,
                                                        locations: [...prev.locations, { name: "", address: "" }]
                                                    }))}
                                                    variant="outline"
                                                    className="h-10 px-6 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/50 hover:bg-eduGreen-950/10 text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-400 uppercase text-[8px] tracking-[0.2em] font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-2" /> Link New Node
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid gap-6">
                                            {schoolForm.locations.map((loc, idx) => (
                                                <div key={idx} className="p-8 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 flex items-center justify-center">
                                                                <MapPin className="w-5 h-5 text-eduGreen-500" />
                                                            </div>
                                                            <h5 className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-widest whitespace-nowrap">Node Vector {idx + 1}</h5>
                                                        </div>
                                                        {isPrincipal && (
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => setSchoolForm(prev => ({
                                                                    ...prev,
                                                                    locations: prev.locations.filter((_, i) => i !== idx)
                                                                }))}
                                                                className="w-10 h-10 p-0 rounded-full text-red-900/50 hover:text-red-600 dark:text-red-500 hover:bg-red-500/10 transition-all border-none"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <div className="grid md:grid-cols-2 gap-8">
                                                        <div className="space-y-3">
                                                            <Label className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest ml-2">Node Designation</Label>
                                                            <Input
                                                                disabled={!isPrincipal}
                                                                value={loc.name}
                                                                onChange={(e) => setSchoolForm(prev => {
                                                                    const newLocs = [...prev.locations];
                                                                    newLocs[idx].name = e.target.value;
                                                                    return { ...prev, locations: newLocs };
                                                                })}
                                                                placeholder="e.g. Science Wing, South Campus"
                                                                className={`bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-12 rounded-xl border-2 font-medium ${!isPrincipal ? 'opacity-60 cursor-not-allowed' : 'focus:border-eduGreen-600'}`}
                                                            />
                                                        </div>
                                                        <div className="space-y-3">
                                                            <Label className="text-[9px] font-medium text-zinc-700 uppercase tracking-widest ml-2">Physical Location</Label>
                                                            <Input
                                                                disabled={!isPrincipal}
                                                                value={loc.address}
                                                                onChange={(e) => setSchoolForm(prev => {
                                                                    const newLocs = [...prev.locations];
                                                                    newLocs[idx].address = e.target.value;
                                                                    return { ...prev, locations: newLocs };
                                                                })}
                                                                placeholder="Enter address or coordinates"
                                                                className={`bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-12 rounded-xl border-2 font-medium ${!isPrincipal ? 'opacity-60 cursor-not-allowed' : 'focus:border-eduGreen-600'}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {loc.address && (
                                                        <div className="w-full h-48 rounded-[1.5rem] overflow-hidden border border-zinc-200 dark:border-zinc-900 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                                                            <iframe
                                                                width="100%"
                                                                height="100%"
                                                                frameBorder="0"
                                                                src={`https://maps.google.com/maps?q=${encodeURIComponent(loc.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                                                            ></iframe>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {schoolForm.locations.length === 0 && (
                                                <div className="py-12 bg-zinc-100/10 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-800 dark:text-zinc-200">
                                                    <MapPin className="w-8 h-8 mb-4 opacity-10" />
                                                    <p className="text-[9px] font-medium uppercase tracking-widest text-zinc-700">No secondary school accounts integrated</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-8 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800 rounded-[2rem] space-y-6">
                                        <h4 className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Digital Footprint</h4>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                            <div className="p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-900 text-center">
                                                <div className="text-2xl font-medium text-zinc-900 dark:text-white">{schoolData?._count?.students || 0}</div>
                                                <div className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">Active Learners</div>
                                            </div>
                                            <div className="p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-900 text-center">
                                                <div className="text-2xl font-medium text-zinc-900 dark:text-white">{schoolData?._count?.users || 0}</div>
                                                <div className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">Authorized Staff</div>
                                            </div>
                                            <div className="p-6 bg-zinc-200 dark:bg-white/50 dark:bg-zinc-950/50 rounded-2xl border border-zinc-200 dark:border-zinc-900 text-center">
                                                <div className="text-2xl font-medium text-zinc-900 dark:text-white">{schoolData?._count?.grades || 0}</div>
                                                <div className="text-[8px] font-medium text-zinc-700 uppercase tracking-widest">Grade Tiers</div>
                                            </div>
                                        </div>
                                    </div>

                                    {isPrincipal && (
                                        <div className="p-8 bg-zinc-100/10 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-900 border-dashed rounded-[2rem] space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="text-[10px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest mb-1">Advanced Maintenance</h4>
                                                    <p className="text-[9px] text-zinc-700 font-medium uppercase tracking-widest">Verify database integrity & auth protocols</p>
                                                </div>
                                                <Button
                                                    onClick={runDiagnostics}
                                                    isLoading={diagnosing}
                                                    variant="outline"
                                                    className="h-10 px-6 rounded-xl border-zinc-300 dark:border-zinc-800 hover:border-eduGreen-500/50 hover:bg-eduGreen-950/10 text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-400 uppercase text-[8px] tracking-[0.2em] font-bold"
                                                >
                                                    <Zap className="w-3.5 h-3.5 mr-2" /> Run Diagnostic Protocol
                                                </Button>
                                            </div>

                                            {diagnosticResult && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 bg-white dark:bg-black rounded-xl border border-zinc-300 dark:border-zinc-800 font-mono text-[9px] text-eduGreen-500 overflow-x-auto"
                                                >
                                                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-200 dark:border-zinc-900 pb-2">
                                                        <span className="w-2 h-2 rounded-full bg-eduGreen-500 animate-pulse" />
                                                        <span>SYSTEM_LOG::DIAGNOSTIC_RESULT</span>
                                                    </div>
                                                    <pre>{JSON.stringify(diagnosticResult, null, 2)}</pre>
                                                </motion.div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-300 dark:bg-white/10 dark:bg-zinc-950/10 border border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] p-8 border-dashed group relative ">
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    {schoolForm.logoUrl ? (
                                        <div className="relative mb-6 group">
                                            <div className="w-32 h-32 rounded-3xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden border-2 border-eduGreen-600/50 flex items-center justify-center relative">
                                                <Image unoptimized src={schoolForm.logoUrl} alt="School Logo" className="object-contain" fill sizes="128px" />
                                            </div>
                                            {isPrincipal && (
                                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-full flex items-center justify-center cursor-pointer hover:border-eduGreen-500 transition-all shadow-xl">
                                                    <Zap className="w-4 h-4 text-eduGreen-500" />
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                </label>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center mb-6 transition-all group-hover:border-eduGreen-900/50">
                                            <Zap className="w-8 h-8 text-zinc-800 dark:text-zinc-200 group-hover:text-eduGreen-500 transition-colors" />
                                        </div>
                                    )}

                                    <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest">Institutional Branding Engine</h4>
                                    <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest mt-2">{schoolForm.logoUrl ? "Organizational identity verified" : "Vectorized organizational branding enabled"}</p>

                                    {isPrincipal && !schoolForm.logoUrl && (
                                        <label className="mt-6">
                                            <div className="cursor-pointer px-8 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-xl text-[9px] font-medium uppercase tracking-widest hover:border-eduGreen-500 hover:text-eduGreen-700 dark:hover:text-eduGreen-400 transition-all">
                                                Upload School Logo
                                            </div>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                        </label>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'communications' && isPrincipal && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <Card className="bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border-zinc-200 dark:border-zinc-900/50 hover:border-eduGreen-900/30 transition-all rounded-[2.5rem]  group shadow-2xl border-t-zinc-800/20">
                                <CardHeader className="p-8 pb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Bell className="w-4 h-4 text-eduGreen-500" />
                                        <span className="text-[10px] font-medium text-eduGreen-500 uppercase tracking-[0.3em]">Institutional Communications</span>
                                    </div>
                                    <CardTitle className="text-2xl font-medium text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight leading-tight">Digital Broadcast Protocols</CardTitle>
                                    <CardDescription className="text-zinc-600 font-medium uppercase tracking-widest text-[9px] mt-1">Manage institutional automated messaging layers</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-6 space-y-10">
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Invitation Protocols</h4>
                                                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Send automated registration keys to new staff and teachers</p>
                                            </div>
                                            <Switch
                                                checked={schoolForm.communicationsConfig.sendInvites}
                                                onCheckedChange={() => setSchoolForm(prev => ({
                                                    ...prev,
                                                    communicationsConfig: { ...prev.communicationsConfig, sendInvites: !prev.communicationsConfig.sendInvites }
                                                }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Academic Reporting</h4>
                                                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Broadcast assessment results and grade reports to parents</p>
                                            </div>
                                            <Switch
                                                checked={schoolForm.communicationsConfig.sendReports}
                                                onCheckedChange={() => setSchoolForm(prev => ({
                                                    ...prev,
                                                    communicationsConfig: { ...prev.communicationsConfig, sendReports: !prev.communicationsConfig.sendReports }
                                                }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-6 bg-zinc-100/20 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] transition-all hover:bg-zinc-200 dark:hover:bg-zinc-900/40">
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-medium text-zinc-900 dark:text-white uppercase tracking-wider">Financial Transactions</h4>
                                                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Issue digital invoices and payment confirmation tokens</p>
                                            </div>
                                            <Switch
                                                checked={schoolForm.communicationsConfig.sendInvoices}
                                                onCheckedChange={() => setSchoolForm(prev => ({
                                                    ...prev,
                                                    communicationsConfig: { ...prev.communicationsConfig, sendInvoices: !prev.communicationsConfig.sendInvoices }
                                                }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-zinc-200 dark:border-zinc-900/50 space-y-4">
                                        <div className="space-y-3">
                                            <Label className="text-[10px] font-medium text-zinc-700 uppercase tracking-[0.3em] ml-2">Institutional Reply-To Hub</Label>
                                            <Input
                                                placeholder="e.g. office@lucy-academy.edu"
                                                value={schoolForm.communicationsConfig.replyTo}
                                                onChange={(e) => setSchoolForm(prev => ({
                                                    ...prev,
                                                    communicationsConfig: { ...prev.communicationsConfig, replyTo: e.target.value }
                                                }))}
                                                className="bg-zinc-100/30 dark:bg-zinc-900/30 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white h-14 rounded-2xl focus:border-eduGreen-600 transition-all border-2 font-medium"
                                            />
                                            <p className="text-[9px] text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest ml-2 italic">Recipient responses will be routed to this email address.</p>
                                        </div>

                                        <div className="pt-6 flex justify-end">
                                            <Button
                                                onClick={handleSave}
                                                isLoading={saving}
                                                className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white h-12 px-8 rounded-xl font-medium text-xs uppercase tracking-[0.2em] shadow-lg shadow-eduGreen-900/20 transition-all active:scale-95"
                                            >
                                                {saving ? "Synchronizing..." : "Save Broadcast Protocols"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-eduGreen-950/10 border border-eduGreen-900/30 rounded-[2.5rem] p-8 border-dashed group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <Zap className="w-8 h-8 text-eduGreen-900/20" />
                                </div>
                                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-eduGreen-900/20 flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Encrypted Transmission Node</h4>
                                        <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest mt-1 max-w-sm">All institutional broadcasts are routed through a secured SMTP connection (Gmail Service Active).</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                    
                    {activeTab === 'academic' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <SettingsAcademicTerms />
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />
        </div >
    );
}
