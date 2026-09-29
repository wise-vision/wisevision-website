# wisevision.tech

Marketing site + docs for WiseVision (ROS2 MCP, WiseOS). Astro 7 static output, Starlight docs at `/docs`, deployed to Cloudflare Pages.

```bash
npm ci
npm run dev        # http://localhost:4321
npm run build      # -> dist/ (runs `npm run tokens` first)
npm run preview
npm test           # vitest + coverage (>=80% lines on scripts/** and src/lib/**)
npm run check      # astro check
npm run tokens     # regenerate src/styles/tokens.{css,json} from tokens.source.json
npm run contrast   # WCAG AA gate over the `pairs` in tokens.source.json
```

Design system: see [DESIGN.md](./DESIGN.md). The old Docusaurus site lives at tag `docusaurus-final` / branch `legacy-docusaurus`.
