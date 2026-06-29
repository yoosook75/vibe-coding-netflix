const API_KEY = window.APP_CONFIG?.TMDB_API_KEY ?? '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const API_ENDPOINTS = {
  'now-playing': `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=ko-KR&page=1`,
};

const TODAY_PICKS = [
  { color1: '#0f1f2c', color2: '#4f6e80' },
  { color1: '#2a1428', color2: '#8a4868' },
  { color1: '#0a2848', color2: '#3898c8' },
  { color1: '#3a1a18', color2: '#784878' },
  { color1: '#1a2838', color2: '#587888' },
  { color1: '#382818', color2: '#987848' },
  { color1: '#182838', color2: '#486878' },
];

const moviesRow = document.getElementById('movies-row');
const carouselViewport = document.getElementById('carousel-viewport');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const carouselProgress = document.getElementById('carousel-progress');
const carouselPrev = document.getElementById('carousel-prev');
const carouselNext = document.getElementById('carousel-next');
const carouselPause = document.getElementById('carousel-pause');
const eventGrid = document.getElementById('event-grid');
const heroSliderTrack = document.getElementById('hero-slider-track');
const heroSliderViewport = document.getElementById('hero-slider-viewport');
const heroSliderPrev = document.getElementById('hero-slider-prev');
const heroSliderNext = document.getElementById('hero-slider-next');
const heroSliderPause = document.getElementById('hero-slider-pause');
const heroSliderCounter = document.getElementById('hero-slider-counter');
const todayPickEl = document.getElementById('today-pick');

let allMovies = [];
let filteredMovies = [];
let todayPickItems = [];
let todayPickIndex = 0;
let heroTrackIndex = 0;
let todayPickAutoTimer = null;
let todayPickHoverPaused = false;
let heroSliderPaused = false;
const HERO_SLIDE_GAP = 20;
let autoScrollTimer = null;
let isPaused = true;
let currentIndex = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartIndex = 0;
let dragOffsetX = 0;

function formatEventPeriod(periodFull) {
  if (!periodFull) return '';
  return periodFull.replace(' - ', ' ~ ');
}

function parseEventTitle(title = '') {
  const match = title.match(/^<([^>]+)>\s*(.*)$/);
  if (!match) {
    return { movie: '', desc: title };
  }

  return {
    movie: match[1].trim(),
    desc: match[2].trim() || title,
  };
}

function getMainEvents() {
  if (typeof EVENT_ITEMS === 'undefined') return [];
  return EVENT_ITEMS.filter((event) => event.category !== 'past').slice(0, 4);
}

function renderMainEventGrid() {
  if (!eventGrid) return;

  const events = getMainEvents();
  eventGrid.innerHTML = '';

  if (!events.length) {
    const empty = document.createElement('p');
    empty.className = 'event-section__empty';
    empty.textContent = '진행 중인 이벤트가 없습니다.';
    eventGrid.appendChild(empty);
    return;
  }

  events.forEach((event) => {
    const card = document.createElement('a');
    card.className = 'event-section__card';
    card.href = `event/detail.html?id=${event.id}`;

    const posterWrap = document.createElement('div');
    posterWrap.className = 'event-section__poster-wrap';

    const { movie, desc } = parseEventTitle(event.title);

    if (event.posterUrl) {
      const img = document.createElement('img');
      img.className = 'event-section__poster';
      img.src = event.posterUrl;
      img.alt = event.title;
      img.loading = 'lazy';
      posterWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'event-section__poster event-section__poster--placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '🎬';
      posterWrap.appendChild(placeholder);
    }

    const info = document.createElement('div');
    info.className = 'event-section__card-info';

    if (movie) {
      const movieLabel = document.createElement('p');
      movieLabel.className = 'event-section__card-movie';
      movieLabel.textContent = movie;
      info.appendChild(movieLabel);
    }

    const title = document.createElement('h3');
    title.className = 'event-section__card-title';
    title.textContent = desc;

    const date = document.createElement('p');
    date.className = 'event-section__card-date';
    date.textContent = formatEventPeriod(event.periodFull);

    info.appendChild(title);
    info.appendChild(date);

    card.appendChild(posterWrap);
    card.appendChild(info);
    eventGrid.appendChild(card);
  });
}

function updateEventPostersFromMovies(movies) {
  if (typeof EVENT_ITEMS === 'undefined') return;

  getMainEvents().forEach((event, index) => {
    if (!movies[index]?.poster_path) return;
    const item = EVENT_ITEMS.find((entry) => entry.id === event.id);
    if (item) {
      item.posterUrl = `${IMAGE_BASE}${movies[index].poster_path}`;
    }
  });

  renderMainEventGrid();
}

function initEventGrid() {
  renderMainEventGrid();
}

function formatPickDateRange(releaseDate) {
  if (!releaseDate) return '';
  const [year, month, day] = releaseDate.split('-');
  return `${year}.${month}.${day} 개봉`;
}

