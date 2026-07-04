# Noesis Web 登录与控制台基础布局 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first usable Noesis Web shell: Owner Token login gate, routed console layout, theme toggle, and honest P0 status pages.

**Architecture:** Keep the feature inside `packages/web`. Use React Router `HashRouter` so refreshes work without Gateway history fallback, use shadcn-style primitives for reusable UI, and isolate localStorage behavior in small tested helpers. The app remains frontend-only and does not introduce backend auth.

**Tech Stack:** React 19, Vite 7, TypeScript, Tailwind CSS v4, shadcn-style components, lucide-react, react-router-dom, Vitest.

---

## File map

- Modify `packages/web/package.json`: add UI/routing dependencies and run a tiny web unit test after build.
- Modify `packages/web/tsconfig.json`: add `@/*` path alias for shadcn-compatible imports.
- Modify `packages/web/vite.config.ts`: add Tailwind Vite plugin and `@` alias.
- Create `packages/web/components.json`: records shadcn configuration for future component additions.
- Create `packages/web/src/lib/utils.ts`: shared `cn()` helper for class merging.
- Create `packages/web/src/components/ui/button.tsx`: shadcn-style button primitive.
- Create `packages/web/src/components/ui/input.tsx`: shadcn-style input primitive.
- Create `packages/web/src/components/ui/label.tsx`: shadcn-style label primitive.
- Create `packages/web/src/components/ui/card.tsx`: shadcn-style card primitives.
- Create `packages/web/src/components/ui/separator.tsx`: shadcn-style separator primitive.
- Create `packages/web/src/session.ts`: localStorage keys and safe read/write helpers.
- Create `packages/web/src/session.test.ts`: deterministic unit checks for the storage helpers.
- Replace `packages/web/src/App.tsx`: login gate, console shell, routes, and pages.
- Replace `packages/web/src/styles.css`: Tailwind entry, theme tokens, Noesis tech background and shell polish.
- Optionally modify `packages/web/index.html`: keep the existing viewport; add theme color if desired.

## Blast radius note

Before implementation, GitNexus impact was run for `Function:packages/web/src/App.tsx:App`.

- Risk: LOW
- Direct upstream caller: `packages/web/src/main.tsx`
- Affected processes: none reported

If the GitNexus index is rebuilt or `App` changes before execution starts, rerun the same impact check before editing `App.tsx`.

---

### Task 1: Install UI dependencies and configure Vite/Tailwind/shadcn

**Files:**

- Modify: `packages/web/package.json`
- Modify: `packages/web/tsconfig.json`
- Modify: `packages/web/vite.config.ts`
- Create: `packages/web/components.json`
- Replace: `packages/web/src/styles.css`

- [ ] **Step 1: Install runtime UI dependencies**

Run from repo root:

```bash
pnpm --filter @noesis/web add react-router-dom lucide-react clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-separator tw-animate-css
```

Expected: `packages/web/package.json` and `pnpm-lock.yaml` are updated.

- [ ] **Step 2: Install Tailwind Vite dependencies**

Run from repo root:

```bash
pnpm --filter @noesis/web add -D tailwindcss @tailwindcss/vite
```

Expected: Tailwind dependencies are added to `packages/web/package.json` devDependencies.

- [ ] **Step 3: Update `packages/web/tsconfig.json`**

