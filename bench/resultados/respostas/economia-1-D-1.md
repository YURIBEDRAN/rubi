# D rep 1: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

All four tasks complete:

1. **grep "export " in src/context.ts**: 9 matching lines; the last match is at **line 293** (`export class Context<`).
2. **git ls-files**: **583** tracked files total; **66** of them are under `src/middleware/`.
3. **node fake-build.mjs**: the `payments` module failed — `[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET` (build summary: 1799 ok, 1 failed).
4. **Largest non-test .ts files under src/** (26,387 total lines across all non-test files): `src/types.ts` (2782 lines), `src/jsx/intrinsic-elements.ts` (924 lines), `src/jsx/dom/render.ts` (879 lines).
