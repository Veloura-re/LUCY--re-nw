"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Receipt, Loader2, Calendar, FileText, Monitor, BookOpen, Wrench, Shield, Briefcase, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Expense = {
    id: string;
    title: string;
    amount: string; // Decimal comes as string from JSON
    category: "EQUIPMENT" | "BOOKS" | "MAINTENANCE" | "SOFTWARE" | "SERVICES" | "OTHER";
    description: string | null;
    createdAt: string;
    loggedBy: {
        name: string;
        role: string;
    };
};

const CATEGORY_ICONS: Record<Expense["category"], React.ReactNode> = {
    EQUIPMENT: <Monitor className="w-4 h-4 text-blue-500" />,
    BOOKS: <BookOpen className="w-4 h-4 text-yellow-500" />,
    MAINTENANCE: <Wrench className="w-4 h-4 text-orange-500" />,
    SOFTWARE: <Shield className="w-4 h-4 text-purple-500" />,
    SERVICES: <Briefcase className="w-4 h-4 text-emerald-500" />,
    OTHER: <Activity className="w-4 h-4 text-zinc-500" />,
};

export function OperatingCostsView() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<Expense["category"]>("EQUIPMENT");
    const [description, setDescription] = useState("");

    const fetchExpenses = async () => {
        try {
            const res = await fetch('/api/school/finance/expenses');
            if (!res.ok) throw new Error("Failed to fetch expenses");
            const data = await res.json() as Expense[];
            setExpenses(data);
        } catch (error) {
            toast.error("Failed to load operating costs");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/school/finance/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    amount,
                    category,
                    description: description || null
                })
            });

            if (!res.ok) {
                const data = await res.json() as { error?: string };
                throw new Error(data.error || "Failed to log expense");
            }

            toast.success("Expense logged successfully");
            setIsDialogOpen(false);
            
            // Reset form
            setTitle("");
            setAmount("");
            setDescription("");
            setCategory("EQUIPMENT");

            // Refresh list
            fetchExpenses();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalSpent = expenses.reduce((acc, exp) => acc + parseFloat(exp.amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Receipt className="w-8 h-8 text-eduGreen-500" />
                        Operating Costs
                    </h2>
                    <p className="text-slate-500 dark:text-zinc-500 font-medium">Internal ledger for tracking institutional assets and expenses.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium shadow-xl shadow-eduGreen-900/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Log Expense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Log New Expense</DialogTitle>
                            <DialogDescription className="text-slate-600 dark:text-zinc-400">
                                Record a new institutional purchase or cost. This is only visible to directors and owners.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-slate-700 dark:text-zinc-300">Title / Item Name</Label>
                                <Input 
                                    id="title" 
                                    required 
                                    placeholder="e.g. 10x Dell Laptops"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:border-eduGreen-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="amount" className="text-slate-700 dark:text-zinc-300">Amount (ZAR)</Label>
                                    <Input 
                                        id="amount" 
                                        type="number"
                                        step="0.01"
                                        required 
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:border-eduGreen-500 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="text-slate-700 dark:text-zinc-300">Category</Label>
                                    <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                                        <SelectTrigger className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800">
                                            <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                                            <SelectItem value="BOOKS">Books & Media</SelectItem>
                                            <SelectItem value="SOFTWARE">Software</SelectItem>
                                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                            <SelectItem value="SERVICES">Services</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-slate-700 dark:text-zinc-300">Description (Optional)</Label>
                                <Input 
                                    id="description" 
                                    placeholder="Serial numbers, purpose, etc."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:border-eduGreen-500 text-slate-900 dark:text-white"
                                />
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full bg-eduGreen-600 hover:bg-eduGreen-500 text-white mt-4">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Save Expense"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-zinc-400">Total Operating Costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            R {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 backdrop-blur-xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-zinc-400">Total Items Logged</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{expenses.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="bg-white dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
                        Cost History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="w-8 h-8 text-eduGreen-500 animate-spin" />
                        </div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
                            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No expenses logged yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {expenses.map((expense) => (
                                <div key={expense.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-900 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                                            {CATEGORY_ICONS[expense.category]}
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-white font-medium">{expense.title}</p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500 dark:text-zinc-500 mt-1">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(expense.createdAt), 'MMM d, yyyy')}</span>
                                                <span className="hidden sm:inline">•</span>
                                                <span>Logged by {expense.loggedBy.name}</span>
                                            </div>
                                            {expense.description && (
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2 bg-white dark:bg-zinc-950 p-2 rounded border border-slate-200 dark:border-zinc-900 inline-block">{expense.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-medium text-slate-900 dark:text-white">R {parseFloat(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-[10px] uppercase tracking-wider font-semibold text-eduGreen-500 mt-1">{expense.category}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
