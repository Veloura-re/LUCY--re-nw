const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

content = content.replace(
    'className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden font-mono lowercase tracking-tight"',
    'className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black overflow-x-hidden font-mono lowercase tracking-tight transition-colors duration-300"'
);

content = content.replace(
    /className="fixed inset-0 z-0 bg-\[linear-gradient(.*?) pointer-events-none"/,
    'className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#00000004_1px,transparent_1px),linear-gradient(to_bottom,#00000004_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"'
);

content = content.replace(
    /style=\{\{ background: "radial-gradient\(circle at 50% 50%, rgba\(255,255,255,0\.03\)/,
    'className="hidden dark:block" style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03)'
);

content = content.replace(
    /className="fixed top-0 left-0 right-0 z-\[60\] bg-white text-black/,
    'className="fixed top-0 left-0 right-0 z-[60] bg-slate-900 text-white dark:bg-white dark:text-black'
);

content = content.replace(
    /scrolled \? "top-7 bg-black\/90 backdrop-blur-xl border-b border-white\/10" : "top-8 bg-transparent"/,
    'scrolled ? "top-7 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/10" : "top-8 bg-transparent"'
);

content = content.replace(
    /className="font-bold text-lg tracking-tighter">lucy_os/,
    'className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os'
);

content = content.replace(
    /text-\[11px\] font-medium uppercase tracking-\[0\.2em\] text-zinc-500/,
    'text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500'
);

content = content.replace(
    /className="relative group hover:text-white transition-colors duration-200"/g,
    'className="relative group hover:text-slate-900 dark:hover:text-white transition-colors duration-200"'
);

content = content.replace(
    /className="absolute -bottom-0\.5 left-0 h-px bg-white/,
    'className="absolute -bottom-0.5 left-0 h-px bg-slate-900 dark:bg-white'
);

content = content.replace(
    /text-\[10px\] text-zinc-700 uppercase tracking-widest/,
    'text-[10px] text-slate-400 dark:text-zinc-700 uppercase tracking-widest font-bold'
);

content = content.replace(
    /className="w-1 h-1 bg-white rounded-full"/,
    'className="w-1 h-1 bg-emerald-500 dark:bg-white rounded-full"'
);

content = content.replace(
    /className="h-9 px-4 text-\[11px\] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded-none border border-white\/10 hover:border-white"/,
    'className="h-9 px-4 text-[11px] uppercase tracking-widest text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-black transition-all rounded-none border border-slate-300 dark:border-white/10 hover:border-slate-900 dark:hover:border-white font-bold"'
);

// Hero Title and other elements...
fs.writeFileSync('app/page.tsx', content);
console.log("Updated basic elements");
