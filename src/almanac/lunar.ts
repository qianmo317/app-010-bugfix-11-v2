import { LUNAR_YEAR_DATA } from '../data/lunar-data';
import { TIAN_GAN, DI_ZHI, SHENG_XIAO, LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES, SOLAR_TERMS } from './constants';
import { gregorianToJDN, jdnToGregorian, getWeekDay, isLeapYear } from '../utils/date';

export interface LunarInfo {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
  yearGanZhi: string;
  monthGanZhi: string;
  dayGanZhi: string;
  shengxiao: string;
  monthName: string;
  dayName: string;
  solarTerm?: string;
}

// 获取某年的春节公历日期
function getSpringFestival(year: number): [number, number, number] {
  const data = LUNAR_YEAR_DATA[year - 1900];
  const offset = data.sf;
  let month = 1;
  let day = offset + 1;
  while (day > (month === 2 && isLeapYear(year) ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])) {
    day -= (month === 2 && isLeapYear(year) ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]);
    month++;
  }
  return [year, month, day];
}

// 公历转农历
export function solarToLunar(year: number, month: number, day: number): LunarInfo {
  if (year < 1900 || year > 2100) {
    throw new Error('Year out of range');
  }

  const jdn = gregorianToJDN(year, month, day);
  const sf = getSpringFestival(year);
  const sfJdn = gregorianToJDN(sf[0], sf[1], sf[2]);

  let lunarYear: number;
  let daysFromSF: number;

  if (jdn >= sfJdn) {
    lunarYear = year;
    daysFromSF = jdn - sfJdn;
  } else {
    lunarYear = year - 1;
    const prevSF = getSpringFestival(lunarYear);
    const prevSFJdn = gregorianToJDN(prevSF[0], prevSF[1], prevSF[2]);
    daysFromSF = jdn - prevSFJdn;
  }

  const data = LUNAR_YEAR_DATA[lunarYear - 1900];
  let lunarMonth = 1;
  let lunarDay = daysFromSF;
  let isLeap = false;

  for (let i = 0; i < 12; i++) {
    const monthDays = data.md[i];
    if (lunarDay < monthDays) {
      lunarMonth = i + 1;
      lunarDay = lunarDay + 1;
      break;
    }
    lunarDay -= monthDays;

    // 检查闰月
    if (data.lm === i + 1) {
      if (lunarDay < data.ld) {
        lunarMonth = i + 1;
        isLeap = true;
        lunarDay = lunarDay + 1;
        break;
      }
      lunarDay -= data.ld;
    }

    if (i === 11) {
      lunarMonth = 12;
      lunarDay = lunarDay + 1;
    }
  }

  // 计算干支
  const yearGanZhi = getYearGanZhi(lunarYear);
  const monthGanZhi = getMonthGanZhi(lunarYear, lunarMonth, isLeap, month, day);
  const dayGanZhi = getDayGanZhi(jdn);
  const shengxiao = SHENG_XIAO[(lunarYear - 4) % 12];

  // 获取节气
  const solarTerm = getSolarTerm(year, month, day);

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    yearGanZhi,
    monthGanZhi,
    dayGanZhi,
    shengxiao,
    monthName: (isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth - 1] + '月',
    dayName: LUNAR_DAY_NAMES[lunarDay - 1],
    solarTerm
  };
}

// 农历转公历
export function lunarToSolar(lunarYear: number, lunarMonth: number, lunarDay: number, isLeap: boolean = false): [number, number, number] {
  if (lunarYear < 1900 || lunarYear > 2100) {
    throw new Error('Year out of range');
  }

  const data = LUNAR_YEAR_DATA[lunarYear - 1900];
  const sf = getSpringFestival(lunarYear);
  const sfJdn = gregorianToJDN(sf[0], sf[1], sf[2]);

  let days = 0;
  for (let i = 0; i < lunarMonth - 1; i++) {
    days += data.md[i];
    if (data.lm === i + 1) days += data.ld;
  }

  if (isLeap && data.lm === lunarMonth) {
    days += data.md[lunarMonth - 1];
  }

  days += lunarDay - 1;

  const jdn = sfJdn + days;
  return jdnToGregorian(jdn);
}

// 年柱（以立春换年）
export function getYearGanZhi(year: number): string {
  // 简化处理：以农历年计算
  const gan = (year - 4) % 10;
  const zhi = (year - 4) % 12;
  return TIAN_GAN[gan] + DI_ZHI[zhi];
}

// 月柱（以节气换月）
export function getMonthGanZhi(year: number, lunarMonth: number, isLeap: boolean, _solarMonth: number, _solarDay: number): string {
  // 年干决定月干起始
  const yearGan = (year - 4) % 10;
  const monthGanStart = (yearGan % 5) * 2;

  // 根据节气调整月份
  let actualMonth = lunarMonth;
  if (isLeap) actualMonth = lunarMonth; // 闰月与前月同干支

  const gan = (monthGanStart + actualMonth - 1) % 10;
  const zhi = (actualMonth + 1) % 12; // 正月=寅
  return TIAN_GAN[gan] + DI_ZHI[zhi];
}

