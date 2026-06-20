/* global window, document, API, UI, Router */
'use strict';

(() => {

// Esta página é carregada via leads.js (que delega para cá quando há id).
window.__renderLeadDetalhe = renderDetalhe;

async function renderDetalhe({ container, id }) {
  container.innerHTML = UI.loadingHTML();
  let data;
  try {
    data = await API.leads.get(id);
  } catch (err) {
    container.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">${UI.escapeHtml(err.message)}</div>`;
    return;
  }

  const lead = data.lead;
  const history = data.history || [];

  const users = await API.users.list().then((r) => r.users).catch(() => []);

  container.innerHTML = `
    <div class="mb-4">
      <a href="#/leads" class="text-xs text-slate-500 hover:text-azulli-700">← Voltar para a lista</a>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Coluna principal -->
      <div class="lg:col-span-2 space-y-6">
        <div class="bg-white border border-slate-200 rounded-2xl p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                ${UI.badgeStatus(lead.status)}
                ${UI.badgeScore(lead.icp_score)}
                ${lead.segmento ? `<span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 capitalize">${lead.segmento}</span>` : ''}
              </div>
              <h2 class="text-xl font-bold text-slate-900">${UI.escapeHtml(lead.nome)}</h2>
              <div class="text-sm text-slate-500 mt-1">${UI.escapeHtml(lead.endereco || '—')}</div>
            </div>
            <div class="flex flex-col gap-2 items-end">
              <button id="btn-status" class="btn-primary">Mudar status</button>
              <button id="btn-atribuir" class="btn-secondary">Atribuir</button>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
            ${field('Telefone', lead.telefone
              ? `<a href="tel:${UI.escapeHtml(lead.telefone)}" class="text-azulli-700 font-medium">${UI.fmtPhone(lead.telefone)}</a>`
              : '—')}
            ${field('WhatsApp', UI.whatsappLink(lead.telefone)
              ? `<a href="${UI.whatsappLink(lead.telefone)}" target="_blank" class="text-emerald-700 font-medium">Abrir conversa</a>`
              : '—')}
            ${field('Email', lead.email || '—')}
            ${field('Cidade/UF', `${lead.cidade || '—'}${lead.uf ? ' / ' + lead.uf : ''}`)}
            ${field('Avaliação Google', lead.avaliacao ? `⭐ ${lead.avaliacao} (${lead.total_avaliacoes ?? '—'})` : '—')}
            ${field('Maps', lead.maps_url
              ? `<a href="${lead.maps_url}" target="_blank" class="text-azulli-700">Abrir</a>`
              : `<a href="${UI.mapsSearchLink(lead)}" target="_blank" class="text-azulli-700">Buscar</a>`)}
            ${field('Responsável', lead.responsavel_nome || '<span class="text-slate-400">não atribuído</span>')}
            ${field('Criado em', UI.fmtDate(lead.created_at))}
          </div>
        </div>

        <!-- Materiais comerciais (IA) -->
        <div class="finder-card p-6">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Materiais comerciais (IA)</h3>
              <p class="text-xs text-slate-500">Personalizados com dados captados (Maps). WhatsApp em conformidade com Meta: 1º contato pede permissão, pitch só após opt-in.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button id="btn-copiar-pitch" class="btn-secondary text-xs">Copiar 1º contato</button>
              <button id="btn-copiar-pos-optin" class="btn-secondary text-xs hidden">Copiar pós opt-in</button>
              <button id="btn-regerar-pitch" class="btn-primary text-xs">Regerar</button>
            </div>
          </div>

          <div class="pitch-tabs mb-4" role="tablist">
            <button type="button" class="pitch-tab pitch-tab-active" data-pitch-tab="whatsapp">WhatsApp</button>
            <button type="button" class="pitch-tab" data-pitch-tab="email">E-mail</button>
          </div>

          <div id="pitch-box" class="pitch-panel">
            ${UI.renderPitchContent('whatsapp', lead.pitch_whatsapp)}
          </div>
        </div>

        <!-- Notas + edição -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 class="text-sm font-bold text-slate-900 mb-3">Notas comerciais</h3>
          <textarea id="notas" class="textarea" placeholder="Anotações da abordagem, próximos passos, objeções…">${UI.escapeHtml(lead.notas || '')}</textarea>
          <div class="mt-3 flex justify-end">
            <button id="btn-salvar-notas" class="btn-primary">Salvar notas</button>
          </div>
        </div>
      </div>

      <!-- Coluna lateral: histórico + ações -->
      <div class="space-y-6">
        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-3">Ações rápidas</h3>
          <div class="space-y-2">
            <button id="btn-converter" class="btn-primary w-full justify-center">✅ Converter em assinante</button>
            <button id="btn-enriquecer" class="btn-secondary w-full justify-center">⚙️ Re-enriquecer com IA</button>
            <button id="btn-pegar" class="btn-secondary w-full justify-center">📍 Pegar para mim</button>
            <button id="btn-excluir" class="btn-danger w-full justify-center">Excluir lead</button>
          </div>
          ${lead.azulli_account_id ? `
            <div class="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              <div class="font-semibold">Vinculado ao Azulli</div>
              <div class="mt-1 font-mono break-all">${UI.escapeHtml(lead.azulli_account_id)}</div>
              ${lead.plano_contratado ? `<div class="mt-1">Plano: ${UI.escapeHtml(lead.plano_contratado)}</div>` : ''}
            </div>` : ''}
        </div>

        <div class="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-3">Histórico de status</h3>
          ${history.length === 0
            ? '<div class="text-xs text-slate-400">Sem mudanças registradas.</div>'
            : `<ol class="space-y-3">${history.map(historyItem).join('')}</ol>`}
        </div>
      </div>
    </div>
  `;

  // Handlers
  document.getElementById('btn-salvar-notas').addEventListener('click', async () => {
    const notas = document.getElementById('notas').value;
    try {
      await API.leads.update(lead.id, { notas });
      UI.toast('Notas salvas.', 'success');
    } catch (err) { UI.toast(err.message, 'error'); }
  });

  document.getElementById('btn-pegar').addEventListener('click', async () => {
    try {
      await API.leads.pegar(lead.id);
      UI.toast('Você agora é responsável por este lead.', 'success');
      Router.go(`#/leads/${lead.id}`);
      setTimeout(() => location.reload(), 100);
    } catch (err) { UI.toast(err.message, 'error'); }
  });

  document.getElementById('btn-status').addEventListener('click', () => modalStatus(lead));
  document.getElementById('btn-atribuir').addEventListener('click', () => modalAtribuir(lead, users));
  document.getElementById('btn-converter').addEventListener('click', () => modalConverter(lead));

  let pitchCanal = 'whatsapp';
  const pitchData = {
    whatsapp: lead.pitch_whatsapp || '',
    email: lead.pitch_email || ''
  };

  function renderPitchBox() {
    document.getElementById('pitch-box').innerHTML = UI.renderPitchContent(
      pitchCanal,
      pitchData[pitchCanal]
    );
    const btnPos = document.getElementById('btn-copiar-pos-optin');
    if (btnPos) {
      const parsed = UI.parsePitchStored(pitchData.whatsapp);
      const show = pitchCanal === 'whatsapp' && parsed && parsed.mensagem_pos_optin;
      btnPos.classList.toggle('hidden', !show);
    }
  }

  document.querySelectorAll('[data-pitch-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      pitchCanal = tab.dataset.pitchTab;
      document.querySelectorAll('[data-pitch-tab]').forEach((t) => {
        t.classList.toggle('pitch-tab-active', t.dataset.pitchTab === pitchCanal);
      });
      renderPitchBox();
    });
  });

  document.getElementById('btn-regerar-pitch').addEventListener('click', async () => {
    const btn = document.getElementById('btn-regerar-pitch');
    btn.disabled = true; btn.textContent = 'Gerando…';
    try {
      const { pitch } = await API.leads.regerarPitch(lead.id, pitchCanal);
      pitchData[pitchCanal] = pitch;
      renderPitchBox();
      UI.toast('Material atualizado.', 'success');
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Regerar';
    }
  });

  document.getElementById('btn-copiar-pitch').addEventListener('click', () => {
    const txt = UI.getPitchCopyText(pitchData[pitchCanal], pitchCanal, 'default');
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => UI.toast('Copiado para a área de transferência.', 'success'));
  });

  document.getElementById('btn-copiar-pos-optin').addEventListener('click', () => {
    const txt = UI.getPitchCopyText(pitchData.whatsapp, 'whatsapp', 'pos_optin');
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => UI.toast('Mensagem pós opt-in copiada.', 'success'));
  });

  document.getElementById('btn-enriquecer').addEventListener('click', async () => {
    const btn = document.getElementById('btn-enriquecer');
    btn.disabled = true; btn.textContent = 'Processando…';
    try {
      await API.leads.enriquecer(lead.id);
      UI.toast('Lead enriquecido.', 'success');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      UI.toast(err.message, 'error');
    } finally {
      btn.disabled = false; btn.textContent = '⚙️ Re-enriquecer com IA';
    }
  });

  document.getElementById('btn-excluir').addEventListener('click', async () => {
    const ok = await UI.confirm({
      titulo: 'Excluir este lead?',
      mensagem: 'Esta ação é definitiva e remove também o histórico de status.',
      confirmar: 'Excluir',
      perigo: true
    });
    if (!ok) return;
    try {
      await API.leads.destroy(lead.id);
      UI.toast('Lead removido.', 'success');
      Router.go('#/leads');
    } catch (err) { UI.toast(err.message, 'error'); }
  });
}

