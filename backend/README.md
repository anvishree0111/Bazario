# Bazario API

Express/MySQL backend for Bazario Phase 1–3.

## Configuration and setup

Copy `.env.example` to `.env` and set a random `JWT_SECRET` of at least 32
characters and the Google OAuth web client ID used by the frontend. Configure
the MySQL connection, then run:

```bash
npm install
npm run migrate
npm start
```

`npm run migrate` applies `sql/schema.sql` for an empty database and records
versioned, transactional migrations in `schema_migrations` for existing
databases. It does not drop, truncate, reset, or seed data. Existing
password-only accounts are retained as data but password login and registration
routes return `410`; accounts must authenticate with a verified Google ID token.

## Authentication

Google-only. Login and registration are separate, explicit operations and the
role (`buyer`/`seller`) is only the *requested* intent: every decision is made
from the backend-verified Google claims and the database.

| Route | Purpose |
|---|---|
| `POST /api/auth/google/login` `{ idToken, role }` | Login only. Returns `{ token, role, user\|seller }`. Never creates an account (`404 ACCOUNT_NOT_FOUND`, `409 WRONG_ROLE`). |
| `POST /api/auth/google/register/start` `{ idToken, role }` | Verifies Google and checks that registration is allowed (`409 ALREADY_REGISTERED` / `ROLE_CONFLICT`). Creates nothing; returns a 30-minute server-signed `registrationToken` and the prefill `{ name, email }`. |
| `POST /api/auth/google/register/complete` `{ registrationToken, role, profile }` | Validates the profile, creates account + Google identity (+ interests) in one transaction and returns a session. Email always comes from the signed token. |
| `GET /api/auth/session` (Bearer token) | Restores a session after a page reload; `401 SESSION_INVALID` if the account no longer exists. |
| `POST /api/auth/google`, `/buyer/google`, `/seller/google` | Legacy aliases. **Login only** now (they used to create accounts silently). |

Profile fields (only what the schema stores): buyer `name`, optional
`interests[]`; seller owner `name`, `shopName`, optional `shopDescription`.

One Google identity maps to one account type (`UNIQUE (provider,
provider_subject)` in `auth_identities`), which is what blocks a buyer
identity from creating a seller account and vice-versa. Unique keys on
`buyers.email`, `sellers.email` and `auth_identities` turn concurrent duplicate
registrations into `ER_DUP_ENTRY`, which is reported as a normal `409`.
No schema migration is required for this change.

Pending registration tokens use a different JWT audience
(`bazario-registration`), so they can never be used as a session. Protected
routes validate signature, issuer, audience (`bazario-client`), role and
numeric identity, and route parameters are checked against the token.

Tests: `npm test` (`test/auth-flows.test.js` covers the rules with an
in-memory store; it needs no MySQL or Google credentials).

## Checkout and data integrity

`POST /api/buyer/:buyerId/orders` checks out the authenticated buyer's current
database cart, locks cart rows, uses database prices (never client prices),
creates one parent order and seller suborders atomically, clears the cart, and
records a unique purchase event. Send a unique `Idempotency-Key` header to
make retries safe. Seller order status changes are ownership-scoped and only
allow `Confirmed -> Processing -> Shipped -> Delivered` or cancellation; the
parent status is aggregated from its suborders.

Behavioral events are accepted at
`POST /api/buyer/:buyerId/events`; interests are stored in both the buyer
profile JSON compatibility field and normalized `buyer_interests` rows.

## Guarded reset helper

`npm run reset:db` is a destructive local-development helper and is never run
by the server or migration runner. It refuses `NODE_ENV=production`, requires
`RESET_ALLOWED_DATABASES` to explicitly list the exact target database, prints
the affected table counts, and deletes records in foreign-key order without
disabling foreign-key checks or dropping tables:

```bash
RESET_ALLOWED_DATABASES=bazario_local \
RESET_DATABASE_CONFIRM=RESET_BAZARIO_DATABASE:bazario_local \
npm run reset:db
```

The procedure preserves schema and unrelated tables. Back up the database first
and verify the selected database name and counts. Do not use this helper against
a database with real data; it cannot restore deleted records automatically.
