import { describe, expect, it } from 'vitest';
import { splitClauses, suggest7P } from './classify';

describe('7P suggestion', () => {
  it('splits Thai clauses on spaces and keeps non-Thai tokens attached', () => {
    expect(splitClauses('เบี้ยประเภท 1 แพงกว่าคู่แข่ง แต่พนักงานบริการดีมาก')).toEqual(['เบี้ยประเภท 1 แพงกว่าคู่แข่ง', 'พนักงานบริการดีมาก']);
    expect(splitClauses('Partner บอกว่าเงื่อนไขไม่ครอบคลุม')).toEqual(['Partner บอกว่าเงื่อนไขไม่ครอบคลุม']);
  });
  it('gives each category only its own clause (no duplicated full sentence)', () => {
    const s = suggest7P('ความคุ้มครองเราน้อยกว่าเมื่อเทียบกับคู่แข่ง เวลาในการให้บริการเราช้ากว่า ควรเพิ่มช่องทางการสื่อสารให้มากกว่านี้');
    const by = Object.fromEntries(s.map((x) => [x.category, x]));
    expect(Object.keys(by).sort()).toEqual(['Process', 'Product', 'Promotion']);
    expect(by.Product.clauses).toEqual(['ความคุ้มครองเราน้อยกว่าเมื่อเทียบกับคู่แข่ง']);
    expect(by.Process.clauses).toEqual(['เวลาในการให้บริการเราช้ากว่า']);
    expect(by.Promotion.clauses).toEqual(['ควรเพิ่มช่องทางการสื่อสารให้มากกว่านี้']);
    expect(s.every((x) => x.sentiment === 'negative')).toBe(true);
  });
  it('detects positive feedback', () => {
    const s = suggest7P('เบี้ยประเภท 1 แพงกว่าคู่แข่ง แต่พนักงานบริการดีมาก');
    expect(s.find((x) => x.category === 'Price')!.sentiment).toBe('negative');
    expect(s.find((x) => x.category === 'People')!.sentiment).toBe('positive');
  });
  it('returns nothing when no keyword matches', () => {
    expect(suggest7P('คุยเรื่องทั่วไป')).toEqual([]);
  });
});