function buildTodayPickItems(movies) {
  return TODAY_PICKS.map((pick, index) => {
    const movie = movies[index];
    if (!movie) {
      return {
        ...pick,
        id: null,
        title: '추천 준비 중',
        subtitle: '',
        dateRange: '',
        poster_path: null,
      };
    }

    return {
      ...pick,
      id: movie.id,
      title: movie.title,
      subtitle: movie.original_title && movie.original_title !== movie.title
        ? movie.original_title
        : '',
      dateRange: formatPickDateRange(movie.release_date),
      poster_path: movie.poster_path,
    };
  });
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyHeroSlideTheme(slide, pick) {
  const color1 = pick.color1 || '#0f1f2c';
  const color2 = pick.color2 || '#4f6e80';

  slide.style.setProperty('--hero-bg-1', color1);
  slide.style.setProperty('--hero-bg-2', color2);
  slide.style.setProperty('--hero-bg-3', color1);
  slide.style.setProperty('--hero-glow-main', hexToRgba(color2, 0.28));
  slide.style.setProperty('--hero-glow-sub', hexToRgba(color1, 0.22));
}

function createHeroBgLayers(posterUrl) {
  const bg = document.createElement('div');
  bg.className = 'hero-card__bg';
  bg.setAttribute('aria-hidden', 'true');

  const blurWrap = document.createElement('div');
  blurWrap.className = 'hero-card__bg-blur';
  if (posterUrl) {
    const blurImg = document.createElement('img');
    blurImg.className = 'hero-card__bg-blur-img';
    blurImg.src = posterUrl;
    blurImg.alt = '';
    blurImg.setAttribute('aria-hidden', 'true');
    blurImg.loading = 'lazy';
    blurImg.decoding = 'async';
    blurWrap.appendChild(blurImg);
  }
  bg.appendChild(blurWrap);

  ['base', 'glow-main', 'glow-sub', 'vignette', 'overlay'].forEach((layer) => {
    const el = document.createElement('div');
    el.className = `hero-card__bg-${layer}`;
    bg.appendChild(el);
  });

  return bg;
}

function createHeroSlide(pick, index, isClone = false) {
  const slide = document.createElement('article');
  slide.className = `hero-slide hero-card${isClone ? ' hero-slide--clone' : ''}`;
  slide.dataset.slideIndex = String(index);

  applyHeroSlideTheme(slide, pick);

  const posterUrl = getPosterUrl(pick.poster_path);
  const bg = createHeroBgLayers(posterUrl);

  const inner = document.createElement('div');
  inner.className = 'hero-slide__inner';

  const info = document.createElement('div');
  info.className = 'hero-slide__info';

  const title = document.createElement('h3');
  title.className = 'hero-slide__title';
  title.textContent = pick.title;

  const date = document.createElement('p');
  date.className = 'hero-slide__date';
  date.textContent = pick.dateRange || '';

  info.appendChild(title);
  info.appendChild(date);

  const posterWrap = document.createElement('div');
  posterWrap.className = 'hero-slide__poster-wrap';

  if (posterUrl) {
    const img = document.createElement('img');
    img.className = 'hero-slide__poster';
    img.src = posterUrl;
    img.alt = `${pick.title} 포스터`;
    img.loading = index === 0 ? 'eager' : 'lazy';
    posterWrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'hero-slide__poster hero-slide__poster--placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = '🎬';
    posterWrap.appendChild(placeholder);
  }

  inner.appendChild(info);
  inner.appendChild(posterWrap);
  slide.appendChild(bg);
  slide.appendChild(inner);

  return slide;
}

function createHeroSkeleton() {
  const slide = document.createElement('article');
  slide.className = 'hero-slide hero-slide--skeleton hero-slide--active';
  slide.setAttribute('aria-hidden', 'true');
  slide.appendChild(document.createElement('div')).className = 'hero-slide__inner';
  return slide;
}

function renderHeroSlides() {
  if (!heroSliderTrack) return;

  const todayPickEl = document.getElementById('today-pick');
  heroSliderTrack.innerHTML = '';

  if (!todayPickItems.length) {
    todayPickEl?.classList.remove('hero-slider--ready');
    heroSliderTrack.appendChild(createHeroSkeleton());
    updateHeroSliderCounter();
    return;
  }

  todayPickEl?.classList.add('hero-slider--ready');

  if (todayPickItems.length === 1) {
    heroSliderTrack.appendChild(createHeroSlide(todayPickItems[0], 0));
    heroTrackIndex = 0;
    todayPickIndex = 0;
    updateHeroSliderCounter();
    scheduleHeroSliderLayout();
    return;
  }

  const lastIndex = todayPickItems.length - 1;
  heroSliderTrack.appendChild(createHeroSlide(todayPickItems[lastIndex], lastIndex, true));

  todayPickItems.forEach((pick, index) => {
    heroSliderTrack.appendChild(createHeroSlide(pick, index));
  });

  heroSliderTrack.appendChild(createHeroSlide(todayPickItems[0], 0, true));

  heroTrackIndex = 1;
  todayPickIndex = 0;
  updateHeroSliderCounter();
  scheduleHeroSliderLayout();
}

function updateHeroSliderCounter() {
  if (!heroSliderCounter || !todayPickItems.length) return;
  const current = String(todayPickIndex + 1).padStart(2, '0');
  const total = String(todayPickItems.length).padStart(2, '0');

  const currentEl = heroSliderCounter.querySelector('.hero-slider__counter-current');
  const totalEl = heroSliderCounter.querySelector('.hero-slider__counter-total');

  if (currentEl && totalEl) {
    currentEl.textContent = current;
    totalEl.textContent = total;
  } else {
    heroSliderCounter.textContent = `${current} / ${total}`;
  }
}

function updateHeroSliderActiveState() {
  heroSliderTrack?.querySelectorAll('.hero-slide').forEach((slide, index) => {
    slide.classList.toggle('hero-slide--active', index === heroTrackIndex);
  });
}

function getHeroSlideWidth(slide) {
  const rect = slide.getBoundingClientRect();
  return rect.width || slide.offsetWidth;
}

function updateHeroSliderTransform(useTransition = true) {
  if (!heroSliderTrack || !heroSliderViewport) return;

  const slides = heroSliderTrack.querySelectorAll('.hero-slide');
  if (!slides.length) return;

  const slideWidth = getHeroSlideWidth(slides[0]);
  const viewportWidth = heroSliderViewport.clientWidth;

  if (slideWidth < 1 || viewportWidth < 1) {
    scheduleHeroSliderLayout();
    return;
  }

  const offset = (viewportWidth - slideWidth) / 2 - heroTrackIndex * (slideWidth + HERO_SLIDE_GAP);

  heroSliderTrack.classList.toggle('is-animating', useTransition);
  heroSliderTrack.style.transition = useTransition
    ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'none';
  heroSliderTrack.style.transform = `translate3d(${offset}px, 0, 0)`;
  updateHeroSliderActiveState();
  updateHeroSliderCounter();
}

function clearHeroSliderAnimationState() {
  heroSliderTrack?.classList.remove('is-animating');
}

function bindHeroSliderLoopReset() {
  if (!heroSliderTrack || todayPickItems.length <= 1) return;

  const handleTransitionEnd = (event) => {
    if (event.target !== heroSliderTrack || event.propertyName !== 'transform') return;

    heroSliderTrack.removeEventListener('transitionend', handleTransitionEnd);
    clearHeroSliderAnimationState();

    const slides = heroSliderTrack.querySelectorAll('.hero-slide');
    const lastTrackIndex = slides.length - 1;

    if (heroTrackIndex === 0) {
      heroTrackIndex = lastTrackIndex - 1;
      updateHeroSliderTransform(false);
    } else if (heroTrackIndex === lastTrackIndex) {
      heroTrackIndex = 1;
      updateHeroSliderTransform(false);
    }

    updateHeroSliderActiveState();
  };

  heroSliderTrack.addEventListener('transitionend', handleTransitionEnd);
}

function scheduleHeroSliderLayout() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      updateHeroSliderTransform(false);
    });
  });
}

