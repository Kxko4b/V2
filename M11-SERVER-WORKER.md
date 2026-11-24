# M11 Server Worker

This worker is the missing bridge between the V2 Admin → Server card and the M11 Termux machine. The existing `kxko-test` HTTP process is separate; it can be online while this queue worker is absent.

## Requirements

- Node.js 18 or newer
- PM2 installed on the M11
- The Supabase project's **service_role secret** (never put it in GitHub or the website)
- The owner account UUID is already set in `m11-worker.js`

## Install on the M11

From Termux:

```sh
mkdir -p ~/server/services
cd ~/server/services
curl -fsSL https://raw.githubusercontent.com/Kxko4b/V2/main/m11-worker.js -o m11-worker.js
```

Create a private environment file:

```sh
cat > ~/server/services/.env <<'EOF'
SUPABASE_URL=https://ggewdpazpeoielbqrcgm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=PASTE_THE_SERVICE_ROLE_SECRET_HERE
EOF
chmod 600 ~/server/services/.env
```

Get the legacy `service_role` secret from Supabase Dashboard → Project Settings → API Keys. Do not use the publishable key from `data/config.js`, and never commit this secret.

Start the worker under PM2:

```sh
pm2 start ~/server/services/m11-worker.js --name kxko-worker
pm2 save
pm2 status
```

Expected PM2 processes: `kxko-test` and `kxko-worker`, both `online`.

## Logs / updates

```sh
pm2 logs kxko-worker --lines 50
```

To update the worker after a code change:

```sh
curl -fsSL https://raw.githubusercontent.com/Kxko4b/V2/main/m11-worker.js -o ~/server/services/m11-worker.js
pm2 restart kxko-worker
```

The worker only polls rows belonging to the configured owner UUID. It expires pending requests older than 10 minutes when it starts, claims jobs before running them, streams output back to Supabase, and enforces a 10-minute command timeout.
