---
description: Pre-commit verification - comprehensive checks for chunk load errors, button nesting, TS errors, code quality, security, and accessibility before committing
---

# Pre-Commit Verification Checklist

Run ALL checks below before committing. Fix any failures before proceeding.

---

## 🔴 CRITICAL CHECKS (Must Pass)

### 1. TypeScript Compilation (ZERO TOLERANCE)

// turbo

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && npx tsc --noEmit 2>&1 | Select-String "error TS" | Select-Object -First 30
```

Also run the error count:

// turbo

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && npx tsc --noEmit 2>&1 | Select-String "error TS" | Measure-Object | Select-Object -Property Count
```

**Rule:** ZERO TypeScript errors allowed. `Count` must be `0`. All props must have interfaces, all `useState` must have generics, all callbacks must be typed. See Architecture Rule 14.

### 2. Chunk Load Error Check (Missing Lazy Pages)

// turbo
Verify all lazy-loaded pages in `App.tsx` have corresponding files:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && powershell -Command "Get-Content src/App.tsx | Select-String 'React\.lazy\(\(\) => import\(' | ForEach-Object { if ($_ -match 'import\(\"(.+?)\"\)') { $path = $matches[1] -replace '@/', 'src/' -replace '\./', 'src/'; $exts = @('.tsx','.ts','.jsx','.js'); $found = $false; foreach ($ext in $exts) { if (Test-Path \"$path$ext\") { $found = $true; break } }; if (!(Test-Path \"$path/index.tsx\") -and !(Test-Path \"$path/index.ts\") -and !$found) { Write-Host \"MISSING: $path\" } } }"
```

**Rule:** Any missing file = ChunkLoadError at runtime. Create the file or remove the route.

### 3. Button Nesting Check

// turbo
Detect `<button>` inside `<button>` (invalid HTML, React hydration errors):

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\layouts\*.tsx","src\components\**\*.tsx" -Pattern "<button" -Recurse | Group-Object Path | Where-Object { $_.Count -gt 3 } | Format-Table Name, Count -AutoSize
```

**Rule:** Files with 4+ `<button>` tags are candidates for nesting. Use `<span role="button" tabIndex={0}>` for interactive elements inside buttons.

### 4. `any` Type Usage

// turbo
TypeScript `any` is FORBIDDEN (Rule #1):

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern ": any[^_A-Za-z]|: any$|as any" -Recurse | Where-Object { $_.Line -notmatch "// eslint-disable|// @ts-ignore|TODO" } | Select-Object -First 20 | Format-Table LineNumber, Path, Line -AutoSize
```

**Rule:** Replace `any` with proper types. Use `unknown` + type guards if needed.

### 5. Console.log Detection

// turbo
`console.log` is FORBIDDEN (Rule #8). Use structured `logger.error/info/warn`:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "console\.(log|warn|error|debug|info)" -Recurse | Where-Object { $_.Line -notmatch "// eslint-disable|// keep|setupProxy" } | Select-Object -First 20 | Format-Table LineNumber, Path -AutoSize
```

### 6. Missing Backend Route Registration

// turbo
Verify all route files in `backend/routes/` are imported in `app/main.py`:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai && powershell -Command "$routes = Get-ChildItem -Path 'backend\routes\*.py' -Name | Where-Object { $_ -ne '__init__.py' -and $_ -ne '__pycache__' }; $main = Get-Content 'backend\app\main.py' -Raw; foreach ($r in $routes) { $name = $r -replace '\.py$',''; if ($main -notmatch $name) { Write-Host \"NOT MOUNTED: $r\" } }"
```

**Rule:** New backend routes MUST be mounted in `app/main.py`, NOT in legacy `server.py`.

### 7. Hardcoded Strings (i18n Violations)

// turbo
Check for hardcoded user-facing strings that should use `t('key')` (Rule #8-ii):

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\pages\**\*.tsx" -Pattern ">(No |>Error |>Loading |>Are you sure|>Delete |>Save |>Cancel |>Submit |>Success" -Recurse | Select-Object -First 15 | Format-Table LineNumber, Path -AutoSize
```

**Note:** This is advisory — flag files with many hardcoded strings for future i18n migration.

### 8. Dark Mode Violations

// turbo
Hard-light colors that break dark mode:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx" -Pattern "bg-white[^/]|text-black[^/]|border-gray-[123]00" -Recurse | Where-Object { $_.Path -notmatch "node_modules|\.test\." } | Select-Object -First 15 | Format-Table LineNumber, Path -AutoSize
```

**Rule:** Use zinc palette (`bg-zinc-900`, `text-zinc-100`) for dark mode compliance.

### 8.5. Hardcoded Colors (No Raw Hex/RGB)

// turbo
Detect hardcoded color values that should use CSS variables from the design system:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\pages\**\*.tsx","src\components\**\*.tsx" -Pattern "#[0-9a-fA-F]{3,8}[^-_a-zA-Z]|rgb\(|rgba\(|hsl\(|hsla\(" -Recurse | Where-Object { $_.Line -notmatch "// keep|eslint-disable|\.css|keyframes|@|gradient" } | Select-Object -First 25 | Format-Table LineNumber, Path -AutoSize
```

**Rule:** NEVER use hardcoded color values (`#1a1a1a`, `rgb(0,0,0)`, etc.) in TSX/TS component files. All colors MUST reference CSS variables from the design system (`var(--bg-primary)`, `var(--text-secondary)`, `var(--border-primary)`, etc.) or use classes from shared CSS files (`pos-shared.css`, `index.css`). Exceptions: CSS files defining the variables themselves, keyframe animations, and gradients using existing vars.

---

## 🟡 IMPORTANT CHECKS (Should Pass)

### 9. Empty Catch Blocks

// turbo
Catch blocks that silently swallow errors:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx","src\**\*.ts" -Pattern "catch\s*(\([^)]*\))?\s*\{\s*\}" -Recurse | Select-Object -First 15 | Format-Table LineNumber, Path -AutoSize
```

**Rule:** Always log errors or handle gracefully. Never swallow silently.

### 10. Unused Imports

// turbo
Dead imports increase bundle size:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && npx tsc --noEmit 2>&1 | Select-String "is declared but" | Select-Object -First 20
```

