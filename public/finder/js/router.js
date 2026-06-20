/* global window, document */
'use strict';

const Router = (() => {
  const routes = {};
  let current = null;

  function register(name, def) {
    routes[name] = def;
  }

  function go(hash) {
    if (window.location.hash === hash) {
      render();
    } else {
      window.location.hash = hash;
    }
  }

  function parseHash() {
    const raw = window.location.hash || '#/dashboard';
    const [path, query = ''] = raw.replace(/^#/, '').split('?');
    const segments = path.split('/').filter(Boolean);
    const route = segments[0] || 'dashboard';
    const id = segments[1] || null;
    const params = new URLSearchParams(query);
    return { route, id, params };
  }

  function setActiveNav(name) {
    document.querySelectorAll('#nav .nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.route === name);
    });
  }

  function setPageTitle(title, subtitle) {
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle || '';
  }

  async function render() {
    if (!window.Auth || !window.Auth.isLogged()) {
      window.Auth?.showLogin();
      return;
    }
    window.Auth.showApp();
    window.FinderNav?.closeSidebar?.();

    const { route, id, params } = parseHash();
    const def = routes[route] || routes.dashboard;
    setActiveNav(def.navKey || route);
    setPageTitle(def.title || 'Azulli Finder', def.subtitle || '');

    const content = document.getElementById('page-content');
    content.innerHTML = window.UI.loadingHTML();

    if (current && current.destroy) {
      try { current.destroy(); } catch { /* ignore */ }
    }
    current = null;

    try {
      const instance = await def.render({ id, params, container: content });
      current = instance || null;
    } catch (err) {
      console.error('[router] erro ao renderizar', err);
      content.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">Erro: ${err.message}</div>`;
    }
  }

  function start() {
    window.addEventListener('hashchange', render);
    if (!window.location.hash) window.location.hash = '#/dashboard';
    render();
  }

  return { register, go, start, parseHash };
})();

window.Router = Router;
