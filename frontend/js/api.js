const API_BASE = 'https://aeronetb-api-aici.onrender.com/api';

function getToken()   { return localStorage.getItem('token'); }
function getUser()    { return JSON.parse(localStorage.getItem('user') || 'null'); }
function logout()     { localStorage.clear(); window.location.href = 'index.html'; }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) { logout(); return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const Auth         = { me: () => apiFetch('/auth/me') };
const Suppliers    = { list: () => apiFetch('/suppliers'), performance: () => apiFetch('/suppliers/performance'), get: (id) => apiFetch(`/suppliers/${id}`), create: (data) => apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => apiFetch(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }) };
const Orders       = { list: (p={}) => apiFetch('/orders?'+new URLSearchParams(p)), delayed: () => apiFetch('/orders/delayed'), get: (id) => apiFetch(`/orders/${id}`), create: (data) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) }), updateStatus: (id, status) => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }) };
const Shipments    = { list: () => apiFetch('/shipments'), get: (id) => apiFetch(`/shipments/${id}`), addUpdate: (id, data) => apiFetch(`/shipments/${id}/update`, { method: 'POST', body: JSON.stringify(data) }) };
const QCReports    = { list: (p={}) => apiFetch('/qc-reports?'+new URLSearchParams(p)), stats: () => apiFetch('/qc-reports/stats'), get: (id) => apiFetch(`/qc-reports/${id}`), create: (data) => apiFetch('/qc-reports', { method: 'POST', body: JSON.stringify(data) }), update: (id, data) => apiFetch(`/qc-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }) };
const Certifications = { list: (p={}) => apiFetch('/certifications?'+new URLSearchParams(p)), get: (id) => apiFetch(`/certifications/${id}`), create: (data) => apiFetch('/certifications', { method: 'POST', body: JSON.stringify(data) }), approve: (id) => apiFetch(`/certifications/${id}/approve`, { method: 'PATCH' }) };
const IoT          = { latest: () => apiFetch('/iot'), alerts: () => apiFetch('/iot/alerts'), history: (id) => apiFetch(`/iot/${id}/history`), post: (data) => apiFetch('/iot', { method: 'POST', body: JSON.stringify(data) }) };
const Equipment    = { list: () => apiFetch('/equipment') };
const Audit        = { list: (p={}) => apiFetch('/audit?'+new URLSearchParams(p)) };
