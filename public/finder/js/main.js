/* global window, document, API, Auth, Router, UI, Theme */
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  Theme.init();
  initMobileNav();
  Auth.bindLoginForm();
  Auth.bindLogout();

  const ok = await Auth.ensureSession();
  if (ok) {
    Router.start();
    loadAppConfig();
  }
});

function initMobileNav() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('sidebar-toggle');
  const closeBtn = document.getElementById('sidebar-close');

  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  toggle?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  window.FinderNav = { closeSidebar };
}

async function loadAppConfig() {
  try {
    const cfg = await API.config();
    const adminUrl = cfg.urls?.admin;
    const nav = document.getElementById('nav');
    if (adminUrl && nav && !document.getElementById('nav-admin-link')) {
      const a = document.createElement('a');
      a.id = 'nav-admin-link';
      a.href = adminUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'nav-item';
      a.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        <span>Admin Azulli</span>`;
      nav.appendChild(a);
    }
    window.__FINDER_PLANS = cfg.plans || [];

    const chip = document.getElementById('ai-status');
    if (chip) {
      chip.classList.remove('hidden');
      chip.innerHTML = cfg.ai
        ? '<span class="w-1.5 h-1.5 rounded-full bg-azulli-500"></span> IA: ON'
        : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> IA: OFF';
    }
  } catch (_e) {
    /* ignore */
  }
}
