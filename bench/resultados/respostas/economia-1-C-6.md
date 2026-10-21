# C rep 6: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `grep -rn "export " src .` matches `src/context.ts` **18 times** in the raw output — but that's because `.` overlaps with `src`, so each of the **9 unique** `export` lines is printed twice (once as `src/context.ts:...`, once as `./src/context.ts:...`). Last match (either form): **line 293** (`export class Context<`).
2. `git ls-files` lists **583** tracked files total; **66** are under `src/middleware/`.
3. `node fake-build.mjs` exits 0 overall (1799 ok, 1 failed) but module **`payments`** failed: `ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET`.
4. Largest non-test `.ts` files under `src/`: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
