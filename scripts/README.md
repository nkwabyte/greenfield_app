# Build Scripts

This directory contains bash scripts for building the Greenfield CRM monorepo.

## Available Scripts

### `build-web.sh`
Builds the web application only.
```bash
./scripts/build-web.sh
```
Output: `apps/web/.next`

### `build-desktop.sh`
Builds the desktop application (also builds web app as dependency).
```bash
./scripts/build-desktop.sh
```
Output: `apps/desktop/release/`

### `build-all.sh`
Builds both web and desktop applications.
```bash
./scripts/build-all.sh
```

### `clean.sh`
Removes build artifacts.
```bash
# Clean build outputs only
./scripts/clean.sh

# Deep clean (includes node_modules)
./scripts/clean.sh --deep
```

## Usage

All scripts are executable and should be run from the project root:

```bash
# Make scripts executable (already done)
chmod +x scripts/*.sh

# Run any script
./scripts/build-web.sh
```

## CI/CD Integration

These scripts can be used in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Build Web App
  run: ./scripts/build-web.sh

- name: Build Desktop App
  run: ./scripts/build-desktop.sh
```
