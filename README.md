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
- `api/` - Vercel serverless API routes for content and leads.
- `lib/` - shared storage and HTTP helpers.

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

The admin panel signs in with the admin password and keeps access in an HttpOnly session cookie. For production, set `ADMIN_SESSION_SECRET` to a long random value so sessions are signed separately from the password.

MongoDB storage:

```bash
copy .env.example .env
```

Then put your real `MONGODB_URI`, `MONGODB_DB`, and `ADMIN_PASSWORD` values in `.env`.

The consultation form validates required fields and saves leads to MongoDB when `MONGODB_URI` is configured. Without MongoDB, it saves to `data/leads.json` locally. If the backend is unavailable, it falls back to opening a prefilled email to the configured business email.

## Production note

Vercel needs these environment variables:

```text
MONGODB_URI
MONGODB_DB
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
BREVO_API_KEY
BREVO_SENDER_EMAIL
BREVO_SENDER_NAME
LEAD_NOTIFY_EMAIL
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
CLOUDINARY_UPLOAD_FOLDER
```

Brevo notes:

- `BREVO_SENDER_EMAIL` must be a sender verified in Brevo.
- `LEAD_NOTIFY_EMAIL` is where consultation requests are sent.
- Leads are still saved if the email provider is unavailable.

Cloudinary notes:

- `CLOUDINARY_CLOUD_NAME` is the account cloud name, not the API key label.
- `CLOUDINARY_UPLOAD_FOLDER` is optional and defaults to `veloura-spaces`.
- Image uploads are available only after an admin signs in.

Do not commit real secrets to the repository.
