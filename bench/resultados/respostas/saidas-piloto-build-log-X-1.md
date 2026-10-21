# build-log X rep 1 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The `payments` module failed: it threw an ERROR because the required environment variable `STRIPE_WEBHOOK_SECRET` was missing. Overall result: 1799 modules ok, 1 failed (just that one, at step 1013).