function field(label, value) {
  return `
    <div>
      <div class="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">${label}</div>
      <div class="text-sm text-slate-800 mt-0.5">${value}</div>
    </div>`;
}

function historyItem(h) {
  return `
    <li class="text-xs">
      <div class="flex items-center gap-2">
        ${UI.badgeStatus(h.status_anterior || 'novo')}
        <span class="text-slate-400">→</span>
        ${UI.badgeStatus(h.status_novo)}
      </div>
      <div class="text-slate-500 mt-1">
        ${UI.escapeHtml(h.user_nome || 'Sistema')} · ${UI.fmtDate(h.created_at)}
      </div>
      ${h.motivo ? `<div class="text-slate-600 mt-1 italic">"${UI.escapeHtml(h.motivo)}"</div>` : ''}
    </li>`;
}

function modalStatus(lead) {
  const optionsHtml = Object.entries(UI.STATUS_LABEL)
    .map(([k, v]) => `<option value="${k}" ${k === lead.status ? 'selected' : ''}>${v}</option>`)
    .join('');
  const { root, close } = UI.openModal(`
    <div class="px-6 py-5 border-b border-slate-200">
      <h3 class="text-lg font-bold text-slate-900">Mudar status</h3>
      <p class="text-xs text-slate-500 mt-1">${UI.escapeHtml(lead.nome)}</p>
    </div>
    <div class="px-6 py-5 space-y-3">
      <div>
        <label class="label">Novo status</label>
        <select id="m-status" class="select">${optionsHtml}</select>
      </div>
      <div>
        <label class="label">Motivo (opcional)</label>
        <textarea id="m-motivo" class="textarea" placeholder="Ex.: cliente respondeu interessado, agendou call…"></textarea>
      </div>
    </div>
    <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
      <button class="btn-secondary" data-cancel>Cancelar</button>
      <button class="btn-primary" data-ok>Salvar</button>
    </div>
  `);
  root.querySelector('[data-cancel]').addEventListener('click', close);
  root.querySelector('[data-ok]').addEventListener('click', async () => {
    const status = root.querySelector('#m-status').value;
    const motivo = root.querySelector('#m-motivo').value;
    try {
      await API.leads.status(lead.id, status, motivo);
      UI.toast('Status atualizado.', 'success');
      close();
      Router.go(`#/leads/${lead.id}`);
      setTimeout(() => location.reload(), 100);
    } catch (err) { UI.toast(err.message, 'error'); }
  });
}

