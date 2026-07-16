# MakeItHappen — working agreements

## Risk-based testing (don't browser-verify everything)

Browser verification (starting the dev server, clicking through, screenshotting) is slow. Reserve it for changes where it's actually the only way to catch a bug. Match verification effort to risk:

**Skip browser verification — `tsc -b` (type-check) is enough:**
- Copy/text changes, formatting tweaks (dates, currency, labels) that don't touch layout
- Pure logic/utility changes (`src/lib/*.ts` helpers, data transforms, formatters) with no new UI surface
- Adding a field to an existing, already-rendered pattern (e.g. another row in a table that already works)
- Non-behavioral refactors: renames, extracting functions, splitting files, reordering
- Backend/data-layer or store (`src/store/store.ts`) changes that don't change what renders
- Config/build/tooling changes with no runtime UI impact

**Quick check — `tsc -b`, then `read_page`/`get_page_text` on the affected component only (no full click-through, no screenshot):**
- New conditional rendering branches on existing pages
- State changes that affect already-existing UI elements
- Changes to an existing modal/panel's content (not its trigger or open/close mechanics)

**Full browser verification required:**
- New interactive elements (buttons, forms, modals) or new user flows
- Layout/CSS changes affecting visual rendering
- Navigation, routing, or anything touching how a page is reached
- Anything the user explicitly asks to see verified in the browser
- Anything you're not confident falls into a lower tier — when in doubt, verify

Default to `tsc -b` (not full `npm run build`, which also runs `vite build` and writes `dist/`) as the fast-path check — it's the cheapest signal available in this project (no test runner or linter configured).

State which tier you're applying and why when you skip full verification, so it's easy to catch if the call was wrong.
