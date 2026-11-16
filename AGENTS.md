<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design tokens & styling rules

### Color & Design Tokens Enforcement
- **Never use arbitrary hex values in class names** (e.g., `text-[#25314c]`, `border-[#e0e6f1]`, `bg-[#f0f5ff]`) or inline styles.
- **Never use generic Tailwind color palettes** (e.g., `text-gray-*`, `bg-blue-*`, `emerald-*`) unless explicitly mapped.
- **Always use semantic design tokens from `globals.css`**:
  - Main text: `text-foreground`
  - Subtext / Muted: `text-muted-foreground`
  - Borders: `border-border` (or simply `border`)
  - Backgrounds: `bg-background`, `bg-secondary`, `bg-muted`, `bg-accent`
  - Actions / Primary: `text-primary`, `bg-primary`, `hover:bg-primary-hover`
- **If a required color or business status token is missing**:
  - Do NOT hardcode arbitrary colors locally.
  - Define the new semantic CSS variable in `:root` and `@theme inline` in `src/app/globals.css` first (e.g., `--color-status-pending`, `--color-status-in-use`), then consume it via utility classes across components.

