# build-log X rep 1 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The **`payments`** module failed:

```
[1013] ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET
```

The build processed 1799 packages successfully and failed on just this one — it needs `STRIPE_WEBHOOK_SECRET` set in the environment but didn't find it.
