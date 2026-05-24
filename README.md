# Veloura Spaces Website

Static premium website for a construction and interior design studio.

## Files

- `index.html` - page structure and content.
- `styles.css` - mobile-first layout, visual system, and responsive rules.
- `script.js` - mobile navigation, project filters, and consultation form behavior.
- `case-studies/` - individual project pages for gallery and SEO depth.
- `local-server.cjs` - optional local static server for browser testing.

## Run

Open `index.html` directly in a browser, or run:

```bash
node local-server.cjs
```

Then visit `http://127.0.0.1:5173/`.

The consultation form validates required fields and opens a prefilled email to `hello@velouraspaces.com`. Replace the email, phone number, and any placeholder project metrics before publishing.
