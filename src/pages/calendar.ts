import { router } from '../router';
import { createElement, clearElement } from '../utils/dom';
import { solarToLunar } from '../almanac/lunar';
import { getDayYiJi } from '../almanac/yiji';
import { WEEK_DAYS } from '../almanac/constants';
import { getWeekDay, daysInMonth } from '../utils/date';

export function renderCalendar(app: HTMLElement) {
  clearElement(app);
  app.className = 'page calendar-page';

  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1;

  // 头部
  const header = createElement('div', 'calendar-header');
  const title = createElement('h1', 'page-title', '老黄历');
  const nav = createElement('div', 'month-nav');

  const prevBtn = createElement('button', 'nav-btn', '◀');
  const monthDisplay = createElement('span', 'month-display');
  const nextBtn = createElement('button', 'nav-btn', '▶');
  const todayBtn = createElement('button', 'nav-btn today-btn', '今');

  nav.append(prevBtn, monthDisplay, nextBtn, todayBtn);
  header.append(title, nav);

  // 快捷入口
  const quickNav = createElement('div', 'quick-nav');
  const pickLink = createElement('a', 'quick-link', '择日') as HTMLAnchorElement;
  pickLink.href = '/pick';
  pickLink.addEventListener('click', (e) => { e.preventDefault(); router.navigate('/pick'); });

  const farmLink = createElement('a', 'quick-link', '农事') as HTMLAnchorElement;
  farmLink.href = '/farm';
  farmLink.addEventListener('click', (e) => { e.preventDefault(); router.navigate('/farm'); });

  quickNav.append(pickLink, farmLink);
  header.appendChild(quickNav);

  // 星期标题
  const weekHeader = createElement('div', 'week-header');
  WEEK_DAYS.forEach(d => {
    weekHeader.appendChild(createElement('div', 'week-day', d));
  });

  // 日历网格
  const grid = createElement('div', 'calendar-grid');

  function renderMonth() {
    clearElement(grid);
    monthDisplay.textContent = `${currentYear}年${currentMonth}月`;

    const firstWeekDay = getWeekDay(currentYear, currentMonth, 1);
    const totalDays = daysInMonth(currentYear, currentMonth);

    // 空白占位
    for (let i = 0; i < firstWeekDay; i++) {
      grid.appendChild(createElement('div', 'day-cell empty'));
    }

    for (let d = 1; d <= totalDays; d++) {
      const box = createElement('div', 'day-cell');
      const isToday = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1 && d === now.getDate();
      if (isToday) box.classList.add('today');

      const numEl = createElement('div', 'solar-day', String(d));
      const lunarInfo = solarToLunar(currentYear, currentMonth, d);
      const lunarEl = createElement('div', 'lunar-day', lunarInfo.monthName);

      // 节气标记
      const term = lunarInfo.solarTerm;
      if (term) {
        box.classList.add('solar-term');
        numEl.textContent = term;
      }

      // 宜忌标记
      const yiJi = getDayYiJi(currentYear, currentMonth, d);
      if (yiJi.ji.length > 0) {
        box.classList.add('has-yi');
      }

      box.append(numEl, lunarEl);
      box.addEventListener('click', () => {
        const nav = `/day/${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        router.navigate(nav);
      });

      grid.appendChild(box);
    }
  }

  prevBtn.addEventListener('click', () => {
    currentMonth = currentMonth - 1;
    if (currentMonth === 0) {
      currentMonth = 12;
      currentYear = currentYear + 1;
    }
    renderMonth();
  });

  nextBtn.addEventListener('click', () => {
    currentMonth = currentMonth + 1;
    if (currentMonth === 13) {
      currentMonth = 1;
      currentYear = currentYear - 1;
    }
    renderMonth();
  });

  todayBtn.addEventListener('click', () => {
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    renderMonth();
  });

  app.append(header, weekHeader, grid);
  renderMonth();
}
