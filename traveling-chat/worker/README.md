# Traveling Chat API

From this folder, deploy the Worker and set its secret:

```powershell
npx wrangler login
npx wrangler secret put DASHSCOPE_API_KEY
npx wrangler deploy
```

Copy the returned URL to `../app/config.js`. Never commit an API key.
