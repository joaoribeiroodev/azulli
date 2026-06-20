/* global window, document, API, UI, Router */
'use strict';

const Auth = (() => {
  function isLogged() { return Boolean(API.token.get()); }

  function showLogin() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
  }
  function showApp() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    renderUserChip();
  }

  function renderUserChip() {
    const user = API.user.get();
    if (!user) return;
    document.getElementById('user-nome').textContent = user.nome || user.email;
    document.getElementById('user-role').textContent = (user.role || '').toUpperCase();
    const initial = (user.nome || user.email || '?').trim().charAt(0).toUpperCase();
    document.getElementById('user-avatar').textContent = initial;
  }

  async function ensureSession() {
    if (!isLogged()) {
      showLogin();
      return false;
    }
    try {
      const { user } = await API.auth.me();
      API.user.set(user);
      showApp();
      return true;
    } catch (e) {
      API.token.clear();
      showLogin();
      return false;
    }
  }

  function bindLoginForm() {
    const form = document.getElementById('login-form');
    const btn  = document.getElementById('login-btn');
    const btnTxt = document.getElementById('login-btn-text');
    const errBox = document.getElementById('login-error');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.classList.add('hidden');
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      btn.disabled = true;
      btnTxt.innerHTML = '<div class="loader" style="border-color: rgba(255,255,255,0.4); border-top-color: white;"></div> Entrando…';

      try {
        const { token, user } = await API.auth.login(email, password);
        API.token.set(token);
        API.user.set(user);
        showApp();
        Router.go('#/dashboard');
        UI.toast(`Bem-vindo, ${user.nome || user.email}!`, 'success');
      } catch (err) {
        errBox.textContent = err.message || 'Falha no login';
        errBox.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btnTxt.textContent = 'Entrar';
      }
    });
  }

  function bindLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
      const ok = await UI.confirm({
        titulo: 'Sair da conta?',
        mensagem: 'Você precisará entrar novamente para acessar o Finder.',
        confirmar: 'Sair',
        perigo: true
      });
      if (!ok) return;
      API.token.clear();
      showLogin();
      window.location.hash = '#/login';
      UI.toast('Sessão encerrada.', 'info');
    });
  }

  return { ensureSession, bindLoginForm, bindLogout, isLogged, showLogin, showApp };
})();

window.Auth = Auth;
