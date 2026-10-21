# build-log Y rep 2 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The build failed on module **`payments`** (step `[1013]`): it threw `ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET`. Final summary: `1799 ok, 1 failed`.
