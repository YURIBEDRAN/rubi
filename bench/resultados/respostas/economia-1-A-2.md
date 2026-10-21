# A rep 2: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `src/context.ts` has 9 matching `export ` lines; the last is at line 293.
2. `git ls-files` tracks 583 files total, 66 of them under `src/middleware/`.
3. `node fake-build.mjs` reports module **payments** failed: missing environment variable `STRIPE_WEBHOOK_SECRET` (step 1013 of 1800).
4. 189 non-test `.ts` files under `src/`; 3 largest: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