// 日柱（用儒略日推算）
export function getDayGanZhi(jdn: number): string {
  const offset = (jdn + 49) % 60;
  return TIAN_GAN[offset % 10] + DI_ZHI[offset % 12];
}

// 时柱
export function getHourGanZhi(dayGanZhi: string, hour: number): string {
  const dayGanIndex = TIAN_GAN.indexOf(dayGanZhi[0]);
  const hourZhiIndex = Math.floor((hour + 1) % 24 / 2) % 12;
  const hourGanStart = (dayGanIndex % 5) * 2;
  const hourGanIndex = (hourGanStart + hourZhiIndex) % 10;
  return TIAN_GAN[hourGanIndex] + DI_ZHI[hourZhiIndex];
}

// 节气计算：太阳视黄经（NOAA 低精度太阳算法）
// 节气对应黄经：小寒285°、立春315°…… 每项递增15°。
// 逐日按北京正午计算黄经，取最接近目标黄经的那一天，
// 可正确处理交节时刻在午夜前后的日期归属。

// 各节气在公历中的典型日，用于划定 ±5 天搜索窗口
const SOLAR_TERM_NOMINAL_DAY = [
  6, 20, 4, 19, 6, 21, 5, 20, 6, 21, 6, 21,
  7, 23, 8, 23, 8, 23, 8, 24, 8, 22, 7, 22
];

// 某日（公历）北京正午 12:00 的太阳视黄经（度，0–360）
function solarLongitude(year: number, month: number, day: number): number {
  // 北京正午 = UTC 04:00；JDE 0 点为正午，故 jde = jdn - 0.5 + 4/24
  const jde = gregorianToJDN(year, month, day) - 0.5 + 4 / 24;
  const T = (jde - 2451545.0) / 36525;

  // 几何平黄经
  let L0 = 280.46646 + T * (36000.76983 + 0.0003032 * T);
  L0 = ((L0 % 360) + 360) % 360;
  // 平近点角
  const Mr = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * Math.PI / 180;
  // 中心差
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  // 光行差与章动修正后的视黄经
  const omega = (125.04 - 1934.136 * T) * Math.PI / 180;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lambda % 360) + 360) % 360;
}

// 与目标黄经的角距离（-180～180）
function angularDistance(lon: number, target: number): number {
  let d = lon - target;
  while (d <= -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

// 公历日期加/减若干天
function addGregorianDays(year: number, month: number, day: number, delta: number): [number, number, number] {
  return jdnToGregorian(gregorianToJDN(year, month, day) + delta);
}

export function getSolarTerm(year: number, month: number, day: number): string | undefined {
  const termIndex = (month - 1) * 2;
  const termIndex2 = (month - 1) * 2 + 1;

  const dates = getSolarTermDates(year);

  if (day === dates[termIndex]) return SOLAR_TERMS[termIndex];
  if (day === dates[termIndex2]) return SOLAR_TERMS[termIndex2];
  return undefined;
}

// 获取某年所有节气的日期（公历日，序号顺序与 SOLAR_TERMS 一致）
// 结果按年缓存：同一年内所有日期复用同一份节气表
const solarTermCache = new Map<number, number[]>();

export function getSolarTermDates(year: number): number[] {
  const cached = solarTermCache.get(year);
  if (cached) return cached;

  const dates = SOLAR_TERM_NOMINAL_DAY.map((nominal, i) => {
    const target = (285 + 15 * i) % 360;
    const month = Math.floor(i / 2) + 1;
    let bestDay = nominal;
    let bestDist = Infinity;
    for (let off = -5; off <= 5; off++) {
      const [y, m, d] = addGregorianDays(year, month, nominal, off);
      const dist = Math.abs(angularDistance(solarLongitude(y, m, d), target));
      if (dist < bestDist) {
        bestDist = dist;
        bestDay = d;
      }
    }
    return bestDay;
  });

  solarTermCache.set(year, dates);
  return dates;
}

// 获取某月所有节气信息
export function getMonthSolarTerms(year: number, month: number): Array<{ name: string; day: number }> {
  const dates = getSolarTermDates(year);
  const result: Array<{ name: string; day: number }> = [];
  const idx1 = (month - 1) * 2;
  const idx2 = (month - 1) * 2 + 1;
  result.push({ name: SOLAR_TERMS[idx1], day: dates[idx1] });
  result.push({ name: SOLAR_TERMS[idx2], day: dates[idx2] });
  return result;
}

// 获取日期信息（完整）
export function getDayInfo(year: number, month: number, day: number) {
  const lunar = solarToLunar(year, month, day);
  const jdn = gregorianToJDN(year, month, day);
  const weekDay = getWeekDay(year, month, day);

  return {
    solar: { year, month, day },
    lunar,
    weekDay,
    jdn
  };
}
