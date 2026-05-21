# Factory Flow Docs

Documentation site for Factory Flow, built with [Mintlify](https://mintlify.com).

## Release notes

Release notes are generated from [GitHub releases](https://github.com/Factory-Flow/factory-flow-app/releases) and written to `release-notes.mdx`. Run the sync script locally before deploying whenever new releases are published.

Copy `.env.example` to `.env` and add your token:

```bash
cp .env.example .env
```

Generate a classic token at GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic). Enable the **`repo`** scope.

**Run the sync:**

```bash
node scripts/sync-releases.mjs
```

**Options:**

| Flag | Description |
|------|-------------|
| `--prerelease` | Include prerelease versions |
| `--limit <n>` | Only pull the latest n releases |
| `--from <version>` | Pull from this version onwards (e.g. `--from v0.1.4`) |
| `--since <date>` | Only include releases after this date (e.g. `--since 2026-05-01`) |

After syncing, commit `release-notes.mdx` and push to deploy.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
