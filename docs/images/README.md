# Screenshot placeholder

Replace this directory's `screenshot.png` with a real capture of the EZCommerse UI.

Recommended capture:

1. Sign in on the live demo or a local `webFe` instance
2. Open the main dashboard (or landing page after login)
3. Capture a clean desktop viewport (~1280×720 or larger)
4. Save as `docs/images/screenshot.png`

You can also run the Playwright helper:

```bash
npm install --prefix scripts  # if using a local package, or: npx playwright install chromium
node scripts/capture-screenshot.js
```

See `scripts/capture-screenshot.js` for options (`BASE_URL`, output path).
