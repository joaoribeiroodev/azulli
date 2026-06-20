/* global window, document, localStorage */
'use strict';

const Theme = (() => {
  const STORAGE_KEY = 'finder-theme';

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(mode) {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.dataset.theme = mode;
    root.style.colorScheme = mode;

    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.textContent = mode === 'dark' ? '☀️' : '🌙';
    });
    document.querySelectorAll('[data-theme-label]').forEach((el) => {
      el.textContent = mode === 'dark' ? 'Modo claro' : 'Modo escuro';
    });
  }

  function set(mode) {
    localStorage.setItem(STORAGE_KEY, mode);
    apply(mode);
  }

  function toggle() {
    set(getPreferred() === 'dark' ? 'light' : 'dark');
  }

  function bindControls() {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', toggle);
    });
  }

  function init() {
    apply(getPreferred());
    bindControls();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? 'dark' : 'light');
    });
  }

  return { init, toggle, set, get: getPreferred };
})();

window.Theme = Theme;
