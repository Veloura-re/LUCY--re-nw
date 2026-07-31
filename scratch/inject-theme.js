const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app');
const targetPages = [
    'about', 'blog', 'careers', 'changelog', 'compliance', 'contact', 'demo',
    'docs', 'features', 'intelligence', 'network', 'partners', 'press',
    'pricing', 'privacy', 'roadmap', 'schools', 'security', 'status', 'support',
    'terms', 'wall', 'community', 'dpa', 'msa', 'sla', 'insurance'
];

targetPages.forEach(page => {
    const filePath = path.join(dir, page, 'page.tsx');
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');

    // Add import if not present
    if (!content.includes('import { ThemeToggle }')) {
        content = content.replace(/"use client";\n/g, `"use client";\n\nimport { ThemeToggle } from "@/components/ui/theme-toggle";\n`);
    }

    // Wrap the return_to_main button
    const targetString = `<Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>`;
    const replacementString = `<div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                    </div>`;

    if (content.includes(targetString)) {
        content = content.replace(targetString, replacementString);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
});
