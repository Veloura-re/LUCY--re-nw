"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Camera,
    CameraOff,
    RefreshCw,
    Upload,
    Keyboard,
    ShieldAlert,
    ShieldCheck,
    X,
    User,
    Phone,
    GraduationCap,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Flashlight
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import jsQR from "jsqr";

interface ScannedStudent {
    id: string;
    studentCode: string;
    firstName: string;
    lastName: string;
    fullName: string;
    photoUrl?: string | null;
    enrollmentStatus: string;
    gradeName: string;
    className: string;
    gender?: string;
    guardianName?: string | null;
    guardianPhone?: string | null;
    guardianRelation?: string | null;
    secondaryPhone?: string | null;
    enrolledAt?: string;
    dob?: string | null;
    school?: {
        id: string;
        name: string;
        logoUrl?: string | null;
    };
}

interface ScanResponse {
    success: boolean;
    status: "VERIFIED" | "CROSS_SCHOOL_MISMATCH" | "NOT_FOUND";
    error?: string;
    schoolMismatch?: boolean;
    student?: ScannedStudent;
    todayAttendance?: {
        status: string;
        date: string;
        reason?: string | null;
    } | null;
}

export function StudentQRScannerModal({
    isOpen: externalIsOpen,
    onClose: externalOnClose
}: {
    isOpen?: boolean;
    onClose?: () => void;
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

    const handleClose = () => {
        stopCamera();
        if (externalOnClose) {
            externalOnClose();
        } else {
            setInternalOpen(false);
        }
    };

    // Mode: "CAMERA" | "MANUAL" | "UPLOAD"
    const [mode, setMode] = useState<"CAMERA" | "MANUAL" | "UPLOAD">("CAMERA");
    const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);

    // Processing & Scan State
    const [verifying, setVerifying] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
    const [manualCode, setManualCode] = useState("");

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanLoopRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sound chime synthesis (No external assets)
    const playSuccessChime = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            const ctx = new AudioContextClass();
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = "sine";
            osc2.type = "sine";
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

            osc2.type = "sine";
            osc2.frequency.setValueAtTime(880, now);
            osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6

            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.36);
            osc2.stop(now + 0.36);
        } catch {
            // Audio context muted or unsupported
        }
    }, []);

    // Global listener to trigger scanner from any page/button
    useEffect(() => {
        const handleOpenEvent = () => {
            setInternalOpen(true);
            setScanResult(null);
            setMode("CAMERA");
        };

        window.addEventListener("lucy:open-scanner", handleOpenEvent);
        return () => window.removeEventListener("lucy:open-scanner", handleOpenEvent);
    }, []);

    // Stop active camera stream
    const stopCamera = useCallback(() => {
        if (scanLoopRef.current) {
            cancelAnimationFrame(scanLoopRef.current);
            scanLoopRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setTorchOn(false);
    }, []);

    // Send detected QR string or code to backend for multi-tenant verification
    const handleVerifyPayload = useCallback(
        async (rawPayload: string) => {
            if (!rawPayload || verifying) return;
            setVerifying(true);
            stopCamera();

            try {
                const response = await fetch("/api/school/students/scan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ qrData: rawPayload })
                });

                const data: ScanResponse = await response.json();

                if (response.ok && data.success) {
                    playSuccessChime();
                    setScanResult(data);
                } else if (response.status === 403 && data.status === "CROSS_SCHOOL_MISMATCH") {
                    setScanResult(data);
                } else {
                    setScanResult({
                        success: false,
                        status: "NOT_FOUND",
                        error: data.error || "Credential could not be verified in the institutional ledger."
                    });
                }
            } catch (err: any) {
                setScanResult({
                    success: false,
                    status: "NOT_FOUND",
                    error: err?.message || "Communication failure with credential ledger. Please retry."
                });
            } finally {
                setVerifying(false);
            }
        },
        [verifying, stopCamera, playSuccessChime]
    );

    // Frame scanner loop
    const scanFrame = useCallback(() => {
        if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
            scanLoopRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!canvas) {
            scanLoopRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            scanLoopRef.current = requestAnimationFrame(scanFrame);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Check Native BarcodeDetector first
        if ("BarcodeDetector" in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
            detector
                .detect(canvas)
                .then((barcodes: any[]) => {
                    if (barcodes.length > 0 && barcodes[0].rawValue) {
                        handleVerifyPayload(barcodes[0].rawValue);
                    } else {
                        scanLoopRef.current = requestAnimationFrame(scanFrame);
                    }
                })
                .catch(() => {
                    // Fallback to jsQR on native detection error
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert"
                    });
                    if (code && code.data) {
                        handleVerifyPayload(code.data);
                    } else {
                        scanLoopRef.current = requestAnimationFrame(scanFrame);
                    }
                });
            return;
        }

        // Fallback directly to jsQR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
            handleVerifyPayload(code.data);
        } else {
            scanLoopRef.current = requestAnimationFrame(scanFrame);
        }
    }, [handleVerifyPayload]);

    // Start video camera feed
    const startCamera = useCallback(async () => {
        stopCamera();
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError("Camera access is not supported in this browser environment.");
            return;
        }

        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: { ideal: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.setAttribute("playsinline", "true");
                await videoRef.current.play();
                setCameraActive(true);

                // Check torch capability
                const track = stream.getVideoTracks()[0];
                const capabilities = track.getCapabilities?.() as any;
                setHasTorch(!!capabilities?.torch);

                scanLoopRef.current = requestAnimationFrame(scanFrame);
            }
        } catch (err: any) {
            console.error("Camera activation error:", err);
            setCameraError(
                err.name === "NotAllowedError"
                    ? "Camera permission denied. Please allow camera access in browser permissions or enter code manually."
                    : "Unable to connect to camera sensor. Ensure no other application is using the camera."
            );
            setCameraActive(false);
        }
    }, [facingMode, stopCamera, scanFrame]);

    // Toggle torch
    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const track = streamRef.current.getVideoTracks()[0];
        try {
            await (track as any).applyConstraints({
                advanced: [{ torch: !torchOn }]
            });
            setTorchOn(!torchOn);
        } catch (e) {
            console.error("Torch toggle error:", e);
        }
    };

    // Toggle camera between front and environment
    const toggleFacingMode = () => {
        setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    };

    // Handle uploaded badge image file
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    handleVerifyPayload(code.data);
                } else {
                    setScanResult({
                        success: false,
                        status: "NOT_FOUND",
                        error: "No clear QR code detected in the uploaded image. Please ensure the badge code is clearly visible."
                    });
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Handle manual code submission
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleVerifyPayload(manualCode.trim());
    };

    // Reset scanner for next badge
    const handleResetScanner = () => {
        setScanResult(null);
        setManualCode("");
        if (mode === "CAMERA") {
            startCamera();
        }
    };

    // Lifecycle trigger when modal opens/closes or mode changes
    useEffect(() => {
        if (isOpen && mode === "CAMERA" && !scanResult && !verifying) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, mode, scanResult, verifying, startCamera, stopCamera]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-xl w-[95vw] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl text-zinc-900 dark:text-white">
                <DialogTitle className="sr-only">Student ID Credential Scanner</DialogTitle>
                <DialogDescription className="sr-only">
                    Institutional QR code scanner for verified student credential authentication.
                </DialogDescription>

                {/* Header Bar */}
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-eduGreen-600/10 dark:bg-eduGreen-500/10 border border-eduGreen-500/20 flex items-center justify-center text-eduGreen-600 dark:text-eduGreen-400">
                            <Camera className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                                Student Credential Scanner
                            </h2>
                            <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
                                Multi-Tenant Secure Verification Node
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        aria-label="Close scanner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Sub-Tabs: Camera | Manual Code | Upload Badge */}
                {!scanResult && !verifying && (
                    <div className="px-6 pt-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3">
                        <button
                            type="button"
                            onClick={() => {
                                setMode("CAMERA");
                                setCameraError(null);
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                mode === "CAMERA"
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md"
                                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                        >
                            <Camera className="w-3.5 h-3.5" />
                            Live Camera
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                stopCamera();
                                setMode("MANUAL");
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                mode === "MANUAL"
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md"
                                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                        >
                            <Keyboard className="w-3.5 h-3.5" />
                            Manual Code
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                stopCamera();
                                setMode("UPLOAD");
                                fileInputRef.current?.click();
                            }}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                mode === "UPLOAD"
                                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md"
                                    : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload Badge
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Viewport Content */}
                <div className="p-6">
                    {/* VERIFYING SPINNER */}
                    {verifying && (
                        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 rounded-full border-2 border-eduGreen-500/20 animate-ping" />
                                <div className="w-full h-full rounded-full border-2 border-t-eduGreen-500 border-r-transparent border-b-eduGreen-500/30 border-l-transparent animate-spin" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                                    Verifying Credential
                                </p>
                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Querying Multi-Tenant Institutional Ledger
                                </p>
                            </div>
                        </div>
                    )}

                    {/* SCAN RESULTS DISPLAY */}
                    {!verifying && scanResult && (
                        <div className="space-y-6">
                            {/* CASE 1: SUCCESSFUL MULTI-TENANT VERIFICATION */}
                            {scanResult.success && scanResult.student && (
                                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-900">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-eduGreen-500" />
                                            <span className="text-xs font-bold uppercase tracking-widest text-eduGreen-600 dark:text-eduGreen-400">
                                                Identity Confirmed
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-eduGreen-500/10 border border-eduGreen-500/20 text-[9px] font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest">
                                            <span className="w-1.5 h-1.5 rounded-full bg-eduGreen-500 animate-pulse" />
                                            Active Standing
                                        </div>
                                    </div>

                                    {/* Student Card Hub Preview */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5">
                                        {/* Avatar Photo */}
                                        <div className="w-24 h-24 rounded-2xl bg-zinc-200 dark:bg-zinc-800 border-2 border-eduGreen-500/30 overflow-hidden relative shadow-lg shrink-0">
                                            {scanResult.student.photoUrl ? (
                                                <Image
                                                    src={scanResult.student.photoUrl}
                                                    alt={scanResult.student.fullName}
                                                    fill
                                                    sizes="96px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-500 dark:text-zinc-400">
                                                    {scanResult.student.firstName[0]}
                                                    {scanResult.student.lastName[0]}
                                                </div>
                                            )}
                                        </div>

                                        {/* Student Details */}
                                        <div className="flex-1 text-center sm:text-left space-y-1.5">
                                            <h3 className="text-xl font-bold uppercase tracking-tight text-zinc-900 dark:text-white">
                                                {scanResult.student.fullName}
                                            </h3>
                                            <p className="text-[10px] font-mono font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                ID Code:{" "}
                                                <span className="text-zinc-900 dark:text-white font-bold">
                                                    {scanResult.student.studentCode}
                                                </span>
                                            </p>

                                            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <span className="px-2.5 py-1 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-[10px] font-medium uppercase text-zinc-800 dark:text-zinc-200">
                                                    {scanResult.student.gradeName} • {scanResult.student.className}
                                                </span>
                                                {scanResult.todayAttendance && (
                                                    <span
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                            scanResult.todayAttendance.status === "PRESENT"
                                                                ? "bg-eduGreen-500/10 text-eduGreen-500 border border-eduGreen-500/20"
                                                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                        }`}
                                                    >
                                                        Today: {scanResult.todayAttendance.status}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guardian Emergency Info */}
                                    <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-900 rounded-2xl p-4 flex items-center justify-between text-xs">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                Guardian Registry
                                            </p>
                                            <p className="font-bold text-zinc-900 dark:text-white uppercase">
                                                {scanResult.student.guardianName || "No Guardian Assigned"}
                                                {scanResult.student.guardianRelation && (
                                                    <span className="text-zinc-500 font-normal ml-1">
                                                        ({scanResult.student.guardianRelation})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {scanResult.student.guardianPhone && (
                                            <a
                                                href={`tel:${scanResult.student.guardianPhone}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-eduGreen-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-eduGreen-500 transition-colors"
                                            >
                                                <Phone className="w-3 h-3" />
                                                {scanResult.student.guardianPhone}
                                            </a>
                                        )}
                                    </div>

                                    {/* Modal Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                        <Button
                                            type="button"
                                            onClick={handleResetScanner}
                                            className="flex-1 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest h-12 shadow-lg"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Scan Next ID
                                        </Button>

                                        <Link
                                            href={`/dashboard/students/${scanResult.student.id}`}
                                            onClick={handleClose}
                                            className="inline-flex items-center justify-center flex-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-800 rounded-2xl font-bold uppercase text-[10px] tracking-widest h-12 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            View Full Profile
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* CASE 2: CROSS-SCHOOL MISMATCH DEFENSE */}
                            {scanResult.status === "CROSS_SCHOOL_MISMATCH" && (
                                <div className="space-y-5 text-center py-4 animate-in fade-in duration-200">
                                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                                        <ShieldAlert className="w-8 h-8" />
                                    </div>

                                    <div className="space-y-2 max-w-md mx-auto">
                                        <h3 className="text-base font-bold uppercase tracking-wider text-amber-500">
                                            Cross-Institution Scan Rejected
                                        </h3>
                                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            This student badge is registered to a different educational institution.
                                            In accordance with multi-tenant privacy mandates, foreign student
                                            records cannot be accessed or altered.
                                        </p>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="button"
                                            onClick={handleResetScanner}
                                            className="bg-zinc-900 text-white dark:bg-white dark:text-black rounded-2xl font-bold uppercase text-[10px] tracking-widest h-11 px-8"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                            Scan Another Badge
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* CASE 3: NOT FOUND / UNRECOGNIZED BADGE */}
                            {scanResult.status === "NOT_FOUND" && (
                                <div className="space-y-5 text-center py-4 animate-in fade-in duration-200">
                                    <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mx-auto">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>

                                    <div className="space-y-2 max-w-md mx-auto">
                                        <h3 className="text-base font-bold uppercase tracking-wider text-red-500">
                                            Credential Not Found
                                        </h3>
                                        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                            {scanResult.error ||
                                                "The scanned code was not found in this institution's ledger. Verify that the badge QR code is intact and belonging to an enrolled student."}
                                        </p>
                                    </div>

                                    <div className="flex justify-center gap-3 pt-4">
                                        <Button
                                            type="button"
                                            onClick={handleResetScanner}
                                            className="bg-zinc-900 text-white dark:bg-white dark:text-black rounded-2xl font-bold uppercase text-[10px] tracking-widest h-11 px-6"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 mr-2" />
                                            Retry Scanner
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setScanResult(null);
                                                setMode("MANUAL");
                                            }}
                                            variant="outline"
                                            className="rounded-2xl font-bold uppercase text-[10px] tracking-widest h-11 px-6"
                                        >
                                            Enter Code Manually
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* LIVE CAMERA VIEWFINDER */}
                    {!verifying && !scanResult && mode === "CAMERA" && (
                        <div className="space-y-4">
                            {cameraError ? (
                                <div className="py-12 px-6 rounded-3xl bg-red-500/5 border border-red-500/20 text-center space-y-4">
                                    <CameraOff className="w-10 h-10 text-red-500 mx-auto" />
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-red-500">
                                            Camera Sensor Inactive
                                        </h3>
                                        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                                            {cameraError}
                                        </p>
                                    </div>
                                    <div className="flex justify-center gap-2 pt-2">
                                        <Button
                                            type="button"
                                            onClick={startCamera}
                                            className="bg-zinc-900 text-white dark:bg-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 px-4"
                                        >
                                            Retry Camera
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => setMode("MANUAL")}
                                            variant="outline"
                                            className="rounded-xl text-[10px] font-bold uppercase tracking-widest h-9 px-4"
                                        >
                                            Enter Code
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative aspect-square max-w-sm mx-auto rounded-3xl overflow-hidden bg-black border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
                                    <video
                                        ref={videoRef}
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Scanning Reticle & Laser */}
                                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                        <div className="relative w-56 h-56 border-2 border-dashed border-eduGreen-500/40 rounded-2xl">
                                            {/* Corner brackets */}
                                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-eduGreen-500 rounded-tl-lg" />
                                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-eduGreen-500 rounded-tr-lg" />
                                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-eduGreen-500 rounded-bl-lg" />
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-eduGreen-500 rounded-br-lg" />

                                            {/* Sweeping laser animation */}
                                            <div
                                                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-eduGreen-400 to-transparent shadow-[0_0_12px_#3BD68D] animate-scanner-laser"
                                            />
                                        </div>
                                    </div>

                                    {/* Camera Overlay Controls */}
                                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                                        <button
                                            type="button"
                                            onClick={toggleFacingMode}
                                            className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-black/80 transition-colors"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Switch Lens
                                        </button>

                                        {hasTorch && (
                                            <button
                                                type="button"
                                                onClick={toggleTorch}
                                                className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                                                    torchOn
                                                        ? "bg-amber-500 text-black border-amber-400"
                                                        : "bg-black/60 border-white/10 text-white hover:bg-black/80"
                                                }`}
                                            >
                                                <Flashlight className="w-3 h-3" />
                                                Torch
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <p className="text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                                Align student badge QR code within the frame
                            </p>
                        </div>
                    )}

                    {/* MANUAL INPUT TAB */}
                    {!verifying && !scanResult && mode === "MANUAL" && (
                        <form onSubmit={handleManualSubmit} className="space-y-4 py-6 max-w-sm mx-auto">
                            <div className="space-y-1.5 text-center">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                                    Lookup By Student Code
                                </h3>
                                <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Enter alphanumeric student identity code
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Input
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="e.g. STU-1029 or UUID"
                                    className="h-12 rounded-2xl font-mono text-center text-sm font-bold uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800"
                                    autoFocus
                                />

                                <Button
                                    type="submit"
                                    disabled={!manualCode.trim()}
                                    className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest h-12 shadow-lg disabled:opacity-50"
                                >
                                    Lookup Credential
                                </Button>
                            </div>
                        </form>
                    )}

                    {/* UPLOAD BADGE PHOTO TAB */}
                    {!verifying && !scanResult && mode === "UPLOAD" && (
                        <div className="py-8 text-center space-y-4 max-w-sm mx-auto">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 hover:border-eduGreen-500 cursor-pointer transition-colors space-y-2 bg-zinc-50/50 dark:bg-zinc-900/20"
                            >
                                <Upload className="w-8 h-8 text-zinc-400 mx-auto" />
                                <p className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                                    Select Badge Photo
                                </p>
                                <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
                                    Supports PNG, JPG, or WebP files
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>

            <style jsx global>{`
                @keyframes scanLaser {
                    0% {
                        top: 4%;
                        opacity: 0.8;
                    }
                    50% {
                        top: 94%;
                        opacity: 1;
                    }
                    100% {
                        top: 4%;
                        opacity: 0.8;
                    }
                }
                .animate-scanner-laser {
                    animation: scanLaser 2.4s ease-in-out infinite;
                }
            `}</style>
        </Dialog>
    );
}
