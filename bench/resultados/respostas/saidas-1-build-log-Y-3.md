# build-log Y rep 3 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The build failed at step **[1013]** — module **`payments`** failed with:

```
ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET
```

Final summary: `build finished: 1799 ok, 1 failed`. So out of 1800 steps, only the `payments` module failed, due to a missing `STRIPE_WEBHOOK_SECRET` environment variable.