### 11. API Endpoint Duplicate Check

// turbo
Multiple routers with same prefix:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\backend && Select-String -Path "routes\*.py" -Pattern 'prefix\s*=\s*"([^"]+)"' | ForEach-Object { if ($_ -match 'prefix\s*=\s*"([^"]+)"') { $matches[1] } } | Group-Object | Where-Object { $_.Count -gt 1 } | Format-Table Name, Count
```

### 12. .env / Secret Leak Check

// turbo
Ensure no secrets are staged for commit:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai && Select-String -Path "frontend\src\**\*.tsx","frontend\src\**\*.ts","backend\**\*.py" -Pattern "sk-[a-zA-Z0-9]{20,}|password\s*=\s*['\"][^'\"]+['\"]|MONGO.*mongodb\+srv|AIza[0-9A-Za-z_-]{35}" -Recurse | Select-Object -First 10 | Format-Table LineNumber, Path -AutoSize
```

**Rule:** NEVER commit API keys, passwords, or connection strings in source files.

### 13. Component Size Check

// turbo
Components over 500 lines should be split:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && powershell -Command "Get-ChildItem -Path 'src\pages','src\components' -Filter '*.tsx' -Recurse | ForEach-Object { $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines; if ($lines -gt 500) { Write-Host \"$($lines) lines: $($_.FullName -replace [regex]::Escape((Get-Location).Path + '\'), '')\" } } | Sort-Object -Descending"
```

---

## 🟢 QUALITY CHECKS (Advisory)

### 14. TODO/FIXME Counter

// turbo
Track outstanding work items:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai && Select-String -Path "frontend\src\**\*.tsx","frontend\src\**\*.ts","backend\**\*.py" -Pattern "TODO|FIXME|HACK|XXX" -Recurse | Measure-Object | Select-Object Count
```

### 15. Key Prop in .map() Check

// turbo
Missing `key` props cause React warnings:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx" -Pattern "\.map\(" -Recurse | ForEach-Object { $line = $_.LineNumber; $file = $_.Path; $next5 = Get-Content $file | Select-Object -Skip ($line-1) -First 5; $joined = $next5 -join " "; if ($joined -notmatch "key=" -and $joined -match "<") { Write-Host "${file}:${line}" } } | Select-Object -First 10
```

### 16. Accessibility (a11y) Quick Check

// turbo
Images without alt, interactive elements without labels:

```
cd c:\Users\MG Group\.gemini\antigravity\scratch\restin-ai\frontend && Select-String -Path "src\**\*.tsx" -Pattern '<img[^>]*(?!alt=)[^>]*/>' -Recurse | Select-Object -First 10 | Format-Table LineNumber, Path -AutoSize
```

---

## Summary

| Priority | Check | Action on Fail |
|----------|-------|---------------|
| 🔴 | TS Compilation | **Block commit** |
| 🔴 | Chunk Load Errors | **Block commit** |
| 🔴 | Button Nesting | **Block commit** |
| 🔴 | `any` Usage | **Block commit** |
| 🔴 | Console.log | **Block commit** |
| 🔴 | Missing Route Mount | **Block commit** |
| 🔴 | Hardcoded Strings | Flag for review |
| 🔴 | Dark Mode Violations | Flag for review |
| 🔴 | Hardcoded Colors | Flag for review |
| 🟡 | Empty Catch | Fix if new code |
| 🟡 | Unused Imports | Clean up |
| 🟡 | Duplicate Routes | Fix immediately |
| 🟡 | Secret Leak | **Block commit** |
| 🟡 | Component Size | Plan refactor |
| 🟢 | TODO Counter | Track in task.md |
| 🟢 | Key Prop | Fix warnings |
| 🟢 | Accessibility | Improve iteratively |
