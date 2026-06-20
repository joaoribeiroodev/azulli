/* global window, document, API, UI, Router */
'use strict';

(() => {

Router.register('leads', {
  navKey: 'leads',
  title: 'Leads',
  subtitle: 'Lista filtrável de potenciais assinantes',
  async render(ctx) {
    if (ctx.id && window.__renderLeadDetalhe) {
      return window.__renderLeadDetalhe(ctx);
    }
    return renderLista(ctx);
  }
});

let currentQueryParams = null;
let currentTotal = 0;

const EXPORT_BTN_HTML = `
  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
  Exportar Excel
`;

async function renderLista({ container, params }) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
        <input type="hidden" id="f-search-id" />
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input id="f-q" class="input md:col-span-2" placeholder="Buscar por nome ou endereço…" />
          <select id="f-status" class="select" multiple size="1">
            <option value="">Status (todos)</option>
            ${Object.entries(UI.STATUS_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
          <select id="f-segmento" class="select">
            <option value="">Segmento (todos)</option>
            ${['alimentacao','beleza','automotivo','saude','servicos','varejo','educacao','tech','construcao','outros']
              .map((s) => `<option value="${s}">${s}</option>`).join('')}
          </select>
          <input id="f-uf" maxlength="2" class="input uppercase" placeholder="UF" />
          <div class="flex items-center gap-2">
            <label class="text-xs text-slate-600 whitespace-nowrap">ICP ≥</label>
            <input id="f-score" type="number" min="0" max="100" step="5" class="input" placeholder="0" />
          </div>
        </div>
        <div id="search-id-banner" class="hidden mt-3 p-3 rounded-lg border border-azulli-200 bg-azulli-50 text-sm text-azulli-900 flex flex-wrap items-center justify-between gap-2">
          <span>Mostrando leads da última busca realizada.</span>
          <button type="button" id="btn-clear-search" class="btn-secondary text-xs py-1.5 px-3">Ver todos os leads</button>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-xs text-slate-600">
            <label class="flex items-center gap-1">
              Ordenar por
              <select id="f-sort" class="select" style="width:auto; padding: 0.3rem 0.5rem;">
                <option value="icp_score">ICP score</option>
                <option value="created_at">Mais recente</option>
                <option value="updated_at">Atualizado recente</option>
                <option value="avaliacao">Avaliação</option>
                <option value="nome">Nome</option>
              </select>
            </label>
            <select id="f-dir" class="select" style="width:auto; padding: 0.3rem 0.5rem;">
              <option value="desc">↓ desc</option>
              <option value="asc">↑ asc</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button id="btn-exportar" class="btn-secondary" disabled title="Exporta todos os leads que correspondem aos filtros atuais">
              ${EXPORT_BTN_HTML}
            </button>
            <button id="btn-limpar" class="btn-secondary">Limpar filtros</button>
            <button id="btn-aplicar" class="btn-primary">Aplicar</button>
          </div>
        </div>
      </div>

      <div id="leads-table"></div>
    `;

    // pre-fill via querystring
    if (params.get('status')) document.getElementById('f-status').value = params.get('status').split(',')[0];
    if (params.get('segmento')) document.getElementById('f-segmento').value = params.get('segmento');
    if (params.get('uf'))      document.getElementById('f-uf').value      = params.get('uf');
    if (params.get('q'))       document.getElementById('f-q').value       = params.get('q');
    if (params.get('scoreMin'))document.getElementById('f-score').value   = params.get('scoreMin');
    if (params.get('sort'))    document.getElementById('f-sort').value    = params.get('sort');
    if (params.get('dir'))     document.getElementById('f-dir').value     = params.get('dir');
    if (params.get('searchId')) {
      document.getElementById('f-search-id').value = params.get('searchId');
      document.getElementById('search-id-banner').classList.remove('hidden');
    }

    const apply = () => carregar();
    document.getElementById('btn-aplicar').addEventListener('click', apply);
    document.getElementById('f-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    document.getElementById('btn-exportar').addEventListener('click', exportarFiltrados);
    document.getElementById('btn-clear-search').addEventListener('click', () => {
      Router.go('leads');
    });
    document.getElementById('btn-limpar').addEventListener('click', () => {
      ['f-q', 'f-uf', 'f-score'].forEach((id) => (document.getElementById(id).value = ''));
      document.getElementById('f-status').value = '';
      document.getElementById('f-segmento').value = '';
      document.getElementById('f-search-id').value = '';
      document.getElementById('search-id-banner').classList.add('hidden');
      apply();
    });

    await carregar();
  }

function buildQueryParams() {
  const params = {
    q: val('f-q'),
    status: val('f-status'),
    segmento: val('f-segmento'),
    uf: val('f-uf').toUpperCase(),
    scoreMin: val('f-score'),
    sort: val('f-sort'),
    dir: val('f-dir'),
    limit: 100
  };
  const searchId = val('f-search-id');
  if (searchId) params.searchId = searchId;
  return params;
}

async function fetchAllLeads(queryBase) {
  const pageSize = 200;
  let skip = 0;
  let all = [];
  let total = 0;

  do {
    const res = await API.leads.list({ ...queryBase, limit: pageSize, skip });
    total = res.total;
    all = all.concat(res.leads);
    skip += res.leads.length;
    if (res.leads.length === 0) break;
  } while (all.length < total);

  return all;
}

async function exportarFiltrados() {
  if (!currentQueryParams || currentTotal === 0) {
    UI.toast('Nenhum lead para exportar com os filtros atuais.', 'warn');
    return;
  }

  const btn = document.getElementById('btn-exportar');
  const prevHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<div class="loader" style="width:1rem;height:1rem;"></div> Exportando…';

  try {
    const { limit, ...rest } = currentQueryParams;
    const leads = await fetchAllLeads(rest);
    await UI.exportLeadsExcel(leads);
  } catch (err) {
    UI.toast(err.message, 'error');
  } finally {
    btn.disabled = currentTotal === 0;
    btn.innerHTML = prevHtml;
  }
}

function setExportEnabled(enabled) {
  const btn = document.getElementById('btn-exportar');
  if (btn) btn.disabled = !enabled;
}

async function carregar() {
  const wrap = document.getElementById('leads-table');
  wrap.innerHTML = UI.loadingHTML();
  setExportEnabled(false);

  const params = buildQueryParams();
  currentQueryParams = { ...params };

  try {
    const { leads, total } = await API.leads.list(params);
    currentTotal = total;

    if (leads.length === 0) {
      currentTotal = 0;
      wrap.innerHTML = UI.emptyHTML({
        titulo: 'Nenhum lead com esses filtros',
        descricao: 'Tente afrouxar os filtros, fazer uma nova busca ou abrir o Kanban para ver o pipeline.',
        icone: '🗂️'
      });
      return;
    }

    setExportEnabled(true);

    const rows = leads.map((l) => `
      <tr>
        <td>
          <a href="#/leads/${l.id}" class="font-semibold text-slate-900 hover:text-azulli-700">${UI.escapeHtml(l.nome)}</a>
          <div class="text-xs text-slate-500 mt-0.5">
            ${l.segmento ? `<span class="capitalize">${l.segmento}</span>` : '<span class="text-slate-400">sem segmento</span>'}
            ${l.cidade ? ` · ${UI.escapeHtml(l.cidade)}${l.uf ? '/' + l.uf : ''}` : ''}
          </div>
        </td>
        <td>${l.telefone ? `<a href="tel:${l.telefone}" class="text-azulli-700">${UI.fmtPhone(l.telefone)}</a>` : '<span class="text-slate-400">—</span>'}</td>
        <td class="text-center">${l.avaliacao ? `⭐ ${l.avaliacao}` : '—'}</td>
        <td class="text-center">${UI.badgeScore(l.icp_score)}</td>
        <td>${UI.badgeStatus(l.status)}</td>
        <td class="text-xs text-slate-500">${l.responsavel_nome || '<span class="text-slate-400">—</span>'}</td>
        <td class="text-xs text-slate-500">${UI.fmtDate(l.created_at)}</td>
        <td class="text-right">
          <a href="#/leads/${l.id}" class="text-azulli-700 hover:text-azulli-900 font-medium">Abrir →</a>
        </td>
      </tr>
    `).join('');

    wrap.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="text-xs text-slate-600">
            Mostrando <span class="font-semibold">${leads.length}</span> de <span class="font-semibold">${total}</span> leads
            ${total > leads.length ? `<span class="text-slate-500"> · exportação inclui todos os ${total}</span>` : ''}
          </div>
          <button type="button" id="btn-exportar-table" class="btn-secondary text-xs py-2">
            ${EXPORT_BTN_HTML}
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Negócio</th>
                <th>Telefone</th>
                <th class="text-center">Avaliação</th>
                <th class="text-center">ICP</th>
                <th>Status</th>
                <th>Responsável</th>
                <th>Criado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('btn-exportar-table').addEventListener('click', exportarFiltrados);
  } catch (err) {
    currentTotal = 0;
    wrap.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">${UI.escapeHtml(err.message)}</div>`;
  }
}

function val(id) { return document.getElementById(id).value.trim(); }

})();
