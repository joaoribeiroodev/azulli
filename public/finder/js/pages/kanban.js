/* global window, document, API, UI, Router */
'use strict';

(() => {

Router.register('kanban', {
  navKey: 'kanban',
  title: 'Pipeline (Kanban)',
  subtitle: 'Arraste leads entre as etapas do pipeline comercial',
  async render({ container }) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <input id="k-q" class="input flex-1 min-w-[200px]" placeholder="Filtrar por nome…" />
        <input id="k-uf" maxlength="2" class="input uppercase" style="width:80px" placeholder="UF" />
        <div class="flex items-center gap-2 text-xs text-slate-600">
          ICP ≥ <input id="k-score" type="number" min="0" max="100" step="5" class="input" style="width:90px" placeholder="0" />
        </div>
        <button id="k-aplicar" class="btn-primary">Aplicar</button>
        <span id="k-status" class="text-xs text-slate-500"></span>
      </div>

      <div id="k-board" class="kanban-board"></div>
    `;

    const apply = () => carregarBoard();
    document.getElementById('k-aplicar').addEventListener('click', apply);
    document.getElementById('k-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });

    await carregarBoard();
  }
});

const COLUMNS = [
  { id: 'novo',           label: 'Novo' },
  { id: 'qualificado',    label: 'Qualificado' },
  { id: 'contatado',      label: 'Contatado' },
  { id: 'em_negociacao',  label: 'Em negociação' },
  { id: 'assinante',      label: 'Assinante' },
  { id: 'descartado',     label: 'Descartado' }
];

async function carregarBoard() {
  const board = document.getElementById('k-board');
  board.innerHTML = UI.loadingHTML();

  const filtros = {
    q: document.getElementById('k-q').value.trim(),
    uf: document.getElementById('k-uf').value.trim().toUpperCase(),
    scoreMin: document.getElementById('k-score').value.trim(),
    limit: 200
  };

  try {
    const { leads, total } = await API.leads.list(filtros);
    document.getElementById('k-status').textContent = `${leads.length} de ${total} leads carregados`;

    const grouped = Object.fromEntries(COLUMNS.map((c) => [c.id, []]));
    leads.forEach((l) => grouped[l.status]?.push(l));

    board.innerHTML = COLUMNS.map((c) => columnHTML(c, grouped[c.id])).join('');
    wireDnd();
  } catch (err) {
    board.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm col-span-6">${UI.escapeHtml(err.message)}</div>`;
  }
}

function columnHTML(col, leads) {
  const cardsHtml = (leads || []).map(cardHTML).join('');
  return `
    <div class="kanban-column" data-status="${col.id}">
      <div class="kanban-column-header">
        <div class="flex items-center gap-2">
          ${UI.badgeStatus(col.id)}
          <span class="text-slate-700">${col.label}</span>
        </div>
        <span class="text-xs font-semibold text-slate-500">${leads.length}</span>
      </div>
      <div class="kanban-cards space-y-2">${cardsHtml || '<div class="text-xs text-slate-400 text-center py-4">vazio</div>'}</div>
    </div>
  `;
}

function cardHTML(lead) {
  return `
    <div class="kanban-card" draggable="true" data-id="${lead.id}">
      <div class="flex items-center justify-between gap-2 mb-1">
        ${UI.badgeScore(lead.icp_score)}
        ${lead.segmento ? `<span class="text-[10px] text-slate-500 capitalize">${UI.escapeHtml(lead.segmento)}</span>` : ''}
      </div>
      <a href="#/leads/${lead.id}" class="block font-semibold text-sm text-slate-900 hover:text-azulli-700 leading-tight">${UI.escapeHtml(lead.nome)}</a>
      <div class="text-xs text-slate-500 mt-1 truncate">
        ${UI.escapeHtml(lead.cidade || '')}${lead.uf ? '/' + lead.uf : ''}
      </div>
      <div class="flex items-center justify-between mt-2 text-xs">
        <span class="text-slate-500">${lead.telefone ? UI.fmtPhone(lead.telefone) : '—'}</span>
        <span class="text-slate-400 text-[10px]">${UI.fmtDate(lead.updated_at)}</span>
      </div>
      ${lead.responsavel_nome ? `<div class="mt-1 text-[10px] text-azulli-700 truncate">👤 ${UI.escapeHtml(lead.responsavel_nome)}</div>` : ''}
    </div>
  `;
}

function wireDnd() {
  let dragged = null;

  document.querySelectorAll('.kanban-card').forEach((card) => {
    card.addEventListener('dragstart', (e) => {
      dragged = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragged = null;
    });
  });

  document.querySelectorAll('.kanban-column').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      const novoStatus = col.dataset.status;
      if (!id || !novoStatus) return;
      try {
        await API.leads.status(id, novoStatus);
        UI.toast(`Lead movido para "${UI.STATUS_LABEL[novoStatus]}".`, 'success');
        carregarBoard();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    });
  });
}

})();
