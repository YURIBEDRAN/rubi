# build-log Y rep 1 (certo; gabarito: payments / STRIPE_WEBHOOK_SECRET)

> Run `node fake-build.mjs` and tell me which module failed and why.

The `payments` module failed at step **[1013]**:

```
ERROR module payments failed: missing environment variable STRIPE_WEBHOOK_SECRET
```

Final tally: 1799 ok, 1 failed. The build needs `STRIPE_WEBHOOK_SECRET` set in the environment for the `payments` module to build successfully.
