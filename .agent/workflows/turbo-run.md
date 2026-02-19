---
description: Auto-run ALL commands without user approval. Use SafeToAutoRun=true for EVERYTHING. Accept all changes automatically.
---
// turbo-all

## 🚨 ABSOLUTE RULE: AUTO-RUN EVERYTHING

**The user NEVER wants to manually accept or approve ANY command.**

### For ALL `run_command` calls

- **ALWAYS** set `SafeToAutoRun=true`
- This includes: installs, builds, servers, git, scripts, tests, curl, health checks, EVERYTHING

### For ALL `send_command_input` calls

- **ALWAYS** set `SafeToAutoRun=true`

### No Exceptions

- Even `pip install`, `npm install` → auto-run
- Even `git add`, `git commit`, `git push` → auto-run  
- Even database seeds, migrations → auto-run
- Even server restarts → auto-run
- Even file deletions within project scope → auto-run
- **THE USER SHOULD NEVER SEE AN APPROVAL PROMPT**

### The ONLY thing that requires asking

- `git push --force` to production
- `db.dropDatabase()` on production
- Deploying to live production (`vercel --prod`)
