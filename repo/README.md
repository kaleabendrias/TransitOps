# TransitOps

Transit operations management platform with role-based access, encrypted data at rest, and offline-first IndexedDB persistence.

## Build and run (Docker — fully self-contained)

```bash
docker compose up --build
```

No host `npm install` or `npm run build` required. Docker installs all dependencies and builds the frontend from source inside the container.

Open **http://localhost:4173**.

## Build and run (no Docker)

```bash
npm install
npm run build
npm run preview
```

Open **http://localhost:4173**.

## Docker services

| Service | Command | Port |
|---------|---------|------|
| **Production** | `docker compose up` | 4173 |
| **Dev server** | `docker compose --profile dev up dev` | 5173 |
| **Tests** | `docker compose --profile test run --rm test` | — |

## Run tests

In Docker:

```bash
./run_tests.sh
```

Locally:

```bash
npm test
```

## Login credentials

### First-time setup (administrator)

On a fresh database with no existing users, the **Register** form on the login page shows all four roles including **Administrator**. Create the first admin account directly from the UI:

1. Open the app and click **Register**.
2. Select **Administrator** from the role dropdown.
3. Enter username `admin`, password `admin1234`, click **Register**.
4. You are logged in as Administrator with full access.

After the first admin account exists, the Administrator role is removed from the registration form. Additional admin accounts can only be created by an existing admin.

### Other roles

Use the **Register** form. Available roles: Dispatcher, Content Author, Reviewer.

| Role | Username | Password | How to create |
|------|----------|----------|---------------|
| Administrator | `admin` | `admin1234` | Register form (first-time only) |
| Dispatcher | any | any (4+ chars) | Register form |
| Content Author | any | any (4+ chars) | Register form |
| Reviewer | any | any (4+ chars) | Register form |

## Verification steps

1. Open app on fresh DB — Register form shows Administrator role.
2. Register as `admin` / `admin1234` — logged in with all nav links visible.
3. Log out, register as Dispatcher — Administrator role no longer in dropdown.
4. Navigate to `/#/admin` directly — redirects to `/` (RBAC blocked).
5. Run `npm test` — all tests pass.
6. Run `npm run check` — 0 errors, 0 warnings.
