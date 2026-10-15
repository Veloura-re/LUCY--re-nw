import fs from 'fs';
import path from 'path';

/**
 * AGENTS.md section 5: no emoji in code, comments, UI strings or logs.
 * Typographic symbols such as check marks, arrows and geometric shapes are allowed.
 */
const EMOJI = new RegExp(
    '[\\u{1F300}-\\u{1FAFF}\\u{1F000}-\\u{1F2FF}\\u231A\\u231B\\u23E9-\\u23EC\\u23F0\\u23F3\\u25FD\\u25FE\\u2614\\u2615' +
    '\\u2648-\\u2653\\u267F\\u2693\\u26A1\\u26AA\\u26AB\\u26BD\\u26BE\\u26C4\\u26C5\\u26CE\\u26D4\\u26EA\\u26F2\\u26F3' +
    '\\u26F5\\u26FA\\u26FD\\u2705\\u270A\\u270B\\u2728\\u274C\\u274E\\u2753-\\u2755\\u2757\\u2795-\\u2797\\u27B0\\u27BF' +
    '\\u2B1B\\u2B1C\\u2B50\\u2B55\\u26A0\\u2694\\u269B\\u2623\\u2699\\u2139\\u2764\\u2709\\u2714\\u2716\\u2702\\u270C\\u2611]',
    'u'
);

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['app', 'components', 'lib', 'hooks', 'utils', 'middleware.ts'];

function walk(target: string, out: string[] = []): string[] {
    const full = path.join(ROOT, target);
    if (!fs.existsSync(full)) return out;
    if (fs.statSync(full).isFile()) return /\.(ts|tsx)$/.test(full) ? [...out, full] : out;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
        if (['node_modules', '.next', '.open-next'].includes(entry.name)) continue;
        const child = path.join(target, entry.name);
        if (entry.isDirectory()) walk(child, out);
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(path.join(ROOT, child));
    }
    return out;
}

describe('zero-emoji mandate', () => {
    it('keeps application source free of emoji', () => {
        const offenders = DIRS.flatMap((d) => walk(d))
            .filter((file) => EMOJI.test(fs.readFileSync(file, 'utf8')))
            .map((file) => path.relative(ROOT, file));
        expect(offenders).toEqual([]);
    });
});
