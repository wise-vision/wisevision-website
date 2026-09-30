// Search the base_link label offset: clean checkComposition, and the leader crosses as few rover wires as possible
// (the rover is exempt from the leader rule because the leader starts inside it, but every wire it cuts is noise).
// node scripts/label-search.mjs <layout>
import { launch, waitReady, layoutReport, BASE } from './lib.mjs';
import { checkComposition, rasterize } from '../../src/hero/layout-check.ts';
const layout = process.argv[2] ?? 'desktop';
const vp = layout === 'mobile' ? { width: 390, height: 780 } : { width: 1440, height: 800 };
const browser = await launch();
const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
await page.goto(`${BASE}/?p=0&copy=0&poster=0&parallax=0&layout=${layout}&dpr=1&label=base_link`);
await waitReady(page);
const res = [];
const DX = layout === 'mobile' ? [-90, -60, -30, 0, 30, 60, 90, 120, 150, 180, 210] : [-220, -160, -110, -60, 0, 60, 110, 160, 220, 280];
const DY = layout === 'mobile' ? [-190, -150, -110, -70, 60, 90, 120, 150, 180] : [-200, -150, -100, 120, 150, 180, 210];
for (const dx of DX)
  for (const dy of DY) {
    await page.evaluate(([x, y]) => { const h = document.getElementById('hero').__hero; h.tune({ label: [x, y] }); }, [dx, dy]);
    const rep = await layoutReport(page);
    const iss = checkComposition(rep, 4);
    const lc = rasterize(rep.leader.slice(1).map((p, i) => [rep.leader[i], p]), rep.frame);
    let cut = 0;
    for (const k of lc) if (rep.occupancy.rover.has(k)) cut++;
    // the callout must not cross the green signal arc either (two lines crossing near the lidar read as clutter)
    const ac = rasterize(rep.arc.slice(1).map((p, i) => [rep.arc[i], p]), rep.frame);
    for (const k of lc) if (ac.has(k)) cut += 50;
    const inFrame = rep.label.x > 12 && rep.label.x + rep.label.w < rep.frame.w - 12 && rep.label.y > 12 && rep.label.y + rep.label.h < rep.frame.h - 12;
    res.push({ dx, dy, cut, iss: iss.join('; '), inFrame, label: [Math.round(rep.label.x), Math.round(rep.label.y)] });
  }
res.filter((r) => !r.iss && r.inFrame).sort((a, b) => a.cut - b.cut).slice(0, 12).forEach((r) => console.log(JSON.stringify(r)));
await browser.close();
