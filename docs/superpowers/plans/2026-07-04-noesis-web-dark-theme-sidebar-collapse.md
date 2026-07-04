# Noesis Web Dark Theme Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Noesis Web dark-theme readability and add a persistent desktop sidebar collapse control.

**Architecture:** Keep the change small: extend existing localStorage helpers in `session.ts`, wire one `sidebarCollapsed` state into `App.tsx`, and tune CSS tokens/utilities in `styles.css`. Do not add new dependencies, new routes, mobile drawers, mock data, or new feature directories.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn-style primitives, lucide-react, react-router-dom, Vitest.

---

## Scope Check

The spec covers one UI refinement in the existing Web shell. It is not multiple independent subsystems. The implementation can be completed as three small commits plus final verification.

## Pre-Implementation Safety

Before editing any function/class/method, run GitNexus impact as required by this repo:

```bash
# Tool call, not shell:
gitnexus_impact({
  repo: "noesis",
  target: "Function:packages/web/src/App.tsx:App",
  direction: "upstream",
  include_tests: true
})
```

Expected known result from planning: risk `LOW`, direct upstream caller `packages/web/src/main.tsx`, affected processes `0`. If the result changes to HIGH or CRITICAL, stop and warn the user before editing.

## File Structure

Modify existing files only:

- `packages/web/src/session.ts`
  - Responsibility: typed, defensive localStorage helpers for Owner Token, theme, and sidebar UI preference.
- `packages/web/src/session.test.ts`
  - Responsibility: deterministic Vitest coverage for storage helpers without browser APIs.
- `packages/web/src/App.tsx`
  - Responsibility: app state, routing, login page, console shell, desktop/sidebar rendering.
- `packages/web/src/styles.css`
  - Responsibility: theme tokens and Noesis-specific visual utilities.

Do not create new component directories or introduce new dependencies.

---

### Task 1: Add Persistent Sidebar Preference Helpers

**Files:**

- Modify: `packages/web/src/session.ts`
- Modify: `packages/web/src/session.test.ts`

- [ ] **Step 1: Add failing tests for sidebar collapsed storage**

Append this import list update in `packages/web/src/session.test.ts`:

```ts
import {
 clearOwnerToken,
 ownerTokenKey,
 readOwnerToken,
 readSidebarCollapsed,
 readTheme,
 saveOwnerToken,
 saveSidebarCollapsed,
 saveTheme,
 sidebarCollapsedKey,
 themeKey,
 type BrowserStorage,
} from "./session.js";
```

Then append this test block after the existing `describe("theme storage", ...)` block:

```ts
describe("sidebar collapsed storage", () => {
 it("defaults to expanded when no preference is stored", () => {
  const storage = new MemoryStorage();

  expect(readSidebarCollapsed(storage)).toBe(false);
 });

 it("stores collapsed and expanded preferences", () => {
  const storage = new MemoryStorage();

  expect(saveSidebarCollapsed(storage, true)).toBe(true);
  expect(storage.getItem(sidebarCollapsedKey)).toBe("true");
  expect(readSidebarCollapsed(storage)).toBe(true);

  expect(saveSidebarCollapsed(storage, false)).toBe(true);
  expect(storage.getItem(sidebarCollapsedKey)).toBe("false");
  expect(readSidebarCollapsed(storage)).toBe(false);
 });

 it("treats unknown values as expanded", () => {
  const storage = new MemoryStorage();
  storage.setItem(sidebarCollapsedKey, "narrow");

  expect(readSidebarCollapsed(storage)).toBe(false);
 });

 it("falls back to expanded when storage throws", () => {
  const storage = new MemoryStorage();
  storage.shouldThrow = true;

  expect(readSidebarCollapsed(storage)).toBe(false);
  expect(saveSidebarCollapsed(storage, true)).toBe(false);
 });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
pnpm --filter @noesis/web exec vitest run src/session.test.ts
```

Expected: FAIL because `readSidebarCollapsed`, `saveSidebarCollapsed`, and `sidebarCollapsedKey` are not exported yet.

- [ ] **Step 3: Add minimal storage helpers**

In `packages/web/src/session.ts`, add the key next to existing keys:

```ts
export const ownerTokenKey = "noesis.ownerToken";
export const themeKey = "noesis.theme";
export const sidebarCollapsedKey = "noesis.sidebarCollapsed";
```

Append these helpers after `saveTheme`:

