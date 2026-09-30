import { describe, it, expect } from 'vitest';
import { icoFromPngs } from '../scripts/build-favicon-ico.mjs';
import { readFileSync } from 'node:fs';

describe('favicon.ico', () => {
  it('icoFromPngs writes a valid ICONDIR with offsets pointing at each PNG', () => {
    const a = Buffer.from('PNG-A'), b = Buffer.from('PNG-BB');
    const ico = icoFromPngs([{ size: 16, png: a }, { size: 32, png: b }]);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(ico[6]).toBe(16);
    expect(ico[22]).toBe(32);
    const offA = ico.readUInt32LE(6 + 12), offB = ico.readUInt32LE(22 + 12);
    expect(offA).toBe(6 + 32);
    expect(ico.subarray(offA, offA + a.length).toString()).toBe('PNG-A');
    expect(ico.subarray(offB, offB + b.length).toString()).toBe('PNG-BB');
    expect(ico.length).toBe(6 + 32 + a.length + b.length);
  });
  it('the committed public/favicon.ico has a 16×16 and a 32×32 PNG entry', () => {
    const ico = readFileSync(new URL('../public/favicon.ico', import.meta.url));
    expect(ico.readUInt16LE(4)).toBe(2);
    const sizes = [ico[6], ico[22]];
    expect(sizes).toEqual([16, 32]);
    for (const e of [6, 22]) {
      const off = ico.readUInt32LE(e + 12);
      expect(ico.subarray(off + 1, off + 4).toString()).toBe('PNG');
    }
  });
  it('security.txt follows RFC 9116 (Contact, future Expires, Canonical)', () => {
    const t = readFileSync(new URL('../public/.well-known/security.txt', import.meta.url), 'utf8');
    expect(t).toMatch(/^Contact: mailto:hello@wisevision\.tech$/m);
    expect(t).toMatch(/^Preferred-Languages: en$/m);
    expect(t).toMatch(/^Canonical: https:\/\/wisevision\.tech\/\.well-known\/security\.txt$/m);
    const exp = t.match(/^Expires: (\S+)$/m)?.[1];
    expect(exp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);
    expect(Date.parse(exp!)).toBeGreaterThan(Date.now());
  });
});
