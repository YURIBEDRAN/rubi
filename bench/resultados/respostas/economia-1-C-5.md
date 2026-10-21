# C rep 5: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

All four tasks complete:

1. `src/context.ts` has **9** matching `export ` lines; the last is at **line 293** (`export class Context<`).
2. `git ls-files` shows **583** tracked files total, **66** under `src/middleware/`.
3. `node fake-build.mjs` reports module **`payments`** failed: **missing environment variable `STRIPE_WEBHOOK_SECRET`** (step 1013 of 1800).
4. Top 3 largest non-test `.ts` files under `src/`: **`src/types.ts`** (2782 lines), **`src/jsx/intrinsic-elements.ts`** (924 lines), **`src/jsx/dom/render.ts`** (879 lines).