function moveHeroSlider(step, options = {}) {
  if (!todayPickItems.length) return;

  if (todayPickItems.length === 1) {
    todayPickIndex = 0;
    heroTrackIndex = 0;
    updateHeroSliderTransform(!options.instant);
    if (!options.fromAuto) resetTodayPickAutoPlay();
    return;
  }

  heroTrackIndex += step;
  todayPickIndex = (todayPickIndex + step + todayPickItems.length) % todayPickItems.length;

  updateHeroSliderTransform(!options.instant);

  if (!options.instant) {
    bindHeroSliderLoopReset();
  }

  if (!options.fromAuto) {
    resetTodayPickAutoPlay();
  }
}

function goToHeroSlide(index, options = {}) {
  if (!todayPickItems.length) return;

  if (todayPickItems.length === 1) {
    todayPickIndex = 0;
    heroTrackIndex = 0;
    updateHeroSliderTransform(!options.instant);
    return;
  }

  const normalized = ((index % todayPickItems.length) + todayPickItems.length) % todayPickItems.length;
  todayPickIndex = normalized;
  heroTrackIndex = normalized + 1;
  updateHeroSliderTransform(!options.instant);

  if (!options.fromAuto) {
    resetTodayPickAutoPlay();
  }
}

function stopTodayPickAutoPlay() {
  if (todayPickAutoTimer) {
    clearInterval(todayPickAutoTimer);
    todayPickAutoTimer = null;
  }
}

function startTodayPickAutoPlay() {
  stopTodayPickAutoPlay();
  if (todayPickHoverPaused || heroSliderPaused || todayPickItems.length <= 1) return;

  todayPickAutoTimer = setInterval(() => {
    moveHeroSlider(1, { fromAuto: true });
  }, 5000);
}

function resetTodayPickAutoPlay() {
  stopTodayPickAutoPlay();
  if (!todayPickHoverPaused) {
    startTodayPickAutoPlay();
  }
}

function initTodayPickInteractions() {
  if (!todayPickEl || todayPickEl.dataset.bound === 'true') return;

  todayPickEl.dataset.bound = 'true';
  todayPickEl.addEventListener('mouseenter', () => {
    todayPickHoverPaused = true;
    stopTodayPickAutoPlay();
  });
  todayPickEl.addEventListener('mouseleave', () => {
    todayPickHoverPaused = false;
    startTodayPickAutoPlay();
  });

  heroSliderPrev?.addEventListener('click', () => {
    moveHeroSlider(-1);
  });

  heroSliderNext?.addEventListener('click', () => {
    moveHeroSlider(1);
  });

  heroSliderPause?.addEventListener('click', () => {
    heroSliderPaused = !heroSliderPaused;
    heroSliderPause.classList.toggle('hero-slider__pause--paused', heroSliderPaused);
    heroSliderPause.setAttribute(
      'aria-label',
      heroSliderPaused ? '자동 재생 재개' : '자동 재생 일시정지'
    );

    if (heroSliderPaused) {
      stopTodayPickAutoPlay();
    } else {
      startTodayPickAutoPlay();
    }
  });

  window.addEventListener('resize', scheduleHeroSliderLayout);
  window.addEventListener('pageshow', scheduleHeroSliderLayout);

  const heroSection = document.querySelector('.hero-slider-section');
  if (heroSection && 'IntersectionObserver' in window) {
    const heroVisibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scheduleHeroSliderLayout();
          }
        });
      },
      { threshold: 0.01 }
    );
    heroVisibilityObserver.observe(heroSection);
  }
}

