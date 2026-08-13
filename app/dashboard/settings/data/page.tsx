"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Database, ShieldAlert, RefreshCw, HardDrive, Upload, Loader2, CheckCircle2, Download } from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";

interface RestorePoint {
    id: string;
    createdAt: string;
    fileUrl: string;
    sizeBytes: number;
    status: string;
}

export default function DataSecuritySettings() {
    const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);

    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, isOpen: boolean, variant?: "info" | "success" | "error" }>({ title: "", message: "", isOpen: false, variant: "info" });
    const [confirmRestore, setConfirmRestore] = useState(false);

    useEffect(() => {
        fetchRestorePoints();
    }, []);

    const fetchRestorePoints = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/school/backups/list');
            if (res.ok) {
                const data = (await res.json()) as any;
                setRestorePoints(data.restorePoints || []);
            }
        } catch (err: any) {
            setError("Failed to load restore points");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateBackup = async () => {
        setIsGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/school/backups/generate', { method: 'POST' });
            if (!res.ok) throw new Error("Failed to generate backup");
            setAlertConfig({ title: "Backup Complete", message: "A new snapshot of your school data has been created.", isOpen: true, variant: "success" });
            fetchRestorePoints();
        } catch (err: any) {
            setAlertConfig({ title: "Backup Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const forceDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            setAlertConfig({ title: "Download Failed", message: "Could not download the file.", isOpen: true, variant: "error" });
        }
    };

    const handleRestore = async () => {
        if (!uploadFile) return;
        setIsRestoring(true);
        setConfirmRestore(false);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result as string;
                    const jsonPayload = JSON.parse(text);

                    const res = await fetch('/api/school/backups/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(jsonPayload)
                    });

                    if (!res.ok) {
                        const errData = (await res.json()) as any;
                        throw new Error(errData.error || "Failed to restore backup");
                    }

                    const data = (await res.json()) as any;
                    setAlertConfig({ title: "Restore Successful", message: data.message, isOpen: true, variant: "success" });
                    setUploadFile(null);
                    fetchRestorePoints();
                } catch (err: any) {
                    setAlertConfig({ title: "Restore Failed", message: err.message, isOpen: true, variant: "error" });
                } finally {
                    setIsRestoring(false);
                }
            };
            reader.readAsText(uploadFile);
        } catch (err: any) {
            setAlertConfig({ title: "File Read Error", message: "Failed to read the backup file.", isOpen: true, variant: "error" });
            setIsRestoring(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Data & Security</h1>
                <p className="text-zinc-600 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1">Manage system snapshots and disaster recovery</p>
            </div>

            {/* Backup Generation Panel */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Database className="w-48 h-48 text-eduGreen-500" />
                </div>
                
                <div className="relative z-10 max-w-xl">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-eduGreen-500" />
                        System Snapshots
                    </h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                        Generate a secure snapshot of your school's database. Snapshots capture the complete institutional state for disaster recovery and system integrity verification.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                        <Button 
                            onClick={handleGenerateBackup}
                            isLoading={isGenerating}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-12 px-6 font-semibold uppercase tracking-widest text-[11px] shadow-lg shadow-eduGreen-900/20"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                            Generate Security Snapshot
                        </Button>
                    </div>
                </div>
            </div>

            {/* Restore Points History */}
            <div className="bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-300 dark:border-zinc-800/50 rounded-[2rem] p-8">
                <h2 className="text-base font-medium text-zinc-900 dark:text-white mb-6">Recent Restore Points</h2>
                
                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-600 dark:text-zinc-500" />
                    </div>
                ) : restorePoints.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl">
                        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-500">No snapshots found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {restorePoints.map((rp) => (
                            <div key={rp.id} className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-eduGreen-500/10 rounded-xl flex items-center justify-center border border-eduGreen-500/20">
                                        <Database className="w-5 h-5 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                            Restore Point - {new Date(rp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-zinc-600 dark:text-zinc-500 font-mono uppercase tracking-wider">{new Date(rp.createdAt).toLocaleTimeString()}</span>
                                            <span className="text-[10px] text-zinc-600">•</span>
                                            <span className="text-[10px] text-zinc-600 dark:text-zinc-500 uppercase tracking-widest font-medium">{formatBytes(rp.sizeBytes)}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => forceDownload(rp.fileUrl, `LUCY_Snapshot_${rp.createdAt.split('T')[0]}.json`)}
                                    className="h-10 px-4 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-700 text-zinc-900 dark:text-white text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download Snapshot
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Danger Zone: Restore */}
            <div className="bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-[2rem] p-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-950/50 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Disaster Recovery (Restore)</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed max-w-2xl">
                            Upload a saved snapshot file (.json) to restore missing data. This will recreate deleted students, staff, classes, and grades. 
                            <strong> Warning:</strong> Restoring will also send password-reset emails to any staff members whose accounts were permanently deleted.
                        </p>

                        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <label className="flex-1 w-full relative">
                                <input 
                                    type="file" 
                                    accept=".json"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                                <div className={`flex items-center gap-3 px-4 h-12 rounded-xl border border-dashed transition-all ${uploadFile ? 'bg-eduGreen-950/20 border-eduGreen-500/50 text-eduGreen-400' : 'bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-400 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-500'}`}>
                                    {uploadFile ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                    <span className="text-[11px] font-medium uppercase tracking-widest truncate">
                                        {uploadFile ? uploadFile.name : "Select Snapshot File (.json)"}
                                    </span>
                                </div>
                            </label>
                            
                            <Button 
                                disabled={!uploadFile}
                                onClick={() => setConfirmRestore(true)}
                                isLoading={isRestoring}
                                className="h-12 px-6 bg-red-600 hover:bg-red-500 text-zinc-900 dark:text-white rounded-xl font-semibold uppercase tracking-widest text-[11px] shadow-lg shadow-red-900/20 shrink-0"
                            >
                                Apply Restore Point
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmRestore}
                onClose={() => setConfirmRestore(false)}
                onConfirm={handleRestore}
                title="Confirm Disaster Recovery"
                description={`You are about to restore data from "${uploadFile?.name}". This action will intelligently recreate missing records and sync your school state. Are you absolutely sure you want to proceed?`}
                confirmText="Yes, Apply Restore Point"
                variant="danger"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                variant={alertConfig.variant}
            />
        </div>
    );
}
