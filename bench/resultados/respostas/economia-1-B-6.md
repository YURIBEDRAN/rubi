# B rep 6: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. **grep "export " src .** — The command searches both `src` and `.`, and since `.` already includes `src`, every match is printed twice (once as `src/...`, once as `./src/...`); total output = 1820 lines = 910 unique matches ×2. In `src/context.ts` there are 9 unique `export` lines (18 raw grep-output lines), and the last one is **line 293** (`export class Context<`).

2. **git ls-files** — 583 tracked files total; 66 of them are under `src/middleware/`.

3. **node fake-build.mjs** — It's a synthetic script (no real `packages/` dir exists) that just prints fabricated log lines. At step `[1013]` it logs: module **`payments`** failed with **"missing environment variable STRIPE_WEBHOOK_SECRET"**. (Final summary line "1799 ok, 1 failed" is just a hardcoded string, not computed from the loop.)

4. **Largest non-test .ts files under src/** (by line count):
   - `src/types.ts` — 2782 lines
   - `src/jsx/intrinsic-elements.ts` — 924 lines
   - `src/jsx/dom/render.ts` — 879 lines
