---
description: Rules for working with 2 Antigravity agents on 2 PCs on the same codebase
---

# 🛡️ Dual-PC Antigravity Workflow

## CRITICAL RULES (ALWAYS FOLLOW)

### Rule 1: CHECK WORKLOCK BEFORE EDITING

Before modifying ANY file, check `.worklock` in the repo root.
If the file you want to edit is listed there, **DO NOT EDIT IT**.
Instead, notify the user that the file is locked by the other PC.

```bash
# Check worklock
cat .worklock
```

### Rule 2: ALWAYS PULL BEFORE STARTING WORK

Before making any changes, always run:

```bash
git fetch origin
git status
```

If you are behind, pull first:

```bash
git pull origin main
```

### Rule 3: LOCK FILES YOU'RE WORKING ON

When starting work on a file or feature area, run:
// turbo

```powershell
.\scripts\worklock.ps1 lock "description of what you're working on" "file1.tsx,file2.py"
```

### Rule 4: UNLOCK WHEN DONE

After committing and pushing, unlock:
// turbo

```powershell
.\scripts\worklock.ps1 unlock
```

### Rule 5: ATOMIC COMMITS

Make small, focused commits. Don't batch 20 files into one commit.
This reduces merge conflict surface area.

### Rule 6: PUSH IMMEDIATELY AFTER COMMIT

Never leave unpushed commits. The other PC might start working on the same area.

```bash
git push origin main
```

### Rule 7: BRANCH FOR RISKY WORK

If working on something that touches many files (refactoring, migrations):
// turbo

```bash
git checkout -b pc1/feature-name
# ... work ...
git checkout main
git merge pc1/feature-name
git push origin main
```

## PC IDENTIFICATION

- **PC1 (MG Group)**: `\\192.168.31.243` — Primary development machine
- **PC2 (arda / DESKTOP-HD5N1D3)**: Secondary development machine

## DOMAIN SPLITTING (Recommended)

To minimize conflicts, split work domains:

| Domain | Files | Preferred PC |
|--------|-------|-------------|
| Backend routes | `backend/routes/*.py` | Either (low conflict) |
| Frontend pages | `frontend/src/pages/**` | Lock via worklock |
| Layouts/Core | `frontend/src/layouts/*` | PC1 only |
| App.tsx / Routes | `frontend/src/App.tsx`, `routes/*` | PC1 only |
| POS | `frontend/src/pages/pos/*` | Lock via worklock |
| Config/Scripts | `*.ps1`, `.agent/*` | PC1 only |

### Rule 8: AUTO-PULL WATCHER (PC2)

Run the auto-pull watcher on PC2 so it automatically syncs when PC1 pushes:
// turbo

```powershell
.\scripts\git-auto-pull.ps1              # Poll every 30s (default)
.\scripts\git-auto-pull.ps1 -Interval 15 # Poll every 15s
.\scripts\git-auto-pull.ps1 -Once        # Single check
```

The watcher will:

- Fetch from origin every N seconds
- Auto-pull when new commits are detected
- Stash local changes before pulling, restore after
- Play a beep sound to notify you of updates

## CODE QUALITY RULES (Both PCs Must Follow)

### No Inline Styles

- **NEVER** use `style={{}}` for hardcoded values (padding, colors, font-size, margins, borders)
- **ALWAYS** use Tailwind CSS classes instead
- **Only exception:** Dynamic runtime values (`style={{ width:`${percent}%`}}`, `style={{ top: contextMenu.y }}`)
- Mark legitimate dynamic exceptions with `// keep-inline` comment
- Use Tailwind arbitrary values for dynamic colors: `className="bg-[#6366f1]"` not `style={{ backgroundColor: '#6366f1' }}`
- Run `/pre-commit-check` check 8.6 before committing