function initTodayPick(movies) {
  todayPickItems = buildTodayPickItems(movies);
  todayPickIndex = 0;
  initTodayPickInteractions();
  renderHeroSlides();
  goToHeroSlide(0, { instant: true, fromAuto: true });
  startTodayPickAutoPlay();
}

function getPosterUrl(posterPath) {
  return posterPath ? `${IMAGE_BASE}${posterPath}` : null;
}

function formatReleaseDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}.${month}.${day} 개봉`;
}

function createPlaceholder() {
  const div = document.createElement('div');
  div.className = 'movie-card__poster movie-card__poster--placeholder';
  div.textContent = '🎬';
  div.setAttribute('aria-hidden', 'true');
  return div;
}

function createMovieCard(movie, index) {
  const card = document.createElement('article');
  card.className = 'movie-card';

  const posterWrap = document.createElement('div');
  posterWrap.className = 'movie-card__poster-wrap';

  const posterUrl = getPosterUrl(movie.poster_path);

  if (posterUrl) {
    const img = document.createElement('img');
    img.className = 'movie-card__poster';
    img.src = posterUrl;
    img.alt = `${movie.title} 포스터`;
    img.loading = 'lazy';
    img.onerror = () => {
      img.replaceWith(createPlaceholder());
    };
    posterWrap.appendChild(img);
  } else {
    posterWrap.appendChild(createPlaceholder());
  }

  if (movie.release_date) {
    const dateBadge = document.createElement('span');
    dateBadge.className = 'movie-card__date';
    dateBadge.textContent = formatReleaseDate(movie.release_date);
    posterWrap.appendChild(dateBadge);
  }

  const overlay = document.createElement('div');
  overlay.className = 'movie-card__overlay';

  const infoBtn = document.createElement('button');
  infoBtn.type = 'button';
  infoBtn.className = 'movie-card__btn movie-card__btn--info';
  infoBtn.textContent = '영화정보';
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `movies/detail.html?id=${movie.id}`;
  });

  const bookBtn = document.createElement('button');
  bookBtn.type = 'button';
  bookBtn.className = 'movie-card__btn movie-card__btn--book';
  bookBtn.innerHTML = '예매하기 <span aria-hidden="true">→</span>';
  bookBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = `movies/detail.html?id=${movie.id}`;
  });

  overlay.appendChild(infoBtn);
  overlay.appendChild(bookBtn);
  posterWrap.appendChild(overlay);

  card.appendChild(posterWrap);

  posterWrap.addEventListener('click', () => {
    window.location.href = `movies/detail.html?id=${movie.id}`;
  });

  return card;
}

function getVisibleCardCount() {
  const width = carouselViewport?.clientWidth || window.innerWidth;
  if (width > 992) return 5;
  if (width > 768) return 3;
  return 2;
}

function syncCarouselMetrics() {
  const viewportWidth = carouselViewport.clientWidth;
  const gap = viewportWidth <= 600 ? 12 : 16;
  const visibleCount = getVisibleCardCount();
  const cardWidth = Math.max(
    100,
    (viewportWidth - (visibleCount - 1) * gap) / visibleCount
  );

  carouselViewport.style.setProperty('--card-gap', `${gap}px`);
  carouselViewport.style.setProperty('--card-width', `${cardWidth}px`);
  carouselViewport.style.setProperty('--visible-cards', String(visibleCount));

  return { gap, viewportWidth, cardWidth };
}

function getCarouselMetrics() {
  return syncCarouselMetrics();
}

function getMovieCards() {
  return moviesRow.querySelectorAll('.movie-card');
}

function getMaxIndex() {
  const count = getMovieCards().length;
  return Math.max(0, count - getVisibleCardCount());
}

function updateActiveCard() {
  const cards = getMovieCards();
  const activeIndex = currentIndex + Math.floor(getVisibleCardCount() / 2);
  cards.forEach((card, index) => {
    card.classList.toggle('movie-card--active', index === activeIndex);
  });
}

function updateCarouselTransform(useTransition = true) {
  const { cardWidth, gap } = syncCarouselMetrics();
  const baseOffset = -currentIndex * (cardWidth + gap);
  const offset = baseOffset + dragOffsetX;

  moviesRow.style.transition = useTransition && !isDragging
    ? 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    : 'none';
  moviesRow.style.transform = `translateX(${offset}px)`;
  updateActiveCard();
}

function updateCarouselProgress() {
  const maxIndex = getMaxIndex();

  if (maxIndex <= 0) {
    carouselProgress.style.width = '100%';
    return;
  }

  carouselProgress.style.width = `${(currentIndex / maxIndex) * 100}%`;
}

function goToSlide(index, useTransition = true) {
  const maxIndex = getMaxIndex();
  currentIndex = Math.max(0, Math.min(index, maxIndex));
  dragOffsetX = 0;
  updateCarouselTransform(useTransition);
  updateCarouselProgress();
}

function scrollCarousel(direction) {
  goToSlide(currentIndex + direction);
}

function scheduleCarouselLayout() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const maxIndex = getMaxIndex();
      if (currentIndex > maxIndex) {
        currentIndex = maxIndex;
      }
      updateCarouselTransform(false);
      updateCarouselProgress();
    });
  });
}

function resetCarousel() {
  currentIndex = 0;
  dragOffsetX = 0;
  scheduleCarouselLayout();
}

function initCarouselSwipe() {
  moviesRow.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (!getMovieCards().length) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartIndex = currentIndex;
    dragOffsetX = 0;
    moviesRow.classList.add('is-dragging');
    moviesRow.setPointerCapture(e.pointerId);
    stopAutoScroll();
  });

  moviesRow.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    dragOffsetX = e.clientX - dragStartX;
    updateCarouselTransform(false);
  });

  moviesRow.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    moviesRow.classList.remove('is-dragging');
    moviesRow.releasePointerCapture(e.pointerId);

    const { cardWidth, gap } = getCarouselMetrics();
    const threshold = (cardWidth + gap) * 0.2;

    if (dragOffsetX < -threshold) {
      goToSlide(dragStartIndex + 1);
    } else if (dragOffsetX > threshold) {
      goToSlide(dragStartIndex - 1);
    } else {
      goToSlide(currentIndex);
    }

    if (!isPaused) startAutoScroll();
  });

  moviesRow.addEventListener('pointercancel', () => {
    if (!isDragging) return;
    isDragging = false;
    moviesRow.classList.remove('is-dragging');
    dragOffsetX = 0;
    goToSlide(currentIndex);
  });
}

function startAutoScroll() {
  stopAutoScroll();
  if (isPaused) return;

  autoScrollTimer = setInterval(() => {
    const maxIndex = getMaxIndex();
    if (maxIndex <= 0) return;

    if (currentIndex >= maxIndex) {
      goToSlide(0);
    } else {
      goToSlide(currentIndex + 1);
    }
  }, 3000);
}

function stopAutoScroll() {
  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }
}

function updatePauseButton() {
  carouselPause.classList.toggle('carousel-btn--paused', isPaused);
  carouselPause.setAttribute(
    'aria-label',
    isPaused ? '자동 재생 재개' : '자동 재생 일시정지'
  );
}

function togglePause() {
  isPaused = !isPaused;
  updatePauseButton();

  if (isPaused) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
}

function showError(message) {
  if (loadingEl) loadingEl.hidden = true;
  errorEl.hidden = false;
  errorEl.textContent = message;
}

function renderMovies(movies) {
  moviesRow.innerHTML = '';

  if (movies.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'loading';
    empty.textContent = searchInput.value.trim()
      ? '검색 결과가 없습니다.'
      : '표시할 영화가 없습니다.';
    moviesRow.appendChild(empty);
    updateCarouselProgress();
    return;
  }

  movies.forEach((movie, index) => {
    moviesRow.appendChild(createMovieCard(movie, index));
  });

  resetCarousel();
  moviesRow.querySelectorAll('.movie-card__poster').forEach((img) => {
    if (img.complete) return;
    img.addEventListener('load', scheduleCarouselLayout, { once: true });
  });
  updateEventPostersFromMovies(movies);
  initTodayPick(movies);
  isPaused = true;
  updatePauseButton();
  stopAutoScroll();
}

function setActiveNav(nav) {
  document.querySelectorAll('.index-nav__link[data-nav]').forEach((el) => {
    el.classList.toggle('index-nav__link--active', el.dataset.nav === nav);
  });

  document.querySelectorAll('.index-footer__nav a[data-nav]').forEach((el) => {
    el.classList.toggle('footer-nav--active', el.dataset.nav === nav);
  });
}

function initIndexNavMegaMenu() {
  const header = document.querySelector('.index-header');
  if (!header) return;

  const megaInner = header.querySelector('.index-header__mega-inner');
  const groups = [
    {
      nav: header.querySelector('[data-nav-group="movies"]'),
      col: header.querySelector('[data-mega="movies"]'),
    },
    {
      nav: header.querySelector('[data-nav-group="tv"]'),
      col: header.querySelector('[data-mega="tv"]'),
    },
    {
      nav: header.querySelector('[data-nav-group="events"]'),
      col: header.querySelector('[data-mega="events"]'),
    },
    {
      nav: header.querySelector('[data-nav-group="community"]'),
      col: header.querySelector('[data-mega="community"]'),
    },
  ];

  if (!megaInner || groups.some((item) => !item.nav || !item.col)) return;

  let activeGroup = null;

  const alignMegaColumns = () => {
    const innerRect = megaInner.getBoundingClientRect();

    groups.forEach(({ nav, col }) => {
      const navRect = nav.getBoundingClientRect();
      col.style.left = `${navRect.left - innerRect.left}px`;
    });
  };

  const setActiveGroup = (groupName) => {
    activeGroup = groupName;
    groups.forEach(({ col }) => col.classList.remove('is-active'));
    const target = groups.find((item) => item.nav?.dataset.navGroup === groupName);
    target?.col.classList.add('is-active');
    alignMegaColumns();
  };

  const clearActiveGroup = () => {
    activeGroup = null;
    groups.forEach(({ col }) => col.classList.remove('is-active'));
    header.classList.remove('index-header--mega-open');
  };

  alignMegaColumns();
  window.addEventListener('resize', alignMegaColumns);

  let megaCloseTimer = null;
  const openMega = (groupName) => {
    clearTimeout(megaCloseTimer);
    setActiveGroup(groupName);
    header.classList.add('index-header--mega-open');
  };
  const closeMega = () => {
    megaCloseTimer = setTimeout(() => {
      clearActiveGroup();
    }, 120);
  };

  groups.forEach(({ nav }) => {
    const groupName = nav.dataset.navGroup;
    nav.addEventListener('mouseenter', () => openMega(groupName));
    nav.addEventListener('mouseleave', closeMega);
  });

  const mega = header.querySelector('.index-header__mega');
  mega?.addEventListener('mouseenter', () => {
    if (activeGroup) openMega(activeGroup);
  });
  mega?.addEventListener('mouseleave', closeMega);
}

async function fetchMovies() {
  const url = API_ENDPOINTS['now-playing'];

  try {
    if (loadingEl) {
      moviesRow.innerHTML = '';
      moviesRow.appendChild(loadingEl);
      loadingEl.hidden = false;
    }
    errorEl.hidden = true;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API 요청 실패 (${response.status})`);
    }

    const data = await response.json();
    allMovies = data.results || [];
    filteredMovies = allMovies;
    searchInput.value = '';
    renderMovies(filteredMovies);
  } catch (err) {
    showError(`영화를 불러오지 못했습니다. ${err.message}`);
    initTodayPick([]);
  }
}

