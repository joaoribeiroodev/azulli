/* global window, document */
'use strict';

const UI = (() => {
  const toastContainer = () => document.getElementById('toast-container');
  const modalRoot = () => document.getElementById('modal-root');

  function toast(msg, type = 'info', timeoutMs = 4000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success: '✓', error: '✕', warn: '!', info: 'i' };
    el.innerHTML = `
      <div class="w-5 h-5 rounded-full bg-[var(--muted-bg)] text-[var(--foreground)] text-xs font-bold flex items-center justify-center flex-shrink-0">${icons[type] || 'i'}</div>
      <div class="text-sm text-[var(--foreground)] flex-1">${escapeHtml(msg)}</div>
      <button class="text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Fechar">×</button>
    `;
    el.querySelector('button').addEventListener('click', () => el.remove());
    toastContainer().appendChild(el);
    if (timeoutMs > 0) setTimeout(() => el.remove(), timeoutMs);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function badgeScore(score) {
    if (score == null) return `<span class="score-badge score-low" title="Sem score">—</span>`;
    let cls = 'score-low';
    if (score >= 80) cls = 'score-elite';
    else if (score >= 60) cls = 'score-high';
    else if (score >= 40) cls = 'score-mid';
    return `<span class="score-badge ${cls}">${score}</span>`;
  }

  const STATUS_LABEL = {
    novo: 'Novo',
    qualificado: 'Qualificado',
    contatado: 'Contatado',
    em_negociacao: 'Em negociação',
    assinante: 'Assinante',
    descartado: 'Descartado'
  };

  function badgeStatus(status) {
    const label = STATUS_LABEL[status] || status;
    return `<span class="status-pill status-${status}">${label}</span>`;
  }

  function fmtDate(dt) {
    if (!dt) return '—';
    try {
      const d = new Date(dt);
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch { return '—'; }
  }

  function fmtPhone(t) {
    if (!t) return '—';
    const d = String(t).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return t;
  }

  function whatsappLink(t) {
    if (!t) return null;
    const d = String(t).replace(/\D/g, '');
    if (!d) return null;
    const intl = d.startsWith('55') ? d : `55${d}`;
    return `https://wa.me/${intl}`;
  }

  function mapsSearchLink(lead) {
    const q = encodeURIComponent(`${lead.nome || ''} ${lead.endereco || ''}`.trim());
    return `https://www.google.com/maps/search/${q}`;
  }

  // ---- Modal ----
  function openModal(html, { onClose } = {}) {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = `<div class="modal-card">${html}</div>`;
    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
    function close() {
      back.remove();
      if (onClose) onClose();
    }
    modalRoot().appendChild(back);
    return { root: back.querySelector('.modal-card'), close };
  }

  function confirm({ titulo, mensagem, confirmar = 'Confirmar', cancelar = 'Cancelar', perigo = false }) {
    return new Promise((resolve) => {
      const { root, close } = openModal(`
        <div class="px-6 py-5 border-b border-[var(--border)]">
          <h3 class="text-lg font-display font-bold text-[var(--foreground)]">${escapeHtml(titulo)}</h3>
        </div>
        <div class="px-6 py-5 text-sm text-[var(--muted)]">${escapeHtml(mensagem)}</div>
        <div class="px-6 py-4 bg-[var(--muted-bg)] flex flex-col-reverse sm:flex-row sm:justify-end gap-2 rounded-b-2xl">
          <button class="btn-secondary" data-cancel>${escapeHtml(cancelar)}</button>
          <button class="${perigo ? 'btn-danger' : 'btn-primary'}" data-ok>${escapeHtml(confirmar)}</button>
        </div>
      `);
      root.querySelector('[data-cancel]').addEventListener('click', () => { close(); resolve(false); });
      root.querySelector('[data-ok]').addEventListener('click', () => { close(); resolve(true); });
    });
  }

  // ---- Loading helpers ----
  function loadingHTML(label = 'Carregando…') {
    return `
      <div class="flex flex-col items-center justify-center py-16 text-[var(--muted)] gap-3">
        <div class="loader loader-lg"></div>
        <div class="text-sm">${escapeHtml(label)}</div>
      </div>`;
  }

  function emptyHTML({ titulo, descricao, icone = '🔍' }) {
    return `
      <div class="flex flex-col items-center justify-center py-16 text-center px-4">
        <div class="text-4xl mb-3">${icone}</div>
        <div class="text-base font-semibold text-[var(--foreground)] mb-1">${escapeHtml(titulo)}</div>
        <div class="text-sm text-[var(--muted)] max-w-md">${escapeHtml(descricao)}</div>
      </div>`;
  }

  return {
    toast,
    escapeHtml,
    badgeScore,
    badgeStatus,
    STATUS_LABEL,
    fmtDate,
    fmtPhone,
    whatsappLink,
    mapsSearchLink,
    openModal,
    confirm,
    loadingHTML,
    emptyHTML
  };
})();

window.UI = UI;
