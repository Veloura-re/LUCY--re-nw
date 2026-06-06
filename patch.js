const fs = require('fs');
const file = '/home/liora/Videos/LUCY--re-nw-39408e68fa8eb30984580330b477df607bf07ede/components/dashboard/ai-assistant.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '{/* Two-Column Layout */}';
const endStr = '                            </div>\n                        </motion.div>';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const newLayout = `{/* Two-Column Layout (Replaced with Coming Soon) */}
                            <div className="flex-1 flex overflow-hidden bg-black/40 backdrop-blur-3xl relative items-center justify-center">
                                {/* Ambient Background Elements */}
                                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-eduGreen-500/10 rounded-full blur-[120px] pointer-events-none" />
                                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
                                
                                <div className="relative flex flex-col items-center justify-center text-center p-8 md:p-12 z-10">
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="mb-8 relative"
                                    >
                                        <div className="absolute inset-0 bg-eduGreen-500/20 blur-[80px] rounded-full" />
                                        <div className="w-24 h-24 rounded-full bg-black/80 border border-white/5 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(20,122,82,0.3)] backdrop-blur-xl">
                                            <Sparkles className="w-10 h-10 text-eduGreen-500 animate-pulse" />
                                        </div>
                                    </motion.div>
                                    
                                    <motion.h2 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3, duration: 0.8 }}
                                        className="text-3xl md:text-5xl font-black text-white uppercase tracking-[0.1em] mb-4 italic"
                                    >
                                        Neural Core <span className="text-eduGreen-500 not-italic font-medium">Initializing</span>
                                    </motion.h2>
                                    
                                    <motion.p 
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.8 }}
                                        className="text-white/40 font-medium text-xs md:text-sm uppercase tracking-[0.3em] max-w-lg leading-relaxed"
                                    >
                                        The next generation of institutional AI is currently undergoing safety alignment and cognitive calibration. 
                                    </motion.p>
                                    
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1, duration: 0.5 }}
                                        className="mt-12 flex items-center gap-3 px-6 py-3 rounded-full border border-white/10 bg-black/50 backdrop-blur-md shadow-2xl"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Deployment Incoming</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>`;

    content = content.substring(0, startIndex) + newLayout + content.substring(endIndex + endStr.length - 39); // keep the last part
    fs.writeFileSync(file, content);
    console.log('Successfully patched ai-assistant.tsx');
} else {
    console.log('Could not find start or end strings');
}
