const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

const detailMain = document.getElementById('detail-main');
const detailLoading = document.getElementById('detail-loading');
const detailError = document.getElementById('detail-error');
const moviePoster = document.getElementById('movie-poster');
const moviePosterThumb = document.getElementById('movie-poster-thumb');
const movieEnTitle = document.getElementById('movie-en-title');
const movieTitle = document.getElementById('movie-title');
const movieDirector = document.getElementById('movie-director');
const movieCast = document.getElementById('movie-cast');
const movieInfoMeta = document.getElementById('movie-info-meta');
const movieRelease = document.getElementById('movie-release');
const movieOverview = document.getElementById('movie-overview');
const movieClips = document.getElementById('movie-clips');
const videoModal = document.getElementById('video-modal');
const videoModalBackdrop = document.getElementById('video-modal-backdrop');
const videoModalClose = document.getElementById('video-modal-close');
const videoModalTitle = document.getElementById('video-modal-title');
const videoModalPlayer = document.getElementById('video-modal-player');
const movieStills = document.getElementById('movie-stills');
const sectionStills = document.getElementById('section-stills');
const stillsCount = document.getElementById('stills-count');
const movieReviews = document.getElementById('movie-reviews');
const reviewsCount = document.getElementById('reviews-count');
const shareBtn = document.getElementById('share-btn');

let currentMovie = null;

function getMovieId() {
  return new URLSearchParams(window.location.search).get('id');
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${year}.${Number(month)}.${Number(day)}`;
}

function getCertification(movie) {
  const krDates = movie.release_dates?.results?.find((r) => r.iso_3166_1 === 'KR');
  const cert = krDates?.release_dates?.[0]?.certification;
  if (cert === '12') return { label: '12', className: 'rating-badge--12', text: '12세이상 관람가' };
  if (cert === '15') return { label: '15', className: 'rating-badge--15', text: '15세이상 관람가' };
  if (cert === '19' || cert === '18') return { label: '19', className: 'rating-badge--19', text: '청소년 관람불가' };
  if (movie.adult) return { label: '19', className: 'rating-badge--19', text: '청소년 관람불가' };
  return { label: 'ALL', className: 'rating-badge--all', text: '전체 관람가' };
}

function showError(message) {
  detailLoading.hidden = true;
  detailLoading.style.display = 'none';
  detailError.hidden = false;
  detailError.textContent = message;
}

function renderInfoMeta(movie) {
  const cert = getCertification(movie);
  const genres = (movie.genres || []).map((g) => g.name).join(', ');
  const runtime = movie.runtime ? `${movie.runtime}분` : '';

  movieInfoMeta.innerHTML = '';

  const badge = document.createElement('span');
  badge.className = `rating-badge ${cert.className}`;
  badge.textContent = cert.label;
  movieInfoMeta.appendChild(badge);

  const certText = document.createElement('span');
  certText.textContent = cert.text;
  movieInfoMeta.appendChild(certText);

  if (runtime) {
    const runtimeEl = document.createElement('span');
    runtimeEl.textContent = runtime;
    movieInfoMeta.appendChild(runtimeEl);
  }

  if (genres) {
    const genresEl = document.createElement('span');
    genresEl.textContent = genres;
    movieInfoMeta.appendChild(genresEl);
  }
}

function renderMovie(movie) {
  currentMovie = movie;
  document.title = `YSCine - ${movie.title}`;

  const year = movie.release_date ? movie.release_date.slice(0, 4) : '';
  movieEnTitle.textContent = `${movie.original_title || movie.title}${year ? `, ${year}` : ''}`;
  movieTitle.textContent = movie.title;

  if (movie.poster_path) {
    const posterUrl = `${IMAGE_BASE}${movie.poster_path}`;
    moviePoster.src = posterUrl;
    moviePoster.alt = `${movie.title} 포스터`;
    moviePosterThumb.src = posterUrl;
    moviePosterThumb.alt = '';
  }

  const director = movie.credits?.crew?.find((c) => c.job === 'Director')?.name || '-';
  const cast = (movie.credits?.cast || []).slice(0, 4).map((c) => c.name).join(', ') || '-';

  movieDirector.textContent = director;
  movieCast.textContent = cast;
  renderInfoMeta(movie);
  movieRelease.textContent = formatReleaseDate(movie.release_date);
  movieOverview.textContent = movie.overview || '줄거리 정보가 없습니다.';

  detailLoading.hidden = true;
  detailLoading.style.display = 'none';
  detailMain.hidden = false;
  detailMain.style.display = 'block';

  fetchMovieVideos(movie.id);
  fetchMovieImages(movie.id);
  fetchMovieReviews(movie.id);
}

const VIDEO_TYPE_ORDER = ['Trailer', 'Teaser', 'Clip', 'Featurette'];

function getVideoEmbedUrl(video, autoplay = false) {
  const params = autoplay ? '?autoplay=1' : '';
  if (video.site === 'YouTube') return `https://www.youtube.com/embed/${video.key}${params}`;
  if (video.site === 'Vimeo') return `https://player.vimeo.com/video/${video.key}${autoplay ? '?autoplay=1' : ''}`;
  return null;
}

