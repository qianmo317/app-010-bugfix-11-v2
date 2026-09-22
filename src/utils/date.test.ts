import { describe, it, expect } from 'vitest';
import { getWeekDay, shiftMonth, daysInMonth, isLeapYear } from './date';

describe('星期计算', () => {
  // 与原生 Date.getUTCDay 交叉验证（0=周日）
  const cases: [number, number, number, number][] = [
    [2024, 9, 22, 0], // 周日
    [2000, 1, 1, 6],  // 周六
    [2024, 2, 10, 6], // 春节周六
    [2025, 1, 1, 3],  // 周三
    [1900, 1, 1, 1],  // 周一
    [2024, 1, 1, 1],  // 周一
    [2024, 12, 31, 2],// 周二
  ];

  cases.forEach(([y, m, d, expected]) => {
    it(`${y}-${m}-${d} 应为星期${['日','一','二','三','四','五','六'][expected]}`, () => {
      expect(getWeekDay(y, m, d)).toBe(expected);
      expect(getWeekDay(y, m, d)).toBe(new Date(Date.UTC(y, m - 1, d)).getUTCDay());
    });
  });

  it('月首日与 JS Date 一致（抽查多个月份）', () => {
    for (const [y, m] of [[2023, 1], [2024, 2], [2025, 6], [1999, 12], [2100, 3]] as [number, number][]) {
      expect(getWeekDay(y, m, 1)).toBe(new Date(Date.UTC(y, m - 1, 1)).getUTCDay());
    }
  });
});

describe('翻月', () => {
  const cases: [number, number, number, number, number][] = [
    [2024, 1, -1, 2023, 12],
    [2024, 12, 1, 2025, 1],
    [2024, 6, -1, 2024, 5],
    [2024, 6, 1, 2024, 7],
    [2000, 1, -12, 1999, 1],
    [1999, 12, 12, 2000, 12],
    [2024, 1, 12, 2025, 1],
    [2024, 12, -12, 2023, 12],
  ];

  cases.forEach(([y, m, delta, ey, em]) => {
    it(`${y}年${m}月 ${delta > 0 ? '后' : '前'}翻 ${Math.abs(delta)} 月应为 ${ey}年${em}月`, () => {
      expect(shiftMonth(y, m, delta)).toEqual([ey, em]);
    });
  });
});

describe('月份天数', () => {
  it('正确处理闰年', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2025)).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
  });
});