function filterMovies(keyword) {
  const query = keyword.trim().toLowerCase();

  if (!query) {
    filteredMovies = allMovies;
  } else {
    filteredMovies = allMovies.filter((movie) =>
      movie.title.toLowerCase().includes(query) ||
      (movie.original_title && movie.original_title.toLowerCase().includes(query))
    );
  }

  renderMovies(filteredMovies);
}

document.querySelectorAll('.index-nav__link[data-nav], .index-footer__nav > a[data-nav]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href') || '';

    if (!href.includes('index.html') || href.includes('movies/')) {
      return;
    }

    const hash = href.includes('#') ? href.split('#')[1] : '';
    if (!hash && link.dataset.nav !== 'home') return;

    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        e.preventDefault();
        setActiveNav(link.dataset.nav);
        target.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    if (link.dataset.nav === 'home') {
      e.preventDefault();
      setActiveNav('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;

  window.location.href = `movies/movies.html?search=${encodeURIComponent(query)}`;
});

carouselPrev.addEventListener('click', () => scrollCarousel(-1));
carouselNext.addEventListener('click', () => scrollCarousel(1));
carouselPause.addEventListener('click', togglePause);

/* TV 시리즈 캐러셀 */
function formatTvAirDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}.${month}.${day} 첫 방영`;
}

function getTvDetailUrl(tvId) {
  return `tv/detail.html?id=${tvId}`;
}

function createTvSeriesCard(show) {
  const card = document.createElement('article');
  card.className = 'movie-card';

  const posterWrap = document.createElement('div');
  posterWrap.className = 'movie-card__poster-wrap';

  const posterUrl = getPosterUrl(show.poster_path);

  if (posterUrl) {
    const img = document.createElement('img');
    img.className = 'movie-card__poster';
    img.src = posterUrl;
    img.alt = `${show.name} 포스터`;
    img.loading = 'lazy';
    img.onerror = () => {
      img.replaceWith(createPlaceholder());
    };
    posterWrap.appendChild(img);
  } else {
    posterWrap.appendChild(createPlaceholder());
  }

  if (show.first_air_date) {
    const dateBadge = document.createElement('span');
    dateBadge.className = 'movie-card__date';
    dateBadge.textContent = formatTvAirDate(show.first_air_date);
    posterWrap.appendChild(dateBadge);
  }

  const overlay = document.createElement('div');
  overlay.className = 'movie-card__overlay';

  const infoBtn = document.createElement('button');
  infoBtn.type = 'button';
  infoBtn.className = 'movie-card__btn movie-card__btn--info';
  infoBtn.textContent = '시리즈 정보';
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = getTvDetailUrl(show.id);
  });

  const detailBtn = document.createElement('button');
  detailBtn.type = 'button';
  detailBtn.className = 'movie-card__btn movie-card__btn--book';
  detailBtn.innerHTML = '상세보기 <span aria-hidden="true">→</span>';
  detailBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = getTvDetailUrl(show.id);
  });

  overlay.appendChild(infoBtn);
  overlay.appendChild(detailBtn);
  posterWrap.appendChild(overlay);
  card.appendChild(posterWrap);

  posterWrap.addEventListener('click', () => {
    window.location.href = getTvDetailUrl(show.id);
  });

  return card;
}

function createMainTvCarousel({
  row,
  viewport,
  loadingEl,
  errorEl,
  progressEl,
  prevBtn,
  nextBtn,
  pauseBtn,
  listNameEl = null,
  createCard = createTvSeriesCard,
  emptyMessage = '표시할 TV 시리즈가 없습니다.',
}) {
  let currentIndex = 0;
  let isPaused = true;
  let autoScrollTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartIndex = 0;
  let dragOffsetX = 0;

  function getCards() {
    return row?.querySelectorAll('.movie-card') ?? [];
  }

  function syncMetrics() {
    const viewportWidth = viewport.clientWidth;
    const gap = viewportWidth <= 600 ? 12 : 16;
    const visibleCount = getVisibleCardCount();
    const cardWidth = Math.max(
      100,
      (viewportWidth - (visibleCount - 1) * gap) / visibleCount
    );

    viewport.style.setProperty('--card-gap', `${gap}px`);
    viewport.style.setProperty('--card-width', `${cardWidth}px`);
    viewport.style.setProperty('--visible-cards', String(visibleCount));

    return { gap, cardWidth };
  }

  function getMaxIndex() {
    const count = getCards().length;
    return Math.max(0, count - getVisibleCardCount());
  }

  function updateActiveCard() {
    const cards = getCards();
    const activeIndex = currentIndex + Math.floor(getVisibleCardCount() / 2);
    cards.forEach((card, index) => {
      card.classList.toggle('movie-card--active', index === activeIndex);
    });
  }

  function updateTransform(useTransition = true) {
    const { cardWidth, gap } = syncMetrics();
    const baseOffset = -currentIndex * (cardWidth + gap);
    const offset = baseOffset + dragOffsetX;

    row.style.transition = useTransition && !isDragging
      ? 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      : 'none';
    row.style.transform = `translateX(${offset}px)`;
    updateActiveCard();
  }

  function updateProgress() {
    const maxIndex = getMaxIndex();
    if (!progressEl) return;

    if (maxIndex <= 0) {
      progressEl.style.width = '100%';
      return;
    }

    progressEl.style.width = `${(currentIndex / maxIndex) * 100}%`;
  }

  function goToSlide(index, useTransition = true) {
    const maxIndex = getMaxIndex();
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    dragOffsetX = 0;
    updateTransform(useTransition);
    updateProgress();
  }

  function scheduleLayout() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const maxIndex = getMaxIndex();
        if (currentIndex > maxIndex) {
          currentIndex = maxIndex;
        }
        updateTransform(false);
        updateProgress();
      });
    });
  }

  function resetCarousel() {
    currentIndex = 0;
    dragOffsetX = 0;
    scheduleLayout();
  }

  function stopAutoScroll() {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer);
      autoScrollTimer = null;
    }
  }

  function startAutoScroll() {
    stopAutoScroll();
    if (isPaused) return;

    autoScrollTimer = setInterval(() => {
      const maxIndex = getMaxIndex();
      if (maxIndex <= 0) return;

      if (currentIndex >= maxIndex) {
        goToSlide(0);
      } else {
        goToSlide(currentIndex + 1);
      }
    }, 3000);
  }

  function updatePauseButton() {
    if (!pauseBtn) return;
    pauseBtn.classList.toggle('carousel-btn--paused', isPaused);
    pauseBtn.setAttribute(
      'aria-label',
      isPaused ? '자동 재생 재개' : '자동 재생 일시정지'
    );
  }

  function togglePause() {
    isPaused = !isPaused;
    updatePauseButton();

    if (isPaused) {
      stopAutoScroll();
    } else {
      startAutoScroll();
    }
  }

  function initSwipe() {
    if (!row) return;

    row.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      if (!getCards().length) return;

      isDragging = true;
      dragStartX = e.clientX;
      dragStartIndex = currentIndex;
      dragOffsetX = 0;
      row.classList.add('is-dragging');
      row.setPointerCapture(e.pointerId);
      stopAutoScroll();
    });

    row.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      dragOffsetX = e.clientX - dragStartX;
      updateTransform(false);
    });

    row.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      row.classList.remove('is-dragging');
      if (row.hasPointerCapture?.(e.pointerId)) {
        row.releasePointerCapture(e.pointerId);
      }

      const { cardWidth, gap } = syncMetrics();
      const threshold = (cardWidth + gap) * 0.2;

      if (dragOffsetX < -threshold) {
        goToSlide(dragStartIndex + 1);
      } else if (dragOffsetX > threshold) {
        goToSlide(dragStartIndex - 1);
      } else {
        goToSlide(currentIndex);
      }

      if (!isPaused) startAutoScroll();
    });

    row.addEventListener('pointercancel', () => {
      if (!isDragging) return;
      isDragging = false;
      row.classList.remove('is-dragging');
      dragOffsetX = 0;
      goToSlide(currentIndex);
    });
  }

  function render(shows, listName = '') {
    if (!row) return;

    row.innerHTML = '';

    if (listNameEl) {
      if (listName) {
        listNameEl.textContent = listName;
        listNameEl.hidden = false;
      } else {
        listNameEl.textContent = '';
        listNameEl.hidden = true;
      }
    }

    if (!shows.length) {
      const empty = document.createElement('p');
      empty.className = 'loading';
      empty.textContent = emptyMessage;
      row.appendChild(empty);
      updateProgress();
      return;
    }

    shows.forEach((item, index) => {
      row.appendChild(createCard(item, index));
    });

    resetCarousel();
    row.querySelectorAll('.movie-card__poster').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', scheduleLayout, { once: true });
    });

    isPaused = true;
    updatePauseButton();
    stopAutoScroll();
  }

  function showError(message) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  function bindControls() {
    prevBtn?.addEventListener('click', () => goToSlide(currentIndex - 1));
    nextBtn?.addEventListener('click', () => goToSlide(currentIndex + 1));
    pauseBtn?.addEventListener('click', togglePause);
  }

  function init() {
    initSwipe();
    updatePauseButton();
    bindControls();
  }

  return {
    init,
    render,
    showError,
    scheduleLayout,
    loadingEl,
    errorEl,
    row,
  };
}

const popularTvCarousel = createMainTvCarousel({
  row: document.getElementById('popular-tv-row'),
  viewport: document.getElementById('popular-tv-carousel-viewport'),
  loadingEl: document.getElementById('popular-tv-loading'),
  errorEl: document.getElementById('popular-tv-error'),
  progressEl: document.getElementById('popular-tv-carousel-progress'),
  prevBtn: document.getElementById('popular-tv-carousel-prev'),
  nextBtn: document.getElementById('popular-tv-carousel-next'),
  pauseBtn: document.getElementById('popular-tv-carousel-pause'),
});

const popularMoviesGrid = document.getElementById('popular-movies-grid');
const popularMoviesLoadingEl = document.getElementById('popular-movies-loading');
const popularMoviesErrorEl = document.getElementById('popular-movies-error');
const POPULAR_MOVIES_GRID_COUNT = 10;

const tvSeriesGrid = document.getElementById('tv-series-grid');
const tvSeriesLoadingEl = document.getElementById('tv-loading');
const tvSeriesErrorEl = document.getElementById('tv-error');
const TV_SERIES_GRID_COUNT = 10;

function renderPopularMoviesGrid(movies) {
  if (!popularMoviesGrid) return;

  popularMoviesGrid.innerHTML = '';
  const items = movies.slice(0, POPULAR_MOVIES_GRID_COUNT);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'tv-series-grid__empty';
    empty.textContent = '표시할 영화가 없습니다.';
    popularMoviesGrid.appendChild(empty);
    return;
  }

  items.forEach((movie, index) => {
    popularMoviesGrid.appendChild(createMovieCard(movie, index));
  });
}

function showPopularMoviesGridError(message) {
  if (popularMoviesLoadingEl) popularMoviesLoadingEl.hidden = true;
  if (popularMoviesErrorEl) {
    popularMoviesErrorEl.hidden = false;
    popularMoviesErrorEl.textContent = message;
  }
}

function renderTvSeriesGrid(shows) {
  if (!tvSeriesGrid) return;

  tvSeriesGrid.innerHTML = '';
  const items = shows.slice(0, TV_SERIES_GRID_COUNT);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'tv-series-grid__empty';
    empty.textContent = '표시할 TV 시리즈가 없습니다.';
    tvSeriesGrid.appendChild(empty);
    return;
  }

  items.forEach((show) => {
    tvSeriesGrid.appendChild(createTvSeriesCard(show));
  });
}

function showTvSeriesGridError(message) {
  if (tvSeriesLoadingEl) tvSeriesLoadingEl.hidden = true;
  if (tvSeriesErrorEl) {
    tvSeriesErrorEl.hidden = false;
    tvSeriesErrorEl.textContent = message;
  }
}

async function fetchPopularMovies() {
  if (!popularMoviesGrid) return;

  try {
    if (popularMoviesLoadingEl) {
      popularMoviesGrid.innerHTML = '';
      popularMoviesGrid.appendChild(popularMoviesLoadingEl);
      popularMoviesLoadingEl.hidden = false;
    }
    if (popularMoviesErrorEl) popularMoviesErrorEl.hidden = true;

    const response = await fetch(
      `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) throw new Error(`인기 영화 조회 실패 (${response.status})`);

    const data = await response.json();
    renderPopularMoviesGrid(data.results || []);
  } catch (err) {
    showPopularMoviesGridError(`인기 영화를 불러오지 못했습니다. ${err.message}`);
  }
}

