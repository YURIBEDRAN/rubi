# B rep 2: 4/4

Gabarito: {"t1":["9","293"],"t2":["583","66"],"t3":["payments","STRIPE_WEBHOOK_SECRET"],"t4":["types.ts","intrinsic-elements.ts","render.ts"]}

1. `grep -rn "export " src .` → **src/context.ts** has 9 matching lines (shown twice in the raw output, 18 lines total, since `.` overlaps with `src`), last match at **line 293**.
2. `git ls-files` → **583** tracked files total, **66** under `src/middleware/`.
3. `node fake-build.mjs` → reports module **"payments"** failed due to **missing environment variable `STRIPE_WEBHOOK_SECRET`** — but note this is a synthetic, untracked script that just prints a scripted fake log (fictional `packages/pkg-N` paths, not real repo modules); it doesn't build anything real.
4. 3 largest non-test `.ts` files under `src/`: **src/types.ts** (2782 lines), **src/jsx/intrinsic-elements.ts** (924), **src/jsx/dom/render.ts** (879).
