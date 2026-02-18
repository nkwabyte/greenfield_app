# Greenfield Monorepo

A pnpm monorepo containing the Greenfield CRM web and desktop applications.

## Structure

```
apps/
  web/        Next.js web application
  desktop/    Electron desktop application
packages/
  types/      Shared TypeScript types (planned)
  shared/     Shared utilities (planned)
  services/   Shared services (planned)
```

## Development

### Prerequisites
- Node.js 18+
- Yarn 1.22+ (or Yarn Berry)

### Install Dependencies
```bash
yarn install
```

### Run Web App Only
```bash
yarn workspace @greenfield/web dev
```
The web app will be available at `http://localhost:9002`

### Run Desktop App Only
```bash
# First, start the web dev server
yarn workspace @greenfield/web dev

# Then in another terminal, start desktop
yarn workspace @greenfield/desktop dev
```

### Run Both Concurrently
```bash
yarn dev
```
This starts both the web dev server and Electron desktop app.

## Build Scripts

Convenient bash scripts are available in the `scripts/` directory:

```bash
# Build web app only
./scripts/build-web.sh

# Build desktop app (includes web)
./scripts/build-desktop.sh

# Build everything
./scripts/build-all.sh

# Clean build artifacts
./scripts/clean.sh
```

See [scripts/README.md](scripts/README.md) for more details.

## Building

### Build Web App
```bash
yarn workspace @greenfield/web build
```

### Build Desktop App
```bash
yarn workspace @greenfield/desktop build
```

### Build All
```bash
yarn workspaces run build
```

## Deployment

### Web (Vercel)
1. Set Vercel project root directory to: `apps/web`
2. Build command: `yarn install && yarn workspace @greenfield/web build`
3. Output directory: `apps/web/.next`

### Desktop
Desktop builds are created in `apps/desktop/release/` after running:
```bash
yarn workspace @greenfield/desktop build
```

## Project Management
- **Package Manager**: Yarn with workspaces
- **Monorepo Tool**: Native Yarn workspaces
- **Web Framework**: Next.js 16
- **Desktop Framework**: Electron 34

# Release

```bash
./scripts/release-desktop.sh v0.2.0
```
