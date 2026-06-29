async function loadLayout(activeNav, basePath = '') {
  const headerTarget = document.getElementById('site-header');
  const footerTarget = document.getElementById('site-footer');

  const [headerRes, footerRes] = await Promise.all([
    fetch(`${basePath}partials/header.html`),
    fetch(`${basePath}partials/footer.html`),
  ]);

  const applyBase = (html) => html.replace(/\{\{BASE\}\}/g, basePath);

  if (headerTarget && headerRes.ok) {
    headerTarget.innerHTML = applyBase(await headerRes.text());
  }

  if (footerTarget && footerRes.ok) {
    footerTarget.innerHTML = applyBase(await footerRes.text());
  }

  if (activeNav) {
    document.querySelectorAll(`[data-nav="${activeNav}"]`).forEach((el) => {
      if (el.classList.contains('index-nav__link')) {
        el.classList.add('index-nav__link--active');
      } else {
        el.classList.add('footer-nav--active');
      }
    });
  }

  initHeaderSearch(basePath);
  initNavMegaMenu();
  initMobileMenu();
}

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('mobile-nav');
  const backdrop = document.getElementById('mobile-nav-backdrop');
  if (!toggle || !nav) return;

  const openMenu = () => {
    nav.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '메뉴 닫기');
    document.body.classList.add('mobile-nav-open');
  };

  const closeMenu = () => {
    nav.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '메뉴 열기');
    document.body.classList.remove('mobile-nav-open');
  };

  toggle.addEventListener('click', () => {
    if (nav.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  backdrop?.addEventListener('click', closeMenu);

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !nav.hidden) closeMenu();
  });
}

function initNavMegaMenu() {
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

function initHeaderSearch(basePath) {
  const form = document.getElementById('header-search-form');
  const input = document.getElementById('header-search-input');

  if (!form || !input) return;

  const searchQuery = new URLSearchParams(window.location.search).get('search');
  if (searchQuery) {
    input.value = searchQuery;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    window.location.href = `${basePath}movies/movies.html?search=${encodeURIComponent(query)}`;
  });
}
