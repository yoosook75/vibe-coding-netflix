const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const eventGrid = document.getElementById('event-grid');
const eventCount = document.getElementById('event-count');
const eventEmpty = document.getElementById('event-empty');
const eventLoading = document.getElementById('event-loading');
const eventFilters = document.getElementById('event-filters');

let currentCategory = 'onsite';
let events = EVENT_ITEMS.map((item) => ({ ...item }));

function getQueryCategory() {
  const category = new URLSearchParams(window.location.search).get('category');
  return EVENT_CATEGORY_LABELS[category] ? category : null;
}

function formatCount(count) {
  return `${count}개의 이벤트`;
}

function createPlaceholder() {
  const div = document.createElement('div');
  div.className = 'event-card__poster event-card__poster--placeholder';
  div.textContent = '🎬';
  div.setAttribute('aria-hidden', 'true');
  return div;
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'event-card';
  card.setAttribute('role', 'link');
  card.tabIndex = 0;
  card.addEventListener('click', () => {
    window.location.href = `detail.html?id=${event.id}&category=${event.category}`;
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = `detail.html?id=${event.id}&category=${event.category}`;
    }
  });

  const posterWrap = document.createElement('div');
  posterWrap.className = 'event-card__poster-wrap';

  if (event.posterUrl) {
    const img = document.createElement('img');
    img.className = 'event-card__poster';
    img.src = event.posterUrl;
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = () => img.replaceWith(createPlaceholder());
    posterWrap.appendChild(img);
  } else {
    posterWrap.appendChild(createPlaceholder());
  }

  const period = document.createElement('p');
  period.className = 'event-card__period';
  period.textContent = `기간 ${event.period}`;

  const title = document.createElement('h2');
  title.className = 'event-card__title';
  title.textContent = event.title;

  const tags = document.createElement('div');
  tags.className = 'event-card__tags';

  event.tags.forEach((tag, index) => {
    const span = document.createElement('span');
    span.className = `event-card__tag ${index === 1 ? 'event-card__tag--accent' : 'event-card__tag--category'}`;
    span.textContent = tag;
    tags.appendChild(span);
  });

  card.appendChild(posterWrap);
  card.appendChild(period);
  card.appendChild(title);
  card.appendChild(tags);

  return card;
}

function renderEvents(list) {
  eventGrid.innerHTML = '';

  if (list.length === 0) {
    eventCount.textContent = formatCount(0);
    eventEmpty.hidden = false;
    return;
  }

  eventEmpty.hidden = true;
  eventCount.textContent = formatCount(list.length);

  list.forEach((event) => {
    eventGrid.appendChild(createEventCard(event));
  });
}

function setCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.event-filter-btn').forEach((btn) => {
    btn.classList.toggle('event-filter-btn--active', btn.dataset.category === category);
  });

  const url = new URL(window.location.href);
  url.searchParams.set('category', category);
  window.history.replaceState({}, '', url);

  const filtered = events.filter((event) => event.category === category);
  renderEvents(filtered);
}

async function loadPostersFromTmdb() {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) return;

    const data = await response.json();
    const movies = data.results || [];

    events = events.map((event, index) => {
      const posterPath = movies[index % movies.length]?.poster_path;
      return {
        ...event,
        posterUrl: posterPath ? `${IMAGE_BASE}${posterPath}` : null,
      };
    });
  } catch {
    /* 포스터 없이 진행 */
  }
}

function initFilters() {
  eventFilters?.querySelectorAll('.event-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => setCategory(btn.dataset.category));
  });
}

async function init() {
  await loadLayout('events', '../');
  initFilters();

  const category = getQueryCategory();
  if (category) {
    currentCategory = category;
    document.querySelectorAll('.event-filter-btn').forEach((btn) => {
      btn.classList.toggle('event-filter-btn--active', btn.dataset.category === category);
    });
  }

  if (eventLoading) {
    eventLoading.remove();
  }

  await loadPostersFromTmdb();
  setCategory(currentCategory);
}

init();
