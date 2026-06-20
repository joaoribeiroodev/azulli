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

async function renderLista({ container, params }) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
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

    const apply = () => carregar();
    document.getElementById('btn-aplicar').addEventListener('click', apply);
    document.getElementById('f-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    document.getElementById('btn-limpar').addEventListener('click', () => {
      ['f-q', 'f-uf', 'f-score'].forEach((id) => (document.getElementById(id).value = ''));
      document.getElementById('f-status').value = '';
      document.getElementById('f-segmento').value = '';
      apply();
    });

    await carregar();
  }

async function carregar() {
  const wrap = document.getElementById('leads-table');
  wrap.innerHTML = UI.loadingHTML();

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

  try {
    const { leads, total } = await API.leads.list(params);

    if (leads.length === 0) {
      wrap.innerHTML = UI.emptyHTML({
        titulo: 'Nenhum lead com esses filtros',
        descricao: 'Tente afrouxar os filtros, fazer uma nova busca ou abrir o Kanban para ver o pipeline.',
        icone: '🗂️'
      });
      return;
    }

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
        <div class="p-4 border-b border-slate-200 text-xs text-slate-600">
          Mostrando <span class="font-semibold">${leads.length}</span> de <span class="font-semibold">${total}</span> leads
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
  } catch (err) {
    wrap.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">${UI.escapeHtml(err.message)}</div>`;
  }
}

function val(id) { return document.getElementById(id).value.trim(); }

})();
