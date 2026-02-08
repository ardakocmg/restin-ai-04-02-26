# Dark Mode Text Color Guidelines

## Semantic Text Tokens

Use these CSS variables for text colors to ensure proper contrast in dark mode:

| Token | Value | Usage |
|-------|-------|-------|
| `var(--text-primary)` | `#F5F5F7` | Main body text, headings |
| `var(--text-secondary)` | `#A1A1AA` | Secondary labels, descriptions |
| `var(--text-muted)` | `#71717A` | Hints, placeholders, disabled text |
| `var(--text-on-brand)` | `#FFFFFF` | Text on brand-colored backgrounds |
| `var(--text-on-dark-bg)` | `#F5F5F7` | Text on dark backgrounds |

## ✅ Correct Usage

```css
/* Good: Using semantic tokens */
.my-label {
  color: var(--text-primary);
}

/* Good: Using Tailwind with dark prefix */
.my-button {
  @apply text-white dark:text-zinc-100;
}

/* Good: Using contextual classes */
.my-card {
  @apply text-zinc-100; /* Light text on dark card */
}
```

## ❌ Avoid

```css
/* Bad: Hardcoded dark colors for text */
.my-label {
  color: #000;       /* Will be invisible on dark bg */
  color: #333;       /* Low contrast on dark bg */
  color: black;      /* Will be invisible */
}
```

## Exceptions

These usages are **permitted** and do not break dark mode:

1. **Print Templates** - Documents meant for white paper printing (payslips, FS3, contracts)
2. **Chart Elements** - Grid lines, axis ticks (e.g., `stroke="#333"` in Recharts)
3. **White-Background Buttons** - Intentional light buttons (`bg-white text-black`)
4. **Light Mode Styles** - Styles wrapped in `.dark` or `dark:` prefix

## Tailwind Text Classes Reference

| Class | Dark Mode Safe? | Notes |
|-------|-----------------|-------|
| `text-white` | ✅ | Always visible on dark backgrounds |
| `text-zinc-100` to `text-zinc-300` | ✅ | Light grays, good contrast |
| `text-zinc-400` | ✅ | Muted but readable |
| `text-zinc-500` | ⚠️ | Use sparingly (low contrast) |
| `text-zinc-600` to `text-zinc-900` | ❌ | Dark grays - problematic |
| `text-black` | ❌ | Only use with `bg-white` or print |

## Global Overrides

The `index.css` file includes global overrides (lines 441-488) that automatically map potentially problematic classes to lighter colors:

- `text-gray-700`, `text-slate-700`, `text-zinc-700` → `#E2E8F0`
- `text-gray-900`, `text-slate-900`, `text-zinc-900` → `#F8FAFC`
- `bg-white` → `#18181B` (dark card background)

This provides a safety net, but prefer using the semantic tokens above for new code.