Replace the file with:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "allowImportingTsExtensions": false,
    "noEmit": true,
    "types": ["vite/client"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Update `packages/web/vite.config.ts`**

Replace the file with:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
 plugins: [react(), tailwindcss()],
 resolve: {
  alias: {
   "@": path.resolve(dirname, "./src"),
  },
 },
});
```

- [ ] **Step 5: Create `packages/web/components.json`**

Create the file with:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 6: Replace `packages/web/src/styles.css` with Tailwind theme tokens**

Replace the file with:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
 --radius: 0.8rem;
 --background: oklch(0.98 0.012 255);
 --foreground: oklch(0.18 0.035 260);
 --card: oklch(1 0 0 / 0.84);
 --card-foreground: oklch(0.18 0.035 260);
 --popover: oklch(1 0 0);
 --popover-foreground: oklch(0.18 0.035 260);
 --primary: oklch(0.58 0.22 285);
 --primary-foreground: oklch(0.98 0.01 260);
 --secondary: oklch(0.94 0.025 260);
 --secondary-foreground: oklch(0.25 0.04 260);
 --muted: oklch(0.93 0.02 260);
 --muted-foreground: oklch(0.46 0.035 260);
 --accent: oklch(0.86 0.09 205);
 --accent-foreground: oklch(0.17 0.04 260);
 --destructive: oklch(0.58 0.22 25);
 --border: oklch(0.86 0.025 260);
 --input: oklch(0.86 0.025 260);
 --ring: oklch(0.66 0.2 285);
}

.dark {
 --background: oklch(0.095 0.025 260);
 --foreground: oklch(0.94 0.018 255);
 --card: oklch(0.16 0.035 260 / 0.76);
 --card-foreground: oklch(0.94 0.018 255);
 --popover: oklch(0.14 0.035 260);
 --popover-foreground: oklch(0.94 0.018 255);
 --primary: oklch(0.68 0.22 285);
 --primary-foreground: oklch(0.98 0.01 260);
 --secondary: oklch(0.22 0.04 260);
 --secondary-foreground: oklch(0.9 0.02 255);
 --muted: oklch(0.22 0.035 260);
 --muted-foreground: oklch(0.68 0.035 255);
 --accent: oklch(0.72 0.16 205);
 --accent-foreground: oklch(0.08 0.02 260);
 --destructive: oklch(0.66 0.21 25);
 --border: oklch(0.32 0.04 260 / 0.72);
 --input: oklch(0.25 0.04 260 / 0.8);
 --ring: oklch(0.72 0.18 285);
}

@theme inline {
 --radius-sm: calc(var(--radius) - 4px);
 --radius-md: calc(var(--radius) - 2px);
 --radius-lg: var(--radius);
 --radius-xl: calc(var(--radius) + 4px);
 --color-background: var(--background);
 --color-foreground: var(--foreground);
 --color-card: var(--card);
 --color-card-foreground: var(--card-foreground);
 --color-popover: var(--popover);
 --color-popover-foreground: var(--popover-foreground);
 --color-primary: var(--primary);
 --color-primary-foreground: var(--primary-foreground);
 --color-secondary: var(--secondary);
 --color-secondary-foreground: var(--secondary-foreground);
 --color-muted: var(--muted);
 --color-muted-foreground: var(--muted-foreground);
 --color-accent: var(--accent);
 --color-accent-foreground: var(--accent-foreground);
 --color-destructive: var(--destructive);
 --color-border: var(--border);
 --color-input: var(--input);
 --color-ring: var(--ring);
}

@layer base {
 * {
  @apply border-border outline-ring/50;
 }

 html {
  font-family:
   Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
   "Segoe UI", sans-serif;
 }

 body {
  @apply bg-background text-foreground;
  min-width: 320px;
  margin: 0;
 }

 #root {
  min-height: 100dvh;
 }

 button,
 a,
 input {
  -webkit-tap-highlight-color: transparent;
 }
}

@layer components {
 .noesis-background {
  position: relative;
  min-height: 100dvh;
  isolation: isolate;
  overflow-x: hidden;
 }

 .noesis-background::before {
  position: fixed;
  inset: 0;
  z-index: -2;
  content: "";
  background:
   radial-gradient(circle at 16% 12%, oklch(0.62 0.24 285 / 0.28), transparent 28rem),
   radial-gradient(circle at 82% 18%, oklch(0.72 0.16 205 / 0.2), transparent 24rem),
   radial-gradient(circle at 52% 86%, oklch(0.55 0.2 260 / 0.16), transparent 22rem),
   var(--background);
 }

 .noesis-background::after {
  position: fixed;
  inset: 0;
  z-index: -1;
  content: "";
  pointer-events: none;
  opacity: 0.24;
  background-image:
   linear-gradient(to right, oklch(0.78 0.1 260 / 0.18) 1px, transparent 1px),
   linear-gradient(to bottom, oklch(0.78 0.1 260 / 0.14) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent 78%);
 }

 .noesis-panel {
  @apply border border-border/70 bg-card/70 shadow-2xl backdrop-blur-xl;
  box-shadow:
   0 24px 80px oklch(0.04 0.04 260 / 0.36),
   inset 0 1px 0 oklch(1 0 0 / 0.06);
 }

 .noesis-card-hover {
  @apply transition duration-200 ease-out;
 }

 .noesis-card-hover:hover {
  transform: translateY(-2px);
  box-shadow:
   0 20px 60px oklch(0.12 0.08 285 / 0.28),
   0 0 0 1px oklch(0.7 0.2 285 / 0.18);
 }

 .noesis-nav-link {
  @apply flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-medium text-muted-foreground transition duration-200;
 }

 .noesis-nav-link:hover {
  @apply bg-secondary/70 text-foreground;
 }

 .noesis-nav-link.active {
  @apply border-primary/70 bg-primary/10 text-foreground;
  box-shadow: inset 3px 0 0 var(--primary), 0 0 24px oklch(0.68 0.22 285 / 0.16);
 }

 .noesis-tech-line {
  height: 1px;
  background: linear-gradient(
   90deg,
   transparent,
   oklch(0.72 0.18 285 / 0.76),
   oklch(0.75 0.15 205 / 0.72),
   transparent
  );
 }
}

@media (prefers-reduced-motion: reduce) {
 *,
 *::before,
 *::after {
  scroll-behavior: auto !important;
  transition-duration: 0.01ms !important;
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
 }

 .noesis-card-hover:hover {
  transform: none;
 }
}
```

