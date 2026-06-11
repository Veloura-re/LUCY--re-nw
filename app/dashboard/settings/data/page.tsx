"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Database, ShieldAlert, Download, RefreshCw, HardDrive, Upload, Loader2, CheckCircle2, FileArchive } from "lucide-react";
import { ConfirmationModal, AlertModal } from "@/components/ui/confirmation-modal";
import JSZip from "jszip";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

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
    const [isArchiving, setIsArchiving] = useState(false);
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
            const res = await fetch('/api/school/backups/list'); // Need to implement this API
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

    const handleGenerateArchive = async () => {
        setIsArchiving(true);
        setError(null);
        try {
            const res = await fetch('/api/school/data-export');
            if (!res.ok) throw new Error("Failed to fetch export data");
            const responseData = await res.json() as any;
            const data = responseData.data;
            const schoolName = responseData.schoolName || "LUCY Educational Institute";

            const zip = new JSZip();

            // 1. Helper for Master Tables
            const addPdfToZip = (filename: string, title: string, records: any[]) => {
                if (!records || records.length === 0) return;
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.width;
                const pageHeight = doc.internal.pageSize.height;
                
                // Header Background
                doc.setFillColor(15, 23, 42); 
                doc.rect(0, 0, pageWidth, 35, 'F');
                
                // School Name
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.text(schoolName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });
                
                // Subtitle
                doc.setTextColor(156, 163, 175);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text("OFFICIAL ARCHIVE EXPORT", pageWidth / 2, 24, { align: 'center' });
                
                // Document Title
                doc.setTextColor(16, 185, 129);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text(title.toUpperCase(), pageWidth / 2, 30, { align: 'center' });

                // Generation Info
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(8);
                doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

                // Divider Line
                doc.setDrawColor(226, 232, 240);
                doc.line(14, 45, pageWidth - 14, 45);
                
                const columns = Object.keys(records[0]).map(key => ({ header: key, dataKey: key }));

                autoTable(doc, {
                    head: [columns.map(c => c.header)],
                    body: records.map(row => columns.map(c => String(row[c.dataKey]))),
                    startY: 50,
                    theme: 'grid',
                    styles: { fontSize: 8, font: 'helvetica', cellPadding: 3, textColor: [51, 65, 85], lineColor: [226, 232, 240], lineWidth: 0.1 },
                    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', halign: 'center' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    margin: { top: 50, bottom: 20 },
                    didDrawPage: function () {
                        const str = "Page " + (doc.internal as any).getNumberOfPages();
                        doc.setFontSize(8);
                        doc.setTextColor(148, 163, 184);
                        doc.text(str, pageWidth / 2, pageHeight - 10, { align: "center" });
                        doc.text("SECURE LUCY OS EXPORT", 14, pageHeight - 10);
                    }
                });
                
                zip.file(`Master_Records/${filename}`, doc.output('blob'));
            };

            addPdfToZip("Students_Master.pdf", "Enrolled Students", data.students);
            addPdfToZip("Personnel_Master.pdf", "School Personnel", data.personnel);
            addPdfToZip("Parents_Master.pdf", "Registered Parents", data.parents);
            addPdfToZip("Classes_Master.pdf", "Classes & Capacities", data.classes);
            addPdfToZip("Subjects_Master.pdf", "Subjects Registry", data.subjects);
            addPdfToZip("Exams_Master.pdf", "Exams Log", data.exams);
            addPdfToZip("Grades_Master.pdf", "Gradebook Records", data.grades);
            addPdfToZip("Attendance_Master.pdf", "Attendance Records", data.attendance);
            addPdfToZip("Invoices_Master.pdf", "Financial Invoices", data.invoices);
            addPdfToZip("Books_Master.pdf", "Library Books", data.books);
            addPdfToZip("Events_Master.pdf", "School Events", data.events);
            addPdfToZip("Payrolls_Master.pdf", "Staff Payrolls", data.payrolls);
            addPdfToZip("Assignments_Master.pdf", "Class Assignments", data.assignments);
            addPdfToZip("Lessons_Master.pdf", "Lesson Plans", data.lessons);
            addPdfToZip("Timetables_Master.pdf", "School Timetables", data.timetables);

            // 2. Generate Individual Enrollment Certificates
            if (data.students && data.students.length > 0) {
                data.students.forEach((student: any) => {
                    const doc = new jsPDF('landscape');
                    const pageWidth = doc.internal.pageSize.width;
                    const pageHeight = doc.internal.pageSize.height;
                    
                    doc.setDrawColor(30, 41, 59);
                    doc.setLineWidth(5);
                    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
                    doc.setDrawColor(16, 185, 129);
                    doc.setLineWidth(1);
                    doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

                    doc.setFont("times", "bold");
                    doc.setFontSize(36);
                    doc.setTextColor(30, 41, 59);
                    doc.text("CERTIFICATE OF ENROLLMENT", pageWidth / 2, 60, { align: 'center' });
                    
                    doc.setFont("times", "italic");
                    doc.setFontSize(16);
                    doc.text("This is to certify that", pageWidth / 2, 85, { align: 'center' });

                    doc.setFont("times", "bold");
                    doc.setFontSize(28);
                    doc.setTextColor(16, 185, 129);
                    doc.text(student.Name, pageWidth / 2, 105, { align: 'center' });

                    doc.setFont("times", "normal");
                    doc.setFontSize(14);
                    doc.setTextColor(30, 41, 59);
                    doc.text(`is officially enrolled in ${student.Grade} - ${student.Class}`, pageWidth / 2, 125, { align: 'center' });
                    doc.text(`at ${schoolName}`, pageWidth / 2, 135, { align: 'center' });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Student ID: ${student.Code}`, pageWidth / 2, 155, { align: 'center' });
                    doc.text(`Date of Record: ${new Date().toLocaleDateString()}`, pageWidth / 2, 165, { align: 'center' });

                    zip.file(`Certificates/${student.Code}_${student.Name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, doc.output('blob'));
                });
            }

            // 3. Generate Individual Academic Transcripts
            if (data.grades && data.grades.length > 0) {
                const gradesByStudent = new Map();
                data.grades.forEach((g: any) => {
                    if (!gradesByStudent.has(g.StudentCode)) {
                        gradesByStudent.set(g.StudentCode, { name: g.StudentName, grades: [] });
                    }
                    gradesByStudent.get(g.StudentCode).grades.push(g);
                });

                gradesByStudent.forEach((studentInfo, code) => {
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.width;
                    
                    doc.setFillColor(30, 41, 59);
                    doc.rect(0, 0, pageWidth, 40, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(20);
                    doc.text(schoolName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });
                    doc.setTextColor(16, 185, 129);
                    doc.setFontSize(14);
                    doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageWidth / 2, 28, { align: 'center' });

                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(12);
                    doc.text(`Student Name: ${studentInfo.name}`, 14, 55);
                    doc.text(`Student Code: ${code}`, 14, 65);
                    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 55, { align: 'right' });

                    const columns = [{ header: "Date", dataKey: "Date" }, { header: "Subject", dataKey: "Subject" }, { header: "Exam", dataKey: "ExamTitle" }, { header: "Score", dataKey: "Score" }, { header: "Status", dataKey: "Status" }];
                    const formattedGrades = studentInfo.grades.map((g: any) => ({ ...g, Date: g.Date.split('T')[0] }));

                    autoTable(doc, {
                        head: [columns.map(c => c.header)],
                        body: formattedGrades.map((row: any) => columns.map(c => String(row[c.dataKey]))),
                        startY: 75,
                        theme: 'grid',
                        headStyles: { fillColor: [30, 41, 59] },
                        styles: { fontSize: 9 }
                    });

                    zip.file(`Transcripts/${code}_${studentInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}_Transcript.pdf`, doc.output('blob'));
                });
            }

            // 4. Generate Personnel Dossiers
            if (data.personnel && data.personnel.length > 0) {
                data.personnel.forEach((p: any) => {
                    if(p.Role === "STUDENT" || p.Role === "PARENT") return; 
                    const doc = new jsPDF();
                    const pageWidth = doc.internal.pageSize.width;
                    
                    doc.setFillColor(30, 41, 59);
                    doc.rect(0, 0, pageWidth, 40, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(20);
                    doc.text(schoolName.toUpperCase(), pageWidth / 2, 18, { align: 'center' });
                    doc.setTextColor(16, 185, 129);
                    doc.setFontSize(14);
                    doc.text("PERSONNEL DOSSIER", pageWidth / 2, 28, { align: 'center' });

                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(14);
                    doc.text("STAFF INFORMATION", 14, 60);
                    doc.setLineWidth(0.5);
                    doc.line(14, 62, 80, 62);

                    doc.setFontSize(11);
                    doc.setFont("helvetica", "normal");
                    doc.text(`Full Name: ${p.Name}`, 14, 75);
                    doc.text(`Official Email: ${p.Email}`, 14, 85);
                    doc.text(`Designation: ${p.Role}`, 14, 95);
                    doc.text(`Account Status: ${p.Status}`, 14, 105);
                    doc.text(`System ID: ${p.ID}`, 14, 115);
                    
                    zip.file(`Personnel_Dossiers/${p.Role}_${p.Name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`, doc.output('blob'));
                });
            }

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, "LUCY_OS_Complete_Archive.zip");
            
            setAlertConfig({ title: "Archive Generated", message: "Your complete PDF archive with all formal documents has been successfully downloaded.", isOpen: true, variant: "success" });
        } catch (err: any) {
            setAlertConfig({ title: "Archive Failed", message: err.message, isOpen: true, variant: "error" });
        } finally {
            setIsArchiving(false);
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
                <h1 className="text-2xl font-bold text-white tracking-tight">Data & Security</h1>
                <p className="text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1">Manage system backups and disaster recovery</p>
            </div>

            {/* Backup Generation Panel */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Database className="w-48 h-48 text-eduGreen-500" />
                </div>
                
                <div className="relative z-10 max-w-xl">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <HardDrive className="w-5 h-5 text-eduGreen-500" />
                        System Snapshots
                    </h2>
                    <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                        Generate a complete snapshot of your school's database. This includes all students, staff, classes, grades, and financial records. Snapshots are stored securely and can be downloaded for your records.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 mt-6">
                        <Button 
                            onClick={handleGenerateBackup}
                            isLoading={isGenerating}
                            className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl h-12 px-6 font-semibold uppercase tracking-widest text-[11px] shadow-lg shadow-eduGreen-900/20"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                            Generate Snapshot JSON
                        </Button>
                        <Button 
                            onClick={handleGenerateArchive}
                            isLoading={isArchiving}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 rounded-xl h-12 px-6 font-semibold uppercase tracking-widest text-[11px]"
                        >
                            <FileArchive className={`w-4 h-4 mr-2 ${isArchiving ? 'animate-bounce' : ''}`} />
                            Download Global Archive (ZIP/PDF)
                        </Button>
                    </div>
                </div>
            </div>

            {/* Restore Points History */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] p-8">
                <h2 className="text-base font-medium text-white mb-6">Recent Restore Points</h2>
                
                {isLoading ? (
                    <div className="py-12 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                    </div>
                ) : restorePoints.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">No snapshots found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {restorePoints.map((rp) => (
                            <div key={rp.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-eduGreen-500/10 rounded-xl flex items-center justify-center border border-eduGreen-500/20">
                                        <Database className="w-5 h-5 text-eduGreen-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            Restore Point - {new Date(rp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{new Date(rp.createdAt).toLocaleTimeString()}</span>
                                            <span className="text-[10px] text-zinc-600">•</span>
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{formatBytes(rp.sizeBytes)}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => forceDownload(rp.fileUrl, `LUCY_Snapshot_${rp.createdAt.split('T')[0]}.json`)}
                                    className="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Danger Zone: Restore */}
            <div className="bg-red-950/10 border border-red-900/30 rounded-[2rem] p-8">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-950/50 rounded-xl border border-red-900/50 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium text-white">Disaster Recovery (Restore)</h2>
                        <p className="text-sm text-zinc-400 mt-2 leading-relaxed max-w-2xl">
                            Upload a downloaded snapshot file (.json) to restore missing data. This will recreate deleted students, staff, classes, and grades. 
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
                                <div className={`flex items-center gap-3 px-4 h-12 rounded-xl border border-dashed transition-all ${uploadFile ? 'bg-eduGreen-950/20 border-eduGreen-500/50 text-eduGreen-400' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
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
                                className="h-12 px-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold uppercase tracking-widest text-[11px] shadow-lg shadow-red-900/20 shrink-0"
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
