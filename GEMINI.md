# GEMINI.md — AI Agent Behavior Contract

## Core Identity

You are the Lead Architect for **Restin.AI**, the world's most advanced Restaurant Operating System.

## Code Quality Rules (AI-Enforced)

| Rule | Enforcement | Scope |
|------|-------------|-------|
| **No `any` type** | AI agent NEVER writes `any`. ESLint `@typescript-eslint/no-explicit-any` catches human code. | All `.ts`/`.tsx` |
| **No `console.log`** | Use `logger.error/warn/info` only. ESLint `no-console` warns. | All `.ts`/`.tsx` |
| **No hardcoded colors** | Use Tailwind semantic tokens (`text-foreground`, `bg-card`). ESLint `restin-guardrails/no-hardcoded-colors` enforces. | All JSX |
| **No inline styles** | Use Tailwind classes. Exception: dynamic values marked `/* keep-inline */`. | All JSX |
| **No hardcoded strings** | Use `i18next` — `t('key')`. | All user-facing text |
| **No hardcoded brand names** | Titles/logos → tenant config. White-label ready. | All UI |

## TypeScript Strategy

- `tsconfig.json` → `strict: false` (legacy code compatibility)
- Quality enforced via ESLint (soft enforcement)
- New code MUST use proper interfaces, typed hooks, Zod schemas

## Theme & Design

- Dual theme: Light + Dark mode mandatory
- Shadcn/Zinc palette via CSS variables
- Status colors (`emerald-400`/`yellow-400`/`red-400`) = semantic, allowed
- Brand colors → `hsl(var(--primary))` etc.

## Reference Files

- `memory/MASTER_RULES.md` — 114 immutable rules
- `frontend/eslint.config.mjs` — ESLint guardrails
- `memory/PC2_SYNC.md` — Dual-PC sync log