function getVideoThumbnail(video) {
  if (video.site === 'YouTube') return `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`;
  return '';
}

function renderClipsLoading() {
  movieClips.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'detail-clips__loading';
  loading.textContent = '무비클립을 불러오는 중...';
  movieClips.appendChild(loading);
}

function renderClipsEmpty() {
  movieClips.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'detail-clips__empty';
  empty.textContent = '무비클립이 없습니다';
  movieClips.appendChild(empty);
}

function getPlayableVideos(videos) {
  return (videos || [])
    .filter((video) => video?.key && getVideoEmbedUrl(video))
    .sort((a, b) => {
      const orderA = VIDEO_TYPE_ORDER.indexOf(a.type);
      const orderB = VIDEO_TYPE_ORDER.indexOf(b.type);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });
}

async function fetchVideoResults(path, language = '') {
  const langParam = language ? `&language=${language}` : '';
  const response = await fetch(
    `https://api.themoviedb.org/3/${path}/videos?api_key=${API_KEY}${langParam}`
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.results || [];
}

async function loadPlayableVideos(path) {
  const locales = ['ko-KR', ''];
  for (const locale of locales) {
    const results = await fetchVideoResults(path, locale);
    if (!results) continue;
    const playable = getPlayableVideos(results);
    if (playable.length) return playable;
  }
  return [];
}

function updateClipsSliderProgress(viewport, progressBar, prevBtn, nextBtn) {
  const maxScroll = viewport.scrollWidth - viewport.clientWidth;
  if (maxScroll <= 0) {
    progressBar.style.width = '100%';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const ratio = viewport.scrollLeft / maxScroll;
  const visibleRatio = viewport.clientWidth / viewport.scrollWidth;
  progressBar.style.width = `${(visibleRatio + ratio * (1 - visibleRatio)) * 100}%`;
  prevBtn.disabled = viewport.scrollLeft <= 1;
  nextBtn.disabled = viewport.scrollLeft >= maxScroll - 1;
}

function initClipsSlider(slider) {
  const viewport = slider.querySelector('.clips-slider__viewport');
  const progressBar = slider.querySelector('.clips-slider__progress-bar');
  const prevBtn = slider.querySelector('.clips-slider__arrow--prev');
  const nextBtn = slider.querySelector('.clips-slider__arrow--next');
  const scrollAmount = () => viewport.clientWidth * 0.75;

  const update = () => updateClipsSliderProgress(viewport, progressBar, prevBtn, nextBtn);

  prevBtn.addEventListener('click', () => {
    viewport.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  });

  nextBtn.addEventListener('click', () => {
    viewport.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
  });

  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

function openVideoModal(video) {
  const embedUrl = getVideoEmbedUrl(video, true);
  if (!embedUrl) return;

  const title = currentMovie ? `<${currentMovie.title}> ${video.name}` : video.name;
  videoModalTitle.textContent = title;
  videoModalPlayer.innerHTML = '';

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = video.name;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;

  videoModalPlayer.appendChild(iframe);
  videoModal.hidden = false;
  videoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  videoModalClose.focus();
}

function closeVideoModal() {
  videoModal.hidden = true;
  videoModal.setAttribute('aria-hidden', 'true');
  videoModalPlayer.innerHTML = '';
  document.body.style.overflow = '';
}

function renderClips(videos) {
  const playable = getPlayableVideos(videos);

  movieClips.innerHTML = '';

  if (!playable.length) {
    renderClipsEmpty();
    return;
  }

  const slider = document.createElement('div');
  slider.className = 'clips-slider';

  const viewport = document.createElement('div');
  viewport.className = 'clips-slider__viewport';

  const track = document.createElement('div');
  track.className = 'clips-slider__track';

  playable.forEach((video) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'clips-slider__item';
    item.setAttribute('aria-label', video.name);

    const thumb = getVideoThumbnail(video);
    if (thumb) {
      const img = document.createElement('img');
      img.src = thumb;
      img.alt = '';
      img.loading = 'lazy';
      item.appendChild(img);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'clips-slider__placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '▶';
      item.appendChild(placeholder);
    }

    item.addEventListener('click', () => openVideoModal(video));
    track.appendChild(item);
  });

  viewport.appendChild(track);

  const controls = document.createElement('div');
  controls.className = 'clips-slider__controls';
  controls.innerHTML = `
    <button type="button" class="clips-slider__arrow clips-slider__arrow--prev" aria-label="이전">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 18l-6-6 6-6"></path>
      </svg>
    </button>
    <div class="clips-slider__progress">
      <div class="clips-slider__progress-bar"></div>
    </div>
    <button type="button" class="clips-slider__arrow clips-slider__arrow--next" aria-label="다음">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"></path>
      </svg>
    </button>
  `;

  slider.appendChild(viewport);
  slider.appendChild(controls);
  movieClips.appendChild(slider);
  initClipsSlider(slider);
}

function renderStills(backdrops) {
  const stills = backdrops.slice(0, 6);
  if (stills.length === 0) return;

  movieStills.innerHTML = '';
  sectionStills.hidden = false;
  stillsCount.textContent = stills.length;

  stills.forEach((image) => {
    const item = document.createElement('div');
    item.className = 'detail-still';

    const img = document.createElement('img');
    img.src = `${BACKDROP_BASE}${image.file_path}`;
    img.alt = '스틸컷';
    img.loading = 'lazy';

    item.appendChild(img);
    movieStills.appendChild(item);
  });
}

function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

function renderReviewsEmpty() {
  movieReviews.innerHTML = '';
  reviewsCount.textContent = '0';

  const empty = document.createElement('li');
  empty.className = 'detail-reviews__empty';
  empty.textContent = '리뷰가 없습니다.';
  movieReviews.appendChild(empty);
}

function createReviewItem(review) {
  const item = document.createElement('li');
  item.className = 'detail-review';

  const header = document.createElement('div');
  header.className = 'detail-review__header';

  const meta = document.createElement('div');
  meta.className = 'detail-review__meta';

  const author = document.createElement('strong');
  author.className = 'detail-review__author';
  author.textContent = review.author || '익명';
  meta.appendChild(author);

  const date = document.createElement('span');
  date.className = 'detail-review__date';
  date.textContent = formatReviewDate(review.created_at);
  meta.appendChild(date);

  header.appendChild(meta);

  const rating = review.author_details?.rating;
  if (rating) {
    const ratingEl = document.createElement('div');
    ratingEl.className = 'detail-review__rating';
    ratingEl.textContent = `★ ${rating / 2}/5`;
    header.appendChild(ratingEl);
  }

  const content = document.createElement('p');
  content.className = 'detail-review__content';
  content.textContent = stripHtml(review.content || '');

  item.appendChild(header);
  item.appendChild(content);

  return item;
}

function renderReviews(reviews) {
  movieReviews.innerHTML = '';

  if (reviews.length === 0) {
    renderReviewsEmpty();
    return;
  }

  reviewsCount.textContent = reviews.length;

  reviews.forEach((review) => {
    movieReviews.appendChild(createReviewItem(review));
  });
}

async function fetchMovieReviews(movieId) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/reviews?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) {
      renderReviews([]);
      return;
    }
    const data = await response.json();
    renderReviews(data.results || []);
  } catch {
    renderReviews([]);
  }
}

