const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const CATEGORY_ENDPOINTS = {
  'on-the-air': `https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}&language=ko-KR`,
  popular: `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=ko-KR`,
};

const CATEGORY_LABELS = {
  'on-the-air': '방영 중',
  popular: '인기 시리즈',
};

const tvGrid = document.getElementById('tv-grid');
const tvLoading = document.getElementById('tv-loading');
const tvError = document.getElementById('tv-error');
const tvCount = document.getElementById('tv-count');
const pageTitle = document.getElementById('page-title');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');
const pagination = document.getElementById('pagination');
const pageSelect = document.getElementById('page-select');
const pageTotal = document.getElementById('page-total');
const pageFirst = document.getElementById('page-first');
const pagePrev = document.getElementById('page-prev');
const pageNext = document.getElementById('page-next');
const pageLast = document.getElementById('page-last');

let currentCategory = 'on-the-air';
let currentSort = 'release';
let currentPage = 1;
let totalPages = 1;
let allShows = [];
let seriesId = null;
let listMode = false;
let listName = '';
let searchMode = false;
let searchQuery = '';

function getQuerySeriesId() {
  return new URLSearchParams(window.location.search).get('id');
}

function getQuerySearch() {
  return new URLSearchParams(window.location.search).get('search');
}

function formatAirDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year.slice(2)}.${month}.${day} 첫 방영`;
}

function getRatingBadge(show) {
  if (show.certification) {
    const cert = show.certification;
    if (cert === '12') return { label: '12', className: 'rating-badge--12' };
    if (cert === '15') return { label: '15', className: 'rating-badge--15' };
    if (cert === '19' || cert === '18') return { label: '19', className: 'rating-badge--19' };
    return { label: cert, className: 'rating-badge--all' };
  }
  return { label: 'ALL', className: 'rating-badge--all' };
}

async function fetchTvDetails(show) {
  const url = `https://api.themoviedb.org/3/tv/${show.id}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits,content_ratings`;

  try {
    const response = await fetch(url);
    if (!response.ok) return show;

    const detail = await response.json();
    const krRating = detail.content_ratings?.results?.find((r) => r.iso_3166_1 === 'KR');
    const certification = krRating?.rating || '';

    const creator = detail.created_by?.[0]?.name
      || detail.credits?.crew?.find((c) => c.job === 'Executive Producer')?.name
      || '-';
    const cast = (detail.credits?.cast || [])
      .slice(0, 3)
      .map((c) => c.name)
      .join(', ') || '-';

    return {
      ...show,
      name: detail.name || show.name,
      episode_run_time: detail.episode_run_time,
      first_air_date: detail.first_air_date || show.first_air_date,
      certification,
      creator,
      cast,
    };
  } catch {
    return show;
  }
}

async function enrichShows(shows) {
  return Promise.all(shows.map((show) => fetchTvDetails(show)));
}

function sortShows(shows) {
  const sorted = [...shows];

  if (currentSort === 'title') {
    sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
  } else {
    sorted.sort((a, b) => new Date(b.first_air_date || 0) - new Date(a.first_air_date || 0));
  }

  return sorted;
}

function createListCard(show) {
  const card = document.createElement('article');
  card.className = 'list-card';
  card.addEventListener('click', () => {
    window.location.href = `detail.html?id=${show.id}`;
  });

  const posterWrap = document.createElement('div');
  posterWrap.className = 'list-card__poster-wrap';

  if (show.poster_path) {
    const img = document.createElement('img');
    img.className = 'list-card__poster';
    img.src = `${IMAGE_BASE}${show.poster_path}`;
    img.alt = `${show.name} 포스터`;
    img.loading = 'lazy';
    posterWrap.appendChild(img);
  }

  const title = document.createElement('h2');
  title.className = 'list-card__title';
  title.textContent = show.name;

  const meta = document.createElement('div');
  meta.className = 'list-card__meta';

  const rating = getRatingBadge(show);
  const badge = document.createElement('span');
  badge.className = `rating-badge ${rating.className}`;
  badge.textContent = rating.label;
  meta.appendChild(badge);

  const runtime = show.episode_run_time?.[0];
  if (runtime) {
    const runtimeEl = document.createElement('span');
    runtimeEl.textContent = `${runtime}분`;
    meta.appendChild(runtimeEl);
  }

  if (show.first_air_date) {
    const date = document.createElement('span');
    date.textContent = formatAirDate(show.first_air_date);
    meta.appendChild(date);
  }

  const creator = document.createElement('p');
  creator.className = 'list-card__people';
  creator.innerHTML = `<span class="list-card__label">제작</span>${show.creator || '-'}`;

  const cast = document.createElement('p');
  cast.className = 'list-card__people';
  cast.innerHTML = `<span class="list-card__label">출연</span>${show.cast || '-'}`;

  card.appendChild(posterWrap);
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(creator);
  card.appendChild(cast);

  return card;
}

function renderShows(shows) {
  tvGrid.innerHTML = '';

  if (shows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'tv-loading';
    empty.textContent = searchMode
      ? '검색 결과가 없습니다.'
      : '표시할 TV 시리즈가 없습니다.';
    tvGrid.appendChild(empty);
    tvCount.textContent = '0개의 시리즈';
    pagination.hidden = true;
    return;
  }

  shows.forEach((show) => {
    tvGrid.appendChild(createListCard(show));
  });

  tvCount.textContent = `${shows.length}개의 시리즈`;
}

function updatePagination() {
  if (totalPages <= 1 && !listMode) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pageTotal.textContent = `/ ${totalPages}`;
  pageSelect.innerHTML = '';

  for (let i = 1; i <= totalPages; i += 1) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    if (i === currentPage) option.selected = true;
    pageSelect.appendChild(option);
  }

  pageFirst.disabled = currentPage === 1;
  pagePrev.disabled = currentPage === 1;
  pageNext.disabled = currentPage === totalPages;
  pageLast.disabled = currentPage === totalPages;
}

