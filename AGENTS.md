# AGENTS.md

Guidance for AI agents working in the Policy Brain repository.

## Repository overview

This is a **documentation-only** repository containing the Software Design Document (SDD) for Policy Brain — an enterprise AI Policy Compiler and Enterprise Knowledge Platform for healthcare payers. There is no application code, package manager manifest, or runnable services yet.

| Path | Contents |
|------|----------|
| `docs/` | 28 numbered SDD sections plus `SDD.md` and `README.md` |
| `README.md` | Chat-derived expanded SDD corpus (raw source material) |

## Cursor Cloud specific instructions

### What runs here

There are no long-running application services. Development work is limited to reading and editing Markdown documentation.

| Task | Command / approach |
|------|-------------------|
| Validate all SDD sections exist | `python3` script checking `docs/[0-9]*.md` (see validation in setup) |
| Preview docs locally | Generate HTML to `/tmp/policy-brain-docs` and serve with `python3 -m http.server 8080` from that directory |
| Lint / test | No lint or test suite is configured; validation is structural (file presence, minimum content length) |
| Build | No build step |

### Previewing documentation

To browse the SDD in a browser during a cloud session, serve the raw markdown directory:

```bash
cd /workspace && python3 -m http.server 8080
```

Then open `http://localhost:8080/docs/README.md`.

For a richer HTML preview, generate pages under `/tmp/policy-brain-docs` (see setup validation script) and serve from that directory instead.

### Gotchas

- **No dependencies to install.** The VM update script is a no-op (`true`). Do not add `npm install` or similar unless application scaffolding is added to the repo.
- **No secrets or `.env` files** are required for documentation work.
- **No CI/CD, pre-commit hooks, or linters** are configured.
- When implementation scaffolding arrives (per `docs/README.md`: "Engineering appendices will be added next"), revisit this file to document services, env vars, and startup commands.

### SDD section index

Sections `01`–`28` in `docs/` cover Vision through Infrastructure. See `docs/README.md` for the canonical table of contents.
