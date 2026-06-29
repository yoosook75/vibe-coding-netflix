const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const CATEGORY_ENDPOINTS = {
  'now-playing': `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR`,
  upcoming: `https://api.themoviedb.org/3/movie/upcoming?api_key=${API_KEY}&language=ko-KR`,
};

const CATEGORY_LABELS = {
  'now-playing': '현재 상영작',
  upcoming: '상영 예정작',
};

const moviesGrid = document.getElementById('movies-grid');
const moviesLoading = document.getElementById('movies-loading');
const moviesError = document.getElementById('movies-error');
const movieCount = document.getElementById('movie-count');
const pageTitle = document.getElementById('page-title');
const breadcrumbCurrent = document.getElementById('breadcrumb-current');
const categoryFilters = document.getElementById('category-filters');
const pagination = document.getElementById('pagination');
const pageSelect = document.getElementById('page-select');
const pageTotal = document.getElementById('page-total');
const pageFirst = document.getElementById('page-first');
const pagePrev = document.getElementById('page-prev');
const pageNext = document.getElementById('page-next');
const pageLast = document.getElementById('page-last');

let currentCategory = 'now-playing';
let currentSort = 'release';
let currentPage = 1;
let totalPages = 1;
let allMovies = [];
let movieId = null;
let listMode = false;
let listName = '';
let searchMode = false;
let searchQuery = '';

function getQueryMovieId() {
  return new URLSearchParams(window.location.search).get('id');
}

function getQuerySearch() {
  return new URLSearchParams(window.location.search).get('search');
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year.slice(2)}.${month}.${day} 개봉`;
}

function getRatingBadge(movie) {
  if (movie.adult) {
    return { label: '19', className: 'rating-badge--19' };
  }
  if (movie.certification) {
    const cert = movie.certification;
    if (cert === '12') return { label: '12', className: 'rating-badge--12' };
    if (cert === '15') return { label: '15', className: 'rating-badge--15' };
    if (cert === '19' || cert === '18') return { label: '19', className: 'rating-badge--19' };
    return { label: cert, className: 'rating-badge--all' };
  }
  return { label: 'ALL', className: 'rating-badge--all' };
}

async function fetchMovieDetails(movie) {
  const url = `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits,release_dates`;

  try {
    const response = await fetch(url);
    if (!response.ok) return movie;

    const detail = await response.json();
    const krDates = detail.release_dates?.results?.find((r) => r.iso_3166_1 === 'KR');
    const certification = krDates?.release_dates?.[0]?.certification || '';

    const director = detail.credits?.crew?.find((c) => c.job === 'Director')?.name || '-';
    const cast = (detail.credits?.cast || [])
      .slice(0, 3)
      .map((c) => c.name)
      .join(', ') || '-';

    return {
      ...movie,
      title: detail.title || movie.title,
      runtime: detail.runtime,
      release_date: detail.release_date || movie.release_date,
      certification,
      director,
      cast,
    };
  } catch {
    return movie;
  }
}

async function enrichMovies(movies) {
  return Promise.all(movies.map((movie) => fetchMovieDetails(movie)));
}

function sortMovies(movies) {
  const sorted = [...movies];

  if (currentSort === 'title') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  } else {
    sorted.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));
  }

  return sorted;
}

function createListCard(movie) {
  const card = document.createElement('article');
  card.className = 'list-card';
  card.addEventListener('click', () => {
    window.location.href = `detail.html?id=${movie.id}`;
  });

  const posterWrap = document.createElement('div');
  posterWrap.className = 'list-card__poster-wrap';

  if (movie.poster_path) {
    const img = document.createElement('img');
    img.className = 'list-card__poster';
    img.src = `${IMAGE_BASE}${movie.poster_path}`;
    img.alt = `${movie.title} 포스터`;
    img.loading = 'lazy';
    posterWrap.appendChild(img);
  }

  const title = document.createElement('h2');
  title.className = 'list-card__title';
  title.textContent = movie.title;

  const meta = document.createElement('div');
  meta.className = 'list-card__meta';

  const rating = getRatingBadge(movie);
  const badge = document.createElement('span');
  badge.className = `rating-badge ${rating.className}`;
  badge.textContent = rating.label;
  meta.appendChild(badge);

  if (movie.runtime) {
    const runtime = document.createElement('span');
    runtime.textContent = `${movie.runtime}분`;
    meta.appendChild(runtime);
  }

  if (movie.release_date) {
    const date = document.createElement('span');
    date.textContent = formatReleaseDate(movie.release_date);
    meta.appendChild(date);
  }

  const director = document.createElement('p');
  director.className = 'list-card__people';
  director.innerHTML = `<span class="list-card__label">감독</span>${movie.director || '-'}`;

  const cast = document.createElement('p');
  cast.className = 'list-card__people';
  cast.innerHTML = `<span class="list-card__label">출연</span>${movie.cast || '-'}`;

  card.appendChild(posterWrap);
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(director);
  card.appendChild(cast);

  return card;
}

function renderMovies(movies) {
  moviesGrid.innerHTML = '';

  if (movies.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'movies-loading';
    empty.textContent = searchMode
      ? '검색 결과가 없습니다.'
      : '표시할 영화가 없습니다.';
    moviesGrid.appendChild(empty);
    movieCount.textContent = '0개의 영화';
    pagination.hidden = true;
    return;
  }

  movies.forEach((movie) => {
    moviesGrid.appendChild(createListCard(movie));
  });

  movieCount.textContent = `${movies.length}개의 영화`;
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
    document.body.classList.add('movies-page--search-mode');
    return;
  }

  document.body.classList.remove('movies-page--search-mode');
}

function clearSearchMode() {
  searchMode = false;
  searchQuery = '';
  document.body.classList.remove('movies-page--search-mode');

  const url = new URL(window.location.href);
  url.searchParams.delete('search');
  window.history.replaceState({}, '', url);
}

function getQueryCategory() {
  const category = new URLSearchParams(window.location.search).get('category');
  if (category === 'upcoming' || category === 'now-playing') {
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
  loadMovies();
}

function setSort(sort) {
  currentSort = sort;

  document.querySelectorAll('.sort-btn').forEach((btn) => {
    btn.classList.toggle('sort-btn--active', btn.dataset.sort === sort);
  });

  if (listMode) {
    renderMovies(sortMovies(allMovies));
  } else {
    loadMovies();
  }
}

async function fetchFromListsApi(id, page = 1) {
  const listsUrl = `https://api.themoviedb.org/3/movie/${id}/lists?api_key=${API_KEY}`;
  const listsRes = await fetch(listsUrl);

  if (!listsRes.ok) {
    throw new Error('영화 리스트를 불러오지 못했습니다.');
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
    movies: (listData.items || []).filter((item) => item.media_type === 'movie' || item.title),
    totalPages: listData.total_pages || 1,
    totalResults: listData.total_results || listData.items?.length || 0,
  };
}

