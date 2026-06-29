const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const detailMain = document.getElementById('event-detail-main');
const detailError = document.getElementById('event-detail-error');
const breadcrumbTitle = document.getElementById('breadcrumb-title');
const categoryEl = document.getElementById('event-category');
const titleEl = document.getElementById('event-title');
const metaEl = document.getElementById('event-meta');
const posterEl = document.getElementById('event-poster');
const posterWrap = document.getElementById('event-poster-wrap');
const bodyEl = document.getElementById('event-body');
const prevLink = document.getElementById('event-prev');
const nextLink = document.getElementById('event-next');
const prevTitle = document.getElementById('event-prev-title');
const nextTitle = document.getElementById('event-next-title');
const listBtn = document.getElementById('event-list-btn');

let events = EVENT_ITEMS.map((item) => ({ ...item }));

function getEventId() {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  return Number.isFinite(id) ? id : null;
}

function getCategoryFromQuery() {
  return new URLSearchParams(window.location.search).get('category');
}

function showError() {
  detailMain.hidden = true;
  detailError.hidden = false;
}

function renderPoster(url, title) {
  if (!url) {
    posterWrap.hidden = true;
    return;
  }

  posterWrap.hidden = false;
  posterEl.src = url;
  posterEl.alt = title;
  posterEl.onerror = () => {
    posterWrap.hidden = true;
  };
}

function renderBody(event) {
  bodyEl.innerHTML = '';

  if (event.schedule?.length) {
    const schedule = document.createElement('div');
    schedule.className = 'event-detail__schedule';

    event.schedule.forEach((line) => {
      const p = document.createElement('p');
      p.className = 'event-detail__schedule-line';
      p.textContent = line;
      schedule.appendChild(p);
    });

    bodyEl.appendChild(schedule);
  }

  (event.paragraphs || []).forEach((text) => {
    const p = document.createElement('p');
    p.className = 'event-detail__paragraph';
    p.textContent = text;
    bodyEl.appendChild(p);
  });
}

function renderAdjacentNav(index) {
  const prev = events[index - 1];
  const next = events[index + 1];

  if (prev) {
    prevLink.href = `detail.html?id=${prev.id}`;
    prevLink.classList.remove('is-disabled');
    prevLink.removeAttribute('aria-disabled');
    prevTitle.textContent = prev.title;
  } else {
    prevLink.removeAttribute('href');
    prevLink.classList.add('is-disabled');
    prevLink.setAttribute('aria-disabled', 'true');
    prevTitle.textContent = '';
  }

  if (next) {
    nextLink.href = `detail.html?id=${next.id}`;
    nextLink.classList.remove('is-disabled');
    nextLink.removeAttribute('aria-disabled');
    nextTitle.textContent = next.title;
  } else {
    nextLink.removeAttribute('href');
    nextLink.classList.add('is-disabled');
    nextLink.setAttribute('aria-disabled', 'true');
    nextTitle.textContent = '';
  }
}

function renderEvent(event, index) {
  const categoryLabel = EVENT_CATEGORY_LABELS[event.category] || '이벤트';

  document.title = `YSCine - ${event.title}`;
  breadcrumbTitle.textContent = event.title;
  categoryEl.textContent = categoryLabel;
  titleEl.textContent = event.title;

  metaEl.innerHTML = '';
  const period = document.createElement('span');
  period.textContent = `기간 ${event.periodFull || event.period}`;
  metaEl.appendChild(period);

  const sep = document.createElement('span');
  sep.className = 'event-detail__meta-sep';
  sep.textContent = '|';
  sep.setAttribute('aria-hidden', 'true');
  metaEl.appendChild(sep);

  const views = document.createElement('span');
  views.textContent = `조회수 ${event.views ?? 0}`;
  metaEl.appendChild(views);

  renderPoster(event.posterUrl, event.title);
  renderBody(event);
  renderAdjacentNav(index);

  const category = getCategoryFromQuery() || event.category;
  listBtn.href = `list.html?category=${category}`;

  detailMain.hidden = false;
  detailError.hidden = true;
}

async function loadPoster(event, index) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) return event;

    const data = await response.json();
    const movies = data.results || [];
    const posterPath = movies[index % movies.length]?.poster_path;

    if (posterPath) {
      event.posterUrl = `${IMAGE_BASE}${posterPath}`;
    }
  } catch {
    /* 포스터 없이 진행 */
  }

  return event;
}

async function init() {
  await loadLayout('events', '../');

  const id = getEventId();
  const index = events.findIndex((item) => item.id === id);

  if (index < 0) {
    showError();
    return;
  }

  const event = await loadPoster({ ...events[index] }, index);
  events[index] = event;
  renderEvent(event, index);
}

init();
