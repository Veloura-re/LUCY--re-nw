"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Calculator, DollarSign, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FeeStructureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newFee: any) => void;
    grades: any[];
}

export function FeeStructureModal({ isOpen, onClose, onSuccess, grades }: FeeStructureModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        amount: "",
        category: "TUITION",
        frequency: "TERM",
        gradeId: "ALL",
        description: ""
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) {
            toast.error("Please provide both structure name and amount quantum.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/school/finance/fees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = (await res.json()) as any;
            if (!res.ok || data.error) {
                toast.error(data.error || "Failed to authorize fee structure");
                return;
            }

            toast.success("Institutional fee structure established.");
            onSuccess(data);
            setFormData({
                name: "",
                amount: "",
                category: "TUITION",
                frequency: "TERM",
                gradeId: "ALL",
                description: ""
            });
            onClose();
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/75 backdrop-blur-md"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 z-10 overflow-hidden"
                >
                    {/* Header Ambient Glow */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-eduGreen-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-zinc-200 dark:border-zinc-900">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-eduGreen-50 dark:bg-eduGreen-950/30 flex items-center justify-center border border-eduGreen-500/20 text-eduGreen-600 dark:text-eduGreen-400">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                    Establish Fee Structure
                                </h3>
                                <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                                    Institutional Billing Matrix & Quantum
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mt-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Structure Descriptor / Name *
                                </label>
                                <Input
                                    placeholder="e.g. Standard Academic Tuition (Term 1)"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="h-11 sm:h-12 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-medium text-xs sm:text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Quantum Amount ($ USD) *
                                </label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <Input
                                        type="number"
                                        placeholder="1250.00"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        min="0"
                                        step="any"
                                        className="h-11 sm:h-12 pl-9 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-xs sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="h-11 sm:h-12 w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-eduGreen-500"
                                >
                                    <option value="TUITION">Tuition</option>
                                    <option value="LAB">Lab & Science</option>
                                    <option value="EXAM">Exam Registration</option>
                                    <option value="TRANSPORT">Transport</option>
                                    <option value="REGISTRATION">Registration</option>
                                    <option value="ACTIVITY">Activity & Clubs</option>
                                    <option value="SPORTS">Sports & Athletics</option>
                                    <option value="LIBRARY">Library</option>
                                    <option value="OTHER">Other / Miscellaneous</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Target Academic Grade
                                </label>
                                <select
                                    value={formData.gradeId}
                                    onChange={e => setFormData({ ...formData, gradeId: e.target.value })}
                                    className="h-11 sm:h-12 w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-eduGreen-500"
                                >
                                    <option value="ALL">All Campus Grades</option>
                                    {grades?.map(g => (
                                        <option key={g.id} value={g.id}>Grade {g.level} - {g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Billing Frequency
                                </label>
                                <select
                                    value={formData.frequency}
                                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    className="h-11 sm:h-12 w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-eduGreen-500"
                                >
                                    <option value="TERM">Per Academic Term</option>
                                    <option value="YEAR">Annually (Per Academic Year)</option>
                                    <option value="MONTH">Monthly Installment</option>
                                    <option value="ONE_TIME">One-Time Matriculation</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                    Internal Remarks / Memo (Optional)
                                </label>
                                <Input
                                    placeholder="e.g. Applicable for 2026/2027 curriculum year"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="h-11 sm:h-12 bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 rounded-xl font-medium text-xs sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-900">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="h-11 sm:h-12 px-5 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-widest"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="h-11 sm:h-12 px-6 bg-eduGreen-600 hover:bg-eduGreen-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-eduGreen-900/30"
                            >
                                {loading ? "Authorizing..." : "Authorize Structure"}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
