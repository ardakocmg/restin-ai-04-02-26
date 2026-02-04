// Duplicate Symbol Guard - Prevents build failures
const fs = require("fs");
const path = require("path");

const TARGETS = [
  { file: "src/pages/pos/POSMain.js", symbols: ["calculateTotal", "sendOrder", "POSMain"] },
  { file: "src/pages/kds/KDSMain.js", symbols: ["KDSMain"] },
  { file: "src/lib/api.js", symbols: ["refreshToken", "api"] },
  { file: "src/App.js", symbols: ["App", "RootOverlays"] }
];

function countOccurrences(text, needle) {
  const re = new RegExp("\\b" + needle + "\\b", "g");
  return (text.match(re) || []).length;
}

let failed = false;

for (const t of TARGETS) {
  const filePath = path.join("/app/frontend", t.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`[GUARD] Skipping ${t.file} (not found)`);
    continue;
  }
  
  const src = fs.readFileSync(filePath, "utf8");

  for (const sym of t.symbols) {
    // Count "const symbol" and "function symbol" declarations
    const constDef = (src.match(new RegExp("\\bconst\\s+" + sym + "\\b", "g")) || []).length;
    const fnDef = (src.match(new RegExp("\\bfunction\\s+" + sym + "\\b", "g")) || []).length;
    const asyncFnDef = (src.match(new RegExp("\\basync\\s+function\\s+" + sym + "\\b", "g")) || []).length;

    const total = constDef + fnDef + asyncFnDef;
    
    if (total > 1) {
      console.error(`[GUARD] ❌ Duplicate definition: ${sym} in ${t.file}`);
      console.error(`        const: ${constDef}, function: ${fnDef}, async function: ${asyncFnDef}`);
      failed = true;
    }
  }

  // Detect adjacent duplicate lines (common patch error)
  const lines = src.split("\n");
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i].trim();
    const next = lines[i + 1].trim();
    
    if (current && current === next && current.length > 10) {
      console.error(`[GUARD] ❌ Adjacent duplicate line in ${t.file} at line ${i + 1}:`);
      console.error(`        "${current.slice(0, 80)}"`);
      failed = true;
      break;  // One per file is enough
    }
  }
}

if (failed) {
  console.error("\n[GUARD] ❌ BUILD BLOCKED - Fix duplicates and retry deploy.\n");
  process.exit(1);
}

console.log("[GUARD] ✓ No duplicate definitions or adjacent duplicate lines found.");
process.exit(0);