function modalAtribuir(lead, users) {
  const opts = ['<option value="">— não atribuído —</option>']
    .concat(users.map((u) => `<option value="${u.id}" ${u.id === lead.responsavel_id ? 'selected' : ''}>${UI.escapeHtml(u.nome)} (${u.role})</option>`))
    .join('');
  const { root, close } = UI.openModal(`
    <div class="px-6 py-5 border-b border-slate-200">
      <h3 class="text-lg font-bold text-slate-900">Atribuir lead</h3>
      <p class="text-xs text-slate-500 mt-1">${UI.escapeHtml(lead.nome)}</p>
    </div>
    <div class="px-6 py-5">
      <label class="label">Responsável</label>
      <select id="m-resp" class="select">${opts}</select>
    </div>
    <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
      <button class="btn-secondary" data-cancel>Cancelar</button>
      <button class="btn-primary" data-ok>Atribuir</button>
    </div>
  `);
  root.querySelector('[data-cancel]').addEventListener('click', close);
  root.querySelector('[data-ok]').addEventListener('click', async () => {
    const id = root.querySelector('#m-resp').value;
    try {
      await API.leads.atribuir(lead.id, id || null);
      UI.toast('Lead atribuído.', 'success');
      close();
      Router.go(`#/leads/${lead.id}`);
      setTimeout(() => location.reload(), 100);
    } catch (err) { UI.toast(err.message, 'error'); }
  });
}