async function fetchMovieVideos(movieId) {
  renderClipsLoading();

  try {
    const playable = await loadPlayableVideos(`movie/${movieId}`);
    renderClips(playable);
  } catch {
    renderClipsEmpty();
  }
}

async function fetchMovieImages(movieId) {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/images?api_key=${API_KEY}`
    );
    if (!response.ok) return;
    const data = await response.json();
    renderStills(data.backdrops || []);
  } catch {
    // 이미지 없음
  }
}

async function fetchMovieDetail(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits,release_dates`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
    const movie = await response.json();
    renderMovie(movie);
  } catch (err) {
    showError(`영화 정보를 불러오지 못했습니다. ${err.message}`);
  }
}

function initTabs() {
  const tabs = document.querySelectorAll('.detail-tab');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      const target = document.getElementById(targetId);
      if (!target) return;

      tabs.forEach((t) => t.classList.toggle('detail-tab--active', t === tab));
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function initVideoModal() {
  videoModalClose.addEventListener('click', closeVideoModal);
  videoModalBackdrop.addEventListener('click', closeVideoModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !videoModal.hidden) closeVideoModal();
  });
}

function initShare() {
  shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: document.title,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자 취소
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다.');
    }
  });
}

async function init() {
  await loadLayout('movies', '../');
  initTabs();
  initVideoModal();
  initShare();

  const movieId = getMovieId();
  if (!movieId) {
    showError('영화 ID가 없습니다. 목록에서 영화를 선택해 주세요.');
  } else {
    fetchMovieDetail(movieId);
  }
}

init();
