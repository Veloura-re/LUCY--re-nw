"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Building2, 
    Smartphone, 
    CheckCircle2, 
    Copy, 
    Plus, 
    Trash2, 
    Edit3, 
    ShieldCheck, 
    X, 
    Loader2, 
    AlertCircle,
    Eye,
    Check,
    CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface BankingAccount {
    id: string;
    type: "BANK_TRANSFER" | "MOBILE_MONEY" | "OTHER";
    provider: string;
    accountName: string;
    accountNumber: string;
    branch?: string;
    instructions?: string;
    isPrimary: boolean;
    isActive: boolean;
}

interface BankingAccountsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialAccounts: BankingAccount[];
    onSuccess: (updatedAccounts: BankingAccount[]) => void;
    schoolName?: string;
}

const PRESET_PROVIDERS = [
    { name: "Commercial Bank of Ethiopia (CBE)", type: "BANK_TRANSFER" as const, defaultInstructions: "Please write student code in the transaction memo/reason." },
    { name: "Telebirr", type: "MOBILE_MONEY" as const, defaultInstructions: "Include student code and grade in the payment remarks." },
    { name: "Awash Bank", type: "BANK_TRANSFER" as const, defaultInstructions: "Enter student ID as the transfer reference." },
    { name: "Bank of Abyssinia", type: "BANK_TRANSFER" as const, defaultInstructions: "Provide student full name and ID in reference." },
    { name: "Dashen Bank", type: "BANK_TRANSFER" as const, defaultInstructions: "Include student code in payment details." },
    { name: "CBE Birr", type: "MOBILE_MONEY" as const, defaultInstructions: "Add student ID in remarks field." },
    { name: "Custom Bank / Provider", type: "BANK_TRANSFER" as const, defaultInstructions: "Please include student ID in transaction reference." }
];

