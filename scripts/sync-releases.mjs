import { writeFileSync, readFileSync, existsSync } from 'fs'
import { createInterface } from 'readline/promises'

const TARGETS = {
  app: {
    repo: 'Factory-Flow/factory-flow-app',
    output: '../changelog/app.mdx',
    product: 'Factory Flow',
  },
  gateway: {
    repo: 'Factory-Flow/factory-flow-gateway',
    output: '../changelog/gateway.mdx',
    product: 'Factory Flow Gateway',
  },
}

const ENV_PATH = new URL('../.env', import.meta.url).pathname.replace(/%20/g, ' ')

function loadEnv() {
  if (!existsSync(ENV_PATH)) return
  for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (key && !process.env[key]) process.env[key] = val
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = { target: null, prerelease: false, limit: null, from: null, since: null, body: true }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) opts.target = args[++i]
    else if (args[i] === '--prerelease') opts.prerelease = true
    else if (args[i] === '--no-body') opts.body = false
    else if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10)
    else if (args[i] === '--from' && args[i + 1]) opts.from = args[++i]
    else if (args[i] === '--since' && args[i + 1]) opts.since = new Date(args[++i])
  }
  return opts
}

async function promptFilters() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => rl.question(q)

  console.log('\nSync which changelog?\n')
  for (const [key, t] of Object.entries(TARGETS)) {
    console.log(`  ${key} — ${t.product} (${t.repo})`)
  }
  let target = null
  while (!TARGETS[target]) {
    target = (await ask(`\nTarget (${Object.keys(TARGETS).join('/')}): `)).trim()
  }

  console.log('\nFilter options (press Enter to skip):\n')

  const prereleaseAns = await ask('Include prereleases? (y/N): ')
  const prerelease = prereleaseAns.trim().toLowerCase() === 'y'

  const bodyAns = await ask('Include release notes body? (Y/n): ')
  const body = bodyAns.trim().toLowerCase() !== 'n'

  const limitAns = await ask('Limit to latest N releases? (e.g. 5): ')
  const limit = limitAns.trim() ? parseInt(limitAns.trim(), 10) : null

  const from = (await ask('From version? (e.g. v0.1.4): ')).trim() || null

  const sinceAns = (await ask('Since date? (YYYY-MM-DD): ')).trim()
  const since = sinceAns ? new Date(sinceAns) : null

  rl.close()
  console.log()
  return { target, prerelease, body, limit, from, since }
}

async function fetchReleases(repo) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const url = `https://api.github.com/repos/${repo}/releases?per_page=100`
  console.log(`Fetching: ${url}`)
  console.log(`Token: ${process.env.GITHUB_TOKEN ? 'set' : 'not set'}`)

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API ${res.status}: ${text}`)
  }
  return res.json()
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function applyFilters(all, opts) {
  let releases = all.filter((r) => !r.draft && (opts.prerelease || !r.prerelease))

  if (opts.since) {
    releases = releases.filter((r) => new Date(r.published_at) >= opts.since)
  }

  if (opts.from) {
    const idx = releases.findIndex((r) => r.tag_name === opts.from)
    if (idx === -1) console.warn(`Warning: --from ${opts.from} not found, ignoring filter`)
    else releases = releases.slice(0, idx + 1)
  }

  if (opts.limit) {
    releases = releases.slice(0, opts.limit)
  }

  return releases
}

async function main() {
  loadEnv()
  const opts = process.argv.length > 2 ? parseArgs() : await promptFilters()

  if (opts.target && !TARGETS[opts.target]) {
    throw new Error(`Unknown --target "${opts.target}". Expected one of: ${Object.keys(TARGETS).join(', ')}`)
  }
  if (!opts.target) {
    console.warn(`No --target given, defaulting to "app". Pass --target ${Object.keys(TARGETS).join('|')} to choose.`)
    opts.target = 'app'
  }
  const target = TARGETS[opts.target]
  const output = new URL(target.output, import.meta.url).pathname.replace(/%20/g, ' ')

  const all = await fetchReleases(target.repo)
  const releases = applyFilters(all, opts)

  if (releases.length === 0) {
    console.log('No releases found matching the given filters.')
    return
  }

  const sections = releases.map((r, i) => {
    const version = r.tag_name
    const date = formatDate(r.published_at)
    const body = opts.body ? (r.body?.trim() || '_No release notes provided._') : null
    const divider = i < releases.length - 1 ? '\n\n---' : ''
    return `## ${version}\n\n_${date}_${body ? `\n\n${body}` : ''}${divider}`
  })

  const mdx = [
    '---',
    'title: "Release notes"',
    `description: "New features, improvements, and fixes shipped to ${target.product}."`,
    '---',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n')

  writeFileSync(output, mdx)
  console.log(`Synced ${releases.length} release(s) → ${target.output.replace('../', '')}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