function updateSearchUI() {
  if (searchMode && searchQuery) {
    const label = `"${searchQuery}" 검색 결과`;
    pageTitle.textContent = label;
    breadcrumbCurrent.textContent = '검색 결과';
    document.title = `YSCine - ${label}`;
    document.body.classList.add('tv-page--search-mode');
    return;
  }

  document.body.classList.remove('tv-page--search-mode');
}

function clearSearchMode() {
  searchMode = false;
  searchQuery = '';
  document.body.classList.remove('tv-page--search-mode');

  const url = new URL(window.location.href);
  url.searchParams.delete('search');
  window.history.replaceState({}, '', url);
}

function getQueryCategory() {
  const category = new URLSearchParams(window.location.search).get('category');
  if (category === 'popular' || category === 'on-the-air') {
    return category;
  }
  return null;
}

function applyCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('filter-btn--active', btn.dataset.category === category);
  });

  const label = CATEGORY_LABELS[category];
  pageTitle.textContent = label;
  breadcrumbCurrent.textContent = label;
  document.title = `YSCine - ${label}`;
}

function setCategory(category) {
  if (searchMode) {
    clearSearchMode();
  }

  applyCategory(category);
  currentPage = 1;
  loadShows();
}

function setSort(sort) {
  currentSort = sort;

  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.classList.toggle('sort-btn--active', btn.dataset.sort === sort);
  });

  if (listMode) {
    renderShows(sortShows(allShows));
  } else {
    loadShows();
  }
}

async function fetchFromListsApi(id, page = 1) {
  const listsUrl = `https://api.themoviedb.org/3/tv/${id}/lists?api_key=${API_KEY}`;
  const listsRes = await fetch(listsUrl);

  if (!listsRes.ok) {
    throw new Error('TV 리스트를 불러오지 못했습니다.');
  }

  const listsData = await listsRes.json();
  const lists = listsData.results || [];

  if (lists.length === 0) {
    throw new Error('연결된 리스트가 없습니다.');
  }

  const selectedList = lists.find((list) => list.item_count > 0 && list.item_count <= 300) || lists[0];
  const listUrl = `https://api.themoviedb.org/3/list/${selectedList.id}?api_key=${API_KEY}&language=ko-KR&page=${page}`;
  const listRes = await fetch(listUrl);

  if (!listRes.ok) {
    throw new Error('리스트 상세 정보를 불러오지 못했습니다.');
  }

  const listData = await listRes.json();
  listName = listData.name || selectedList.name;

  return {
    shows: (listData.items || []).filter((item) => item.media_type === 'tv' || item.name),
    totalPages: listData.total_pages || 1,
    totalResults: listData.total_results || listData.items?.length || 0,
  };
}

async function fetchFromSearchApi(page = 1) {
  const url = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&language=ko-KR&query=${encodeURIComponent(searchQuery)}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('검색 결과를 불러오지 못했습니다.');
  }

  const data = await response.json();

  return {
    shows: data.results || [],
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
  };
}

async function fetchFromCategoryApi(page = 1) {
  const url = `${CATEGORY_ENDPOINTS[currentCategory]}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('TV 시리즈 목록을 불러오지 못했습니다.');
  }

  const data = await response.json();

  return {
    shows: data.results || [],
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
  };
}

async function loadShows() {
  tvError.hidden = true;
  tvGrid.innerHTML = '';
  tvGrid.appendChild(tvLoading);
  tvLoading.hidden = false;

  try {
    let result;

    if (searchMode && searchQuery) {
      result = await fetchFromSearchApi(currentPage);
      updateSearchUI();
    } else if (listMode && seriesId) {
      result = await fetchFromListsApi(seriesId, currentPage);
      pageTitle.textContent = listName;
      breadcrumbCurrent.textContent = listName;
      document.title = `YSCine - ${listName}`;
    } else {
      result = await fetchFromCategoryApi(currentPage);
    }

    totalPages = result.totalPages;
    const enriched = await enrichShows(result.shows);
    allShows = sortShows(enriched);

    tvLoading.remove();
    renderShows(allShows);
    updatePagination();

    if (!listMode && !searchMode) {
      tvCount.textContent = `${result.totalResults}개의 시리즈`;
    } else if (searchMode) {
      tvCount.textContent = `${result.totalResults}개의 검색 결과`;
    }
  } catch (err) {
    tvLoading.remove();
    tvError.hidden = false;
    tvError.textContent = err.message;
    pagination.hidden = true;
  }
}

function initPagination() {
  pageSelect.addEventListener('change', () => {
    currentPage = Number(pageSelect.value);
    loadShows();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  pageFirst.addEventListener('click', () => {
    currentPage = 1;
    loadShows();
  });

  pagePrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadShows();
    }
  });

  pageNext.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadShows();
    }
  });

  pageLast.addEventListener('click', () => {
    currentPage = totalPages;
    loadShows();
  });
}

function initFilters() {
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => setCategory(btn.dataset.category));
  });

  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.addEventListener('click', () => setSort(btn.dataset.sort));
  });
}

async function init() {
  await loadLayout('tv', '../');
  initPagination();
  initFilters();

  searchQuery = getQuerySearch() || '';
  seriesId = getQuerySeriesId();

  if (searchQuery) {
    searchMode = true;
    currentPage = 1;
  } else if (seriesId) {
    listMode = true;
    document.body.classList.add('tv-page--list-mode');
  } else {
    const category = getQueryCategory();
    if (category) {
      applyCategory(category);
    }
  }

  loadShows();
}

init();
