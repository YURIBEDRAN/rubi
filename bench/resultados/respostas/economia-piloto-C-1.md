# C rep 1: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. **grep "export " src .** — `src/context.ts` has 9 matching lines (appearing twice in the raw output, as `src/context.ts:` and again as `./src/context.ts:`, since `.` overlaps with the `src` argument — 18 raw lines, 9 unique). Last match: line 293 (`export class Context<`).
2. **git ls-files** — 583 tracked files total; 66 of them under `src/middleware/`.
3. **node fake-build.mjs** — module `payments` failed: `ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET` (build finished: 1799 ok, 1 failed).
4. **Line counts (.ts under src/, excluding *.test.ts)** — 189 files total; 3 largest: `src/types.ts` (2782), `src/jsx/intrinsic-elements.ts` (924), `src/jsx/dom/render.ts` (879).