- [ ] **Step 7: Run web build after setup**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: build succeeds or only fails because UI primitives are not created yet. If it fails because Tailwind cannot load, fix the dependency/configuration before continuing.

- [ ] **Step 8: Commit setup**

```bash
git add packages/web/package.json packages/web/tsconfig.json packages/web/vite.config.ts packages/web/components.json packages/web/src/styles.css pnpm-lock.yaml
git commit -m "feat(web): 配置 shadcn 控制台样式基础"
```

---

### Task 2: Add tested local storage helpers

**Files:**

- Create: `packages/web/src/session.ts`
- Create: `packages/web/src/session.test.ts`
- Modify: `packages/web/package.json`

- [ ] **Step 1: Create `packages/web/src/session.ts`**

Create the file with:

```ts
export const ownerTokenKey = "noesis.ownerToken";
export const themeKey = "noesis.theme";

export type NoesisTheme = "dark" | "light";

export interface BrowserStorage {
 getItem(key: string): string | null;
 setItem(key: string, value: string): void;
 removeItem(key: string): void;
}

export function readOwnerToken(storage: Pick<BrowserStorage, "getItem">): string | null {
 try {
  const token = storage.getItem(ownerTokenKey)?.trim();
  return token === undefined || token.length === 0 ? null : token;
 } catch {
  return null;
 }
}

export function saveOwnerToken(storage: Pick<BrowserStorage, "setItem">, token: string): boolean {
 const normalized = token.trim();

 if (normalized.length === 0) {
  return false;
 }

 try {
  storage.setItem(ownerTokenKey, normalized);
  return true;
 } catch {
  return false;
 }
}

export function clearOwnerToken(storage: Pick<BrowserStorage, "removeItem">): boolean {
 try {
  storage.removeItem(ownerTokenKey);
  return true;
 } catch {
  return false;
 }
}

export function readTheme(
 storage: Pick<BrowserStorage, "getItem">,
 fallback: NoesisTheme = "dark",
): NoesisTheme {
 try {
  const value = storage.getItem(themeKey);
  return value === "dark" || value === "light" ? value : fallback;
 } catch {
  return fallback;
 }
}

export function saveTheme(storage: Pick<BrowserStorage, "setItem">, theme: NoesisTheme): boolean {
 try {
  storage.setItem(themeKey, theme);
  return true;
 } catch {
  return false;
 }
}
```

- [ ] **Step 2: Create `packages/web/src/session.test.ts`**

Create the file with:

```ts
import { describe, expect, it } from "vitest";
import {
 clearOwnerToken,
 ownerTokenKey,
 readOwnerToken,
 readTheme,
 saveOwnerToken,
 saveTheme,
 themeKey,
 type BrowserStorage,
} from "./session.js";

class MemoryStorage implements BrowserStorage {
 private readonly values = new Map<string, string>();

 public shouldThrow = false;

 getItem(key: string): string | null {
  if (this.shouldThrow) {
   throw new Error("storage unavailable");
  }

  return this.values.get(key) ?? null;
 }

 setItem(key: string, value: string): void {
  if (this.shouldThrow) {
   throw new Error("storage unavailable");
  }

  this.values.set(key, value);
 }

 removeItem(key: string): void {
  if (this.shouldThrow) {
   throw new Error("storage unavailable");
  }

  this.values.delete(key);
 }
}

describe("Owner Token storage", () => {
 it("trims and stores a non-empty Owner Token", () => {
  const storage = new MemoryStorage();

  expect(saveOwnerToken(storage, "  owner-token  ")).toBe(true);
  expect(readOwnerToken(storage)).toBe("owner-token");
 });

 it("rejects an empty Owner Token", () => {
  const storage = new MemoryStorage();

  expect(saveOwnerToken(storage, "   ")).toBe(false);
  expect(storage.getItem(ownerTokenKey)).toBeNull();
 });

 it("clears an existing Owner Token", () => {
  const storage = new MemoryStorage();
  expect(saveOwnerToken(storage, "owner-token")).toBe(true);

  expect(clearOwnerToken(storage)).toBe(true);
  expect(readOwnerToken(storage)).toBeNull();
 });

 it("fails closed when storage throws", () => {
  const storage = new MemoryStorage();
  storage.shouldThrow = true;

  expect(saveOwnerToken(storage, "owner-token")).toBe(false);
  expect(readOwnerToken(storage)).toBeNull();
  expect(clearOwnerToken(storage)).toBe(false);
 });
});

describe("theme storage", () => {
 it("stores dark and light theme preferences", () => {
  const storage = new MemoryStorage();

  expect(saveTheme(storage, "light")).toBe(true);
  expect(storage.getItem(themeKey)).toBe("light");
  expect(readTheme(storage)).toBe("light");

  expect(saveTheme(storage, "dark")).toBe(true);
  expect(readTheme(storage)).toBe("dark");
 });

 it("falls back to dark for unknown theme values", () => {
  const storage = new MemoryStorage();
  storage.setItem(themeKey, "neon");

  expect(readTheme(storage)).toBe("dark");
 });

 it("falls back when storage throws", () => {
  const storage = new MemoryStorage();
  storage.shouldThrow = true;

  expect(readTheme(storage, "light")).toBe("light");
  expect(saveTheme(storage, "dark")).toBe(false);
 });
});
```

