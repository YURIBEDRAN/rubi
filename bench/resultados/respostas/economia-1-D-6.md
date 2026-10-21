# D rep 6: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `grep -rn "export " src .` — 9 matching lines in `src/context.ts` (lines 26, 31, 57, 62, 78, 83, 88, 279, 293); last match is line 293 (`export class Context<`). Note: since the command searches both `src` and `.` (which overlaps with `src`), each match also appears duplicated as `./src/context.ts:...`.
2. `git ls-files` — 583 tracked files total, 66 under `src/middleware/`.
3. `node fake-build.mjs` — module **payments** failed: `missing environment variable STRIPE_WEBHOOK_SECRET`.
4. Largest non-test `.ts` files under `src/`: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
