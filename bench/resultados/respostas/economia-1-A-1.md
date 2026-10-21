# A rep 1: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

All four tasks are done:

1. `grep -rn "export " src .` → **9 matches** in `src/context.ts`, last match at **line 293** (`export class Context<`).
2. `git ls-files` → **583 tracked files** total, **66 files** under `src/middleware/`.
3. `node fake-build.mjs` → module **`payments`** failed: **missing environment variable `STRIPE_WEBHOOK_SECRET`** (build finished 1799 ok, 1 failed).
4. 3 largest non-test `.ts` files under `src/`: **`src/types.ts` (2782 lines)**, **`src/jsx/intrinsic-elements.ts` (924 lines)**, **`src/jsx/dom/render.ts` (879 lines)**.
