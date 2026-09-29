---
type: internal
ws: W0.6
---
# Old-URL redirect inventory (wisevision.tech)

Sources:

- **(a) Docusaurus build** at tag `docusaurus-final` (ecfd247): `git ls-tree -r --name-only docusaurus-final -- src/pages` → 20 files = 19 routes + `index` (`/`).
- **(b) Wayback CDX** `https://web.archive.org/cdx/search/cdx?url=wisevision.tech/*&output=json&fl=original,statuscode,timestamp&collapse=urlkey&limit=2000`, fetched 2026-09-29: 160 rows. Includes the 2025 Next.js site (`/agriculture`, `/logistics`, `/pricing`, … plus page names recovered from `/_next/static/.../pages/*.js` chunk URLs) and the 2025 `/static/doc/*` Docusaurus docs.

Target routes on the new site: `/`, `/ros2-mcp/`, `/wiseos/`, `/defence/`, `/contact/`, `/privacy/`, `/docs/`. Nothing on the old site was about defence, so nothing redirects to `/defence/`.

## Redirected (301)

| old path | new path | source | reason |
|---|---|---|---|
| `/about` (+ `/about/`) | `/` | docusaurus-final | Company page; the new site has no team/about page (L11). Home carries the company story. |
| `/ai-automations` (+ `/ai-automations/`) | `/wiseos/` | docusaurus-final | AI agent over fleet data is WiseOS. |
| `/case-studies` (+ `/case-studies/`) | `/wiseos/` | docusaurus-final | Case studies were fleet/IoT deployments; nearest is WiseOS (early access). |
| `/case-studies/agri-field` (+ `/case-studies/agri-field/`) | `/wiseos/` | docusaurus-final | Case study (fleet/IoT deployment) → WiseOS. |
| `/case-studies/automotive-twin` (+ `/case-studies/automotive-twin/`) | `/wiseos/` | docusaurus-final | Case study (fleet/IoT deployment) → WiseOS. |
| `/case-studies/pv-farm` (+ `/case-studies/pv-farm/`) | `/wiseos/` | docusaurus-final | Case study (fleet/IoT deployment) → WiseOS. |
| `/case-studies/smart-city` (+ `/case-studies/smart-city/`) | `/wiseos/` | docusaurus-final | Case study (fleet/IoT deployment) → WiseOS. |
| `/case-studies/warehouse-amr` (+ `/case-studies/warehouse-amr/`) | `/wiseos/` | docusaurus-final | Case study (fleet/IoT deployment) → WiseOS. |
| `/contact` | `/contact/` | docusaurus-final | Same page; explicit slash redirect. |
| `/demo` (+ `/demo/`) | `/wiseos/` | docusaurus-final | Old "book a demo" page; demos are requested on WiseOS early access. |
| `/digital-twins` (+ `/digital-twins/`) | `/ros2-mcp/` | docusaurus-final | Digital-twin/simulation work is driven through ROS2 MCP (Gazebo demo). |
| `/mcp-ros2` (+ `/mcp-ros2/`) | `/ros2-mcp/` | docusaurus-final | Renamed route (L4 product name "ROS2 MCP"). |
| `/products` (+ `/products/`) | `/ros2-mcp/` | docusaurus-final | Old product overview; the primary product is ROS2 MCP (L1/L3). |
| `/solutions` (+ `/solutions/`) | `/wiseos/` | docusaurus-final | Old solutions overview (fleet/IoT) → WiseOS. |
| `/technology` (+ `/technology/`) | `/ros2-mcp/` | docusaurus-final | Old technology page (ROS 2 + MCP stack) → ROS2 MCP. |
| `/thank-you` (+ `/thank-you/`) | `/contact/` | docusaurus-final | Old form confirmation page. |
| `/use-cases` (+ `/use-cases/`) | `/wiseos/` | docusaurus-final | Old use-case list (fleet/IoT) → WiseOS. |
| `/wiseos` | `/wiseos/` | docusaurus-final | Same page; explicit slash redirect. |
| `/agriculture` (+ `/agriculture/`) | `/wiseos/` | wayback | 2025 Next.js industry page → WiseOS. |
| `/ai-centric-systems` (+ `/ai-centric-systems/`) | `/wiseos/` | wayback | 2025 Next.js AI systems page → WiseOS. |
| `/downloads` (+ `/downloads/`) | `/docs/` | wayback | 2025 Next.js downloads page → docs. |
| `/enhanced-dry-port` (+ `/enhanced-dry-port/`) | `/wiseos/` | wayback | 2025 Next.js logistics case → WiseOS. |
| `/dry-port` (+ `/dry-port/`) | `/wiseos/` | wayback | 2025 Next.js logistics case (from build manifest) → WiseOS. |
| `/logistics` (+ `/logistics/`) | `/wiseos/` | wayback | 2025 Next.js industry page → WiseOS. |
| `/pricing` (+ `/pricing/`) | `/ros2-mcp/` | wayback | 2025 pricing page; ROS2 MCP is now free (L16), WiseOS pricing is not public. |
| `/robotics` (+ `/robotics/`) | `/ros2-mcp/` | wayback | 2025 Next.js robotics page → ROS2 MCP (L1). |
| `/smart-city` (+ `/smart-city/`) | `/wiseos/` | wayback | 2025 Next.js industry page → WiseOS. |
| `/smart-factory` (+ `/smart-factory/`) | `/wiseos/` | wayback | 2025 Next.js industry page → WiseOS. |
| `/privacy-policy` (+ `/privacy-policy/`) | `/privacy/` | wayback | 2025 privacy page (from Next.js build manifest) → new privacy notice. |
| `/basic-demo` (+ `/basic-demo/`) | `/wiseos/` | wayback | 2025 demo page (build manifest) → WiseOS early access. |
| `/data-management` (+ `/data-management/`) | `/wiseos/` | wayback | 2025 page (build manifest): data black box → WiseOS. |
| `/wisevision-lora-bridge` (+ `/wisevision-lora-bridge/`) | `/wiseos/` | wayback | 2025 LoRaWAN bridge page (build manifest) → WiseOS (LoRaWAN bridge). |
| `/static/doc/blackbox/*` | `/wiseos/` | wayback | Old Data Black Box docs → WiseOS (Data Black Box). |
| `/static/doc/bridge/*` | `/wiseos/` | wayback | Old LoRaWAN bridge docs → WiseOS. |
| `/static/doc/dashboard/*` | `/wiseos/` | wayback | Old dashboard docs → WiseOS. |
| `/static/doc/devboard/*` | `/docs/` | wayback | Old dev-board (micro-ROS LoRa-E5) docs; product not on the new site → docs index. |
| `/static/doc/tools/*` | `/docs/` | wayback | Old tools (notificator) docs → docs index. |
| `/static/doc/blog/*` | `/` | wayback | Old blog (one post) → home. |
| `/static/doc/docs/*` | `/docs/` | wayback | Old docs root → docs. |
| `/static/doc` (+ `/static/doc/`) | `/docs/` | wayback | Old docs root → docs. |
| `/static/doc/blog` (+ `/static/doc/blog/`) | `/` | wayback | Old blog root (Wayback 301) → home. |

