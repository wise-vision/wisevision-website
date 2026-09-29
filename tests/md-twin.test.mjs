import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { twinPath, twinMarkdown, twinBody } from '../src/lib/md-twin.mjs';
import { markdownText, htmlMainText, normalise, compareTexts, checkDist } from '../scripts/md-twin-parity.mjs';

const BODY = `Run the server in **read-only** mode. Don't skip it — really.

:::caution[Actuation tools]
These tools can move a robot.
:::

| Tool | Mutates |
| --- | --- |
| \`ros2_topic_publish\` | yes |

\`\`\`bash
docker run -i --rm -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy
\`\`\`

<details><summary>Input schema (JSON)</summary>

\`\`\`json
{ "a": "<b>" }
\`\`\`

</details>

See [the quickstart](/docs/ros2-mcp/quickstart/) and '/&lt;action>/cancel_goal'.
`;

// What Starlight renders for BODY (trimmed to the parts that matter: smart quotes, aside title, expressive-code chrome, anchors).
const HTML = `<html><head><title>x</title></head><body><header>Site header text</header><main>
<h1 id="_top">Security model</h1>
<div class="sl-markdown-content">
<p>Run the server in <strong>read-only</strong> mode. Don’t skip it — really.</p>
<aside class="starlight-aside starlight-aside--caution"><p class="starlight-aside__title"><svg></svg>Actuation tools</p><div class="starlight-aside__content"><p>These tools can move a robot.</p></div></aside>
<table><thead><tr><th>Tool</th><th>Mutates</th></tr></thead><tbody><tr><td><code>ros2_topic_publish</code></td><td>yes</td></tr></tbody></table>
<div class="expressive-code"><figure class="frame is-terminal"><figcaption class="header"><span class="title"></span><span class="sr-only">Terminal window</span></figcaption><pre><code><div class="ec-line"><div class="code">docker run -i --rm -e ROS2_MCP_READONLY=1 wisevision/ros2_mcp:jazzy</div></div></code></pre><div class="copy"><button title="Copy to clipboard" data-code="x"><div></div></button></div></figure></div>
<details><summary>Input schema (JSON)</summary>
<div class="expressive-code"><figure class="frame"><pre><code><div class="ec-line"><div class="code">{ "a": "&lt;b>" }</div></div></code></pre></figure></div>
</details>
<p>See <a href="/docs/ros2-mcp/quickstart/">the quickstart</a> and ‘/&lt;action>/cancel_goal’.</p>
<div class="sl-heading-wrapper"><h2 id="x">Next</h2><a class="sl-anchor-link" href="#x"><span aria-hidden="true"></span><span class="sr-only">Section titled “Next”</span></a></div>
</div>
<footer class="sl-footer">Edit page</footer>
</main></body></html>`;

describe('twinPath', () => {
  it('maps a docs entry id to its .md URL', () => {
    expect(twinPath('docs/ros2-mcp/quickstart')).toBe('/docs/ros2-mcp/quickstart.md');
    expect(twinPath('docs')).toBe('/docs.md');
  });
  it('maps an index entry id the same way as its page URL', () => {
    expect(twinPath('docs/wiseos/index')).toBe('/docs/wiseos.md');
  });
});

describe('twinMarkdown / twinBody', () => {
  const md = twinMarkdown({ title: 'Security model', description: 'How to lock it down.', body: BODY });
  it('starts with the title and the description, then the page body verbatim', () => {
    expect(md.startsWith('# Security model\n\n> How to lock it down.\n\n')).toBe(true);
    expect(md).toContain(BODY.trim());
  });
  it('twinBody strips the title block back off', () => {
    expect(twinBody(md).trim()).toBe(BODY.trim());
  });
  it('works without a description', () => {
    const m = twinMarkdown({ title: 'T', body: 'Hello.' });
    expect(m).toBe('# T\n\nHello.\n');
    expect(twinBody(m).trim()).toBe('Hello.');
  });
});

describe('text extraction', () => {
  it('normalise folds smart punctuation and whitespace', () => {
    expect(normalise('Don’t  “x”\n‘y’ a–b … ')).toBe(`Don't "x" 'y' a-b ...`);
  });
  it('markdownText keeps code blocks, table cells, aside labels and link text; drops raw HTML tags', () => {
    const t = markdownText(BODY);
    expect(t).toContain('ROS2_MCP_READONLY=1');
    expect(t).toContain('Actuation tools');
    expect(t).toContain('ros2_topic_publish');
    expect(t).toContain('Input schema (JSON)');
    expect(t).toContain('the quickstart');
    expect(t).not.toContain('<details>');
    expect(t).toContain("'/<action>/cancel_goal'");
  });
  it('htmlMainText reads only the markdown content, without screen-reader-only chrome or copy buttons', () => {
    const t = htmlMainText(HTML);
    expect(t).not.toContain('Site header text');
    expect(t).not.toContain('Terminal window');
    expect(t).not.toContain('Section titled');
    expect(t).not.toContain('Edit page');
    expect(t).toContain('ROS2_MCP_READONLY=1');
  });
  it('htmlMainText throws when the page has no markdown content', () => {
    expect(() => htmlMainText('<html><body><main></main></body></html>')).toThrow(/sl-markdown-content/);
  });
});

describe('compareTexts', () => {
  it('passes for the twin of the same page', () => {
    const r = compareTexts(markdownText(BODY + '\n## Next\n'), htmlMainText(HTML));
    expect(r).toEqual({ ok: true });
  });
  it('fails, showing where, when the HTML drifts from the markdown', () => {
    const r = compareTexts(markdownText(BODY), htmlMainText(HTML.replace('read-only', 'read-write')));
    expect(r.ok).toBe(false);
    expect(r.md).toContain('read-only');
    expect(r.html).toContain('read-write');
  });
});

describe('checkDist', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'twins-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const page = (rel, html) => {
    mkdirSync(join(dir, rel), { recursive: true });
    writeFileSync(join(dir, rel, 'index.html'), html);
  };
  const withLink = (href) => HTML.replace('<title>x</title>', `<title>x</title><link rel="alternate" type="text/markdown" href="${href}">`);

  it('passes when every docs page has a twin, the head link and matching text', () => {
    page('docs/security', withLink('/docs/security.md'));
    writeFileSync(join(dir, 'docs/security.md'), twinMarkdown({ title: 'Security model', body: BODY + '\n## Next\n' }));
    const r = checkDist(dir);
    expect(r.failures).toEqual([]);
    expect(r.checked).toBe(1);
  });
  it('fails a page with no twin file', () => {
    page('docs/a', withLink('/docs/a.md'));
    expect(checkDist(dir).failures.join()).toMatch(/missing twin/);
  });
  it('fails a page with no alternate link in the head', () => {
    page('docs/security', HTML);
    writeFileSync(join(dir, 'docs/security.md'), twinMarkdown({ title: 'S', body: BODY + '\n## Next\n' }));
    expect(checkDist(dir).failures.join()).toMatch(/alternate/);
  });
  it('fails a page whose twin text differs', () => {
    page('docs/security', withLink('/docs/security.md'));
    writeFileSync(join(dir, 'docs/security.md'), twinMarkdown({ title: 'S', body: 'Something else.' }));
    expect(checkDist(dir).failures.join()).toMatch(/text differs/);
  });
  it('fails when there are no docs pages at all', () => {
    expect(checkDist(dir).failures.join()).toMatch(/no docs pages/);
  });
});
