# build-log X rep 3 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The build failed at step **1013** on module **payments**:

```
[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET
```

The script simulates 1800 build steps (compile/bundle/lint/typecheck) and hard-codes a failure at iteration 1013, logging that the `payments` module failed due to a missing `STRIPE_WEBHOOK_SECRET` environment variable (the rest of the 1799 steps still report "ok").
