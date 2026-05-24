# Veloura Spaces Website

Static premium website for a construction and interior design studio.

## Files

- `index.html` - page structure and content.
- `styles.css` - mobile-first layout, visual system, and responsive rules.
- `script.js` - mobile navigation, project filters, and consultation form behavior.
- `case-studies/` - individual project pages for gallery and SEO depth.
- `case-study.html` - dynamic project detail page powered by backend content.
- `admin/` - admin panel for editing website content and reviewing leads.
- `data/content.json` - local content database used by the backend.
- `local-server.cjs` - local backend and static server.

## Run

Open `index.html` directly in a browser, or run:

```bash
npm start
```

Then visit `http://127.0.0.1:5173/`.

Admin panel:

```text
http://127.0.0.1:5173/admin/
```

Default local admin password:

```text
veloura-admin
```

Set a stronger password when running locally:

```bash
ADMIN_PASSWORD="your-strong-password" npm start
```

The consultation form validates required fields and saves leads to `data/leads.json` when the backend is running. If the backend is unavailable, it falls back to opening a prefilled email to the configured business email.

## Production note

The local backend stores edits in JSON files. That works for developer testing, but Vercel does not provide persistent file storage for serverless deployments. For a live admin panel, connect the same content API to a persistent database such as Supabase Postgres.
