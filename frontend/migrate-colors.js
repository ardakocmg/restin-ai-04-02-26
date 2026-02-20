const fs = require('fs');
const path = require('path');

const DIR_TO_SCAN = path.join(__dirname, 'src');

// Regex patterns for the mass migration
// We use word boundaries \b to avoid partially replacing classes
const REPLACEMENTS = [
    // Backgrounds Base
    { from: /\bbg-zinc-950\b|\bbg-\[\#0A0A0B\]\b|\bbg-\[\#0F0F10\]\b|\bbg-\[\#09090b\]\b/g, to: 'bg-background' },

    // Backgrounds Cards
    { from: /\bbg-zinc-900\b|\bbg-\[\#18181b\]\b|\bbg-\[\#1a1a1a\]\b|\bbg-\[\#161617\]\b/g, to: 'bg-card' },

    // Backgrounds Secondary/Muted
    { from: /\bbg-zinc-800\b/g, to: 'bg-secondary' },

    // Text
    { from: /\btext-white\b|\btext-zinc-50\b|\btext-zinc-100\b/g, to: 'text-foreground' },
    { from: /\btext-zinc-200\b|\btext-zinc-300\b/g, to: 'text-secondary-foreground' },
    { from: /\btext-zinc-400\b|\btext-zinc-500\b|\btext-zinc-600\b/g, to: 'text-muted-foreground' },

    // Borders
    { from: /\bborder-zinc-800\b|\bborder-zinc-700\b|\bborder-white\/5\b|\bborder-white\/10\b/g, to: 'border-border' },
    { from: /\bdivide-zinc-800\b|\bdivide-zinc-700\b/g, to: 'divide-border' },

    // Hovers
    { from: /\bhover:bg-zinc-800\b|\bhover:bg-zinc-700\b/g, to: 'hover:bg-secondary/80' },
    { from: /\bhover:text-white\b|\bhover:text-zinc-100\b/g, to: 'hover:text-foreground' }
];

let filesChanged = 0;
let totalReplacementsMade = 0;

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let fileReplacements = 0;

    REPLACEMENTS.forEach(rule => {
        let match;
        // Count replacements for logging
        while ((match = rule.from.exec(originalContent)) !== null) {
            fileReplacements++;
            totalReplacementsMade++;
        }
        // Do actual replace
        content = content.replace(rule.from, rule.to);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesChanged++;
        console.log(`Updated: ${path.relative(__dirname, filePath)} (${fileReplacements} replacements)`);
    }
}

console.log('🔄 Starting Color Migration Script...');
console.log('Scanning directory:', DIR_TO_SCAN);

try {
    walkDir(DIR_TO_SCAN);
    console.log('\n✅ Migration Complete!');
    console.log(`• Files Modified: ${filesChanged}`);
    console.log(`• Total Class Replacements: ${totalReplacementsMade}`);
} catch (error) {
    console.error('❌ Error during migration:', error);
}
