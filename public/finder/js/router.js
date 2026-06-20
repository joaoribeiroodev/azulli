/* global window, document */
'use strict';

const Router = (() => {
  const routes = {};
  let current = null;
  const loadedScripts = new Set();

  const PAGE_SCRIPTS = {
    dashboard: '/finder/js/pages/dashboard.js',
    buscar: '/finder/js/pages/buscar.js',
    leads: '/finder/js/pages/leads.js',
    kanban: '/finder/js/pages/kanban.js',
    historico: '/finder/js/pages/historico.js',
    equipe: '/finder/js/pages/equipe.js',
  };

  function register(name, def) {
    routes[name] = def;
  }

  function parseTarget(target) {
    const clean = String(target || '').replace(/^#\/?/, '').replace(/^\//, '');
    const [pathPart, query = ''] = clean.split('?');
    const segments = pathPart.split('/').filter(Boolean);
    return {
      route: segments[0] || 'dashboard',
      id: segments[1] || null,
      query,
    };
  }

  function go(target) {
    const { route, id, query } = parseTarget(target);
    if (window.__FINDER_NAV__) {
      const path = id ? `${route}/${id}` : route;
      window.__FINDER_NAV__.go(query ? `${path}?${query}` : path);
      return;
    }
    const hashPath = id ? `#/${route}/${id}` : `#/${route}`;
    const hash = query ? `${hashPath}?${query}` : hashPath;
    if (window.location.hash === hash) {
      render();
    } else {
      window.location.hash = hash;
    }
  }

  function parseHash() {
    if (window.__FINDER_NEXT_ROUTES__) {
      const match = window.location.pathname.match(/^\/finder\/([^/]+)(?:\/([^/]+))?/);
      const route = match?.[1] || 'dashboard';
      const id = match?.[2] || null;
      const params = new URLSearchParams(window.location.search);
      return { route, id, params };
    }

    const raw = window.location.hash || '#/dashboard';
    const [path, query = ''] = raw.replace(/^#/, '').split('?');
    const segments = path.split('/').filter(Boolean);
    const route = segments[0] || 'dashboard';
    const id = segments[1] || null;
    const params = new URLSearchParams(query);
    return { route, id, params };
  }

  function loadScript(src) {
    if (loadedScripts.has(src)) return Promise.resolve();
    const existing = document.querySelector(`script[data-page-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded) {
        loadedScripts.add(src);
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
      });
    }
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.defer = true;
      el.dataset.pageSrc = src;
      el.onload = () => {
        el.dataset.loaded = '1';
        loadedScripts.add(src);
        resolve();
      };
      el.onerror = reject;
      document.body.appendChild(el);
    });
  }

  async function ensureRouteModules(route, id) {
    const scripts = [];
    if (PAGE_SCRIPTS[route]) scripts.push(PAGE_SCRIPTS[route]);
    if (route === 'leads' && id) scripts.push('/finder/js/pages/lead-detail.js');
    for (const src of scripts) {
      await loadScript(src);
    }
  }

  function bindHashLinks() {
    if (!window.__FINDER_NEXT_ROUTES__) return;
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#/"]');
      if (!anchor) return;
      e.preventDefault();
      go(anchor.getAttribute('href'));
    });
  }

  function setActiveNav(name) {
    document.querySelectorAll('#nav .nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === name);
    });
  }

  function setPageTitle(title, subtitle) {
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    const mobileTitleEl = document.getElementById('page-title-mobile');
    const mobileSubtitleEl = document.getElementById('page-subtitle-mobile');
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle || '';
    if (mobileTitleEl) mobileTitleEl.textContent = title;
    if (mobileSubtitleEl) {
      mobileSubtitleEl.textContent = subtitle || '';
      mobileSubtitleEl.classList.toggle('hidden', !subtitle);
    }
  }

  async function renderInto({ route, id, params, container }) {
    await ensureRouteModules(route, id);

    const def = routes[route] || routes.dashboard;
    if (!def) return;

    setActiveNav(def.navKey || route);
    setPageTitle(def.title || 'Azulli Finder', def.subtitle || '');

    container.innerHTML = window.UI.loadingHTML();

    if (current && current.destroy) {
      try { current.destroy(); } catch { /* ignore */ }
    }
    current = null;

    try {
      const instance = await def.render({ id, params, container });
      current = instance || null;
    } catch (err) {
      console.error('[router] erro ao renderizar', err);
      container.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">Erro: ${err.message}</div>`;
    }
  }

  async function renderPage(ctx) {
    return renderInto(ctx);
  }

  async function render() {
    if (!window.Auth || !window.Auth.isLogged()) {
      window.Auth?.showLogin();
      return;
    }
    window.Auth.showApp();
    window.FinderNav?.closeSidebar?.();

    const { route, id, params } = parseHash();
    const content = document.getElementById('page-content');
    if (!content) return;

    await renderInto({ route, id, params, container: content });
  }

  function start() {
    bindHashLinks();
    window.addEventListener('hashchange', render);
    if (!window.location.hash && !window.__FINDER_NEXT_ROUTES__) {
      window.location.hash = '#/dashboard';
    }
    render();
  }

  return { register, go, start, parseHash, renderPage, bindHashLinks };
})();

window.Router = Router;