```ts
export function readSidebarCollapsed(storage: Pick<BrowserStorage, "getItem">): boolean {
 try {
  return storage.getItem(sidebarCollapsedKey) === "true";
 } catch {
  return false;
 }
}

export function saveSidebarCollapsed(
 storage: Pick<BrowserStorage, "setItem">,
 collapsed: boolean,
): boolean {
 try {
  storage.setItem(sidebarCollapsedKey, collapsed ? "true" : "false");
  return true;
 } catch {
  return false;
 }
}
```

- [ ] **Step 4: Run focused tests and verify they pass**

Run:

```bash
pnpm --filter @noesis/web exec vitest run src/session.test.ts
```

Expected: PASS, with 11 tests passing.

- [ ] **Step 5: Run web package test**

Run:

```bash
pnpm --filter @noesis/web test
```

Expected: PASS. Build succeeds and `src/session.test.ts` reports 11 passing tests.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add packages/web/src/session.ts packages/web/src/session.test.ts
git commit -m "feat(web): 保存侧栏收起偏好"
```

---

### Task 2: Wire Desktop Sidebar Collapse in App Shell

**Files:**

- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Update lucide imports**

In `packages/web/src/App.tsx`, add `PanelLeftClose` and `PanelLeftOpen` to the lucide import block:

```ts
import {
 Activity,
 Bot,
 CheckCircle2,
 Database,
 LogOut,
 Moon,
 Network,
 PanelLeftClose,
 PanelLeftOpen,
 Search,
 Server,
 Settings,
 ShieldCheck,
 Sun,
 type LucideIcon,
} from "lucide-react";
```

- [ ] **Step 2: Import sidebar helper functions**

Update the session import in `packages/web/src/App.tsx` to include the new helpers:

```ts
import {
 clearOwnerToken,
 readOwnerToken,
 readSidebarCollapsed,
 readTheme,
 saveOwnerToken,
 saveSidebarCollapsed,
 saveTheme,
 type BrowserStorage,
 type NoesisTheme,
} from "./session.js";
```

- [ ] **Step 3: Add a safe reader for the sidebar preference**

Add this function after `readStoredTheme()`:

```ts
function readStoredSidebarCollapsed(): boolean {
 const storage = browserStorage();
 return storage === null ? false : readSidebarCollapsed(storage);
}
```

- [ ] **Step 4: Add App-level sidebar state and persistence handler**

Inside `App()`, add this state after the existing `theme` state:

```ts
const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => readStoredSidebarCollapsed());
```

Add this handler after `toggleTheme()`:

```ts
function toggleSidebarCollapsed() {
 setSidebarCollapsed((current) => {
  const next = !current;
  const storage = browserStorage();

  if (storage !== null) {
   saveSidebarCollapsed(storage, next);
  }

  return next;
 });
}
```

Update the `ConsoleShell` call to pass the new state and handler:

```tsx
<ConsoleShell
 onLogout={handleLogout}
 onToggleSidebarCollapsed={toggleSidebarCollapsed}
 onToggleTheme={toggleTheme}
 ownerToken={ownerToken}
 sidebarCollapsed={sidebarCollapsed}
 theme={theme}