- [ ] **Step 3: Update `packages/web/package.json` test script**

Change the script from:

```json
"test": "pnpm build"
```

to:

```json
"test": "pnpm build && vitest run src/session.test.ts"
```

- [ ] **Step 4: Run the storage test**

Run:

```bash
pnpm --filter @noesis/web test
```

Expected: build succeeds and `session.test.ts` passes.

- [ ] **Step 5: Commit storage helpers**

```bash
git add packages/web/src/session.ts packages/web/src/session.test.ts packages/web/package.json
git commit -m "feat(web): 添加本地 Owner Token 状态辅助函数"
```

---

### Task 3: Add shadcn-style UI primitives

**Files:**

- Create: `packages/web/src/lib/utils.ts`
- Create: `packages/web/src/components/ui/button.tsx`
- Create: `packages/web/src/components/ui/input.tsx`
- Create: `packages/web/src/components/ui/label.tsx`
- Create: `packages/web/src/components/ui/card.tsx`
- Create: `packages/web/src/components/ui/separator.tsx`

- [ ] **Step 1: Create `packages/web/src/lib/utils.ts`**

Create the file with:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
 return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create `packages/web/src/components/ui/button.tsx`**

Create the file with:

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
 "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
 {
  variants: {
   variant: {
    default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
    destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
    outline: "border border-input bg-background/60 shadow-xs hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline",
   },
   size: {
    default: "h-11 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-12 rounded-md px-6",
    icon: "size-11",
   },
  },
  defaultVariants: {
   variant: "default",
   size: "default",
  },
 },
);

function Button({
 className,
 variant,
 size,
 asChild = false,
 ...props
}: ComponentProps<"button"> &
 VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
 }) {
 const Comp = asChild ? Slot : "button";

 return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
```

- [ ] **Step 3: Create `packages/web/src/components/ui/input.tsx`**

Create the file with:

```tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
 return (
  <input
   data-slot="input"
   type={type}
   className={cn(
    "flex h-11 w-full min-w-0 rounded-md border border-input bg-background/70 px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow,border-color] duration-200 placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
    className,
   )}
   {...props}
  />
 );
}

export { Input };
```

- [ ] **Step 4: Create `packages/web/src/components/ui/label.tsx`**

Create the file with:

```tsx
import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
 return (
  <LabelPrimitive.Root
   data-slot="label"
   className={cn(
    "flex select-none items-center gap-2 text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
    className,
   )}
   {...props}
  />
 );
}

