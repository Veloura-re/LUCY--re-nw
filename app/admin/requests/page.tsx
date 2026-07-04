'use client';

import { useState, useEffect } from "react";
import {
    Loader2, Users, Search
} from "lucide-react";
import { toast } from "sonner";

interface AccessRequest {
    id: string;
    callsign: string;
    email: string;
    message: string;
    createdAt: string;
}

export default function AccessRequestsPage() {
    const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
    const [isLoadingAccess, setIsLoadingAccess] = useState(true);

    // Search filter state
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchAccessRequests();
    }, []);

    const fetchAccessRequests = async () => {
        setIsLoadingAccess(true);
        try {
            const res = await fetch('/api/admin/wants-access');
            if (!res.ok) throw new Error('Failed to fetch access requests');
            const data = (await res.json()) as any;
            setAccessRequests(data.requests || []);
        } catch (err: any) {
            console.error(err.message);
            toast.error("Failed to load wants-access requests");
        } finally {
            setIsLoadingAccess(false);
        }
    };

    // Client-side filtering
    const filteredRequests = accessRequests.filter(req => {
        return req.callsign.toLowerCase().includes(searchQuery.toLowerCase()) || 
               req.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
               req.message.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold font-orbitron tracking-tight text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-sky-500" />
                    ACCESS REQUESTS
                </h1>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-1">
                    Manage direct access requests submitted through the public intake portal
                </p>
            </div>

            {/* Filter Panel */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search requests by callsign, email, payload..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl h-10 pl-9 pr-4 text-xs text-white focus:border-eduGreen-500 focus:outline-none placeholder-zinc-600"
                    />
                </div>
            </div>

            {/* Access Requests Table */}
            {isLoadingAccess ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-500 opacity-60" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-700">Loading requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-24 rounded-2xl border border-dashed border-zinc-900">
                    <Users className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                    <p className="text-zinc-600 font-medium uppercase tracking-widest text-xs">No requests discovered</p>
                    <p className="text-[10px] text-zinc-700 mt-1">Adjust filters or search parameters</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-white/5 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/5 border-b border-white/5">
                        <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Callsign / Identifier</div>
                        <div className="col-span-3 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Direct Comm Link</div>
                        <div className="col-span-4 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest">Payload Content</div>
                        <div className="col-span-2 text-[9px] font-semibold text-zinc-600 uppercase tracking-widest text-right">Logged At</div>
                    </div>
                    
                    {/* Table Rows */}
                    <div className="divide-y divide-white/5 bg-black">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-zinc-900/30 items-center transition-colors text-white">
                                <div className="col-span-3 font-mono text-xs select-all truncate">{req.callsign}</div>
                                <div className="col-span-3 font-mono text-xs text-zinc-400 select-all truncate">{req.email}</div>
                                <div className="col-span-4 text-xs text-zinc-300 leading-relaxed font-mono select-all pr-2">
                                    {req.message}
                                </div>
                                <div className="col-span-2 text-right text-[10px] text-zinc-600 font-mono">
                                    {new Date(req.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
