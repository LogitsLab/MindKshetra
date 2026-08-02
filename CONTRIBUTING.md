# Contributing to MindKshetra

Thanks for your interest in improving MindKshetra. This is an open repository — ideas and patches are welcome.

## How to participate

### Open an issue
Use [Issues](https://github.com/LogitsLab/MindKshetra/issues) when you want to:

- Report a bug (steps to reproduce, expected vs actual, browser/OS)
- Propose a feature or design idea (problem, users, rough approach)
- Ask a question about architecture or astrology/Gita product direction

Please search existing issues first. Clear titles and details help maintainers respond faster.

### Open a pull request
1. Fork the repo and create a branch from **`dev`** — `dev` is the
   integration branch and every PR targets it. `main` is production and
   auto-deploys; nothing merges to `main` except promotions from `dev`.
2. Keep the change focused (one concern per PR)
3. Follow existing TypeScript / UI patterns; don’t reformat unrelated files
4. Add or update tests when you touch retrieval, astrology math, or API contracts
5. Fill out the PR description: **what** changed and **why**
6. Link related issues

Small PRs are easier to review than large ones.

## Local development

```bash
npm install
cp .env.example .env.local
# Add at least GROQ_API_KEY for Madhav
npm run dev
```

See the [README](README.md) for Supabase, Redis, and production env setup.  
System design: [ARCHITECTURE.md](ARCHITECTURE.md).

## What not to commit

- Secrets or API keys (use `.env.local`; never commit `.env`)
- Generated caches, `.vercel/`, `node_modules/`
- Internal planning notes (`*.plan.md`, personal TODO dumps)

## Code of conduct expectations

Be respectful. This project mixes scripture, personal reflection, and astrology — treat users’ lived experience with care. Prefer clarity over jargon.

## License

By contributing, you agree that your contributions are licensed under the same license as this repository (AGPL-3.0-or-later).