export { Label };
```

- [ ] **Step 5: Create `packages/web/src/components/ui/card.tsx`**

Create the file with:

```tsx
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
 return (
  <div
   data-slot="card"
   className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}
   {...props}
  />
 );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
 return <div data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
 return <div data-slot="card-title" className={cn("font-semibold leading-none", className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
 return <div data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
 return <div data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
 return <div data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
```

- [ ] **Step 6: Create `packages/web/src/components/ui/separator.tsx`**

Create the file with:

```tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Separator({
 className,
 orientation = "horizontal",
 decorative = true,
 ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
 return (
  <SeparatorPrimitive.Root
   data-slot="separator"
   decorative={decorative}
   orientation={orientation}
   className={cn(
    "shrink-0 bg-border",
    orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
    className,
   )}
   {...props}
  />
 );
}

export { Separator };
```

- [ ] **Step 7: Run web build**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: build succeeds.

- [ ] **Step 8: Commit UI primitives**

```bash
git add packages/web/src/lib/utils.ts packages/web/src/components/ui/button.tsx packages/web/src/components/ui/input.tsx packages/web/src/components/ui/label.tsx packages/web/src/components/ui/card.tsx packages/web/src/components/ui/separator.tsx
git commit -m "feat(web): 添加 shadcn 基础组件"
```

---

### Task 4: Replace the placeholder with login gate and console routes

**Files:**

- Replace: `packages/web/src/App.tsx`

- [ ] **Step 1: Rerun impact check before editing `App`**

Use GitNexus impact analysis:

```text
gitnexus_impact({ repo: "noesis", target: "Function:packages/web/src/App.tsx:App", direction: "upstream", depth: 3, include_tests: true })
```

Expected: LOW risk, with `packages/web/src/main.tsx` as the direct caller. If risk is HIGH or CRITICAL, stop and report the blast radius before editing.

- [ ] **Step 2: Replace `packages/web/src/App.tsx`**

Replace the file with:

```tsx
import { protocolVersion } from "@noesis/shared";
import {
 Activity,
 Bot,
 CheckCircle2,
 Database,
 LogOut,
 Moon,
 Network,
 Search,
 Server,
 Settings,
 ShieldCheck,
 Sun,
 type LucideIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
 clearOwnerToken,
 readOwnerToken,
 readTheme,
 saveOwnerToken,
 saveTheme,
 type BrowserStorage,
 type NoesisTheme,
} from "./session.js";

type RouteItem = {
 path: string;
 label: string;
 description: string;
 icon: LucideIcon;
};

const routeItems: RouteItem[] = [
 { path: "/dashboard", label: "仪表盘", description: "P0 控制闭环概览", icon: Activity },
 { path: "/machines", label: "机器", description: "Client Agent 接入状态", icon: Server },
 { path: "/tasks", label: "任务", description: "Task 与 Task Event 状态", icon: Bot },
 { path: "/settings", label: "设置", description: "本地门禁与主题", icon: Settings },
];

const statusCards = [
 {
  title: "Gateway",
  value: "待接入",
  description: "等待真实 Gateway API 连接",
  icon: Network,
 },
 {
  title: "Machines",
  value: "0 台",
  description: "等待 Client Agent 注册心跳",
  icon: Server,
 },
 {
  title: "Tasks",
  value: "暂无",
  description: "等待创建第一个可观测 Task",
  icon: Bot,
 },
 {
  title: "Protocol",
  value: protocolVersion,
  description: "来自 @noesis/shared 的协议版本",
  icon: Database,
 },
] as const;

function browserStorage(): BrowserStorage | null {
 if (typeof window === "undefined") {
  return null;
 }

 return window.localStorage;
}

function readStoredOwnerToken(): string | null {
 const storage = browserStorage();
 return storage === null ? null : readOwnerToken(storage);
}

function readStoredTheme(): NoesisTheme {
 const storage = browserStorage();
 return storage === null ? "dark" : readTheme(storage);
}

export function App() {
 const [ownerToken, setOwnerToken] = useState<string | null>(() => readStoredOwnerToken());
 const [theme, setTheme] = useState<NoesisTheme>(() => readStoredTheme());

 useEffect(() => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;

  const storage = browserStorage();
  if (storage !== null) {
   saveTheme(storage, theme);
  }
 }, [theme]);

 function handleLogin(token: string): boolean {
  const storage = browserStorage();

  if (storage === null || !saveOwnerToken(storage, token)) {
   return false;
  }

  setOwnerToken(token.trim());
  return true;
 }

 function handleLogout() {
  const storage = browserStorage();

  if (storage !== null) {
   clearOwnerToken(storage);
  }

  setOwnerToken(null);
 }

 function toggleTheme() {
  setTheme((current) => (current === "dark" ? "light" : "dark"));
 }

 return (
  <HashRouter>
   <div className="noesis-background">
    {ownerToken === null ? (
     <LoginPage onLogin={handleLogin} onToggleTheme={toggleTheme} theme={theme} />
    ) : (
     <ConsoleShell
      onLogout={handleLogout}
      onToggleTheme={toggleTheme}
      ownerToken={ownerToken}
      theme={theme}
     />
    )}
   </div>
  </HashRouter>
 );
}

function LoginPage({
 onLogin,
 onToggleTheme,
 theme,
}: {
 onLogin: (token: string) => boolean;
 onToggleTheme: () => void;
 theme: NoesisTheme;
}) {
 const navigate = useNavigate();
 const [ownerToken, setOwnerToken] = useState("");
 const [error, setError] = useState<string | null>(null);

 function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const normalized = ownerToken.trim();
  if (normalized.length === 0) {
   setError("请输入 Owner Token。");
   return;
  }

  if (!onLogin(normalized)) {
   setError("无法保存 Owner Token，请检查浏览器本地存储权限。");
   return;
  }

  setError(null);
  navigate("/dashboard", { replace: true });
 }

 return (
  <main className="flex min-h-dvh items-center justify-center px-4 py-10">
   <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
    <section className="space-y-6">
     <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 text-sm text-muted-foreground backdrop-blur-xl">
      <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
      个人 Gateway 控制台门禁
     </div>

     <div className="space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Noesis 灵识</p>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
       连接 Gateway、Machine 与 Task Event 的 AI 控制台
      </h1>
      <p className="max-w-xl text-base leading-8 text-muted-foreground">
       使用 Owner Token 进入个人工作台。本阶段只做本地门禁，不创建多账号体系，也不暴露长期凭证明文。
      </p>
     </div>

     <div className="grid gap-3 sm:grid-cols-3">
      <StatusChip icon={Network} label="Gateway" value="Ready shell" />
      <StatusChip icon={Server} label="Machine" value="Await agent" />
      <StatusChip icon={Bot} label="Task Event" value="Append-only" />
     </div>
    </section>

    <Card className="noesis-panel noesis-card-hover mx-auto w-full max-w-md overflow-hidden">
     <div className="noesis-tech-line" />
     <CardHeader className="space-y-2">
      <div className="flex items-center justify-between gap-3">
       <div>
        <CardTitle className="text-2xl">登录 Noesis</CardTitle>
        <CardDescription className="mt-2">输入 Owner Token 进入控制台。</CardDescription>
       </div>
       <Button
        aria-label={theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"}
        onClick={onToggleTheme}
        size="icon"
        variant="outline"
       >
        {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
       </Button>
      </div>
     </CardHeader>
     <CardContent>
      <form className="space-y-5" onSubmit={handleSubmit}>
       <div className="space-y-2">
        <Label htmlFor="owner-token">Owner Token</Label>
        <Input
         aria-describedby={error === null ? "owner-token-help" : "owner-token-error"}
         aria-invalid={error !== null}
         autoComplete="current-password"
         autoFocus
         id="owner-token"
         onChange={(event) => setOwnerToken(event.target.value)}
         placeholder="粘贴 Gateway Owner Token"
         type="password"
         value={ownerToken}
        />
        {error === null ? (
         <p className="text-sm text-muted-foreground" id="owner-token-help">
          Token 只保存在当前浏览器本地。
         </p>
        ) : (
         <p className="text-sm font-medium text-destructive" id="owner-token-error">
          {error}
         </p>
        )}
       </div>

       <Button className="w-full" type="submit">
        进入控制台
       </Button>
      </form>
     </CardContent>
    </Card>
   </div>
  </main>
 );
}

function ConsoleShell({
 onLogout,
 onToggleTheme,
 ownerToken,
 theme,
}: {
 onLogout: () => void;
 onToggleTheme: () => void;
 ownerToken: string;
 theme: NoesisTheme;
}) {
 const location = useLocation();
 const navigate = useNavigate();
 const currentRoute = useMemo(
  () => routeItems.find((item) => item.path === location.pathname) ?? routeItems[0],
  [location.pathname],
 );

 function handleLogout() {
  onLogout();
  navigate("/dashboard", { replace: true });
 }

 return (
  <div className="grid min-h-dvh lg:grid-cols-[240px_minmax(0,1fr)]">
   <aside className="hidden border-r border-border/70 bg-card/40 p-4 backdrop-blur-xl lg:block">
    <div className="mb-8 flex min-h-11 items-center gap-3 px-2">
     <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
      <Network className="size-5" aria-hidden="true" />
     </div>
     <div>
      <p className="text-sm font-semibold leading-none">Noesis 灵识</p>
      <p className="mt-1 text-xs text-muted-foreground">Human-AI Workspace</p>
     </div>
    </div>

    <nav aria-label="主导航" className="space-y-2">
     {routeItems.map((item) => (
      <NavLink className="noesis-nav-link" key={item.path} to={item.path}>
       <item.icon className="size-4" aria-hidden="true" />
       <span>{item.label}</span>
      </NavLink>
     ))}
    </nav>
   </aside>

   <div className="flex min-w-0 flex-col">
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/72 backdrop-blur-xl">
     <div className="flex min-h-16 items-center gap-3 px-4 lg:px-6">
      <div className="flex items-center gap-3 lg:hidden">
       <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Network className="size-5" aria-hidden="true" />
       </div>
       <span className="text-sm font-semibold">Noesis</span>
      </div>

      <div className="hidden min-h-11 flex-1 items-center gap-3 rounded-full border border-border/70 bg-card/50 px-4 text-sm text-muted-foreground md:flex">
       <Search className="size-4" aria-hidden="true" />
       <span>搜索即将接入 Gateway / Machine / Task</span>
       <kbd className="ml-auto rounded border border-border/70 px-2 py-0.5 text-xs">⌘K</kbd>
      </div>

      <Button
       aria-label={theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"}
       onClick={onToggleTheme}
       size="icon"
       variant="outline"
      >
       {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      </Button>

      <Button onClick={handleLogout} variant="outline">
       <LogOut aria-hidden="true" />
       <span className="hidden sm:inline">退出</span>
      </Button>
     </div>

     <nav aria-label="移动端主导航" className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
      {routeItems.map((item) => (
       <NavLink className="noesis-nav-link min-w-fit" key={item.path} to={item.path}>
        <item.icon className="size-4" aria-hidden="true" />
        <span>{item.label}</span>
       </NavLink>
      ))}
     </nav>
    </header>

    <div className="border-b border-border/70 bg-card/25 px-4 py-3 text-sm text-muted-foreground lg:px-6">
     <span>面包屑：</span>
     <span className="font-medium text-foreground">{currentRoute.label}</span>
     <span className="mx-2 text-border">/</span>
     <span>{currentRoute.description}</span>
    </div>

    <main className="flex-1 px-4 py-6 lg:px-6">
     <Routes>
      <Route element={<Navigate replace to="/dashboard" />} index />
      <Route element={<DashboardPage ownerToken={ownerToken} />} path="/dashboard" />
      <Route element={<MachinesPage />} path="/machines" />
      <Route element={<TasksPage />} path="/tasks" />
      <Route element={<SettingsPage onLogout={handleLogout} ownerToken={ownerToken} />} path="/settings" />
      <Route element={<Navigate replace to="/dashboard" />} path="*" />
     </Routes>
    </main>
   </div>
  </div>
 );
}

function DashboardPage({ ownerToken }: { ownerToken: string }) {
 return (
  <div className="space-y-6">
   <PageHeading
    description="当前只展示 P0 控制闭环的真实边界：Gateway、Machine、Task 与协议版本。"
    title="仪表盘"
   />

   <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="P0 控制闭环占位状态">
    {statusCards.map((card) => (
     <Card className="noesis-panel noesis-card-hover" key={card.title}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
       <div>
        <CardDescription>{card.title}</CardDescription>
        <CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
       </div>
       <div className="rounded-lg border border-primary/30 bg-primary/10 p-2 text-primary">
        <card.icon className="size-5" aria-hidden="true" />
       </div>
      </CardHeader>
      <CardContent>
       <p className="text-sm text-muted-foreground">{card.description}</p>
      </CardContent>
     </Card>
    ))}
   </section>

   <Card className="noesis-panel">
    <CardHeader>
     <CardTitle className="flex items-center gap-2">
      <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
      本地门禁状态
     </CardTitle>
     <CardDescription>Owner Token 已保存在当前浏览器。本阶段不做服务端校验。</CardDescription>
    </CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-3">
     <StatusChip icon={ShieldCheck} label="Owner Token" value={ownerToken.length > 0 ? "已保存" : "未保存"} />
     <StatusChip icon={Network} label="Gateway API" value="待接入" />
     <StatusChip icon={Bot} label="Task Event" value="待创建" />
    </CardContent>
   </Card>
  </div>
 );
}

function MachinesPage() {
 return (
  <PlaceholderPage
   description="正式机器列表会在 Client Agent 注册、心跳和能力上报接入后补齐。"
   icon={Server}
   title="机器"
  >
   等待 Client Agent 接入 Gateway。
  </PlaceholderPage>
 );
}

function TasksPage() {
 return (
  <PlaceholderPage
   description="正式任务列表会聚合 command.run、文件操作和后续 Pi 任务。"
   icon={Bot}
   title="任务"
  >
   暂无 Task。创建第一个任务后，这里会显示 Task Event 证据链。
  </PlaceholderPage>
 );
}

function SettingsPage({ onLogout, ownerToken }: { onLogout: () => void; ownerToken: string }) {
 return (
  <div className="space-y-6">
   <PageHeading description="本阶段只暴露本地门禁状态和退出入口。" title="设置" />
   <Card className="noesis-panel max-w-2xl">
    <CardHeader>
     <CardTitle>Owner Token</CardTitle>
     <CardDescription>Token 已保存，但不会在界面显示明文。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
     <div className="rounded-lg border border-border/70 bg-secondary/40 p-4 text-sm text-muted-foreground">
      当前状态：<span className="font-medium text-foreground">{ownerToken.length > 0 ? "已保存" : "未保存"}</span>
     </div>
     <Separator />
     <Button onClick={onLogout} variant="destructive">
      <LogOut aria-hidden="true" />
      退出并清除本地 Token
     </Button>
    </CardContent>
   </Card>
  </div>
 );
}

function PlaceholderPage({
 children,
 description,
 icon: Icon,
 title,
}: {
 children: string;
 description: string;
 icon: LucideIcon;
 title: string;
}) {
 return (
  <div className="space-y-6">
   <PageHeading description={description} title={title} />
   <Card className="noesis-panel max-w-3xl">
    <CardHeader>
     <div className="flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
      <Icon className="size-6" aria-hidden="true" />
     </div>
     <CardTitle className="pt-2">{children}</CardTitle>
     <CardDescription>这是诚实占位状态，不使用大规模 mock 数据。</CardDescription>
    </CardHeader>
   </Card>
  </div>
 );
}

function PageHeading({ description, title }: { description: string; title: string }) {
 return (
  <section className="space-y-2">
   <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Noesis Console</p>
   <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
   <p className="max-w-3xl text-base leading-7 text-muted-foreground">{description}</p>
  </section>
 );
}

function StatusChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
 return (
  <div className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-card/55 px-4 py-3 backdrop-blur-xl">
   <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
    <Icon className="size-5" aria-hidden="true" />
   </div>
   <div className="min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="truncate text-sm font-medium text-foreground">{value}</p>
   </div>
  </div>
 );
}
```

- [ ] **Step 3: Run web build**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: build succeeds.

- [ ] **Step 4: Run web unit test**

Run:

```bash
pnpm --filter @noesis/web test
```

Expected: build succeeds and `session.test.ts` passes.

- [ ] **Step 5: Commit login and shell**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): 添加登录门禁和控制台外壳"
```

---

### Task 5: Browser QA and final verification

**Files:**

- No planned source changes unless checks reveal a defect.

- [ ] **Step 1: Run LSP diagnostics for web files**

Run:

```text
lsp_diagnostics({ path: "packages/web/src", severity: "all" })
```

Expected: no TypeScript errors.

- [ ] **Step 2: Run web build**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: build succeeds.

- [ ] **Step 3: Run full repository verification**

Run:

```bash
pnpm verify
```

Expected: all package builds, tests, and boundary checks pass.

- [ ] **Step 4: Start the web app for manual QA**

Run:

```bash
pnpm --filter @noesis/web exec vite --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 5: Check login with browser automation**

Use browser automation against the Vite URL:

```text
Open http://127.0.0.1:5173/
Assert text: 登录 Noesis
Fill Owner Token: local-owner-token
Click: 进入控制台
Assert text: 仪表盘
Assert text: Gateway
```

Expected: login succeeds and dashboard is visible.

- [ ] **Step 6: Check navigation and unknown route handling**

Use browser automation:

```text
Click: 机器
Assert text: 等待 Client Agent 接入 Gateway。
Click: 任务
Assert text: 暂无 Task。
Open http://127.0.0.1:5173/#/unknown
Assert text: 仪表盘
```

Expected: navigation works and unknown route redirects to dashboard.

- [ ] **Step 7: Check theme toggle and logout**

Use browser automation:

```text
Click theme toggle button
Assert html data-theme changes from dark to light, or light to dark
Click: 退出
Assert text: 登录 Noesis
```

Expected: theme toggles and logout returns to login.

- [ ] **Step 8: Check 375px width manually or with browser viewport**

Use browser automation viewport `375x812`:

```text
Open http://127.0.0.1:5173/
Login with Owner Token if needed
Assert no horizontal scrollbar on documentElement
Assert mobile navigation is visible
```

Expected: no horizontal scroll and touch targets remain usable.

- [ ] **Step 9: Run GitNexus change detection before final handoff**

Use GitNexus:

```text
gitnexus_detect_changes({ repo: "noesis", scope: "all" })
```

Expected: affected scope is limited to Web shell files, package lock/config, and the existing design docs/context changes.

- [ ] **Step 10: Commit final fixes if any were needed**

If Task 5 changed files, commit them:

```bash
git add packages/web docs/superpowers/plans/2026-07-03-noesis-web-login-console-shell.md
git commit -m "test(web): 验证登录控制台外壳"
```

If no files changed during QA, do not create an empty commit.
