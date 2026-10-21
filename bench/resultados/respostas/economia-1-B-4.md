# B rep 4: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `grep -rn "export " src .` → **9** matching lines in `src/context.ts` (lines 26, 31, 57, 62, 78, 83, 88, 279, 293), last match at **line 293**. (Note: since the command searches both `src` and `.`, and `.` includes `src`, every src file's matches appear twice — once as `src/context.ts:...` and once as `./src/context.ts:...` — so the file actually contributes 18 lines to the raw output, but 9 distinct matches.)
2. `git ls-files` → **583** tracked files total, **66** under `src/middleware/`.
3. `node fake-build.mjs` → module **payments** failed: `missing environment variable STRIPE_WEBHOOK_SECRET` (build summary: 1799 ok, 1 failed; process still exited 0).
4. **189** non-test `.ts` files under `src/`. 3 largest: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
