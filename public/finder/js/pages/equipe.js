/* global window, document, API, UI, Router */
'use strict';

(() => {

Router.register('equipe', {
  navKey: 'equipe',
  title: 'Equipe',
  subtitle: 'Usuários internos do time comercial',
  async render({ container }) {
    const me = API.user.get();
    const isAdmin = me && me.role === 'admin';

    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-slate-500">Membros do time que têm acesso ao Finder.</p>
        ${isAdmin
          ? '<button id="btn-novo-usuario" class="btn-primary">+ Novo usuário</button>'
          : '<span class="text-xs text-slate-400">Somente admin pode criar usuários.</span>'}
      </div>
      <div id="equipe-list"></div>
    `;

    if (isAdmin) {
      document.getElementById('btn-novo-usuario').addEventListener('click', () => modalNovoUsuario());
    }

    await carregar(isAdmin);
  }
});

async function carregar(isAdmin) {
  const wrap = document.getElementById('equipe-list');
  wrap.innerHTML = UI.loadingHTML();
  try {
    const { users } = await API.users.list();
    if (users.length === 0) {
      wrap.innerHTML = UI.emptyHTML({
        titulo: 'Sem usuários',
        descricao: 'Use `npm run seed:admin` para criar o primeiro admin.',
        icone: '👥'
      });
      return;
    }
    const rows = users.map((u) => `
      <tr>
        <td>
          <div class="font-medium text-slate-900">${UI.escapeHtml(u.nome || '—')}</div>
          <div class="text-xs text-slate-500">${UI.escapeHtml(u.email)}</div>
        </td>
        <td>
          <span class="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 uppercase font-semibold">${UI.escapeHtml(u.role)}</span>
        </td>
        <td>
          ${u.ativo
            ? '<span class="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Ativo</span>'
            : '<span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Inativo</span>'}
        </td>
        <td class="text-xs text-slate-500">${UI.fmtDate(u.ultimo_login)}</td>
        <td class="text-xs text-slate-500">${UI.fmtDate(u.created_at)}</td>
        ${isAdmin ? `<td class="text-right"><button data-id="${u.id}" data-ativo="${u.ativo}" class="btn-secondary text-xs btn-toggle">${u.ativo ? 'Desativar' : 'Ativar'}</button></td>` : '<td></td>'}
      </tr>
    `).join('');

    wrap.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Role</th>
              <th>Status</th>
              <th>Último login</th>
              <th>Criado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    if (isAdmin) {
      wrap.querySelectorAll('.btn-toggle').forEach((b) => {
        b.addEventListener('click', async () => {
          try {
            await API.users.update(b.dataset.id, { ativo: b.dataset.ativo !== 'true' });
            carregar(isAdmin);
          } catch (err) { UI.toast(err.message, 'error'); }
        });
      });
    }
  } catch (err) {
    wrap.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">${UI.escapeHtml(err.message)}</div>`;
  }
}

function modalNovoUsuario() {
  const roles = ['admin', 'sdr', 'bdr', 'closer', 'ops', 'viewer'];
  const { root, close } = UI.openModal(`
    <div class="px-6 py-5 border-b border-slate-200">
      <h3 class="text-lg font-bold text-slate-900">Novo usuário</h3>
      <p class="text-xs text-slate-500 mt-1">Criar um novo membro do time comercial</p>
    </div>
    <div class="px-6 py-5 space-y-3">
      <div><label class="label">Nome</label><input id="nu-nome" class="input" /></div>
      <div><label class="label">Email</label><input id="nu-email" type="email" class="input" /></div>
      <div><label class="label">Senha (mín. 8)</label><input id="nu-senha" type="password" class="input" /></div>
      <div><label class="label">Role</label>
        <select id="nu-role" class="select">${roles.map((r) => `<option value="${r}" ${r === 'sdr' ? 'selected' : ''}>${r.toUpperCase()}</option>`).join('')}</select>
      </div>
      <div id="nu-erro" class="hidden text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded"></div>
    </div>
    <div class="px-6 py-4 bg-slate-50 flex justify-end gap-2 rounded-b-2xl">
      <button class="btn-secondary" data-cancel>Cancelar</button>
      <button class="btn-primary" data-ok>Criar</button>
    </div>
  `);
  root.querySelector('[data-cancel]').addEventListener('click', close);
  root.querySelector('[data-ok]').addEventListener('click', async () => {
    const errBox = root.querySelector('#nu-erro');
    errBox.classList.add('hidden');
    try {
      await API.users.create({
        nome:  root.querySelector('#nu-nome').value.trim(),
        email: root.querySelector('#nu-email').value.trim(),
        password: root.querySelector('#nu-senha').value,
        role:  root.querySelector('#nu-role').value
      });
      UI.toast('Usuário criado.', 'success');
      close();
      carregar(true);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });
}

})();
