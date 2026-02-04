const fs = require('fs');
const path = require('path');

const fixDirs = [
    path.join(__dirname, 'frontend/src/pages/admin/inventory'),
    path.join(__dirname, 'frontend/src/pages/admin/hr')
];

fixDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                const filePath = path.join(dir, file);
                // Skip if directory
                if (fs.statSync(filePath).isDirectory()) return;

                let content = fs.readFileSync(filePath, 'utf8');

                // Replace 4 levels with 3 levels for these specific files
                let newContent = content.replace(/\.\.\/\.\.\/\.\.\/\.\.\/layouts/g, '../../../layouts');
                newContent = newContent.replace(/\.\.\/\.\.\/\.\.\/\.\.\/components/g, '../../../components');

                if (content !== newContent) {
                    console.log(`Fixing imports in: ${file}`);
                    fs.writeFileSync(filePath, newContent);
                }
            }
        });
    }
});

console.log('Fixed imports.');
