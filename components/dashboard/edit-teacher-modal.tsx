import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";
import { Save, UserCog } from "lucide-react";

interface EditTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    teacher: any;
}

export function EditTeacherModal({ isOpen, onClose, onSuccess, teacher }: EditTeacherModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        gender: "",
        qualification: "",
        role: "TEACHER",
        photoUrl: ""
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (teacher) {
            setFormData({
                name: teacher.name || "",
                email: teacher.email || "",
                phone: teacher.phone || "",
                gender: teacher.gender || "",
                qualification: teacher.qualification || "",
                role: teacher.role || "TEACHER",
                photoUrl: teacher.photoUrl || ""
            });
        }
    }, [teacher]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/school/teachers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: teacher.id,
                    ...formData
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border-zinc-900 text-white max-w-2xl rounded-[2.5rem]">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                            <UserCog className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-medium italic">Configure Personnel</DialogTitle>
                            <DialogDescription className="text-zinc-500 font-medium uppercase tracking-widest text-[10px]">
                                Update profile for {teacher?.name}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="md:col-span-2 flex justify-center py-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                        <ImageUpload
                            value={formData.photoUrl}
                            onChange={(url) => setFormData({ ...formData, photoUrl: url })}
                            bucket="avatars"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Full Name</label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Email Address</label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Phone</label>
                        <Input
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Gender</label>
                        <div className="flex bg-zinc-900 border-zinc-800 border rounded-xl h-12 items-center px-4">
                            <div className="flex gap-4">
                                {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                        className={`text-[9px] font-medium uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${formData.gender === g ? 'bg-eduGreen-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Qualification</label>
                        <Input
                            value={formData.qualification}
                            onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                            className="bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 ml-2">Role / Designation</label>
                        <select
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-zinc-900 border-zinc-800 text-white h-12 rounded-xl px-4 outline-none focus:border-eduGreen-600 transition-all border appearance-none"
                        >
                            <option value="TEACHER">TEACHER</option>
                            <option value="HOMEROOM">HOMEROOM ADVISOR</option>
                            <option value="PRINCIPAL">PRINCIPAL</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-3 pt-6 border-t border-zinc-900/50 mt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="text-zinc-500 hover:text-white font-medium uppercase text-[10px] tracking-widest">Cancel</Button>
                        <Button type="submit" disabled={loading} className="bg-eduGreen-600 hover:bg-eduGreen-500 text-white font-medium uppercase text-[10px] tracking-widest rounded-xl px-8 min-w-[140px]">
                            {loading ? (
                                <><span className="w-4 h-4 mr-2 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

