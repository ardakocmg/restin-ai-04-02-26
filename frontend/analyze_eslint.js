const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));
    const counts = {};
    let e = 0, w = 0;
    data.forEach(f => {
        (f.messages || []).forEach(m => {
            const id = m.ruleId || 'unknown_rule';
            counts[id] = (counts[id] || 0) + 1;
            if (m.severity === 2) e++; else w++;
        });
    });
    console.log('Total Errors: ' + e);
    console.log('Total Warnings: ' + w);
    console.log('Total IDE Issues: ' + (e + w));
    console.log('\nBreakdown by Rule:');
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    sorted.forEach(([k,v]) => console.log(' - ' + k + ': ' + v));
} catch (err) {
    console.error(err);
}
