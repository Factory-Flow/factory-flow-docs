import { writeFileSync } from 'fs'

const REPO = 'Factory-Flow/factory-flow-app'
const OUTPUT = new URL('../release-notes.mdx', import.meta.url).pathname

async function fetchReleases() {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }

  const url = `https://api.github.com/repos/${REPO}/releases?per_page=100`
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

async function main() {
  const all = await fetchReleases()
  const releases = all.filter((r) => !r.draft && !r.prerelease)

  if (releases.length === 0) {
    console.log('No published releases found.')
    return
  }

  const sections = releases.map((r, i) => {
    const version = r.tag_name
    const date = formatDate(r.published_at)
    const body = r.body?.trim() || '_No release notes provided._'
    const divider = i < releases.length - 1 ? '\n\n---' : ''
    return `## ${version} — ${date}\n\n${body}${divider}`
  })

  const mdx = [
    '---',
    'title: "Release notes"',
    'description: "New features, improvements, and fixes shipped to Factory Flow."',
    '---',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n')

  writeFileSync(OUTPUT, mdx)
  console.log(`Synced ${releases.length} release(s) → release-notes.mdx`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
