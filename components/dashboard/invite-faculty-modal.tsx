import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/image-upload";
import { UserPlus, MailCheck, Mail, Copy } from "lucide-react";
import SpringingLoader from "@/components/dashboard/springing-loader";

interface InviteFacultyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (token: string, user: any) => void;
}

export function InviteFacultyModal({ isOpen, onClose, onSuccess }: InviteFacultyModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        gender: "",
        qualification: "",
        role: "TEACHER",
        photoUrl: "",
        teacherCode: ""
    });
    const [loading, setLoading] = useState(false);
    const [inviteResult, setInviteResult] = useState<{ token: string, user: any, emailSent?: boolean } | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/school/teachers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json() as any;
            if (data.token) {
                setInviteResult({ token: data.token, user: data.user, emailSent: data.emailSent });
                onSuccess(data.token, data.user);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!inviteResult) return;
        navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteResult.token}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const resetAndClose = () => {
        setInviteResult(null);
        setFormData({
            name: "", email: "", phone: "", gender: "", qualification: "", role: "TEACHER", photoUrl: "", teacherCode: ""
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
            <DialogContent className="max-w-2xl rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-900 flex items-center justify-center border border-slate-200 dark:border-zinc-800">
                            {inviteResult ? <MailCheck className="w-5 h-5 text-emerald-600 dark:text-eduGreen-500" /> : <UserPlus className="w-5 h-5 text-emerald-600 dark:text-eduGreen-500" />}
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-medium tracking-tight text-slate-900 dark:text-white">
                                {inviteResult ? "Deployment Successful" : "Invite Academic Personnel"}
                            </DialogTitle>
                            <DialogDescription className="text-slate-500 dark:text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1">
                                {inviteResult ? "Secure uplink established" : "Generate secure access token for faculty member"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {loading ? (
                    <div className="py-20 flex justify-center items-center">
                        <SpringingLoader message="Synthesizing Faculty Data" />
                    </div>
                ) : !inviteResult ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 flex justify-center py-4 bg-slate-50 dark:bg-zinc-900/30 rounded-2xl border border-slate-200/80 dark:border-zinc-800/50">
                            <ImageUpload
                                value={formData.photoUrl}
                                onChange={(url) => setFormData({ ...formData, photoUrl: url })}
                                bucket="avatars"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500 ml-2">Full Name</label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white h-12 rounded-xl focus:border-emerald-600 transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500 ml-2">Email Address</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white h-12 rounded-xl focus:border-emerald-600 transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500 ml-2">Phone</label>
                            <Input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white h-12 rounded-xl focus:border-emerald-600 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500 ml-2">Qualification</label>
                            <Input
                                value={formData.qualification}
                                onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                                className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white h-12 rounded-xl focus:border-emerald-600 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-medium uppercase tracking-widest text-slate-500 dark:text-zinc-500 ml-2">Gender</label>
                            <div className="flex bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 border rounded-xl h-12 items-center px-2 w-full overflow-x-auto">
                                <div className="flex gap-2">
                                    {['MALE', 'FEMALE'].map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gender: g })}
                                            className={`text-[9px] font-medium uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${formData.gender === g ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-slate-200/80 dark:border-zinc-900/50 mt-2">
                            <Button type="button" variant="ghost" onClick={resetAndClose} className="text-slate-500 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white font-medium uppercase text-[10px] tracking-widest">Cancel</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium uppercase text-[10px] tracking-widest rounded-xl px-8 min-w-[140px] shadow-lg shadow-emerald-900/20">
                                <Mail className="w-4 h-4 mr-2" /> Dispatch Invite
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="text-center space-y-8 max-w-md mx-auto py-8">
                        <div className="p-8 bg-slate-50 dark:bg-zinc-900/50 rounded-[2rem] border border-slate-200 dark:border-zinc-800/50">
                            <p className="text-slate-500 dark:text-zinc-500 text-[10px] font-medium uppercase tracking-widest mb-2">Authenticated Recipient</p>
                            <p className="text-lg font-medium text-slate-900 dark:text-white tracking-tight break-all">{inviteResult.user.email}</p>
                            
                            {inviteResult.emailSent === false ? (
                                <div className="mt-6 flex flex-col items-center justify-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-[10px] text-red-500 font-medium uppercase tracking-widest">Email Delivery Failed</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest text-center mt-2">The system could not deliver the email. Please share this token manually.</p>
                                </div>
                            ) : (
                                <div className="mt-6 flex flex-col items-center justify-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] text-emerald-600 dark:text-eduGreen-500 font-medium uppercase tracking-widest">Link Active & Encrypted</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest text-center mt-2">Remind the recipient to check their spam/junk folder.</p>
                                </div>
                            )}
                        </div>
                        <Button size="lg" onClick={() => { setInviteResult(null); setFormData({ name: "", email: "", phone: "", gender: "", qualification: "", role: "TEACHER", photoUrl: "", teacherCode: "" }); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-14 rounded-2xl font-medium text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20">
                            Create Another Invitation
                        </Button>
                        <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-[10px] text-slate-500 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-eduGreen-500 font-medium uppercase tracking-widest">
                            <Copy className="w-3 h-3 mr-2" />
                            {copied ? "Link Copied" : "Copy Secret Link"}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
