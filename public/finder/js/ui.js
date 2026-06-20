/* global window, document, XLSX */
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

  function exportLeadsExcel(leads, { filenamePrefix = 'Azulli_Prospects' } = {}) {
    if (!leads || leads.length === 0) {
      toast('Nenhum lead para exportar.', 'warn');
      return;
    }
    if (typeof XLSX === 'undefined') {
      toast('Biblioteca Excel não carregada.', 'error');
      return;
    }

    const dados = leads.map((l, i) => ({
      '#': i + 1,
      'Negócio': l.nome || '',
      'Segmento': l.segmento || '',
      'Porte': l.porte || '',
      'Telefone': l.telefone || '',
      'WhatsApp': l.whatsapp || '',
      'E-mail': l.email || '',
      'Endereço': l.endereco || '',
      'Cidade': l.cidade || '',
      'UF': l.uf || '',
      'Avaliação Google': l.avaliacao ?? '',
      'ICP score': l.icp_score ?? '',
      'Status': STATUS_LABEL[l.status] || l.status || '',
      'Responsável': l.responsavel_nome || '',
      'Website': l.website || '',
      'Maps': l.maps_url || '',
      'Data prospecção': fmtDate(l.created_at)
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    ws['!cols'] = [
      { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 24 }, { wch: 38 }, { wch: 18 }, { wch: 4 }, { wch: 12 }, { wch: 8 },
      { wch: 14 }, { wch: 18 }, { wch: 24 }, { wch: 28 }, { wch: 18 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(wb, `${filenamePrefix}_${stamp}.xlsx`);
    toast(`${leads.length} lead(s) exportado(s) para Excel.`, 'success');
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

  function parsePitchStored(stored) {
    if (!stored || typeof stored !== 'string') return null;
    const trimmed = stored.trim();
    if (!trimmed) return null;
    if (!trimmed.startsWith('{')) {
      return { v: 1, legacy: true, canal: 'whatsapp', mensagem: trimmed, corpo: trimmed };
    }
    try { return JSON.parse(trimmed); }
    catch { return { v: 1, legacy: true, canal: 'whatsapp', mensagem: trimmed, corpo: trimmed }; }
  }

  function getPitchCopyText(stored, canal = 'whatsapp', variant = 'default') {
    const parsed = parsePitchStored(stored);
    if (!parsed) return '';
    if (canal === 'email') {
      if (parsed.assunto && parsed.corpo) return `Assunto: ${parsed.assunto}\n\n${parsed.corpo}`;
      return parsed.corpo || parsed.mensagem || stored;
    }
    if (variant === 'pos_optin' && parsed.mensagem_pos_optin) return parsed.mensagem_pos_optin;
    if (variant === 'follow_up' && parsed.follow_up) return parsed.follow_up;
    return parsed.mensagem || parsed.corpo || stored;
  }

  function pitchSection(label, value) {
    if (!value) return '';
    return `
      <div class="pitch-section">
        <div class="pitch-section-label">${escapeHtml(label)}</div>
        <div class="pitch-section-body">${escapeHtml(value)}</div>
      </div>`;
  }

  function pitchList(label, items) {
    if (!items || !items.length) return '';
    const lis = items.map((item) => {
      if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
      if (item && item.objecao) {
        return `<li><strong>${escapeHtml(item.objecao)}</strong><br><span class="text-[var(--muted)]">${escapeHtml(item.resposta || '')}</span></li>`;
      }
      return '';
    }).filter(Boolean).join('');
    if (!lis) return '';
    return `
      <div class="pitch-section">
        <div class="pitch-section-label">${escapeHtml(label)}</div>
        <ul class="pitch-list">${lis}</ul>
      </div>`;
  }

  function renderPitchContent(canal, stored) {
    const parsed = parsePitchStored(stored);
    if (!parsed) {
      return `<div class="pitch-empty">Ainda não gerado. Clique em "Regerar" para criar materiais personalizados.</div>`;
    }

    if (parsed.legacy) {
      return `<div class="pitch-message">${escapeHtml(parsed.mensagem || parsed.corpo || '')}</div>`;
    }

    if (canal === 'email') {
      const assuntoAlt = parsed.assunto_alternativo
        ? `<div class="text-xs text-[var(--muted)] mt-1">Alternativo: ${escapeHtml(parsed.assunto_alternativo)}</div>`
        : '';
      return `
        <div class="pitch-block">
          <div class="pitch-block-label">Assunto</div>
          <div class="pitch-message pitch-message-compact">${escapeHtml(parsed.assunto || '—')}</div>
          ${assuntoAlt}
        </div>
        <div class="pitch-block mt-4">
          <div class="pitch-block-label">E-mail pronto para enviar</div>
          <div class="pitch-message">${escapeHtml(parsed.corpo || '')}</div>
        </div>
        ${parsed.estrutura ? `
          <details class="pitch-details mt-4">
            <summary>Estrutura da mensagem</summary>
            <div class="pitch-details-body">
              ${pitchSection('Abertura', parsed.estrutura.abertura)}
              ${pitchSection('Contexto', parsed.estrutura.contexto)}
              ${pitchSection('Problema', parsed.estrutura.problema)}
              ${pitchSection('Solução', parsed.estrutura.solucao)}
              ${pitchList('Benefícios', parsed.estrutura.beneficios)}
              ${pitchSection('CTA', parsed.estrutura.cta)}
            </div>
          </details>` : ''}
        ${parsed.personalizacao_usada && parsed.personalizacao_usada.length ? `
          <div class="pitch-block mt-4">
            <div class="pitch-block-label">Personalização usada</div>
            <ul class="pitch-list">${parsed.personalizacao_usada.map((g) => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
          </div>` : ''}`;
    }

    return `
      <div class="pitch-compliance mb-4">
        <div class="pitch-compliance-title">Conformidade Meta / WhatsApp Business</div>
        <p class="pitch-compliance-text">1º contato sem pitch comercial. Envie a proposta completa só após resposta positiva do lead.</p>
      </div>
      <div class="pitch-block">
        <div class="pitch-block-label">1º contato (antes do opt-in)</div>
        <div class="pitch-message">${escapeHtml(parsed.mensagem || '')}</div>
      </div>
      ${parsed.mensagem_pos_optin ? `
        <div class="pitch-block mt-4">
          <div class="pitch-block-label">Após resposta positiva (opt-in)</div>
          <div class="pitch-message">${escapeHtml(parsed.mensagem_pos_optin)}</div>
        </div>` : ''}
      ${parsed.estrutura ? `
        <details class="pitch-details mt-4" open>
          <summary>Estrutura da abordagem</summary>
          <div class="pitch-details-body">
            ${pitchSection('Gancho personalizado', parsed.estrutura.gancho)}
            ${pitchSection('Contexto do contato', parsed.estrutura.contexto || parsed.estrutura.dor)}
            ${pitchSection('Pedido de permissão', parsed.estrutura.permissao || parsed.estrutura.beneficio)}
            ${pitchSection('Opt-out', parsed.estrutura.opt_out || parsed.estrutura.cta)}
          </div>
        </details>` : ''}
      ${parsed.personalizacao_usada && parsed.personalizacao_usada.length ? `
        <div class="pitch-block mt-4">
          <div class="pitch-block-label">Personalização usada (dados captados)</div>
          <ul class="pitch-list">${parsed.personalizacao_usada.map((g) => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
        </div>` : ''}
      ${parsed.follow_up ? `
        <div class="pitch-block mt-4">
          <div class="pitch-block-label">Follow-up leve (máx. 1x, sem pitch repetido)</div>
          <div class="pitch-message pitch-message-compact">${escapeHtml(parsed.follow_up)}</div>
        </div>` : ''}
      ${parsed.conformidade_meta && parsed.conformidade_meta.observacao ? `
        <div class="pitch-block mt-4">
          <div class="pitch-block-label">Observação Meta</div>
          <div class="pitch-section-body">${escapeHtml(parsed.conformidade_meta.observacao)}</div>
        </div>` : ''}
      ${pitchList('Objeções e respostas', parsed.objecoes)}
      ${pitchList('Dicas para o vendedor', parsed.dicas_vendedor)}`;
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
    exportLeadsExcel,
    openModal,
    confirm,
    loadingHTML,
    emptyHTML,
    parsePitchStored,
    getPitchCopyText,
    renderPitchContent
  };
})();

window.UI = UI;
