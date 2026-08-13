"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, LogOut, Trash2, CheckCircle2, XCircle, ShieldAlert, Zap, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "info" | "logout";
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "info",
    isLoading = false,
}: ConfirmationModalProps) {

    const getIconConfig = () => {
        switch (variant) {
            case "danger":
                return {
                    icon: Trash2,
                    bgColor: "bg-red-50 dark:bg-red-950/30",
                    borderColor: "border-red-200 dark:border-red-900/50",
                    iconColor: "text-red-600 dark:text-red-500",
                    glowColor: "shadow-[0_0_40px_rgba(239,68,68,0.15)]"
                };
            case "warning":
                return {
                    icon: AlertTriangle,
                    bgColor: "bg-amber-50 dark:bg-amber-950/30",
                    borderColor: "border-amber-200 dark:border-amber-900/50",
                    iconColor: "text-amber-600 dark:text-amber-500",
                    glowColor: "shadow-[0_0_40px_rgba(245,158,11,0.15)]"
                };
            case "logout":
                return {
                    icon: LogOut,
                    bgColor: "bg-red-50 dark:bg-red-950/30",
                    borderColor: "border-red-200 dark:border-red-900/50",
                    iconColor: "text-red-600 dark:text-red-500",
                    glowColor: "shadow-[0_0_40px_rgba(239,68,68,0.15)]"
                };
            default:
                return {
                    icon: ShieldAlert,
                    bgColor: "bg-eduGreen-50 dark:bg-eduGreen-950/30",
                    borderColor: "border-eduGreen-200 dark:border-eduGreen-900/50",
                    iconColor: "text-eduGreen-600 dark:text-eduGreen-500",
                    glowColor: "shadow-[0_0_40px_rgba(20,184,115,0.15)]"
                };
        }
    };

    const getConfirmButtonStyle = () => {
        switch (variant) {
            case "danger":
                return "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-950/50";
            case "warning":
                return "bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-950/50";
            case "logout":
                return "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-950/50";
            default:
                return "bg-gradient-to-b from-eduGreen-500 to-eduGreen-600 hover:from-eduGreen-400 hover:to-eduGreen-500 text-white shadow-lg shadow-eduGreen-950/50";
        }
    };

    const iconConfig = getIconConfig();
    const IconComponent = iconConfig.icon;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className={cn("max-w-sm sm:max-w-md", iconConfig.glowColor)}>
                <DialogHeader>
                    {/* Icon Container */}
                    <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto",
                        "border-2 transition-all duration-300",
                        iconConfig.bgColor,
                        iconConfig.borderColor
                    )}>
                        <IconComponent className={cn("w-10 h-10", iconConfig.iconColor)} />
                    </div>

                    <DialogTitle className="text-2xl font-medium tracking-tight text-slate-900 dark:text-white uppercase mb-3">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 h-14 rounded-2xl font-medium text-sm text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900/50 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={cn(
                            "flex-1 h-14 rounded-2xl font-medium text-sm transition-all duration-200 active:scale-95",
                            getConfirmButtonStyle()
                        )}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4 animate-pulse" />
                                Processing...
                            </span>
                        ) : confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Premium Alert Modal for notifications
interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    variant?: "info" | "success" | "error";
}

export function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    variant = "info"
}: AlertModalProps) {

    const getConfig = () => {
        switch (variant) {
            case "success":
                return {
                    icon: CheckCircle2,
                    bgColor: "bg-eduGreen-50 dark:bg-eduGreen-950/30",
                    borderColor: "border-eduGreen-200 dark:border-eduGreen-900/50",
                    iconColor: "text-eduGreen-600 dark:text-eduGreen-500",
                    glowColor: "shadow-[0_0_60px_rgba(20,184,115,0.2)]",
                    buttonStyle: "bg-gradient-to-b from-eduGreen-500 to-eduGreen-600 hover:from-eduGreen-400 hover:to-eduGreen-500 text-white shadow-lg shadow-eduGreen-950/50"
                };
            case "error":
                return {
                    icon: XCircle,
                    bgColor: "bg-red-50 dark:bg-red-950/30",
                    borderColor: "border-red-200 dark:border-red-900/50",
                    iconColor: "text-red-600 dark:text-red-500",
                    glowColor: "shadow-[0_0_60px_rgba(239,68,68,0.2)]",
                    buttonStyle: "bg-gradient-to-b from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 hover:from-zinc-300 hover:to-zinc-400 dark:hover:from-zinc-600 dark:hover:to-zinc-700 text-zinc-900 dark:text-white shadow-lg shadow-zinc-950/50"
                };
            default:
                return {
                    icon: Info,
                    bgColor: "bg-blue-50 dark:bg-blue-950/30",
                    borderColor: "border-blue-200 dark:border-blue-900/50",
                    iconColor: "text-blue-600 dark:text-blue-500",
                    glowColor: "shadow-[0_0_60px_rgba(59,130,246,0.2)]",
                    buttonStyle: "bg-gradient-to-b from-zinc-800 to-zinc-900 dark:from-zinc-200 dark:to-white hover:from-zinc-700 hover:to-zinc-800 dark:hover:from-white dark:hover:to-zinc-100 text-white dark:text-black shadow-lg"
                };
        }
    };

    const config = getConfig();
    const IconComponent = config.icon;

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className={cn("max-w-sm sm:max-w-md", config.glowColor)}>
                <DialogHeader>
                    {/* Icon Container */}
                    <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto",
                        "border-2 transition-all duration-300",
                        config.bgColor,
                        config.borderColor
                    )}>
                        <IconComponent className={cn("w-10 h-10", config.iconColor)} />
                    </div>

                    <DialogTitle className="text-xl font-medium tracking-tight text-slate-900 dark:text-white uppercase mb-3">
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
                        {message}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-8">
                    <Button
                        onClick={onClose}
                        className={cn(
                            "w-full h-14 rounded-2xl font-medium text-sm transition-all duration-200 active:scale-95",
                            config.buttonStyle
                        )}
                    >
                        Acknowledged
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Input Modal for collecting user input
interface InputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    description?: string;
    placeholder?: string;
    defaultValue?: string;
    inputType?: string;
    confirmText?: string;
    footerElement?: React.ReactNode;
}

