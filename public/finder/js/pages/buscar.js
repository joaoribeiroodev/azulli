/* global window, document, API, UI, Router, XLSX */
'use strict';

(() => {

Router.register('buscar', {
  navKey: 'buscar',
  title: 'Buscar leads',
  subtitle: 'Encontre MEIs e pequenas empresas por segmento e localização',
  async render({ container }) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <form id="form-buscar" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="label">Segmento (ICP)</label>
            <input id="termo" class="input" placeholder="Ex.: Salão de Beleza, Oficina Mecânica, Pet Shop" required />
          </div>
          <div>
            <label class="label">Localização</label>
            <input id="localizacao" class="input" placeholder="Ex.: Vila Madalena SP, Tijuca RJ" required />
          </div>
          <div class="flex items-end gap-2">
            <button type="submit" id="btn-buscar" class="btn-primary flex-1 justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <span id="btn-buscar-txt">Buscar</span>
            </button>
          </div>
        </form>

        <div class="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span class="font-medium text-slate-700">Sugestões:</span>
          ${suggestion('Salão de Beleza', 'Vila Madalena SP')}
          ${suggestion('Oficina Mecânica', 'Pinheiros SP')}
          ${suggestion('Pet Shop', 'Tijuca RJ')}
          ${suggestion('Padaria', 'Savassi BH')}
          ${suggestion('Consultório Odontológico', 'Asa Sul DF')}
        </div>
      </div>

      <div id="resultados-wrapper"></div>
    `;

    // Aviso se busca não estiver configurada (ex.: falta GOOGLE_PLACES_API_KEY na Vercel)
    API.config().then((cfg) => {
      if (cfg.search && !cfg.search.configured) {
        const banner = document.createElement('div');
        banner.className = 'mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm';
        banner.innerHTML = `
          <strong>Busca indisponível em produção.</strong>
          Configure <code class="text-xs bg-amber-100 px-1 rounded">GOOGLE_PLACES_API_KEY</code>
          na Vercel (Places API New no Google Cloud) para habilitar a prospecção.
        `;
        container.insertBefore(banner, container.firstChild);
      }
    }).catch(() => {});

    const form = document.getElementById('form-buscar');
    const wrapper = document.getElementById('resultados-wrapper');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const termo = document.getElementById('termo').value.trim();
      const localizacao = document.getElementById('localizacao').value.trim();
      if (termo.length < 2 || localizacao.length < 2) {
        UI.toast('Preencha segmento e localização (2+ caracteres).', 'warn');
        return;
      }
      const btn = document.getElementById('btn-buscar');
      const txt = document.getElementById('btn-buscar-txt');
      btn.disabled = true;
      txt.innerHTML = '<div class="loader" style="border-color:rgba(255,255,255,0.4); border-top-color:white;"></div> Buscando…';
      wrapper.innerHTML = UI.loadingHTML('Coletando dados no Google Maps — pode levar 10–20 segundos.');
      try {
        const res = await API.searches.create(termo, localizacao);
        renderResultados(wrapper, res.dados);
        UI.toast(`${res.total} potenciais assinantes encontrados.`, 'success');
      } catch (err) {
        wrapper.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">Erro: ${UI.escapeHtml(err.message)}</div>`;
        UI.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
        txt.textContent = 'Buscar';
      }
    });

    // Pré-fill via querystring (?termo=...&localizacao=...)
    const { params } = Router.parseHash();
    if (params.get('termo')) document.getElementById('termo').value = params.get('termo');
    if (params.get('localizacao')) document.getElementById('localizacao').value = params.get('localizacao');

    // Mensagem inicial
    if (!params.get('termo')) {
      wrapper.innerHTML = UI.emptyHTML({
        titulo: 'Pronto para prospectar',
        descricao: 'Escolha um segmento com bom fit de ICP e uma região onde o Azulli tem demanda. Os leads encontrados entram automaticamente na sua base com enriquecimento por IA em segundo plano (se OpenAI estiver configurada).',
        icone: '🎯'
      });
    }
  }
});

