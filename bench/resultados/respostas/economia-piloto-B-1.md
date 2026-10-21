# B rep 1: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `grep -rn "export " src .` → **9 matching lines** in `src/context.ts`; last match at **line 293** (`export class Context<`).
2. `git ls-files` → **583 tracked files** total, **66** under `src/middleware/`.
3. `node fake-build.mjs` → module **`payments`** failed: missing environment variable `STRIPE_WEBHOOK_SECRET`.
4. **189** non-test `.ts` files under `src/`; 3 largest: `types.ts` (2782 lines), `jsx/intrinsic-elements.ts` (924 lines), `jsx/dom/render.ts` (879 lines).