function modalConverter(lead) {
  const plans = window.__FINDER_PLANS || [
    { id: 'pro', name: 'Pro', price: 29.99 },
    { id: 'enterprise', name: 'Empresarial', price: 47.99 }
  ];
  const planOpts = plans.map((p) =>
    `<option value="${p.id}">${UI.escapeHtml(p.name)} — R$ ${Number(p.price).toFixed(2).replace('.', ',')}/mês</option>`
  ).join('');

  const { root, close } = UI.openModal(`
    <div class="px-6 py-5 border-b border-slate-200">
      <h3 class="text-lg font-bold text-slate-900">Converter em assinante</h3>
      <p class="text-xs text-slate-500 mt-1">${UI.escapeHtml(lead.nome)}</p>
    </div>
    <div class="px-6 py-5 space-y-3">
      <p class="text-sm text-slate-600">
        Busca uma conta existente no Azulli pelo e-mail, CNPJ ou owner. Se não encontrar, retorna link de cadastro.
      </p>
      <div>
        <label class="label">Plano contratado</label>
        <select id="m-plano" class="select">${planOpts}</select>
      </div>
    </div>
    <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
      <button class="btn-secondary" data-cancel>Cancelar</button>
      <button class="btn-primary" data-ok>Converter</button>
    </div>
  `);
  root.querySelector('[data-cancel]').addEventListener('click', close);
  root.querySelector('[data-ok]').addEventListener('click', async () => {
    const plano = root.querySelector('#m-plano').value;
    const btn = root.querySelector('[data-ok]');
    btn.disabled = true;
    btn.textContent = 'Consultando Azulli…';
    try {
      const { conversao } = await API.leads.converter(lead.id, plano);
      if (conversao.status === 'linked') {
        UI.toast(conversao.message || 'Lead vinculado ao tenant Azulli.', 'success');
      } else {
        UI.toast(conversao.message || 'Cadastro pendente — envie o link de registro.', 'info');
        if (conversao.registerUrl) {
          window.open(conversao.registerUrl, '_blank', 'noopener');
        }
      }
      close();
      setTimeout(() => location.reload(), 400);
    } catch (err) {
      UI.toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Converter';
    }
  });
}

})();
