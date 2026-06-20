/* global window */
'use strict';

const API = (() => {
  const TOKEN_KEY = 'azulli_finder_token';
  const USER_KEY  = 'azulli_finder_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch { return null; }
  }
  function setUser(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

  async function request(method, path, { body, query } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let url = path;
    if (query) {
      const usp = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v == null || v === '') return;
        if (Array.isArray(v)) usp.set(k, v.join(','));
        else usp.set(k, v);
      });
      const qs = usp.toString();
      if (qs) url += `?${qs}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });

    let payload = null;
    const text = await res.text();
    if (text) {
      try { payload = JSON.parse(text); }
      catch { payload = { raw: text }; }
    }

    if (res.status === 401) {
      // sessão expirada
      clearToken();
      if (window.Router) window.Router.go('#/login');
      throw new ApiError(payload?.erro || 'Sessão expirada', 401, payload);
    }

    if (!res.ok) {
      throw new ApiError(payload?.erro || `HTTP ${res.status}`, res.status, payload);
    }

    return payload;
  }

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  }

  return {
    ApiError,
    token: { get: getToken, set: setToken, clear: clearToken },
    user:  { get: getUser, set: setUser },

    health: () => request('GET', '/api/health'),
    config: () => request('GET', '/api/config'),

    auth: {
      login: (email, password) => request('POST', '/api/auth/login', { body: { email, password } }),
      me:    () => request('GET', '/api/auth/me')
    },

    users: {
      list:   () => request('GET',   '/api/users'),
      create: (data) => request('POST',  '/api/users', { body: data }),
      update: (id, data) => request('PATCH', `/api/users/${id}`, { body: data })
    },

    searches: {
      create: (termo, localizacao) =>
        request('POST', '/api/searches', { body: { termo, localizacao } }),
      list: (params) => request('GET', '/api/searches', { query: params })
    },

    leads: {
      list:   (params) => request('GET',  '/api/leads', { query: params }),
      stats:  () => request('GET', '/api/leads/stats'),
      get:    (id) => request('GET',    `/api/leads/${id}`),
      update: (id, data) => request('PATCH',  `/api/leads/${id}`, { body: data }),
      destroy:(id) => request('DELETE', `/api/leads/${id}`),
      status: (id, status, motivo) =>
        request('POST', `/api/leads/${id}/status`, { body: { status, motivo } }),
      atribuir: (id, responsavelId) =>
        request('POST', `/api/leads/${id}/atribuir`, { body: { responsavelId } }),
      pegar:    (id) => request('POST', `/api/leads/${id}/pegar`),
      enriquecer: (id) => request('POST', `/api/leads/${id}/enriquecer`),
      regerarPitch: (id, canal = 'whatsapp') =>
        request('POST', `/api/leads/${id}/pitch`, { query: { canal } }),
      converter: (id, plano) =>
        request('POST', `/api/leads/${id}/converter`, { body: { plano } })
    }
  };
})();

window.API = API;