export function InputModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    placeholder = "",
    defaultValue = "",
    inputType = "text",
    confirmText = "Confirm",
    footerElement
}: InputModalProps) {
    const [value, setValue] = React.useState(defaultValue);

    React.useEffect(() => {
        if (isOpen) setValue(defaultValue);
    }, [isOpen, defaultValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
            <DialogContent className="max-w-sm sm:max-w-md shadow-[0_0_60px_rgba(20,184,115,0.15)]">
                <DialogHeader>
                    <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto",
                        "border-2 transition-all duration-300",
                        "bg-eduGreen-50 dark:bg-eduGreen-950/30 border-eduGreen-900/50"
                    )}>
                        <Zap className="w-10 h-10 text-eduGreen-500" />
                    </div>

                    <DialogTitle className="text-xl font-medium tracking-tight text-slate-900 dark:text-white uppercase mb-3">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-6">
                    <input
                        type={inputType}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full h-14 bg-white dark:bg-zinc-900/80 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl px-5 text-slate-900 dark:text-white font-medium text-sm focus:border-eduGreen-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                        autoFocus
                    />

                    {footerElement}

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl font-medium text-sm text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900/50 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-14 rounded-2xl font-medium text-sm transition-all duration-200 active:scale-95 bg-gradient-to-b from-eduGreen-500 to-eduGreen-600 hover:from-eduGreen-400 hover:to-eduGreen-500 text-zinc-900 dark:text-white shadow-lg shadow-eduGreen-950/50"
                        >
                            {confirmText}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// Payment Modal for issuing or recording payments
interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { amount: number; method: string; note: string }) => void;
    title: string;
    description?: string;
    confirmText?: string;
    defaultAmount?: string;
    isLoading?: boolean;
}

export function PaymentModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Issue Payment",
    defaultAmount = "",
    isLoading = false
}: PaymentModalProps) {
    const [amount, setAmount] = React.useState(defaultAmount);
    const [method, setMethod] = React.useState("BANK_TRANSFER");
    const [note, setNote] = React.useState("");

    React.useEffect(() => {
        if (isOpen) {
            setAmount(defaultAmount);
            setMethod("BANK_TRANSFER");
            setNote("");
        }
    }, [isOpen, defaultAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
            onConfirm({ amount: numAmount, method, note });
            // Note: we don't automatically close here to allow for loading states if handled by parent
        } else {
            toast.error("Please enter a valid disbursement amount.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && !isLoading && onClose()}>
            <DialogContent className="max-w-sm sm:max-w-md shadow-[0_0_80px_rgba(245,158,11,0.1)] border-amber-200 dark:border-amber-900/20 bg-white dark:bg-zinc-950">
                <DialogHeader>
                    <div className={cn(
                        "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 mx-auto",
                        "border-2 transition-all duration-300 bg-amber-100/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/30 text-amber-700 dark:text-amber-500 shadow-sm"
                    )}>
                        <CreditCard className="w-10 h-10" />
                    </div>

                    <DialogTitle className="text-xl font-medium tracking-tight text-slate-900 dark:text-white uppercase mb-3">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-zinc-600 dark:text-zinc-500 font-medium text-[10px] uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Quantum (Amount)</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-500 font-medium">$</span>
                                <input
                                    required
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full h-16 bg-white dark:bg-zinc-900/80 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl pl-10 pr-5 text-slate-900 dark:text-white font-medium text-xl focus:border-amber-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-700"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Transmission Method</label>
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="w-full h-14 bg-white dark:bg-zinc-900/80 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl px-5 text-slate-900 dark:text-white font-medium text-sm focus:border-amber-500 outline-none appearance-none cursor-pointer"
                            >
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="CASH">Cash Deposit</option>
                                <option value="MOBILE_MONEY">Mobile Money</option>
                                <option value="CHEQUE">Corporate Cheque</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-medium text-zinc-600 dark:text-zinc-500 uppercase tracking-widest ml-1">Internal Reference / Note</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Optional transaction details..."
                                className="w-full h-24 bg-white dark:bg-zinc-900/80 border-2 border-slate-200 dark:border-zinc-800 rounded-2xl p-5 text-slate-900 dark:text-white font-medium text-sm focus:border-amber-500 outline-none transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-zinc-700"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 h-14 rounded-2xl font-medium text-[10px] uppercase tracking-widest text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-900/50 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-14 rounded-2xl font-medium text-[10px] uppercase tracking-widest transition-all active:scale-95 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-900 dark:text-white shadow-lg shadow-amber-950/50"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Zap className="w-3 h-3 animate-pulse" />
                                    Transmitting...
                                </span>
                            ) : confirmText}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
