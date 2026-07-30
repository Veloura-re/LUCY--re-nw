"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ShieldCheck, Phone, User, Calendar, MapPin, Sparkles, RefreshCcw } from "lucide-react";
import QRCode from "react-qr-code";
import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { cn, calculateAge } from "@/lib/utils";
import Image from "next/image";

interface IDCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    type: "STUDENT" | "TEACHER";
    schoolAddress?: string;
    schoolName?: string;
    schoolLogo?: string;
}

/**
 * IDCardModal - Landscape Orientation
 * UI: 500px x 320px
 * Print: 85.60mm x 53.98mm (ID-1 Standard Landscape)
 */
export function IDCardModal({ isOpen, onClose, user, type, schoolName = "LUCY ACADEMY", schoolAddress, schoolLogo }: IDCardModalProps) {
    const componentRef = useRef<HTMLDivElement>(null);
    const [isFlipped, setIsFlipped] = useState(false);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: user ? `${user.firstName || user.name}_ID_Card` : 'ID_Card',
    });

    if (!user) return null;

    const fullName = type === "STUDENT" ? `${user.firstName} ${user.lastName}` : user.name;
    const code = type === "STUDENT" ? user.studentCode : user.teacherCode;
    const roleTitle = type === "STUDENT" ? "Student Identity" : "Faculty Identity";
    const initial = fullName ? fullName[0] : "?";
    const age = type === "STUDENT" ? calculateAge(user.dob) : null;

    const qrValue = typeof window !== 'undefined' ? `${window.location.origin}/verify/student/${user.id}` : "";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[600px] bg-transparent border-0 shadow-none p-0 flex flex-col items-center outline-none">

                {/* ID CARD UI CONTAINER (500px x 320px Landscape) */}
                <div
                    className="relative w-[500px] h-[320px] cursor-pointer group perspective-1000"
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    <motion.div
                        className="w-full h-full relative preserve-3d"
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* FRONT SIDE (UI Landscape) */}
                        <div className="absolute inset-0 w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                            <div className="w-full h-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-[20px] overflow-hidden relative shadow-2xl flex flex-col">
                                {/* Header */}
                                <div className="px-6 py-4 bg-gradient-to-r from-eduGreen-950/30 to-transparent flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900/50">
                                    <div className="flex items-center gap-2">
                                        {schoolLogo ? (
                                            <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 shadow-[0_0_10px_rgba(59,214,141,0.3)] relative">
                                                <Image src={schoolLogo} className="object-contain p-0.5" alt="Logo" fill sizes="24px" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-lg bg-eduGreen-600 flex items-center justify-center shadow-[0_0_10px_rgba(59,214,141,0.3)]">
                                                <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
                                            </div>
                                        )}
                                        <span className="text-[10px] font-medium tracking-[0.2em] text-zinc-900 dark:text-white uppercase italic">{schoolName}</span>
                                    </div>
                                    <div className="px-3 py-0.5 rounded-full bg-eduGreen-950/20 border border-eduGreen-900/20 text-[8px] font-medium text-eduGreen-500 uppercase tracking-widest">
                                        {roleTitle}
                                    </div>
                                </div>

                                {/* Content Body */}
                                <div className="flex-1 p-6 flex items-center gap-8">
                                    {/* Photo Area */}
                                    <div className="w-32 h-32 rounded-[2rem] p-1 bg-gradient-to-tr from-eduGreen-600 to-slate-200 dark:to-zinc-800 shadow-2xl shrink-0">
                                        <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-slate-50 dark:bg-zinc-950 relative border border-slate-200 dark:border-zinc-900">
                                            {user.photoUrl ? (
                                                <Image src={user.photoUrl} alt="ID" className="object-cover" fill sizes="128px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-4xl font-medium text-slate-400 dark:text-zinc-800">
                                                    {initial}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Area */}
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-medium text-slate-900 dark:text-white tracking-tight uppercase leading-tight">{fullName}</h2>
                                            <p className="text-[9px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-widest">Entity Identification Code: <span className="text-slate-900 dark:text-white font-mono">{code || "--------"}</span></p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-zinc-900/50 pt-4">
                                            {type === "STUDENT" ? (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Level / Class</p>
                                                        <p className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 uppercase">{user.class?.grade?.name || "N/A"} • {user.class?.name || "N/A"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Enrolled</p>
                                                        <p className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 uppercase">{user.enrolledAt ? new Date(user.enrolledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : "N/A"}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="space-y-1">
                                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Department / Role</p>
                                                        <p className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 uppercase">Faculty • {user.role || "TEACHER"}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Joined</p>
                                                        <p className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 uppercase">{user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : "N/A"}</p>
                                                    </div>
                                                </>
                                            )}
                                            <div className="space-y-1">
                                                <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Gender</p>
                                                <p className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 uppercase">{user.gender || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Bar */}
                                <div className="px-6 py-3 bg-slate-100/50 dark:bg-zinc-900/30 flex justify-between items-center border-t border-slate-200 dark:border-zinc-900/50">
                                    <div className="flex items-center gap-1 opacity-20">
                                        <ShieldCheck className="w-3 h-3 text-slate-900 dark:text-white" />
                                        <span className="text-[6px] font-medium text-slate-900 dark:text-white uppercase tracking-[0.3em]">Neural Verification Active</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 animate-pulse" />
                                        <span className="text-[8px] font-medium text-eduGreen-500 uppercase tracking-widest">Standing: Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BACK SIDE (UI Landscape) */}
                        <div className="absolute inset-0 w-full h-full backface-hidden" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                            <div className="w-full h-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 rounded-[20px] overflow-hidden relative shadow-2xl flex flex-row p-6 items-center gap-8">
                                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-slate-200/50 dark:from-zinc-900/50 to-transparent opacity-50" />

                                {/* Guardian / Contact Area */}
                                <div className="relative z-10 flex-1 space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-900 pb-3">
                                        <User className="w-4 h-4 text-eduGreen-600" />
                                        <h3 className="text-[10px] font-medium text-slate-900 dark:text-white uppercase tracking-[0.2em]">Contact & Lifecycle</h3>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">{type === "STUDENT" ? "Guardian Registry" : "Qualification / Title"}</p>
                                        <p className="text-xs font-medium text-slate-900 dark:text-white uppercase truncate">
                                            {type === "STUDENT" 
                                                ? <>{user.guardianName || "N/A"} • <span className="text-eduGreen-500 uppercase">{user.guardianRelation || "Guardian"}</span></>
                                                : <span className="text-eduGreen-500 uppercase">{user.qualification || "Faculty Member"}</span>
                                            }
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Gender</p>
                                            <p className="text-[10px] font-medium text-slate-900 dark:text-white uppercase">{user.gender || "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Enrolled / Joined</p>
                                            <p className="text-[10px] font-medium text-slate-900 dark:text-white uppercase">{(type === 'STUDENT' ? user.enrolledAt : user.createdAt) ? new Date(type === 'STUDENT' ? user.enrolledAt : user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : "---"}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest">Expires</p>
                                            <p className="text-[10px] font-medium text-eduGreen-500 uppercase">{(type === 'STUDENT' ? user.enrolledAt : user.createdAt) ? (() => { const d = new Date(type === 'STUDENT' ? user.enrolledAt : user.createdAt); d.setMonth(d.getMonth() + 10); return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); })() : "---"}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-200 dark:border-zinc-900/50">
                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-1">{type === "STUDENT" ? "Emergency Uplinks" : "Contact Number"}</p>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-xs">
                                                <Phone className="w-3 h-3 text-eduGreen-600" />
                                                {type === "STUDENT" ? (user.guardianPhone || "N/A") : (user.phone || "N/A")}
                                            </div>
                                            {type === "STUDENT" && user.secondaryPhone && (
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-white/60 font-medium text-[10px] pl-5 border-l border-slate-200 dark:border-zinc-800">
                                                    {user.secondaryPhone}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* QR Section Area */}
                                <div className="relative z-10 w-48 flex flex-col items-center gap-4 shrink-0 border-l border-slate-200 dark:border-zinc-900/50 pl-8">
                                    <div className="relative p-3 bg-white rounded-[15px] shadow-[0_0_40px_rgba(255,255,255,0.05)] group/qr hover:scale-110 transition-transform duration-300">
                                        <QRCode
                                            value={qrValue}
                                            size={140}
                                            level="H"
                                            className="rounded-lg"
                                        />
                                    </div>
                                    <div className="text-center space-y-0.5">
                                        <p className="text-[7px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em]">System Validation</p>
                                        <p className="text-[5px] font-medium text-slate-500 dark:text-zinc-700 uppercase tracking-[0.1em]">Cloud Synchronized</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="absolute -bottom-10 left-0 right-0 text-center opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <p className="text-[8px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                            <RefreshCcw className="w-3 h-3 animate-spin" style={{ animationDuration: '8s' }} />
                            Tap to Flip Identity
                        </p>
                    </div>
                </div>

                <div className="absolute -left-[9999px] top-0 overflow-hidden" aria-hidden="true">
                    <div ref={componentRef} className="print:block bg-white text-black p-[10mm] m-0 overflow-hidden">
                        <div className="flex flex-col gap-[10mm]">
                            {/* Front Side Print Landscape */}
                            <div className="relative w-[323.5px] h-[204px] rounded-[12px] overflow-hidden flex flex-col bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-900" style={{ width: '85.60mm', height: '53.98mm' }}>
                                {/* Pattern Overlay */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-eduGreen-900/40 via-transparent to-transparent opacity-60" />
                                <div className="absolute bottom-0 inset-x-0 h-[10mm] bg-gradient-to-t from-slate-200 dark:from-black to-transparent opacity-40" />

                                <div className="relative z-10 h-[10mm] bg-slate-100/40 dark:bg-black/40 flex items-center justify-between px-[5mm] border-b border-slate-200 dark:border-white/5">
                                    <div className="flex items-center gap-1.5">
                                        {schoolLogo ? (
                                            <div className="w-[3.5mm] h-[3.5mm] rounded-sm bg-slate-50 dark:bg-black overflow-hidden flex items-center justify-center relative">
                                                <Image src={schoolLogo} alt="Logo" className="object-contain" fill sizes="20px" />
                                            </div>
                                        ) : (
                                            <div className="w-[3.5mm] h-[3.5mm] rounded-sm bg-eduGreen-600 flex items-center justify-center">
                                                <Sparkles className="w-[2.5mm] h-[2.5mm] text-zinc-900 dark:text-white" />
                                            </div>
                                        )}
                                        <span className="text-[7pt] font-medium uppercase tracking-[0.2em] italic">{schoolName}</span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[5pt] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                        {roleTitle}
                                    </span>
                                </div>

                                <div className="relative z-10 flex-1 flex flex-row items-center p-[5mm] gap-[6mm]">
                                    <div className="w-[22mm] h-[22mm] rounded-[4mm] p-[0.3mm] bg-gradient-to-tr from-eduGreen-600 to-slate-200 dark:to-zinc-700 shadow-xl shrink-0">
                                        <div className="w-full h-full rounded-[3.8mm] overflow-hidden bg-slate-50 dark:bg-black relative border border-slate-200 dark:border-white/5">
                                            {user.photoUrl ? (
                                                <Image src={user.photoUrl} alt="Photo" className="object-cover" fill sizes="100px" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[22pt] font-medium text-slate-400 dark:text-zinc-800">{initial}</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-[3mm]">
                                        <h2 className="text-[13pt] font-medium uppercase tracking-tight leading-tight">{fullName}</h2>
                                        <div className="grid grid-cols-2 gap-[2mm] border-t border-slate-200 dark:border-white/5 pt-[3mm]">
                                            <div>
                                                <p className="text-[4.5pt] font-medium uppercase text-slate-400 dark:text-zinc-500 tracking-widest mb-0.5">ID Frequency</p>
                                                <p className="text-[7.5pt] font-medium text-slate-900 dark:text-white font-mono">{code}</p>
                                            </div>
                                            <div>
                                                <p className="text-[4.5pt] font-medium uppercase text-slate-400 dark:text-zinc-500 tracking-widest mb-0.5">{type === "STUDENT" ? "Classification" : "Department / Role"}</p>
                                                <p className="text-[6pt] font-medium text-slate-600 dark:text-zinc-300 uppercase truncate">
                                                    {type === "STUDENT" 
                                                        ? `${user.class?.grade?.name || "N/A"} • ${user.class?.name || "N/A"}`
                                                        : `Faculty • ${user.role || "TEACHER"}`
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[4.5pt] font-medium uppercase text-slate-400 dark:text-zinc-500 tracking-widest mb-0.5">Gender</p>
                                                <p className="text-[6pt] font-medium text-slate-600 dark:text-zinc-300 uppercase truncate">{user.gender || "N/A"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 h-[6mm] bg-slate-100/40 dark:bg-black/40 border-t border-slate-200 dark:border-white/5 flex items-center justify-between px-[5mm]">
                                    <div className="flex items-center gap-1 opacity-40">
                                        <ShieldCheck className="w-[3mm] h-[3mm]" />
                                        <span className="text-[4.5pt] font-medium uppercase tracking-[0.2em]">Verified Registry Interface</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-[1mm] h-[1mm] rounded-full bg-eduGreen-500 shadow-[0_0_5px_#3BD68D]" />
                                        <span className="text-[5pt] font-medium text-eduGreen-500 uppercase">Secured</span>
                                    </div>
                                </div>
                            </div>

                            {/* Back Side Print Landscape */}
                            <div className="relative w-[323.5px] h-[204px] rounded-[12px] overflow-hidden flex flex-row bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-900 p-[6mm] items-center gap-[6mm]" style={{ width: '85.60mm', height: '53.98mm' }}>
                                {/* Pattern Overlay */}
                                <div className="absolute inset-x-0 top-0 h-[15mm] bg-gradient-to-b from-white/5 to-transparent opacity-60" />

                                <div className="relative z-10 flex-1 space-y-[5mm]">
                                    <div className="border-b border-slate-200 dark:border-white/5 pb-[3mm]">
                                        <div className="flex items-center gap-1.5 mb-[1.5mm]">
                                            <User className="w-[3mm] h-[3mm] text-eduGreen-500" />
                                            <h3 className="text-[6pt] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-400">{type === "STUDENT" ? "Guardian Hub" : "Qualification / Title"}</h3>
                                        </div>
                                        <p className="text-[9pt] font-medium uppercase leading-none">
                                            {type === "STUDENT" ? (user.guardianName || "N/A") : (user.qualification || "Faculty Member")}
                                        </p>
                                        <div className="flex justify-between items-end mt-1">
                                            <p className="text-[5pt] font-medium text-eduGreen-500 uppercase tracking-widest">
                                                {type === "STUDENT" ? (user.guardianRelation || "Authorized Guardian") : (user.role || "TEACHER")}
                                            </p>
                                            <div className="text-right">
                                                <p className="text-[4pt] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Expires</p>
                                                <p className="text-[6pt] font-medium text-slate-900 dark:text-white leading-none mt-0.5">{(type === 'STUDENT' ? user.enrolledAt : user.createdAt) ? (() => { const d = new Date(type === 'STUDENT' ? user.enrolledAt : user.createdAt); d.setMonth(d.getMonth() + 10); return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); })() : "---"}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-[2mm] bg-slate-50 dark:bg-white/5 p-[2.5mm] rounded-[2.5mm] border border-slate-200 dark:border-white/5">
                                        <p className="text-[4.5pt] font-medium uppercase text-slate-400 dark:text-zinc-500 tracking-widest">{type === "STUDENT" ? "Emergency Uplinks" : "Contact Number"}</p>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-[8.5pt] font-medium text-slate-900 dark:text-white">{type === "STUDENT" ? (user.guardianPhone || "N/A") : (user.phone || "N/A")}</p>
                                            {type === "STUDENT" && user.secondaryPhone && (
                                                <p className="text-[6pt] font-medium text-slate-500 dark:text-white/50 pl-[3mm] border-l border-slate-200 dark:border-white/10">{user.secondaryPhone}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 w-[35mm] flex flex-col items-center shrink-0 border-l border-slate-200 dark:border-white/5 pl-[6mm] gap-[3mm]">
                                    <div className="p-[2.5mm] bg-white rounded-[4mm] shadow-2xl">
                                        <QRCode value={qrValue} size={110} level="H" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[5.5pt] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-500">Validation Protocol</p>
                                        <p className="text-[4pt] font-medium text-slate-500 dark:text-zinc-700 uppercase tracking-widest">Cloud Encrypted Access</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-12 mb-8">
                    <Button onClick={handlePrint} className="bg-slate-900 text-zinc-900 dark:text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 h-12 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-2xl">
                        <Printer className="w-4 h-4 mr-2" /> Print Credentials
                    </Button>
                    <Button variant="outline" onClick={onClose} className="border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white h-12 px-8 rounded-2xl font-medium text-[10px] uppercase tracking-widest">
                        Close
                    </Button>
                </div>
            </DialogContent>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                @media print {
                    @page {
                        size: 85.60mm 53.98mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </Dialog>
    );
}

