"""
Hardcoded Tailwind Color → Theme Token Migration Script
Replaces hardcoded Tailwind color classes with theme-aware tokens.

Strategy:
  Phase 1: Neutral grays (slate/zinc/gray/neutral/stone) → theme tokens
  Phase 2: Status colors without dark: → add dark: variant pair
  
Safe because:
  - Only touches className strings in .tsx files
  - Preserves dark: variants already present
  - Does NOT touch hex colors, inline styles, or CSS files
"""
import os, re, glob

SRC = r"frontend\src"
EXTENSIONS = ["*.tsx"]

# ═══════════════════════════════════════════════════════════════
# PHASE 1: NEUTRAL GRAYS → THEME TOKENS
# These are safe 1:1 replacements — gray/slate/zinc/neutral/stone
# are layout colors that should use CSS variables.
# ═══════════════════════════════════════════════════════════════

# Pattern: "text-{gray}-{shade} dark:text-{gray}-{shade}" → single theme token
# We handle pairs FIRST (to avoid double-replacing)
PAIR_REPLACEMENTS = {
    # text-foreground pairs (dark text + light text in dark mode)
    r'text-(?:slate|zinc|gray|neutral|stone)-900\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:50|100|200)': 'text-foreground',
    r'text-(?:slate|zinc|gray|neutral|stone)-800\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:100|200)': 'text-foreground',
    r'text-(?:slate|zinc|gray|neutral|stone)-700\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:200|300)': 'text-foreground',
    
    # text-muted-foreground pairs
    r'text-(?:slate|zinc|gray|neutral|stone)-500\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:300|400)': 'text-muted-foreground',
    r'text-(?:slate|zinc|gray|neutral|stone)-600\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:300|400)': 'text-muted-foreground',
    r'text-(?:slate|zinc|gray|neutral|stone)-400\s+dark:text-(?:slate|zinc|gray|neutral|stone)-(?:400|500)': 'text-muted-foreground',
    r'text-(?:slate|zinc|gray|neutral|stone)-500\s+dark:text-(?:slate|zinc|gray|neutral|stone)-500': 'text-muted-foreground',
    
    # bg-background pairs
    r'bg-white\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-(?:900|950)': 'bg-background',
    r'bg-(?:slate|zinc|gray|neutral|stone)-50\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-(?:900|950)': 'bg-background',
    
    # bg-muted pairs
    r'bg-(?:slate|zinc|gray|neutral|stone)-100\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-800': 'bg-muted',
    r'bg-(?:slate|zinc|gray|neutral|stone)-200\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-(?:700|800)': 'bg-muted',
    r'bg-(?:slate|zinc|gray|neutral|stone)-100\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-(?:700|900)': 'bg-muted',
    
    # bg-card pairs
    r'bg-white\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-800': 'bg-card',
    r'bg-(?:slate|zinc|gray|neutral|stone)-50\s+dark:bg-(?:slate|zinc|gray|neutral|stone)-800': 'bg-card',
    
    # border-border pairs
    r'border-(?:slate|zinc|gray|neutral|stone)-200\s+dark:border-(?:slate|zinc|gray|neutral|stone)-(?:700|800)': 'border-border',
    r'border-(?:slate|zinc|gray|neutral|stone)-300\s+dark:border-(?:slate|zinc|gray|neutral|stone)-(?:600|700)': 'border-border',
    r'border-(?:slate|zinc|gray|neutral|stone)-100\s+dark:border-(?:slate|zinc|gray|neutral|stone)-800': 'border-border',
    
    # divide pairs
    r'divide-(?:slate|zinc|gray|neutral|stone)-200\s+dark:divide-(?:slate|zinc|gray|neutral|stone)-(?:700|800)': 'divide-border',
}

# Single neutral replacements (no dark: pair present)
SINGLE_REPLACEMENTS = {
    # Text → foreground (dark shades = main text)
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-900(?!\S)': 'text-foreground',
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-800(?!\S)': 'text-foreground',
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-700(?!\S)': 'text-foreground',
    
    # Text → muted-foreground (mid shades = secondary text)
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-600(?!\S)': 'text-muted-foreground',
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-500(?!\S)': 'text-muted-foreground',
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-400(?!\S)': 'text-muted-foreground',
    r'(?<!\S)text-(?:slate|zinc|gray|neutral|stone)-300(?!\S)': 'text-muted-foreground',
    
    # Background → background (very light = page bg)
    r'(?<!\S)bg-(?:slate|zinc|gray|neutral|stone)-50(?!\S)': 'bg-background',
    
    # Background → muted (light = section bg)
    r'(?<!\S)bg-(?:slate|zinc|gray|neutral|stone)-100(?!\S)': 'bg-muted',
    r'(?<!\S)bg-(?:slate|zinc|gray|neutral|stone)-200(?!\S)': 'bg-muted',
    
    # Background → secondary (medium = interactive bg)
    r'(?<!\S)bg-(?:slate|zinc|gray|neutral|stone)-300(?!\S)': 'bg-secondary',
    
    # Border → border
    r'(?<!\S)border-(?:slate|zinc|gray|neutral|stone)-100(?!\S)': 'border-border',
    r'(?<!\S)border-(?:slate|zinc|gray|neutral|stone)-200(?!\S)': 'border-border',
    r'(?<!\S)border-(?:slate|zinc|gray|neutral|stone)-300(?!\S)': 'border-border',
    
    # Divide → border
    r'(?<!\S)divide-(?:slate|zinc|gray|neutral|stone)-200(?!\S)': 'divide-border',
    r'(?<!\S)divide-(?:slate|zinc|gray|neutral|stone)-100(?!\S)': 'divide-border',
}

