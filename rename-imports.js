/**
 * Phase 2: Update all import paths from pages/admin to pages/manager
 * Also rename AdminLayout component to ManagerLayout
 */
const fs = require('fs');
const path = require('path');

function getAllFiles(dir, exts) {
    let results = [];
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (item === 'node_modules' || item === '.git') continue;
                results = results.concat(getAllFiles(fullPath, exts));
            } else if (exts.some(ext => fullPath.endsWith(ext))) {
                results.push(fullPath);
            }
        }
    } catch (e) { }
    return results;
}

const files = getAllFiles('frontend/src', ['.ts', '.tsx', '.js', '.jsx']);
let totalChanges = 0;
let changedFiles = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;

    // 1. Replace import paths: /pages/admin/ → /pages/manager/
    content = content.replace(/\/pages\/admin\//g, '/pages/manager/');
    content = content.replace(/\/pages\/admin"/g, '/pages/manager"');
    content = content.replace(/\/pages\/admin'/g, "/pages/manager'");

    // 2. Replace AdminLayout → ManagerLayout (component name AND import)
    content = content.replace(/\bAdminLayout\b/g, 'ManagerLayout');

    if (content !== original) {
        changedFiles++;
        fs.writeFileSync(file, content, 'utf8');
        const diffCount = content.split('manager').length - original.split('manager').length;
        totalChanges += Math.abs(diffCount);
        console.log(`  ✓ ${file}`);
    }
}

// 3. Rename AdminLayout.tsx → ManagerLayout.tsx
const oldFile = 'frontend/src/pages/manager/AdminLayout.tsx';
const newFile = 'frontend/src/pages/manager/ManagerLayout.tsx';
if (fs.existsSync(oldFile)) {
    let content = fs.readFileSync(oldFile, 'utf8');
    content = content.replace(/\bAdminLayout\b/g, 'ManagerLayout');
    fs.writeFileSync(newFile, content, 'utf8');
    fs.unlinkSync(oldFile);
    console.log(`  ✓ Renamed AdminLayout.tsx → ManagerLayout.tsx`);
    changedFiles++;
}

console.log(`\nDone: ${changedFiles} files updated`);