async function fetchPopularTvSeries() {
  if (!popularTvCarousel.row) return;

  try {
    if (popularTvCarousel.loadingEl) {
      popularTvCarousel.row.innerHTML = '';
      popularTvCarousel.row.appendChild(popularTvCarousel.loadingEl);
      popularTvCarousel.loadingEl.hidden = false;
    }
    if (popularTvCarousel.errorEl) popularTvCarousel.errorEl.hidden = true;

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) throw new Error(`인기 TV 조회 실패 (${response.status})`);

    const data = await response.json();
    popularTvCarousel.render(data.results || []);
  } catch (err) {
    popularTvCarousel.showError(`인기 TV 시리즈를 불러오지 못했습니다. ${err.message}`);
  }
}

async function fetchTvSeriesGrid() {
  if (!tvSeriesGrid) return;

  try {
    if (tvSeriesLoadingEl) {
      tvSeriesGrid.innerHTML = '';
      tvSeriesGrid.appendChild(tvSeriesLoadingEl);
      tvSeriesLoadingEl.hidden = false;
    }
    if (tvSeriesErrorEl) tvSeriesErrorEl.hidden = true;

    const response = await fetch(
      `https://api.themoviedb.org/3/tv/on_the_air?api_key=${API_KEY}&language=ko-KR&page=1`
    );
    if (!response.ok) throw new Error(`TV 시리즈 조회 실패 (${response.status})`);

    const data = await response.json();
    renderTvSeriesGrid(data.results || []);
  } catch (err) {
    showTvSeriesGridError(`TV 시리즈를 불러오지 못했습니다. ${err.message}`);
  }
}

initCarouselSwipe();
updatePauseButton();
popularTvCarousel.init();
window.addEventListener('resize', () => {
  scheduleCarouselLayout();
  popularTvCarousel.scheduleLayout();
});
initEventGrid();
initIndexNavMegaMenu();
initMobileMenu();
fetchMovies();
fetchPopularMovies();
fetchPopularTvSeries();
fetchTvSeriesGrid();
