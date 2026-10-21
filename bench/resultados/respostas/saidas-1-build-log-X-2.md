# build-log X rep 2 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The `payments` module failed at step 1013: **missing environment variable `STRIPE_WEBHOOK_SECRET`**. Everything else (1799 steps) passed.
