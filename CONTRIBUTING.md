# Contributing to EZCommerse

Thanks for helping improve EZCommerse! This guide covers local setup, conventions, and how we review contributions.

## Code of Conduct

By participating, you agree to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

### Prerequisites

- Node.js 22+
- npm
- Docker (optional, recommended for Postgres + API)
- PostgreSQL 16+ if not using Docker Compose

### Backend (`be/`)

```bash
cd be
cp .env.example .env
npm install
```

**With Docker (API + Postgres):**

```bash
docker compose up --build
```

**Without Docker:**

```bash
npm run start:dev
```

API default: `http://localhost:4000` (routes under `/api`).

### Web frontend (`webFe/`)

```bash
cd webFe
cp .env.example .env
npm install
npm run dev
```

App default: `http://localhost:3000`. Point `NEXT_PUBLIC_API_BASE_URL` at the API.

## Branch naming

Use short, descriptive prefixes:

| Prefix | Use |
| --- | --- |
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, maintenance |
| `refactor/` | Code restructuring without behavior change |
| `test/` | Tests only |

Examples: `feat/loyalty-discount-ui`, `fix/sale-total-rounding`, `docs/deployment-docker`.

## Commit messages

We prefer [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(sales): support partial cash and UPI on create
fix(inventory): aggregate shared recipe ingredients
docs(readme): clarify docker compose quick start
chore(ci): run lint and test on pull requests
```

Keep the subject under ~72 characters; explain *why* in the body when needed.

## Tests and linting

### Backend

```bash
cd be
npm run lint
npm run test
npm run test:e2e   # optional; needs a configured test environment
```

### Web

```bash
cd webFe
npm run lint
npm run test
```

Please run lint and relevant unit tests before opening a PR. CI will re-run them on every push to `main` and on pull requests.

## Pull request process

1. Fork (or branch from `main` if you have write access).
2. Create a focused branch (one concern per PR when practical).
3. Ensure lint/tests pass locally.
4. Open a PR using the template; link related issues (`Fixes #123`).
5. Respond to review feedback promptly.

**What reviewers look for**

- Clear problem statement and scoped diff
- Tests for non-trivial logic (especially sales, inventory, auth)
- No secrets, `.env` files, or personal paths
- Docs updated when behavior or setup changes
- Conventional commit history (squash is fine)

**Review timing**

Maintainers aim to give an initial response within **a few days**. Complex changes may take longer. Feel free to ping after a week if there is no reply.

## Issue triage and labels

New issues typically start with `needs-triage`. Maintainers then apply labels such as:

- `bug`, `enhancement`, `documentation`, `question`
- `good first issue`, `help wanted`
- `wontfix` (when we intentionally will not pursue)

See [`.github/labels.yml`](.github/labels.yml) for the full set. Security issues should **not** be filed publicly — see [SECURITY.md](SECURITY.md).

## Questions

Use GitHub Discussions (once enabled) for open-ended questions, or open an issue with the `question` label.