/>
```

- [ ] **Step 5: Extend ConsoleShell props**

Change the `ConsoleShell` signature to this:

```tsx
function ConsoleShell({
 onLogout,
 onToggleSidebarCollapsed,
 onToggleTheme,
 ownerToken,
 sidebarCollapsed,
 theme,
}: {
 onLogout: () => void;
 onToggleSidebarCollapsed: () => void;
 onToggleTheme: () => void;
 ownerToken: string;
 sidebarCollapsed: boolean;
 theme: NoesisTheme;
}) {
```

- [ ] **Step 6: Replace the desktop shell and aside opening markup**

Replace this existing shell opening:

```tsx
<div className="grid min-h-dvh lg:grid-cols-[240px_minmax(0,1fr)]">
 <aside className="hidden border-r border-border/70 bg-card/40 p-4 backdrop-blur-xl lg:block">
```

with:

```tsx
<div className={sidebarCollapsed ? "noesis-shell noesis-shell-collapsed" : "noesis-shell"}>
 <aside
  className={sidebarCollapsed ? "noesis-sidebar noesis-sidebar-collapsed" : "noesis-sidebar"}
  data-collapsed={sidebarCollapsed}
 >
```

- [ ] **Step 7: Replace the brand block**

Replace the current brand block inside the sidebar with:

```tsx
<div className="mb-8 flex min-h-11 items-center gap-3 px-2">
 <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10">
  <Network className="size-5" aria-hidden="true" />
 </div>
 <div className="noesis-sidebar-label min-w-0">
  <p className="truncate text-sm font-semibold leading-none">Noesis 灵识</p>
  <p className="mt-1 truncate text-xs text-muted-foreground">Human-AI Workspace</p>
 </div>
</div>
```

- [ ] **Step 8: Add titles and collapsible labels to desktop nav links**

Replace the desktop nav map with:

```tsx
<nav aria-label="主导航" className="space-y-2">
 {routeItems.map((item) => (
  <NavLink className="noesis-nav-link" key={item.path} title={item.label} to={item.path}>
   <item.icon className="size-4 shrink-0" aria-hidden="true" />
   <span className="noesis-sidebar-label">{item.label}</span>
  </NavLink>
 ))}
</nav>
```

- [ ] **Step 9: Add the sidebar collapse button at the bottom**

After the desktop `nav`, before closing `</aside>`, add:

```tsx
<div className="mt-auto pt-4">
 <Button
  aria-label={sidebarCollapsed ? "展开菜单" : "收起菜单"}
  className="noesis-sidebar-toggle"
  onClick={onToggleSidebarCollapsed}
  title={sidebarCollapsed ? "展开菜单" : "收起菜单"}
  variant="outline"
 >
  {sidebarCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
  <span className="noesis-sidebar-label">收起菜单</span>
 </Button>
</div>
```

- [ ] **Step 10: Run typecheck/build**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: PASS. If TypeScript reports an unused import or prop mismatch, fix only the reported line.

- [ ] **Step 11: Commit Task 2**

Run:

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): 添加桌面侧栏收起交互"
```

---

### Task 3: Tune Dark Theme and Sidebar CSS

**Files:**

- Modify: `packages/web/src/styles.css`

- [ ] **Step 1: Replace the dark token block**

Replace the existing `.dark { ... }` block in `packages/web/src/styles.css` with this calmer dark palette:

```css
.dark {
 --background: oklch(0.105 0.018 260);
 --foreground: oklch(0.93 0.012 255);
 --card: oklch(0.155 0.024 260 / 0.82);
 --card-foreground: oklch(0.93 0.012 255);
 --popover: oklch(0.145 0.024 260);
 --popover-foreground: oklch(0.93 0.012 255);
 --primary: oklch(0.64 0.15 282);
 --primary-foreground: oklch(0.98 0.008 260);
 --secondary: oklch(0.215 0.026 260);
 --secondary-foreground: oklch(0.88 0.014 255);
 --muted: oklch(0.215 0.024 260);
 --muted-foreground: oklch(0.72 0.02 255);
 --accent: oklch(0.66 0.105 205);
 --accent-foreground: oklch(0.09 0.018 260);
 --destructive: oklch(0.64 0.19 25);
 --border: oklch(0.3 0.026 260 / 0.68);
 --input: oklch(0.245 0.026 260 / 0.78);
 --ring: oklch(0.66 0.13 282);
}
```

- [ ] **Step 2: Replace background glow and grid utilities**

Replace `.noesis-background::before` with:

```css
.noesis-background::before {
 position: fixed;
 inset: 0;
 z-index: -2;
 content: "";
 background:
  radial-gradient(circle at 18% 14%, oklch(0.56 0.16 282 / 0.16), transparent 24rem),
  radial-gradient(circle at 84% 20%, oklch(0.62 0.1 205 / 0.12), transparent 24rem),
  radial-gradient(circle at 52% 90%, oklch(0.45 0.12 260 / 0.08), transparent 26rem),
  var(--background);
}
```

Replace `.noesis-background::after` with:

```css
.noesis-background::after {
 position: fixed;
 inset: 0;
 z-index: -1;
 content: "";
 pointer-events: none;
 opacity: 0.14;
 background-image:
  linear-gradient(to right, oklch(0.76 0.06 260 / 0.12) 1px, transparent 1px),
  linear-gradient(to bottom, oklch(0.76 0.06 260 / 0.1) 1px, transparent 1px);
 background-size: 48px 48px;
 mask-image: linear-gradient(to bottom, black, transparent 72%);
}
```

- [ ] **Step 3: Replace panel, hover, nav active, and tech line utilities**

Replace `.noesis-panel` with:

```css
.noesis-panel {
 @apply border border-border/70 bg-card/80 shadow-xl backdrop-blur-xl;
 box-shadow:
  0 18px 60px oklch(0.03 0.03 260 / 0.28),
  inset 0 1px 0 oklch(1 0 0 / 0.045);
}
```

Replace `.noesis-card-hover:hover` with:

```css
.noesis-card-hover:hover {
 transform: translateY(-1px);
 box-shadow:
  0 18px 52px oklch(0.04 0.04 260 / 0.3),
  0 0 0 1px oklch(0.64 0.12 282 / 0.14);
}
```

Replace `.noesis-nav-link.active` with:

```css
.noesis-nav-link.active {
 @apply border-primary/55 bg-primary/10 text-foreground;
 box-shadow: inset 3px 0 0 var(--primary);
}
```

Replace `.noesis-tech-line` with:

```css
.noesis-tech-line {
 height: 1px;
 background: linear-gradient(
  90deg,
  transparent,
  oklch(0.64 0.13 282 / 0.46),
  oklch(0.66 0.1 205 / 0.36),
  transparent
 );
}
```

- [ ] **Step 4: Add shell and sidebar collapse CSS utilities**

Add these rules inside `@layer components`, after `.noesis-background::after` and before `.noesis-panel`:

```css
.noesis-shell {
 @apply grid min-h-dvh lg:grid-cols-[240px_minmax(0,1fr)];
 transition: grid-template-columns 200ms ease-out;
}

.noesis-shell-collapsed {
 @apply lg:grid-cols-[72px_minmax(0,1fr)];
}

.noesis-sidebar {
 @apply hidden border-r border-border/70 bg-card/40 p-4 backdrop-blur-xl lg:flex lg:flex-col;
 transition:
  padding 200ms ease-out,
  background-color 200ms ease-out;
}

.noesis-sidebar-collapsed {
 @apply px-3;
}

.noesis-sidebar-label {
 min-width: 0;
 overflow: hidden;
 white-space: nowrap;
 transition:
  opacity 160ms ease-out,
  transform 160ms ease-out,
  max-width 160ms ease-out;
}

.noesis-sidebar-collapsed .noesis-sidebar-label {
 pointer-events: none;
 display: inline-block;
 max-width: 0;
 opacity: 0;
 transform: translateX(-0.25rem);
}

.noesis-sidebar-collapsed .noesis-nav-link,
.noesis-sidebar-collapsed .noesis-sidebar-toggle {
 @apply justify-center gap-0 px-0;
}

.noesis-sidebar-toggle {
 @apply w-full justify-start gap-3;
}
```

- [ ] **Step 5: Extend reduced-motion handling**

Inside the existing `@media (prefers-reduced-motion: reduce)` block, keep the current global rule and ensure these selectors do not animate:

```css
.noesis-card-hover:hover {
 transform: none;
}

.noesis-shell,
.noesis-sidebar,
.noesis-sidebar-label {
 transition: none;
}
```

If `.noesis-card-hover:hover` already exists in the reduced-motion block, replace that block body with the combined version above.

- [ ] **Step 6: Run web build**

Run:

```bash
pnpm --filter @noesis/web build
```

Expected: PASS. CSS bundle may change size.

- [ ] **Step 7: Commit Task 3**

Run:

```bash
git add packages/web/src/styles.css
git commit -m "style(web): 优化暗色主题与侧栏收起样式"
```

---

### Task 4: Full Verification and Browser QA

**Files:**

- No source edits expected.

- [ ] **Step 1: Run package tests**

Run:

```bash
pnpm --filter @noesis/web test
```

Expected: PASS. Build succeeds and `src/session.test.ts` reports 11 passing tests.

- [ ] **Step 2: Run workspace verification**

Run:

```bash
pnpm verify
```

Expected: PASS, ending with `Noesis initialization boundaries OK`.

- [ ] **Step 3: Start the web dev server**

Run:

```bash
pnpm --filter @noesis/web exec vite --host 127.0.0.1 --port 5173
```

Expected: Vite prints a local URL `http://127.0.0.1:5173/`.

- [ ] **Step 4: Verify with Playwright MCP**

Use Playwright MCP. Navigate to `http://127.0.0.1:5173/` and run this browser code after logging in with any non-empty Owner Token:

```js
async (page) => {
 await page.goto("http://127.0.0.1:5173/");
 await page.evaluate(() => {
  localStorage.removeItem("noesis.ownerToken");
  localStorage.removeItem("noesis.sidebarCollapsed");
  localStorage.setItem("noesis.theme", "dark");
 });
 await page.reload();
 await page.getByRole("textbox", { name: "Owner Token" }).fill("sidebar-token");
 await page.getByRole("button", { name: "进入控制台" }).click();
 await page.waitForTimeout(300);

 const before = await page.evaluate(() => ({
  url: window.location.href,
  collapsed: localStorage.getItem("noesis.sidebarCollapsed"),
  width: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
 }));

 await page.getByRole("button", { name: "收起菜单" }).click();
 await page.waitForTimeout(300);

 const afterCollapse = await page.evaluate(() => ({
  collapsed: localStorage.getItem("noesis.sidebarCollapsed"),
  sidebarWidth: document.querySelector("aside")?.getBoundingClientRect().width,
 }));

 await page.reload();
 await page.waitForTimeout(500);

 const afterReload = await page.evaluate(() => ({
  collapsed: localStorage.getItem("noesis.sidebarCollapsed"),
  sidebarWidth: document.querySelector("aside")?.getBoundingClientRect().width,
 }));

 return { before, afterCollapse, afterReload };
}
```

Expected result:

```json
{
  "before": {
    "url": "http://127.0.0.1:5173/#/dashboard",
    "collapsed": null,
    "width": 1280,
    "scrollWidth": 1280
  },
  "afterCollapse": {
    "collapsed": "true",
    "sidebarWidth": 72
  },
  "afterReload": {
    "collapsed": "true",
    "sidebarWidth": 72
  }
}
```

The exact viewport width may differ. The important checks are: URL is dashboard, collapsed value becomes `"true"`, sidebar width is approximately `72`, and reload preserves the collapsed state.

- [ ] **Step 5: Verify navigation while collapsed**

With sidebar collapsed, click the navigation icons for 机器, 任务, 设置, then 仪表盘.

Expected:

- `#/machines` shows heading `机器`.
- `#/tasks` shows heading `任务`.
- `#/settings` shows heading `设置`.
- `#/dashboard` shows heading `仪表盘`.

- [ ] **Step 6: Verify mobile viewport**

Use Playwright MCP to set viewport to 375×812 and run:

```js
async (page) => {
 await page.setViewportSize({ width: 375, height: 812 });
 await page.goto("http://127.0.0.1:5173/#/dashboard");
 await page.waitForTimeout(300);

 return await page.evaluate(() => ({
  clientWidth: document.documentElement.clientWidth,
  scrollWidth: document.documentElement.scrollWidth,
  hasHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  asideVisible: (() => {
   const aside = document.querySelector("aside");
   return aside === null ? false : getComputedStyle(aside).display !== "none";
  })(),
  collapseButtonExists: Array.from(document.querySelectorAll("button")).some((button) =>
   ["收起菜单", "展开菜单"].includes(button.getAttribute("aria-label") ?? ""),
  ),
 }));
}
```

Expected:

```json
{
  "clientWidth": 375,
  "scrollWidth": 375,
  "hasHorizontalScroll": false,
  "asideVisible": false,
  "collapseButtonExists": false
}
```

The `clientWidth` can be `360` depending on browser chrome/device emulation. The important checks are no horizontal scroll, hidden desktop aside, and no desktop collapse button on mobile.

- [ ] **Step 7: Check diagnostics**

Run:

```bash
pnpm --filter @noesis/web build
```

Then use pi-lens diagnostics:

```bash
# Tool call, not shell:
lens_diagnostics({ mode: "all", severity: "error" })
```

Expected: no blocking errors for edited files.

- [ ] **Step 8: Detect changed flows before final report**

Run GitNexus change detection:

```bash
# Tool call, not shell:
gitnexus_detect_changes({ repo: "noesis", scope: "all" })
```

Expected: low-risk changes limited to Web UI/session helper files. If unexpected server/client/shared flows appear, inspect before reporting completion.

- [ ] **Step 9: Final commit if verification-only adjustments were made**

If Task 4 required any source adjustment, commit it:

```bash
git add packages/web/src/App.tsx packages/web/src/styles.css packages/web/src/session.ts packages/web/src/session.test.ts
git commit -m "fix(web): 完成侧栏收起与暗色主题验证修正"
```

If Task 4 made no source changes, do not create an empty commit.

## Self-Review Notes

- Spec coverage: Task 1 covers persistent local state; Task 2 covers desktop collapse interaction and accessibility labels; Task 3 covers dark theme glare reduction and reduced motion; Task 4 covers package/workspace/browser/mobile verification.
- Type consistency: helper names are `readSidebarCollapsed`, `saveSidebarCollapsed`, and `sidebarCollapsedKey` in both implementation and tests.
- Scope guard: plan uses existing files only, no new dependencies, no mobile drawer, no tooltip component, no mock data, and no API/login semantic changes.
