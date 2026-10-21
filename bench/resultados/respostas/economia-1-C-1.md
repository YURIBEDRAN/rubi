# C rep 1: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `export ` matches in `src/context.ts`: 9 lines, last match at line 293.
2. `git ls-files`: 583 tracked files total; 66 of them under `src/middleware/`.
3. `node fake-build.mjs` fails on the `payments` module — "missing environment variable STRIPE_WEBHOOK_SECRET" (logged at step 1013; script reports 1799 ok, 1 failed).
4. Largest non-test `.ts` files under `src/`: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