async function fetchFromSearchApi(page = 1) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&language=ko-KR&query=${encodeURIComponent(searchQuery)}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('검색 결과를 불러오지 못했습니다.');
  }

  const data = await response.json();

  return {
    movies: data.results || [],
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
  };
}

async function fetchFromCategoryApi(page = 1) {
  const url = `${CATEGORY_ENDPOINTS[currentCategory]}&page=${page}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('영화 목록을 불러오지 못했습니다.');
  }

  const data = await response.json();

  return {
    movies: data.results || [],
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
  };
}

async function loadMovies() {
  moviesError.hidden = true;
  moviesGrid.innerHTML = '';
  moviesGrid.appendChild(moviesLoading);
  moviesLoading.hidden = false;

  try {
    let result;

    if (searchMode && searchQuery) {
      result = await fetchFromSearchApi(currentPage);
      updateSearchUI();
    } else if (listMode && movieId) {
      result = await fetchFromListsApi(movieId, currentPage);
      pageTitle.textContent = listName;
      breadcrumbCurrent.textContent = listName;
      document.title = `YSCine - ${listName}`;
    } else {
      result = await fetchFromCategoryApi(currentPage);
    }

    totalPages = result.totalPages;
    const enriched = await enrichMovies(result.movies);
    allMovies = sortMovies(enriched);

    moviesLoading.remove();
    renderMovies(allMovies);
    updatePagination();

    if (!listMode && !searchMode) {
      movieCount.textContent = `${result.totalResults}개의 영화`;
    } else if (searchMode) {
      movieCount.textContent = `${result.totalResults}개의 검색 결과`;
    }
  } catch (err) {
    moviesLoading.remove();
    moviesError.hidden = false;
    moviesError.textContent = err.message;
    pagination.hidden = true;
  }
}

function initPagination() {
  pageSelect.addEventListener('change', () => {
    currentPage = Number(pageSelect.value);
    loadMovies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  pageFirst.addEventListener('click', () => {
    currentPage = 1;
    loadMovies();
  });

  pagePrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      loadMovies();
    }
  });

  pageNext.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage += 1;
      loadMovies();
    }
  });

  pageLast.addEventListener('click', () => {
    currentPage = totalPages;
    loadMovies();
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
  await loadLayout('movies', '../');
  initPagination();
  initFilters();

  searchQuery = getQuerySearch() || '';
  movieId = getQueryMovieId();

  if (searchQuery) {
    searchMode = true;
    currentPage = 1;
  } else if (movieId) {
    listMode = true;
    document.body.classList.add('movies-page--list-mode');
  } else {
    const category = getQueryCategory();
    if (category) {
      applyCategory(category);
    }
  }

  loadMovies();
}

init();