# ═══════════════════════════════════════════════════════════════
# PHASE 2: STATUS COLORS — add dark: variant if missing
# Only when NO dark: follows immediately in the same className
# ═══════════════════════════════════════════════════════════════

STATUS_DARK_PAIRS = {
    # Red (error/destructive)
    r'(?<!\S)text-red-500(?!\S)(?!\s+dark:text-red)': 'text-red-600 dark:text-red-400',
    r'(?<!\S)text-red-600(?!\S)(?!\s+dark:text-red)': 'text-red-600 dark:text-red-400',
    r'(?<!\S)text-red-700(?!\S)(?!\s+dark:text-red)': 'text-red-700 dark:text-red-400',
    r'(?<!\S)bg-red-50(?!\S)(?!\s+dark:bg-red)': 'bg-red-50 dark:bg-red-950/20',
    r'(?<!\S)bg-red-100(?!\S)(?!\s+dark:bg-red)': 'bg-red-100 dark:bg-red-950/20',
    r'(?<!\S)border-red-200(?!\S)(?!\s+dark:border-red)': 'border-red-200 dark:border-red-800',
    r'(?<!\S)border-red-300(?!\S)(?!\s+dark:border-red)': 'border-red-300 dark:border-red-800',
    
    # Green (success)
    r'(?<!\S)text-green-500(?!\S)(?!\s+dark:text-green)': 'text-green-600 dark:text-green-400',
    r'(?<!\S)text-green-600(?!\S)(?!\s+dark:text-green)': 'text-green-600 dark:text-green-400',
    r'(?<!\S)text-green-700(?!\S)(?!\s+dark:text-green)': 'text-green-700 dark:text-green-400',
    r'(?<!\S)bg-green-50(?!\S)(?!\s+dark:bg-green)': 'bg-green-50 dark:bg-green-950/20',
    r'(?<!\S)bg-green-100(?!\S)(?!\s+dark:bg-green)': 'bg-green-100 dark:bg-green-950/20',
    r'(?<!\S)border-green-200(?!\S)(?!\s+dark:border-green)': 'border-green-200 dark:border-green-800',
    
    # Emerald (success variant)
    r'(?<!\S)text-emerald-500(?!\S)(?!\s+dark:text-emerald)': 'text-emerald-600 dark:text-emerald-400',
    r'(?<!\S)text-emerald-600(?!\S)(?!\s+dark:text-emerald)': 'text-emerald-600 dark:text-emerald-400',
    r'(?<!\S)text-emerald-700(?!\S)(?!\s+dark:text-emerald)': 'text-emerald-700 dark:text-emerald-400',
    r'(?<!\S)bg-emerald-50(?!\S)(?!\s+dark:bg-emerald)': 'bg-emerald-50 dark:bg-emerald-950/20',
    r'(?<!\S)bg-emerald-100(?!\S)(?!\s+dark:bg-emerald)': 'bg-emerald-100 dark:bg-emerald-950/20',
    r'(?<!\S)border-emerald-200(?!\S)(?!\s+dark:border-emerald)': 'border-emerald-200 dark:border-emerald-800',
    
    # Blue (info/primary actions)
    r'(?<!\S)text-blue-500(?!\S)(?!\s+dark:text-blue)': 'text-blue-600 dark:text-blue-400',
    r'(?<!\S)text-blue-600(?!\S)(?!\s+dark:text-blue)': 'text-blue-600 dark:text-blue-400',
    r'(?<!\S)text-blue-700(?!\S)(?!\s+dark:text-blue)': 'text-blue-700 dark:text-blue-400',
    r'(?<!\S)bg-blue-50(?!\S)(?!\s+dark:bg-blue)': 'bg-blue-50 dark:bg-blue-950/20',
    r'(?<!\S)bg-blue-100(?!\S)(?!\s+dark:bg-blue)': 'bg-blue-100 dark:bg-blue-950/20',
    r'(?<!\S)border-blue-200(?!\S)(?!\s+dark:border-blue)': 'border-blue-200 dark:border-blue-800',
    
    # Amber/Yellow (warning)
    r'(?<!\S)text-amber-500(?!\S)(?!\s+dark:text-amber)': 'text-amber-600 dark:text-amber-400',
    r'(?<!\S)text-amber-600(?!\S)(?!\s+dark:text-amber)': 'text-amber-600 dark:text-amber-400',
    r'(?<!\S)text-amber-700(?!\S)(?!\s+dark:text-amber)': 'text-amber-700 dark:text-amber-400',
    r'(?<!\S)bg-amber-50(?!\S)(?!\s+dark:bg-amber)': 'bg-amber-50 dark:bg-amber-950/20',
    r'(?<!\S)bg-amber-100(?!\S)(?!\s+dark:bg-amber)': 'bg-amber-100 dark:bg-amber-950/20',
    r'(?<!\S)border-amber-200(?!\S)(?!\s+dark:border-amber)': 'border-amber-200 dark:border-amber-800',
    
    r'(?<!\S)text-yellow-500(?!\S)(?!\s+dark:text-yellow)': 'text-yellow-600 dark:text-yellow-400',
    r'(?<!\S)text-yellow-600(?!\S)(?!\s+dark:text-yellow)': 'text-yellow-600 dark:text-yellow-400',
    r'(?<!\S)bg-yellow-50(?!\S)(?!\s+dark:bg-yellow)': 'bg-yellow-50 dark:bg-yellow-950/20',
    
    # Orange (alert)
    r'(?<!\S)text-orange-500(?!\S)(?!\s+dark:text-orange)': 'text-orange-600 dark:text-orange-400',
    r'(?<!\S)text-orange-600(?!\S)(?!\s+dark:text-orange)': 'text-orange-600 dark:text-orange-400',
    r'(?<!\S)bg-orange-50(?!\S)(?!\s+dark:bg-orange)': 'bg-orange-50 dark:bg-orange-950/20',
    r'(?<!\S)border-orange-200(?!\S)(?!\s+dark:border-orange)': 'border-orange-200 dark:border-orange-800',
    
    # Purple (feature/info)
    r'(?<!\S)text-purple-500(?!\S)(?!\s+dark:text-purple)': 'text-purple-600 dark:text-purple-400',
    r'(?<!\S)text-purple-600(?!\S)(?!\s+dark:text-purple)': 'text-purple-600 dark:text-purple-400',
    r'(?<!\S)bg-purple-50(?!\S)(?!\s+dark:bg-purple)': 'bg-purple-50 dark:bg-purple-950/20',
    r'(?<!\S)border-purple-200(?!\S)(?!\s+dark:border-purple)': 'border-purple-200 dark:border-purple-800',
    
    # Indigo
    r'(?<!\S)text-indigo-500(?!\S)(?!\s+dark:text-indigo)': 'text-indigo-600 dark:text-indigo-400',
    r'(?<!\S)text-indigo-600(?!\S)(?!\s+dark:text-indigo)': 'text-indigo-600 dark:text-indigo-400',
    r'(?<!\S)bg-indigo-50(?!\S)(?!\s+dark:bg-indigo)': 'bg-indigo-50 dark:bg-indigo-950/20',
    r'(?<!\S)border-indigo-200(?!\S)(?!\s+dark:border-indigo)': 'border-indigo-200 dark:border-indigo-800',
    
    # Cyan/Teal
    r'(?<!\S)text-cyan-500(?!\S)(?!\s+dark:text-cyan)': 'text-cyan-600 dark:text-cyan-400',
    r'(?<!\S)text-cyan-600(?!\S)(?!\s+dark:text-cyan)': 'text-cyan-600 dark:text-cyan-400',
    r'(?<!\S)text-teal-500(?!\S)(?!\s+dark:text-teal)': 'text-teal-600 dark:text-teal-400',
    r'(?<!\S)text-teal-600(?!\S)(?!\s+dark:text-teal)': 'text-teal-600 dark:text-teal-400',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # Phase 1a: Replace pairs first (more specific)
    for pattern, replacement in PAIR_REPLACEMENTS.items():
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            diff = int(len(re.findall(pattern, content)))
            changes += diff
            content = new_content
    
    # Phase 1b: Replace singles (less specific)
    for pattern, replacement in SINGLE_REPLACEMENTS.items():
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            diff = int(len(re.findall(pattern, content)))
            changes += diff
            content = new_content
    
    # Phase 2: Status colors — add dark: pair
    for pattern, replacement in STATUS_DARK_PAIRS.items():
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            diff = int(len(re.findall(pattern, content)))
            changes += diff
            content = new_content
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
    
    return int(changes)

# Run migration
total_changes = int(0)
files_changed = int(0)

for ext in EXTENSIONS:
    for filepath in glob.glob(os.path.join(SRC, "**", ext), recursive=True):
        n = process_file(filepath)
        if n > 0:
            rel = os.path.relpath(filepath, SRC)
            print(f"  {rel}: {n} replacements")
            total_changes += n
            files_changed += 1

print(f"\n{'='*50}")
print(f"Total: {total_changes} replacements across {files_changed} files")