export function BankingAccountsModal({
    isOpen,
    onClose,
    initialAccounts,
    onSuccess,
    schoolName
}: BankingAccountsModalProps) {
    const [accounts, setAccounts] = useState<BankingAccount[]>(initialAccounts || []);
    const [editingAccount, setEditingAccount] = useState<BankingAccount | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    // Form fields for create/edit
    const [formData, setFormData] = useState<Partial<BankingAccount>>({
        type: "BANK_TRANSFER",
        provider: "Commercial Bank of Ethiopia (CBE)",
        accountName: schoolName || "",
        accountNumber: "",
        branch: "",
        instructions: "Please write student code in the transaction memo/reason.",
        isPrimary: false,
        isActive: true
    });

    useEffect(() => {
        if (isOpen) {
            setAccounts(initialAccounts || []);
            setIsCreatingNew(false);
            setEditingAccount(null);
        }
    }, [isOpen, initialAccounts]);

    if (!isOpen) return null;

    const startCreateNew = (preset?: typeof PRESET_PROVIDERS[0]) => {
        const selectedPreset = preset || PRESET_PROVIDERS[0];
        setFormData({
            id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: selectedPreset.type,
            provider: selectedPreset.name === "Custom Bank / Provider" ? "" : selectedPreset.name,
            accountName: schoolName || "",
            accountNumber: "",
            branch: "",
            instructions: selectedPreset.defaultInstructions,
            isPrimary: accounts.length === 0,
            isActive: true
        });
        setEditingAccount(null);
        setIsCreatingNew(true);
    };

    const startEdit = (acc: BankingAccount) => {
        setFormData({ ...acc });
        setEditingAccount(acc);
        setIsCreatingNew(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.provider?.trim()) {
            toast.error("Provider or bank name is required.");
            return;
        }
        if (!formData.accountName?.trim()) {
            toast.error("Account holder name is required.");
            return;
        }
        if (!formData.accountNumber?.trim()) {
            toast.error("Account number or phone is required.");
            return;
        }

        const accountToSave: BankingAccount = {
            id: formData.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: formData.type || "BANK_TRANSFER",
            provider: formData.provider.trim(),
            accountName: formData.accountName.trim(),
            accountNumber: formData.accountNumber.trim(),
            branch: formData.branch?.trim() || "",
            instructions: formData.instructions?.trim() || "",
            isPrimary: !!formData.isPrimary,
            isActive: formData.isActive !== false
        };

        let updatedList: BankingAccount[] = [];

        if (editingAccount) {
            updatedList = accounts.map(a => a.id === editingAccount.id ? accountToSave : a);
        } else {
            updatedList = [...accounts, accountToSave];
        }

        // If this account was set as primary, unmark others
        if (accountToSave.isPrimary) {
            updatedList = updatedList.map(a => a.id === accountToSave.id ? a : { ...a, isPrimary: false });
        } else if (updatedList.length === 1) {
            updatedList[0].isPrimary = true;
        }

        await persistAccounts(updatedList);
        setIsCreatingNew(false);
        setEditingAccount(null);
    };

    const handleDeleteAccount = async (id: string) => {
        const remaining = accounts.filter(a => a.id !== id);
        if (remaining.length > 0 && !remaining.some(a => a.isPrimary)) {
            remaining[0].isPrimary = true;
        }
        await persistAccounts(remaining);
    };

    const handleTogglePrimary = async (id: string) => {
        const updated = accounts.map(a => ({
            ...a,
            isPrimary: a.id === id
        }));
        await persistAccounts(updated);
    };

    const handleToggleActive = async (id: string) => {
        const updated = accounts.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a);
        await persistAccounts(updated);
    };

    const persistAccounts = async (newList: BankingAccount[]) => {
        setSaving(true);
        try {
            const res = await fetch("/api/school/finance/banking", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accounts: newList })
            });

            const data: any = await res.json();
            if (res.ok) {
                setAccounts(newList);
                toast.success(data.message || "Institutional banking accounts synchronized.");
                onSuccess(newList);
            } else {
                toast.error(data.error || "Failed to update banking accounts.");
            }
        } catch (err: any) {
            console.error("Banking update error:", err);
            toast.error("Network error while updating banking channels.");
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success("Account number copied to clipboard.");
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/80 backdrop-blur-md"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 15 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    className="relative w-full max-w-3xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-10 overflow-hidden my-8"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between bg-white dark:bg-zinc-900/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-eduGreen-500/10 border border-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-medium text-zinc-900 dark:text-white uppercase tracking-tight">
                                    Official Institutional Banking Channels
                                </h2>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 uppercase tracking-widest mt-0.5">
                                    Configure verified school accounts for parent tuition & fee settlements
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
                        {/* Notice Banner */}
                        <div className="p-4 rounded-2xl bg-eduGreen-500/5 border border-eduGreen-500/20 text-xs flex items-start gap-3">
                            <ShieldCheck className="w-4 h-4 text-eduGreen-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-semibold text-zinc-900 dark:text-white text-[11px] uppercase tracking-wider">
                                    Direct Institutional Settlement Guarantee
                                </p>
                                <p className="text-zinc-600 dark:text-zinc-400 text-[10px] leading-relaxed">
                                    Accounts added here appear directly in the Parent Settlement Portal. When families submit tuition slips, all transactions resolve straight to your school&apos;s verified institutional accounts.
                                </p>
                            </div>
                        </div>

                        {/* Existing Accounts List */}
                        {!isCreatingNew && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        Configured Accounts ({accounts.length})
                                    </h3>
                                    <Button
                                        onClick={() => startCreateNew()}
                                        size="sm"
                                        className="h-9 px-4 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-eduGreen-900/20"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Account
                                    </Button>
                                </div>

                                {accounts.length === 0 ? (
                                    <div className="py-12 px-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/20">
                                        <Building2 className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
                                        <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1">
                                            No Institutional Accounts Configured
                                        </p>
                                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400 uppercase tracking-widest max-w-md mx-auto mb-5">
                                            Please add at least one commercial bank or mobile money account (e.g. CBE or Telebirr) so parents can settle dues.
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {PRESET_PROVIDERS.slice(0, 3).map((p, idx) => (
                                                <Button
                                                    key={idx}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => startCreateNew(p)}
                                                    className="h-8 rounded-xl border-zinc-300 dark:border-zinc-700 text-[10px] uppercase tracking-wider font-semibold hover:border-eduGreen-500"
                                                >
                                                    <Plus className="w-3 h-3 mr-1 text-eduGreen-500" /> {p.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {accounts.map((acc, idx) => (
                                            <div
                                                key={acc.id}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900/50",
                                                    acc.isPrimary 
                                                        ? "border-eduGreen-500/40 shadow-sm" 
                                                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                )}
                                            >
                                                <div className="flex items-start gap-3.5">
                                                    <div className={cn(
                                                        "p-2.5 rounded-xl border shrink-0 mt-0.5",
                                                        acc.type === "MOBILE_MONEY" 
                                                            ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                                                            : "bg-eduGreen-500/10 border-eduGreen-500/20 text-eduGreen-500"
                                                    )}>
                                                        {acc.type === "MOBILE_MONEY" ? <Smartphone className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                                                                {acc.provider}
                                                            </h4>
                                                            {acc.isPrimary && (
                                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-eduGreen-100 dark:bg-eduGreen-950/60 text-eduGreen-700 dark:text-eduGreen-400 border border-eduGreen-300 dark:border-eduGreen-800/40">
                                                                    Primary
                                                                </span>
                                                            )}
                                                            {!acc.isActive && (
                                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                                    Disabled
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                                            <span>Number: <strong className="text-zinc-900 dark:text-white select-all">{acc.accountNumber}</strong></span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleCopy(acc.accountNumber, idx)}
                                                                className="text-zinc-600 hover:text-eduGreen-500 transition-colors"
                                                                title="Copy account number"
                                                            >
                                                                {copiedIndex === idx ? <Check className="w-3 h-3 text-eduGreen-500" /> : <Copy className="w-3 h-3" />}
                                                            </button>
                                                        </p>
                                                        <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                                            Name: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{acc.accountName}</span>
                                                            {acc.branch && <span> · Branch: {acc.branch}</span>}
                                                        </p>
                                                        {acc.instructions && (
                                                            <p className="text-[9px] text-zinc-600 dark:text-zinc-500 italic">
                                                                Memo: {acc.instructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                                                    {!acc.isPrimary && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={saving}
                                                            onClick={() => handleTogglePrimary(acc.id)}
                                                            className="h-8 px-2.5 text-[9px] uppercase tracking-wider font-semibold rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-eduGreen-500 hover:bg-eduGreen-500/10"
                                                        >
                                                            Set Primary
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={saving}
                                                        onClick={() => handleToggleActive(acc.id)}
                                                        className={cn(
                                                            "h-8 px-2.5 text-[9px] uppercase tracking-wider font-semibold rounded-lg",
                                                            acc.isActive ? "text-zinc-600 hover:text-amber-500" : "text-eduGreen-600 hover:text-eduGreen-500"
                                                        )}
                                                    >
                                                        {acc.isActive ? "Deactivate" : "Activate"}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={saving}
                                                        onClick={() => startEdit(acc)}
                                                        className="h-8 w-8 p-0 rounded-lg text-zinc-600 hover:text-zinc-900 dark:hover:text-white"
                                                        title="Edit Account"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={saving}
                                                        onClick={() => handleDeleteAccount(acc.id)}
                                                        className="h-8 w-8 p-0 rounded-lg text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
                                                        title="Delete Account"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create / Edit Form */}
                        {isCreatingNew && (
                            <form onSubmit={handleFormSubmit} className="space-y-5 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                                    <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                        {editingAccount ? "Edit Banking Channel" : "New Institutional Settlement Account"}
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setIsCreatingNew(false); setEditingAccount(null); }}
                                        className="h-7 px-2.5 text-[9px] uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        Cancel
                                    </Button>
                                </div>

                                {/* Preset Selector (on new account) */}
                                {!editingAccount && (
                                    <div>
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400 mb-2 block">
                                            Quick Rail Presets
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {PRESET_PROVIDERS.map((preset, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            type: preset.type,
                                                            provider: preset.name === "Custom Bank / Provider" ? "" : preset.name,
                                                            instructions: preset.defaultInstructions
                                                        });
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider border transition-all",
                                                        formData.provider === preset.name || (preset.name === "Custom Bank / Provider" && !PRESET_PROVIDERS.slice(0, -1).some(p => p.name === formData.provider))
                                                            ? "bg-eduGreen-500/15 border-eduGreen-500 text-eduGreen-600 dark:text-eduGreen-400 shadow-sm"
                                                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                                                    )}
                                                >
                                                    {preset.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Channel Type
                                        </Label>
                                        <select
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full h-11 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-eduGreen-500"
                                        >
                                            <option value="BANK_TRANSFER">Bank Wire / Deposit</option>
                                            <option value="MOBILE_MONEY">Mobile Money / Telebirr</option>
                                            <option value="OTHER">Other Settlement Rail</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Bank / Provider Name *
                                        </Label>
                                        <Input
                                            value={formData.provider || ""}
                                            onChange={e => setFormData({ ...formData, provider: e.target.value })}
                                            placeholder="e.g. Commercial Bank of Ethiopia (CBE)"
                                            required
                                            className="h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Official Account Holder Name *
                                        </Label>
                                        <Input
                                            value={formData.accountName || ""}
                                            onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                            placeholder="e.g. Wakanda Academy PLC"
                                            required
                                            className="h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Account / Phone Number *
                                        </Label>
                                        <Input
                                            value={formData.accountNumber || ""}
                                            onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                            placeholder="e.g. 1000123456789 or 0911223344"
                                            required
                                            className="h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Branch / SWIFT Code (Optional)
                                        </Label>
                                        <Input
                                            value={formData.branch || ""}
                                            onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                            placeholder="e.g. Bole Medhanialem Branch"
                                            className="h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                                            Transfer Memo Instructions (For Parents)
                                        </Label>
                                        <Input
                                            value={formData.instructions || ""}
                                            onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                                            placeholder="e.g. Please write student ID in payment description"
                                            className="h-11 rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Checkbox options */}
                                <div className="flex flex-wrap items-center gap-6 pt-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-800 dark:text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.isPrimary}
                                            onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                                            className="rounded border-zinc-300 text-eduGreen-600 focus:ring-eduGreen-500 w-4 h-4"
                                        />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Set as Primary Settlement Rail</span>
                                    </label>
                                    <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-800 dark:text-zinc-200">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive !== false}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="rounded border-zinc-300 text-eduGreen-600 focus:ring-eduGreen-500 w-4 h-4"
                                        />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider">Visible to Parents (Active)</span>
                                    </label>
                                </div>

                                {/* Live Parent Preview Card */}
                                <div className="mt-4 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 space-y-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                        <Eye className="w-3 h-3 text-eduGreen-500" />
                                        Live Parent Portal View Preview
                                    </div>
                                    <div className="bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-300 dark:border-zinc-800 space-y-1.5 text-left text-xs">
                                        <div className="text-[10px] font-bold text-eduGreen-600 dark:text-eduGreen-400 uppercase tracking-widest flex items-center justify-between">
                                            <span>{formData.provider || "Bank Name"}</span>
                                            <span className="text-[9px] text-zinc-600 font-normal">
                                                {formData.type === "MOBILE_MONEY" ? "Mobile Channel" : "Direct Wire"}
                                            </span>
                                        </div>
                                        <p className="text-zinc-700 dark:text-zinc-300">
                                            <span className="text-zinc-600 dark:text-zinc-400 text-[10px] uppercase tracking-wider">
                                                {formData.type === "MOBILE_MONEY" ? "Phone / Till:" : "Account Number:"}
                                            </span>{" "}
                                            <strong className="font-mono text-zinc-900 dark:text-white select-all">
                                                {formData.accountNumber || "1000XXXXXXXX"}
                                            </strong>
                                        </p>
                                        <p className="text-zinc-700 dark:text-zinc-300">
                                            <span className="text-zinc-600 dark:text-zinc-400 text-[10px] uppercase tracking-wider">Account Name:</span>{" "}
                                            <strong className="text-zinc-900 dark:text-white">
                                                {formData.accountName || "Official School Account"}
                                            </strong>
                                        </p>
                                        {formData.branch && (
                                            <p className="text-zinc-700 dark:text-zinc-300 text-[10px]">
                                                <span className="text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Branch:</span>{" "}
                                                {formData.branch}
                                            </p>
                                        )}
                                        {formData.instructions && (
                                            <p className="text-[9px] text-amber-800 dark:text-amber-400/90 font-medium pt-1 border-t border-zinc-200 dark:border-zinc-800/60">
                                                Notice: {formData.instructions}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setIsCreatingNew(false); setEditingAccount(null); }}
                                        className="h-11 px-5 rounded-xl border-zinc-300 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="h-11 px-6 rounded-xl bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-eduGreen-900/20"
                                    >
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                                        {editingAccount ? "Save Changes" : "Save Banking Channel"}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 px-6 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/30 flex justify-between items-center text-[10px] text-zinc-600 dark:text-zinc-400">
                        <span className="uppercase tracking-widest">
                            School Ledger: <strong className="text-zinc-800 dark:text-zinc-200">{schoolName || "Institutional Node"}</strong>
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                            className="h-8 px-4 rounded-xl text-[9px] uppercase tracking-wider font-semibold"
                        >
                            Done
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