## Not redirected (deliberately)

| old path(s) | why |
|---|---|
| `/` | Same route on the new site. |
| `/_next/*`, `/assets/*`, `/img/*` (incl. `/img/members/*`), `/static/icons/*`, `/static/home/*`, `/static/logo.png`, `/static/favicon.png`, `/static/files/dummy.pdf` | Build assets and images. Dropped per brief; `/img/members/*` especially must 404 (L11: no people). |
| `/robots.txt`, `/favicon.ico`, `/sitemap.xml` | Served by the new site. |
| `/.docusaurus/`, `/1`, `/admin/`, `/node_modules/`, `/ads.txt`, `/app-ads.txt`, `/atom.xml`, `/feed*`, `/index.xml`, `/gtm.js`, `/.well-known/*` | Were already 404 in the archive (crawler probes). |
| `/?trk=...` (LinkedIn) | Query string on `/`; `/` still exists. |
| `/analityka-dla-handlu`, `/covid`, `/identyfikacja`, `/wideo-na-zywo`, `/zdalny-dostep`, `/404` | Polish-language / legacy pages seen only as Next.js chunk names, never archived as pages. English-only site (L15); no inbound value. |

## Host-level (not in `_redirects`)

- `www.wisevision.tech/*` → `https://wisevision.tech/*` 301 is a Cloudflare zone rule (W0.2), not a Pages `_redirects` rule. The 2025 archive was served on `www`, so the zone rule plus these path rules give a two-hop worst case (`www` + path). That is acceptable; a single-hop version needs a Bulk Redirect list once the CF token exists (H1).
- `wisevision.netlify.app` → `wisevision.tech` is W10.4 (H4, Adam's Netlify account).

## Sampled check for the W0 gate (after deploy)

```bash
for p in /mcp-ros2 /mcp-ros2/ /products/ /case-studies/warehouse-amr/ /about/ /demo/ /pricing /robotics /static/doc/blackbox/intro/ /thank-you/; do
  curl -s -o /dev/null -w "%{http_code} %{redirect_url}  $p\n" "https://wisevision.tech$p"; done
```

Expected: every line `301 https://wisevision.tech/<new>/`.
