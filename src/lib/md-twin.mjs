// Markdown twins of the docs pages: every /docs/<path>/ page is also served as /docs/<path>.md
// (text/markdown, see public/_headers) so agents can read the source text without HTML chrome.
// Used by src/pages/[...twin].md.ts (the files) and src/lib/route-md-twin.ts (the <link rel="alternate">).

/** Docs collection entry id (e.g. `docs/ros2-mcp/quickstart`, `docs/wiseos/index`) -> twin URL path. */
export function twinPath(id) {
  const clean = id.replace(/\/index$/, '').replace(/^\/+|\/+$/g, '');
  return `/${clean}.md`;
}

/** The twin file: `# title`, an optional `> description`, then the page body exactly as authored. */
export function twinMarkdown({ title, description, body }) {
  const head = description ? `# ${title}\n\n> ${description}\n\n` : `# ${title}\n\n`;
  return `${head}${body.trim()}\n`;
}

/** Inverse of twinMarkdown's header: the body text that must match the rendered HTML page. */
export function twinBody(md) {
  return md.replace(/^# [^\n]*\n\n(?:> [^\n]*\n\n)?/, '');
}