function suggestion(termo, loc) {
  return `<button data-termo="${UI.escapeHtml(termo)}" data-loc="${UI.escapeHtml(loc)}"
    class="suggestion px-2.5 py-1 rounded-md bg-slate-100 hover:bg-azulli-100 hover:text-azulli-700 transition"
    onclick="document.getElementById('termo').value=this.dataset.termo; document.getElementById('localizacao').value=this.dataset.loc;">
    ${UI.escapeHtml(termo)} · ${UI.escapeHtml(loc)}
  </button>`;
}

function renderResultados(wrapper, leads) {
  if (!leads || leads.length === 0) {
    wrapper.innerHTML = UI.emptyHTML({
      titulo: 'Nenhum resultado',
      descricao: 'Tente um termo mais comum (ex.: "Pizzaria") ou uma localização mais ampla (ex.: "São Paulo SP").',
      icone: '🙊'
    });
    return;
  }

  const rows = leads.map((l) => `
    <tr>
      <td>
        <a href="#/leads/${l.id}" class="font-semibold text-slate-900 hover:text-azulli-700">${UI.escapeHtml(l.nome)}</a>
        ${l.segmento ? `<div class="text-xs text-slate-500 mt-0.5">${l.segmento}</div>` : ''}
      </td>
      <td>
        ${l.telefone
          ? `<a href="tel:${UI.escapeHtml(l.telefone)}" class="text-azulli-700 hover:text-azulli-900 font-medium">${UI.fmtPhone(l.telefone)}</a>`
          : '<span class="text-slate-400">—</span>'}
      </td>
      <td class="text-slate-600">${UI.escapeHtml(l.endereco || '—')}</td>
      <td class="text-center">${l.avaliacao ? `⭐ ${l.avaliacao}` : '—'}</td>
      <td class="text-center">${UI.badgeScore(l.icp_score)}</td>
      <td class="text-center">
        <div class="flex items-center justify-center gap-2">
          ${l.maps_url || l.nome ? `<a href="${l.maps_url || UI.mapsSearchLink(l)}" target="_blank" rel="noopener" class="text-slate-500 hover:text-azulli-700" title="Abrir no Maps">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>` : ''}
          ${UI.whatsappLink(l.telefone) ? `<a href="${UI.whatsappLink(l.telefone)}" target="_blank" rel="noopener" class="text-emerald-600 hover:text-emerald-800" title="Abrir no WhatsApp">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24z"/></svg>
          </a>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  wrapper.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div class="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900">${leads.length} potenciais assinantes encontrados</h3>
          <p class="text-xs text-slate-500 mt-0.5">Já salvos na base. Segmento e ICP são calculados em segundo plano (usa o termo da busca).</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-exportar" class="btn-secondary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            Exportar Excel
          </button>
          <a href="#/leads" class="btn-primary">Ver na lista completa</a>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead>
            <tr>
              <th>Negócio</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th class="text-center">Avaliação</th>
              <th class="text-center">ICP</th>
              <th class="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btn-exportar').addEventListener('click', () => exportarExcel(leads));
}

function exportarExcel(leads) {
  const dados = leads.map((l, i) => ({
    'ID': i + 1,
    'Negócio': l.nome,
    'Segmento': l.segmento || '',
    'Telefone': l.telefone || '',
    'Endereço': l.endereco || '',
    'Cidade': l.cidade || '',
    'UF': l.uf || '',
    'Avaliação Google': l.avaliacao || '',
    'ICP score': l.icp_score ?? '',
    'Status': l.status,
    'Data prospecção': UI.fmtDate(l.created_at)
  }));
  const ws = XLSX.utils.json_to_sheet(dados);
  ws['!cols'] = [
    { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 38 },
    { wch: 18 }, { wch: 4 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 18 }
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
  const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  XLSX.writeFile(wb, `Azulli_Prospects_${stamp}.xlsx`);
  UI.toast('Excel exportado.', 'success');
}

})();
