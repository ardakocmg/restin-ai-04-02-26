const fs = require('fs');
const path = require('path');

const DIR_TO_SCAN = path.join(__dirname, 'src');

// Map exact pixel values to their standard Tailwind scale equivalent for spacing
const TW_SPACING = {
    0: '0', 2: '0.5', 4: '1', 6: '1.5', 8: '2', 10: '2.5', 12: '3', 14: '3.5',
    16: '4', 20: '5', 24: '6', 28: '7', 32: '8', 36: '9', 40: '10', 44: '11',
    48: '12', 56: '14', 60: '15', 64: '16', 72: '18', 80: '20', 96: '24', 112: '28', 128: '32',
    144: '36', 160: '40', 176: '44', 192: '48', 208: '52', 224: '56',
    240: '60', 256: '64', 288: '72', 320: '80', 384: '96'
};

let filesChanged = 0;
let zIndexReplacements = 0;
let spacingReplacements = 0;

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

    // 1. Z-Index Normalization
    // Match z-[100], z-[999], etc.
    content = content.replace(/z-\[(\d+)\]/g, (match, zValueStr) => {
        const zValue = parseInt(zValueStr, 10);
        if (zValue > 50) {
            zIndexReplacements++;
            return 'z-50'; // Tailwind max standard is 50
        } else if (zValue === 50 || zValue === 40 || zValue === 30 || zValue === 20 || zValue === 10 || zValue === 0) {
            zIndexReplacements++;
            return `z-${zValue}`;
        }

        // Round to nearest 10 for arbitrary values like z-[33]
        const rounded = Math.round(zValue / 10) * 10;
        if (rounded <= 50) {
            zIndexReplacements++;
            return `z-${rounded}`;
        }
        return match;
    });

    // 2. Spacing Normalization
    // Match prefix-[40px] -> prefix-10
    const spacingRegex = /\b(w|h|min-w|min-h|max-w|max-h|top|bottom|left|right|p|pt|pb|pl|pr|px|py|m|mt|mb|ml|mr|mx|my|gap|gap-x|gap-y)-\[(\d+)px\]/g;
    content = content.replace(spacingRegex, (match, prefix, pxValueStr) => {
        const pxValue = parseInt(pxValueStr, 10);
        if (TW_SPACING[pxValue] !== undefined) {
            spacingReplacements++;
            return `${prefix}-${TW_SPACING[pxValue]}`;
        }
        return match; // Keep arbitrary if it doesn't match a perfect tailwind scale to prevent UI destruction
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesChanged++;
        // console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    }
}

console.log('🔄 Starting Spacing & Z-Index Standardization...');
try {
    walkDir(DIR_TO_SCAN);
    console.log('\n✅ Standardization Complete!');
    console.log(`• Files Modified: ${filesChanged}`);
    console.log(`• Z-Index Fixes: ${zIndexReplacements}`);
    console.log(`• Spacing Fixes: ${spacingReplacements}`);
} catch (error) {
    console.error('❌ Error during migration:', error);
}
