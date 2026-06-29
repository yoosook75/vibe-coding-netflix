const detailMain = document.getElementById('board-detail-main');
const detailError = document.getElementById('board-detail-error');
const breadcrumbTitle = document.getElementById('breadcrumb-title');
const categoryEl = document.getElementById('board-category');
const titleEl = document.getElementById('board-title');
const metaEl = document.getElementById('board-meta');
const posterEl = document.getElementById('board-poster');
const posterWrap = document.getElementById('board-poster-wrap');
const bodyEl = document.getElementById('board-body');
const prevLink = document.getElementById('board-prev');
const nextLink = document.getElementById('board-next');
const prevTitle = document.getElementById('board-prev-title');
const nextTitle = document.getElementById('board-next-title');
const listBtn = document.getElementById('board-list-btn');

const notices = sortNotices(NOTICE_LIST);

function getNoticeId() {
  const id = Number(new URLSearchParams(window.location.search).get('id'));
  return Number.isFinite(id) ? id : null;
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

function renderBody(notice) {
  bodyEl.innerHTML = '';

  (notice.paragraphs || []).forEach((text) => {
    const p = document.createElement('p');
    p.className = 'board-detail__paragraph';
    p.textContent = text;
    bodyEl.appendChild(p);
  });
}

function renderAdjacentNav(index) {
  const prev = notices[index - 1];
  const next = notices[index + 1];

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

function renderNotice(notice, index) {
  document.title = `YSCine - ${notice.title}`;
  breadcrumbTitle.textContent = notice.title;
  titleEl.textContent = notice.title;

  if (notice.pinned) {
    categoryEl.hidden = false;
  } else {
    categoryEl.hidden = true;
  }

  metaEl.innerHTML = '';
  const date = document.createElement('span');
  date.textContent = notice.date;
  metaEl.appendChild(date);

  const sep = document.createElement('span');
  sep.className = 'board-detail__meta-sep';
  sep.textContent = '|';
  sep.setAttribute('aria-hidden', 'true');
  metaEl.appendChild(sep);

  const views = document.createElement('span');
  views.textContent = `조회수 ${notice.views ?? 0}`;
  metaEl.appendChild(views);

  renderPoster(notice.imageUrl, notice.title);
  renderBody(notice);
  renderAdjacentNav(index);

  listBtn.href = 'list.html';

  detailMain.hidden = false;
  detailError.hidden = true;
}

async function init() {
  await loadLayout('community', '../');

  const id = getNoticeId();
  const index = notices.findIndex((item) => item.id === id);

  if (index < 0) {
    showError();
    return;
  }

  renderNotice(notices[index], index);
}

init();
