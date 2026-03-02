# H2 PDF API

Backend API for PDF annotation app. Stores PDF files and app state, identifies user via `X-Device-ID` header.

## Requirements

- Node.js 18+
- PostgreSQL

## Installation

```bash
cd api
npm install
```

## Configuration

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Edit `DATABASE_URL` to match your PostgreSQL setup.

## Database

```bash
# Create migration and run
npx prisma migrate dev --name init

# Or push schema (dev)
npx prisma db push
```

## Run

```bash
# Development
npm run start:dev

# Production
npm run build && npm run start
```

API runs by default at `http://localhost:3000`. App runs at `http://localhost:8080`.

## API Endpoints

### User & Files (header `X-Device-ID`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/ensure` | Ensure user exists |
| GET | `/api/files` | List user's PDFs |
| POST | `/api/files` | Upload PDF (multipart, field `file`) |
| GET | `/api/files/:id` | Metadata file |
| GET | `/api/files/:id/download` | Download PDF |
| GET | `/api/files/:id/state` | Get app state |
| PATCH | `/api/files/:id/state` | Update app state (auto-save) |
| DELETE | `/api/files/:id` | Delete file |

### Admin (header `X-Admin-Key`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List users (id, deviceId, joinedAt, lastLoginAt) |

Requires `ADMIN_API_KEY` env var. Send header `X-Admin-Key: <ADMIN_API_KEY>`.
