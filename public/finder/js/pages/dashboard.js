/* global window, document, API, UI, Chart, Router */
'use strict';

(() => {

Router.register('dashboard', {
  navKey: 'dashboard',
  title: 'Dashboard',
  subtitle: 'Visão geral da prospecção de assinantes do Azulli',
  async render({ container }) {
    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6" id="stat-cards"></div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Funil comercial</h3>
              <p class="text-xs text-slate-500">Leads por etapa do pipeline</p>
            </div>
          </div>
          <canvas id="chart-status" height="120"></canvas>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-1">Top segmentos</h3>
          <p class="text-xs text-slate-500 mb-3">Onde concentrar prospecção</p>
          <canvas id="chart-segmento" height="160"></canvas>
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5 lg:col-span-3">
          <h3 class="text-sm font-bold text-slate-900 mb-1">Distribuição geográfica</h3>
          <p class="text-xs text-slate-500 mb-3">Leads por UF (top 15)</p>
          <canvas id="chart-uf" height="80"></canvas>
        </div>
      </div>

      <div class="mt-6 bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-slate-900">Próximos passos</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a href="#/buscar" class="border border-slate-200 hover:border-azulli-400 hover:bg-azulli-50/50 rounded-xl p-4 transition">
            <div class="text-xs uppercase font-semibold text-azulli-700 tracking-wider mb-1">Prospectar</div>
            <div class="text-sm font-medium text-slate-900">Buscar novos leads</div>
            <div class="text-xs text-slate-500 mt-1">Encontre MEIs com bom ICP por segmento + região</div>
          </a>
          <a href="#/kanban" class="border border-slate-200 hover:border-azulli-400 hover:bg-azulli-50/50 rounded-xl p-4 transition">
            <div class="text-xs uppercase font-semibold text-azulli-700 tracking-wider mb-1">Trabalhar pipeline</div>
            <div class="text-sm font-medium text-slate-900">Abrir Kanban</div>
            <div class="text-xs text-slate-500 mt-1">Mover leads entre etapas até virar assinante</div>
          </a>
          <a href="#/leads?sort=icp_score&dir=desc&status=novo,qualificado" class="border border-slate-200 hover:border-azulli-400 hover:bg-azulli-50/50 rounded-xl p-4 transition">
            <div class="text-xs uppercase font-semibold text-azulli-700 tracking-wider mb-1">Foco</div>
            <div class="text-sm font-medium text-slate-900">Leads de alto ICP</div>
            <div class="text-xs text-slate-500 mt-1">Lista ordenada por score, novos e qualificados</div>
          </a>
        </div>
      </div>
    `;

    const stats = await API.leads.stats();
    renderStatCards(stats.resumo);
    renderChartStatus(stats.byStatus);
    renderChartSegmento(stats.bySegmento);
    renderChartUf(stats.byUf);
  }
});

function renderStatCards(r) {
  const c = document.getElementById('stat-cards');
  c.innerHTML = [
    card('Total de leads', r.total, 'Toda a base do Finder'),
    card('Em pipeline', r.ativos, 'Novos, qualificados, contatados, em negociação'),
    card('Assinantes', r.assinantes, 'Leads convertidos em assinantes do Azulli'),
    card('ICP médio', r.icp_medio, 'Score médio dos leads enriquecidos'),
    card('Buscas (7d)', r.buscas_7d, 'Atividade do time na última semana')
  ].join('');
}

function card(label, value, hint) {
  return `
    <div class="stat-card">
      <div class="label">${label}</div>
      <div class="value">${value ?? 0}</div>
      <div class="hint">${hint}</div>
    </div>`;
}

function renderChartStatus(data) {
  const STATUS_ORDER = ['novo', 'qualificado', 'contatado', 'em_negociacao', 'assinante', 'descartado'];
  const COLORS = {
    novo: '#3b82f6', qualificado: '#06b6d4', contatado: '#eab308',
    em_negociacao: '#f97316', assinante: '#16a34a', descartado: '#94a3b8'
  };
  const map = Object.fromEntries(data.map((d) => [d.status, d.total]));
  new Chart(document.getElementById('chart-status'), {
    type: 'bar',
    data: {
      labels: STATUS_ORDER.map((s) => UI.STATUS_LABEL[s]),
      datasets: [{
        label: 'Leads',
        data: STATUS_ORDER.map((s) => map[s] || 0),
        backgroundColor: STATUS_ORDER.map((s) => COLORS[s]),
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function renderChartSegmento(data) {
  const top = data.slice(0, 6);
  new Chart(document.getElementById('chart-segmento'), {
    type: 'doughnut',
    data: {
      labels: top.map((d) => d.segmento),
      datasets: [{
        data: top.map((d) => d.total),
        backgroundColor: ['#1f57e6', '#3273ff', '#5891ff', '#8ab6ff', '#bcd6ff', '#deebff']
      }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
  });
}

function renderChartUf(data) {
  new Chart(document.getElementById('chart-uf'), {
    type: 'bar',
    data: {
      labels: data.map((d) => d.uf),
      datasets: [{
        label: 'Leads',
        data: data.map((d) => d.total),
        backgroundColor: '#1f57e6',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

})();
