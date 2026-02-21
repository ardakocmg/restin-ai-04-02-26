const fs = require('fs');

// These are const declarations where the alias script wrongly added "name: _name"
// instead of just renaming to "_name"
const fixes = [
    ['src/pages/kds/KDSMain_v2.tsx', 28, 'user: _user', '_user'],
    ['src/pages/kds/KDSSetup.tsx', 17, 'user: _user', '_user'],
    ['src/pages/manager/floorplan/FloorplanEditor.tsx', 57, 'queryClient: _queryClient', '_queryClient'],
    ['src/pages/manager/forecasting/SeasonalPatterns.tsx', 17, 'venueId: _venueId', '_venueId'],
    ['src/pages/manager/guests/GuestProfiles.tsx', 30, 'queryClient: _queryClient', '_queryClient'],
    ['src/pages/manager/Microservices.tsx', 23, 'navigate: _navigate', '_navigate'],
    ['src/pages/manager/pos/KioskModePage.tsx', 32, 'queryClient: _queryClient', '_queryClient'],
    ['src/pages/manager/ProductManagement.tsx', 38, 'navigate: _navigate', '_navigate'],
    ['src/pages/manager/training/RecipeVideoBites.tsx', 27, 'queryClient: _queryClient', '_queryClient'],
];

let fixed = 0;

for (const [file, line, wrongPattern, rightPattern] of fixes) {
    if (!fs.existsSync(file)) { console.log('[MISS] ' + file); continue; }
    let content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const idx = line - 1;

    if (idx < lines.length && lines[idx].includes(wrongPattern)) {
        // Check if this is a const/let/var declaration (not destructuring)
        const line_content = lines[idx];

        // Only fix if this is NOT inside { } destructuring braces context
        // i.e., it's a plain const x = ... or inside [ ] array destructuring
        if (line_content.match(/const\s+/) || line_content.match(/let\s+/) || line_content.match(/^\s+/)) {
            lines[idx] = lines[idx].replace(wrongPattern, rightPattern);
            fixed++;
            console.log('[FIX] ' + file + ':' + line + ' ' + wrongPattern + ' -> ' + rightPattern);
        }
    } else {
        console.log('[SKIP] ' + file + ':' + line + ' pattern not found');
    }

    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

console.log('Done! Fixed: ' + fixed);
