/* global window, document, API, UI, Router */
'use strict';

(() => {

Router.register('historico', {
  navKey: 'historico',
  title: 'Histórico de buscas',
  subtitle: 'Tudo o que o time já prospectou',
  async render({ container }) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <label class="text-sm flex items-center gap-2">
          <input type="checkbox" id="hist-mine" class="rounded">
          Apenas minhas buscas
        </label>
        <button id="hist-aplicar" class="btn-primary">Aplicar</button>
      </div>
      <div id="hist-list"></div>
    `;

    document.getElementById('hist-aplicar').addEventListener('click', carregar);
    document.getElementById('hist-mine').addEventListener('change', carregar);
    await carregar();
  }
});

async function carregar() {
  const wrap = document.getElementById('hist-list');
  wrap.innerHTML = UI.loadingHTML();
  const mine = document.getElementById('hist-mine').checked ? '1' : undefined;
  try {
    const { searches } = await API.searches.list({ mine, limit: 200 });
    if (searches.length === 0) {
      wrap.innerHTML = UI.emptyHTML({
        titulo: 'Sem buscas no histórico',
        descricao: 'Faça uma busca na aba "Buscar leads" para começar.',
        icone: '🕓'
      });
      return;
    }
    const rows = searches.map((s) => `
      <tr>
        <td><span class="font-medium text-slate-900">${UI.escapeHtml(s.termo)}</span>
          <span class="text-slate-500"> · ${UI.escapeHtml(s.localizacao)}</span></td>
        <td class="text-xs text-slate-500">${UI.escapeHtml(s.user_nome || '—')}</td>
        <td class="text-center font-semibold text-slate-700">${s.total_results ?? '—'}</td>
        <td class="text-xs text-slate-500">${s.duracao_ms != null ? Math.round(s.duracao_ms/1000) + 's' : '—'}</td>
        <td class="text-xs text-slate-500">${UI.fmtDate(s.created_at)}</td>
        <td class="text-right">
          <a href="#/buscar?termo=${encodeURIComponent(s.termo)}&localizacao=${encodeURIComponent(s.localizacao)}"
             class="text-azulli-700 font-medium">Repetir →</a>
        </td>
      </tr>
    `).join('');
    wrap.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Busca</th>
                <th>Usuário</th>
                <th class="text-center">Resultados</th>
                <th>Duração</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('[historico] falha ao carregar', err);
    const detalhe = err.status ? ` (HTTP ${err.status})` : '';
    const payload = err.payload ? `<pre class="mt-2 text-[11px] bg-red-100/50 p-2 rounded overflow-auto max-h-40">${UI.escapeHtml(JSON.stringify(err.payload, null, 2))}</pre>` : '';
    wrap.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
        <div class="font-semibold">Não foi possível carregar o histórico${detalhe}</div>
        <div class="mt-1">${UI.escapeHtml(err.message || 'Erro desconhecido')}</div>
        ${payload}
      </div>`;
  }
}

})();
