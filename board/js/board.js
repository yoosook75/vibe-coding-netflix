const boardList = document.getElementById('board-list');
const boardTotal = document.getElementById('board-total');
const boardEmpty = document.getElementById('board-empty');
const boardPagination = document.getElementById('board-pagination');
const searchForm = document.getElementById('board-search-form');
const searchInput = document.getElementById('board-search-input');
const perPageSelect = document.getElementById('board-per-page');

let currentPage = 1;
let perPage = 10;
let searchQuery = '';
let filteredNotices = sortNotices(NOTICE_LIST);

const PIN_ICON = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 3v2h2v2h-2v2l-5 5v6l-2 2v1h8v-1l-2-2v-6l-5-5V7h2V5h-2V3h-4z"></path>
  </svg>
`;

const ATTACH_ICON = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
`;

function filterNotices() {
  const query = searchQuery.trim().toLowerCase();
  if (!query) {
    filteredNotices = sortNotices(NOTICE_LIST);
    return;
  }

  filteredNotices = sortNotices(
    NOTICE_LIST.filter((item) => item.title.toLowerCase().includes(query))
  );
}

function getTotalPages() {
  return Math.max(1, Math.ceil(filteredNotices.length / perPage));
}

function getPageItems() {
  const start = (currentPage - 1) * perPage;
  return filteredNotices.slice(start, start + perPage);
}

function createBoardItem(notice, displayIndex) {
  const li = document.createElement('li');
  li.className = 'board-item';

  const link = document.createElement('a');
  link.className = 'board-item__link';
  link.href = `detail.html?id=${notice.id}`;

  const indexCell = document.createElement('div');
  indexCell.className = notice.pinned ? 'board-item__pin' : 'board-item__index';
  indexCell.innerHTML = notice.pinned
    ? PIN_ICON
    : String(displayIndex);
  if (notice.pinned) {
    indexCell.setAttribute('aria-label', '고정 공지');
  }

  const titleWrap = document.createElement('div');
  titleWrap.className = 'board-item__title-wrap';

  const title = document.createElement('span');
  title.className = 'board-item__title';
  title.textContent = notice.title;

  titleWrap.appendChild(title);

  if (notice.hasAttachment) {
    const attach = document.createElement('span');
    attach.className = 'board-item__attach';
    attach.setAttribute('aria-label', '첨부파일');
    attach.innerHTML = ATTACH_ICON;
    titleWrap.appendChild(attach);
  }

  const date = document.createElement('time');
  date.className = 'board-item__date';
  date.dateTime = notice.date.replace(/\./g, '-');
  date.textContent = notice.date;

  link.appendChild(indexCell);
  link.appendChild(titleWrap);
  link.appendChild(date);
  li.appendChild(link);

  return li;
}

function renderList() {
  boardList.innerHTML = '';
  const items = getPageItems();

  boardTotal.textContent = `총 ${filteredNotices.length}건`;

  if (items.length === 0) {
    boardEmpty.hidden = false;
    boardPagination.hidden = true;
    return;
  }

  boardEmpty.hidden = true;

  items.forEach((notice) => {
    const displayIndex = notice.pinned ? '' : notice.id;
    boardList.appendChild(createBoardItem(notice, displayIndex));
  });
}

function renderPagination() {
  const totalPages = getTotalPages();
  boardPagination.innerHTML = '';

  if (totalPages <= 1) {
    boardPagination.hidden = true;
    return;
  }

  boardPagination.hidden = false;

  for (let page = 1; page <= totalPages; page += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `board-pagination__btn${page === currentPage ? ' board-pagination__btn--active' : ''}`;
    btn.textContent = String(page);
    btn.setAttribute('aria-label', `${page}페이지`);
    if (page === currentPage) {
      btn.setAttribute('aria-current', 'page');
    }
    btn.addEventListener('click', () => {
      currentPage = page;
      renderList();
      renderPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    boardPagination.appendChild(btn);
  }
}

function refresh() {
  filterNotices();
  const totalPages = getTotalPages();
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  renderList();
  renderPagination();
}

searchForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  searchQuery = searchInput.value;
  currentPage = 1;
  refresh();
});

searchInput?.addEventListener('input', () => {
  if (!searchInput.value) {
    searchQuery = '';
    currentPage = 1;
    refresh();
  }
});

perPageSelect?.addEventListener('change', () => {
  perPage = Number(perPageSelect.value);
  currentPage = 1;
  refresh();
});

async function init() {
  await loadLayout('community', '../');
  refresh();
}

init();
