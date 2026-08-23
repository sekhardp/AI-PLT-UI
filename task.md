# Runtime Config Implementation

- [x] `public/config.json` — dev default
- [x] `src/config.ts` — typed singleton
- [x] `src/main.tsx` — await config before render
- [x] `src/api.ts` — use getConfig() instead of hardcoded BASE
- [x] `docker-entrypoint.sh` — write config.json from env vars
- [x] `Dockerfile` — switch CMD → ENTRYPOINT
- [x] `nginx.conf` — no-store for /config.json
- [x] `k8s/configmap.yaml` — new ConfigMap
- [x] `k8s/deployment.yaml` — add envFrom
