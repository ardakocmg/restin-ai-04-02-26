const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'frontend/src');
const appJsPath = path.join(projectRoot, 'App.js');

const appContent = fs.readFileSync(appJsPath, 'utf8');

// Regex to capture import paths
const importRegex = /import\s+[\w{},*\s]+\s+from\s+['"]([^'"]+)['"]/g;
const simpleImportRegex = /import\s+['"]([^'"]+)['"]/g; // For side-effect imports like css

let missingImports = [];
let match;

const checkPath = (importPath) => {
    // Skip libraries
    if (!importPath.startsWith('.')) return;

    let resolvedPath = path.resolve(projectRoot, importPath);

    // Extensions to check
    const extensions = ['.js', '.jsx', '.ts', '.tsx', ''];

    let exists = false;
    for (const ext of extensions) {
        if (fs.existsSync(resolvedPath + ext)) {
            // Check if it's a directory (needs explicit index)
            if (fs.statSync(resolvedPath + ext).isDirectory()) {
                for (const subExt of ['.js', '.jsx', '.ts', '.tsx']) {
                    if (fs.existsSync(path.join(resolvedPath + ext, `index${subExt}`))) {
                        exists = true;
                        break;
                    }
                }
                // Handle specific case where import points to dir but means file
                if (!exists && extensions.some(e => fs.existsSync(resolvedPath + e) && !fs.statSync(resolvedPath + e).isDirectory())) {
                    exists = true;
                }

            } else {
                exists = true;
            }
            if (exists) break;
        }
    }

    if (!exists) {
        missingImports.push(importPath);
    }
};

while ((match = importRegex.exec(appContent)) !== null) {
    checkPath(match[1]);
}

while ((match = simpleImportRegex.exec(appContent)) !== null) {
    checkPath(match[1]);
}

if (missingImports.length > 0) {
    console.log("MISSING IMPORTS FOUND:");
    missingImports.forEach(i => console.log(i));
    process.exit(1);
} else {
    console.log("All imports validated successfully.");
}
