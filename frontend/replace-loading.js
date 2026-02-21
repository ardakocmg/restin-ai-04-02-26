/**
 * replace-loading.js — Replace all plain "Loading..." with branded <LoadingSpinner />
 * 
 * Strategy:
 * 1. Replace inline loading patterns (div/Card)
 * 2. Add import if missing
 * 3. Handle PageContainer loading
 */
const fs = require('fs');
const path = require('path');

let totalFixed = 0;
let importAdded = 0;

function processFile(filePath) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) return;

    let content = fs.readFileSync(abs, 'utf-8');
    const original = content;
    let changed = false;

    // ═══ Pattern 1: <div className="p-8">Loading...</div> ═══
    content = content.replace(
        /<div className="p-8">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 2: <div className="p-8 text-foreground">Loading...</div> ═══
    content = content.replace(
        /<div className="p-8 text-foreground">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 3: <div className="p-8 text-slate-50">Loading...</div> ═══
    content = content.replace(
        /<div className="p-8 text-slate-50">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 4: <div className="p-6">Loading...</div> ═══
    content = content.replace(
        /<div className="p-6">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 5: <div className="p-6 text-foreground">Loading...</div> ═══
    content = content.replace(
        /<div className="p-6 text-foreground">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 6: <div>Loading...</div> ═══
    content = content.replace(
        /<div>Loading\.\.\.<\/div>/g,
        '<LoadingSpinner />'
    );

    // ═══ Pattern 7: <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card> ═══
    content = content.replace(
        /<Card><CardContent className="p-8 text-center">Loading\.\.\.<\/CardContent><\/Card>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 8: Suspense fallback with Loading... ═══
    content = content.replace(
        /fallback=\{<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading\.\.\.<\/div>\}/g,
        'fallback={<LoadingSpinner variant="fullScreen" />}'
    );

    // ═══ Pattern 9: <p ...>Loading...</p> ═══
    content = content.replace(
        /<p className="text-center py-8 text-gray-500">Loading\.\.\.<\/p>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 10: flex items-center justify-center h-64 Loading... ═══
    content = content.replace(
        /<div className="flex items-center justify-center h-64 text-muted-foreground">Loading\.\.\.<\/div>/g,
        '<LoadingSpinner variant="page" />'
    );

    // ═══ Pattern 11: PageContainer title="Loading..." variations ═══
    // These are loading state for the whole page — change to just a spinner
    // <PageContainer title="Loading..." description="" className="" actions={<></>}>
    content = content.replace(
        /<PageContainer title="Loading\.\.\." description="" className="" actions=\{<><\/>\}>/g,
        '<PageContainer title="" description="" className="" actions={<></>}><LoadingSpinner variant="page" />'
    );
    // Also handle simpler version
    content = content.replace(
        /title="Loading\.\.\."/g,
        'title=""'
    );

    // ═══ Pattern 12: Inline text "Loading..."  ═══
    // Be careful — only replace if it's clearly a loading state div
    // Some are conditional: loading ? 'Loading...' : `${count} items`
    // These should stay as-is since the text is contextual

    if (content !== original) {
        changed = true;

        // Add import if not present
        if (content.includes('<LoadingSpinner') && !content.includes("from '@/components/shared/LoadingSpinner'") && !content.includes('LoadingSpinner.tsx')) {
            // Find the last import line
            const importLines = content.split('\n');
            let lastImportIndex = -1;
            for (let i = 0; i < importLines.length; i++) {
                if (importLines[i].trim().startsWith('import ')) {
                    lastImportIndex = i;
                }
            }

            if (lastImportIndex > -1) {
                importLines.splice(lastImportIndex + 1, 0, "import LoadingSpinner from '@/components/shared/LoadingSpinner';");
                content = importLines.join('\n');
                importAdded++;
            }
        }

        fs.writeFileSync(abs, content, 'utf-8');
        totalFixed++;
        console.log(`[FIX] ${filePath}`);
    }
}

// ═══ Find all TSX files with "Loading..." ═══
function findFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') {
            results.push(...findFiles(full));
        } else if (e.isFile() && e.name.endsWith('.tsx')) {
            const content = fs.readFileSync(full, 'utf-8');
            if (content.includes('Loading...') && !content.includes('LoadingSpinner.tsx')) {
                results.push(full);
            }
        }
    }
    return results;
}

const files = findFiles(path.resolve('src'));
console.log(`Found ${files.length} files with Loading...\n`);

for (const f of files) {
    processFile(path.relative(process.cwd(), f));
}

console.log(`\n✅ Done! Files modified: ${totalFixed}, Imports added: ${importAdded}`);
