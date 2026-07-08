"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, ArrowRight, Loader2 } from "lucide-react";

export default function MarklistIndexPage() {
    const router = useRouter();
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 50;

    useEffect(() => {
        // Fetch all marklists (filtered by teacher serverside ideally, or client side)
        // Since I don't have a "My Marklists" API yet, I'll fetch generic or just assume we show all for now.
        // Actually, I can allow the user to just see what's available.
        // I'll reuse the config API or create a listing API.
        // Let's create a quick listing endpoint client-side logic? 
        // No, I need an API. 
        // I'll create a new API route `GET /api/marklist/list` quickly or just use `GET /api/marklist/config` without params?
        // My previous API required params. I'll modify `GET /api/marklist/config` to return ALL if no params provided (filtered by school).

        fetchConfigs();
    }, [page]);

    const fetchConfigs = async () => {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });
            const res = await fetch(`/api/marklist/config/list?${params.toString()}`); // New Endpoint
            if (res.ok) {
                const data = await res.json() as any;
                if (data.configs) {
                    setConfigs(data.configs);
                    if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
                } else {
                    setConfigs(data); // Fallback
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-medium uppercase tracking-tight text-white">My Marklists</h1>
                <p className="text-zinc-400 font-medium">Select a Marklist to manage grades</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
            ) : configs.length === 0 ? (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-10 text-center text-zinc-500 font-medium">
                        No Marklists configured yet. Ask your Director to create one.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {configs.map((conf) => (
                        <Card key={conf.id} className="group bg-zinc-900/50 border-zinc-800 hover:border-eduGreen-500/50 transition-all cursor-pointer  relative"
                            onClick={() => router.push(`/dashboard/marklist/view?configId=${conf.id}`)}>
                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-zinc-800 group-hover:bg-eduGreen-500 transition-colors" />
                            <CardHeader>
                                <CardTitle className="text-xl font-medium text-white">{conf.class?.name}</CardTitle>
                                <div className="text-eduGreen-400 font-medium uppercase tracking-widest text-xs flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    {conf.subject?.name}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-zinc-500 text-xs font-medium uppercase">{conf.columns?.length || 0} Assessments</span>
                                    <Button size="sm" variant="ghost" className="text-zinc-400 group-hover:text-eduGreen-400 group-hover:translate-x-1 transition-all">
                                        Open Chart <ArrowRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-xl mt-8">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

