# D rep 3: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. **grep export in src/context.ts**: 9 matches; last match at line 293 (`export class Context<`).
2. **git ls-files**: 583 tracked files total; 66 under `src/middleware/`.
3. **node fake-build.mjs**: reports module `payments` failed due to missing environment variable `STRIPE_WEBHOOK_SECRET`.
4. **Largest non-test .ts files under src/**: `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924), `src/jsx/dom/render.ts` (879).

Note on task 3: `fake-build.mjs` isn't a real build — it just prints 1800 synthetic log lines for nonexistent packages (`pkg-0`..`pkg-96`) and hardcodes one fake error at iteration 1013. It's an untracked file in this repo, not part of any actual toolchain, so treat that "failure" as fabricated test output, not a genuine signal about the project.
