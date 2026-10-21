# C rep 2: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

Here's the summary of all four tasks:

1. **grep "export " in src/context.ts**: 9 distinct exported lines, last at line 293 (`export class Context<`). Note: since the command searches both `src` and `.` (which overlaps, as `.` already contains `src`), the raw output lists each match twice — once as `src/context.ts:...` and once as `./src/context.ts:...` (18 lines total, 9 unique).

2. **git ls-files**: 583 tracked files total; 66 of them are under `src/middleware/`.

3. **node fake-build.mjs**: Prints `[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET`. ⚠️ This isn't a real build failure — the script just loops 1800 times printing synthetic log lines and hardcodes that one "ERROR" string at iteration 1013 regardless of any actual module or environment state. It's fabricated output, not evidence of an actual payments/Stripe problem.

4. **Largest non-test .ts files in src/**: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
