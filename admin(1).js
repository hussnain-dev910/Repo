/* ══════════════════════════════════════════
   admin.js — Hussnain.dev Admin Panel
   
   BUG FIX: Token refresh k baad invalid
   credentials ka masla theek kiya gaya hai.
   
   Root Cause: Backend ka real JWT hai jo
   localStorage mein save hota tha, lekin
   enterAdmin() mein username decode karne
   k liye JWT format assume kiya ja raha tha
   (split('.')[1]). Agar backend ka token
   format alag ho toh ye crash karta tha aur
   token delete ho jata tha, jis se dobara
   login mangta tha.
   
   Fix: Username alag se localStorage mein
   save karo, aur token ko sirf verification
   k liye use karo — decode mat karo.
   ══════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════
// CONFIG
// FIX: pehle ye hardcoded 'http://localhost:5000' tha,
// jis wajah se agar admin.html kisi doosre URL (live
// server, ya 127.0.0.1, ya alag port) se khula ho to
// save calls galat jagah jaate the aur silently fail
// ho jaate the ya localhost pe chalne wale kisi
// doosre server ko hit karte the. Ab yeh hamesha usi
// server se baat karega jahan se page khud load hua hai.
// ═══════════════════════════════════════════════
const API_BASE = window.location.origin;

// Token aur username dono alag save karo
let TOKEN    = localStorage.getItem('admin_token') || null;
let USERNAME = localStorage.getItem('admin_username') || 'Admin';

let portfolioData = {};

// ═══════════════════════════════════════════════
// API HELPER — real backend se baat karta hai
// ═══════════════════════════════════════════════
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (TOKEN) opts.headers['Authorization'] = 'Bearer ' + TOKEN;
  if (body)  opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + path, opts);
  const text = await res.text();

  if (!text || !text.trim()) {
    if (!res.ok) throw new Error('Server ne empty response diya');
    return {};
  }

  let data;
  try   { data = JSON.parse(text); }
  catch { throw new Error('Server ne invalid JSON diya: ' + text.substring(0, 100)); }

  if (!res.ok) throw new Error(data.error || data.message || 'Request fail ho gayi');
  return data;
}

// ═══════════════════════════════════════════════
// INIT — page load hone par check karo
// ═══════════════════════════════════════════════
async function init() {
  document.getElementById('apiUrlInfo').textContent = API_BASE;

  // 1. Backend reachable hai?
  try {
    await api('GET', '/api');
    setApiStatus(true);
  } catch {
    setApiStatus(false);
    showPage('loginPage');
    showToast('⚠️ Backend nahi mila. Pehle server start karo.', 'error');
    return;
  }

  // 2. Pehli baar setup chahiye?
  let setupRequired = false;
  try {
    const status = await api('GET', '/api/auth/setup-status');
    setupRequired = status.setupRequired;
  } catch { /* ignore */ }

  showPage(''); // loading hide karo

  if (setupRequired) {
    showPage('setupPage');
    return;
  }

  // 3. Pehle se token saved hai toh seedha andar
  if (TOKEN) {
    try {
      await loadPortfolioData();
      enterAdmin();
      return;
    } catch (err) {
      // Token expire ho gaya ya invalid hai — clear karo
      clearAuth();
    }
  }

  showPage('loginPage');
}

function setApiStatus(ok) {
  document.getElementById('apiDot').className = 'api-dot ' + (ok ? 'connected' : 'disconnected');
  const txt = document.getElementById('apiStatusText');
  txt.textContent = ok ? 'Backend connected' : 'Backend offline';
  txt.style.color = ok ? 'var(--green)' : 'var(--red)';
}

function showPage(id) {
  ['loadingPage','setupPage','loginPage','adminPage'].forEach(p => {
    const el = document.getElementById(p);
    if (!el) return;
    if (p === 'adminPage') el.style.display = 'none';
    else el.style.display = 'none';
  });
  if (!id) return; // sirf loading hide karna tha
  const target = document.getElementById(id);
  if (!target) return;
  target.style.display = id === 'adminPage' ? 'block' : 'flex';
}

// ═══════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════
function saveAuth(token, username) {
  TOKEN    = token;
  USERNAME = username;
  localStorage.setItem('admin_token',    token);
  localStorage.setItem('admin_username', username); // <-- KEY FIX: username alag save
}

function clearAuth() {
  TOKEN    = null;
  USERNAME = 'Admin';
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_username');
}

// ═══════════════════════════════════════════════
// SETUP — pehli baar admin banana
// ═══════════════════════════════════════════════
async function doSetup() {
  const u    = document.getElementById('setupUser').value.trim();
  const p    = document.getElementById('setupPass').value;
  const c    = document.getElementById('setupConfirm').value;
  const btn  = document.getElementById('setupBtn');

  hideAuthMessages();

  if (!u || u.length < 3) { showAuthErr('setupErr', 'setupErrMsg', 'Username kam az kam 3 characters ka hona chahiye'); return; }
  if (!p || p.length < 6) { showAuthErr('setupErr', 'setupErrMsg', 'Password kam az kam 6 characters ka hona chahiye'); return; }
  if (p !== c)            { showAuthErr('setupErr', 'setupErrMsg', 'Dono passwords match nahi karte'); return; }

  btn.disabled = true;
  btn.textContent = 'Account bana raha hun...';

  try {
    const data = await api('POST', '/api/auth/setup', { username: u, password: p });
    saveAuth(data.token, data.username || u);
    document.getElementById('setupOk').classList.add('show');
    setTimeout(async () => {
      await loadPortfolioData();
      enterAdmin();
    }, 1200);
  } catch (err) {
    showAuthErr('setupErr', 'setupErrMsg', err.message);
    btn.disabled = false;
    btn.textContent = 'Admin Account Banao →';
  }
}

// ═══════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════
async function doLogin() {
  const u   = document.getElementById('loginUser').value.trim();
  const p   = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');

  hideAuthMessages();

  if (!u || !p) { showAuthErr('loginErr', 'loginErrMsg', 'Username aur password dono zaroori hain'); return; }

  btn.disabled = true;
  btn.textContent = 'Sign in ho raha hai...';

  try {
    const data = await api('POST', '/api/auth/login', { username: u, password: p });

    // Backend se mila username use karo, warna jo user ne likha
    const uname = data.username || u;
    saveAuth(data.token, uname);

    await loadPortfolioData();
    enterAdmin();
    showToast('Welcome back, ' + uname + '! 👋', 'success');
  } catch (err) {
    showAuthErr('loginErr', 'loginErrMsg', err.message);
    document.getElementById('loginPass').value = '';
    btn.disabled = false;
    btn.textContent = 'Dashboard mein enter karo';
  }
}

function showAuthErr(wrapId, msgId, msg) {
  document.getElementById(msgId).textContent = msg;
  document.getElementById(wrapId).classList.add('show');
}

function hideAuthMessages() {
  ['setupErr','setupOk','loginErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}

function doLogout() {
  clearAuth();
  showPage('loginPage');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
}

// ═══════════════════════════════════════════════
// ENTER ADMIN DASHBOARD
// ═══════════════════════════════════════════════
function enterAdmin() {
  showPage('adminPage');

  // USERNAME seedha localStorage se milta hai — koi JWT decode nahi
  document.getElementById('userName').textContent   = USERNAME;
  document.getElementById('userAvatar').textContent = USERNAME.charAt(0).toUpperCase();

  populateAllForms();
  loadMessages();
  updateDashStats();
}

// ═══════════════════════════════════════════════
// PORTFOLIO DATA LOAD
// ═══════════════════════════════════════════════
async function loadPortfolioData() {
  const data = await api('GET', '/api/portfolio');
  portfolioData = data;
  return data;
}

// ═══════════════════════════════════════════════
// PANEL NAVIGATION
// ═══════════════════════════════════════════════
const PANEL_TITLES = {
  dashboard: 'Dashboard',
  hero:      'Hero Section',
  about:     'About Me',
  skills:    'Skills',
  hobbies:   'Hobbies',
  projects:  'Projects',
  contact:   'Contact Info',
  messages:  'Messages',
  settings:  'Settings'
};

function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes("'" + name + "'")) n.classList.add('active');
  });

  document.getElementById('breadcrumbCurrent').textContent = PANEL_TITLES[name] || name;
  if (name === 'messages') loadMessages();
}

// ═══════════════════════════════════════════════
// SAVE SECTION
// ═══════════════════════════════════════════════
async function saveSection(section, data) {
  try {
    await api('PUT', '/api/portfolio/' + section, { data });
    portfolioData[section] = data;
    flashMsg(section.replace('Info','') + '-msg');
    showToast((PANEL_TITLES[section] || section) + ' save ho gaya!', 'success');
    updateDashStats();
  } catch (err) {
    showToast('Save fail: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════
// POPULATE FORMS
// ═══════════════════════════════════════════════
function populateAllForms() {
  const h = portfolioData.hero || {};
  setVal('h-badge', h.badge); setVal('h-line1', h.line1); setVal('h-line2', h.line2);
  setVal('h-line3', h.line3); setVal('h-desc', h.desc);
  setVal('h-s1', h.s1); setVal('h-s2', h.s2); setVal('h-s3', h.s3);

  const a = portfolioData.about || {};
  setVal('a-name', a.name); setVal('a-badge', a.badge);
  setVal('a-p1', a.p1); setVal('a-p2', a.p2); setVal('a-p3', a.p3);
  setVal('a-tags', a.tags);

  const hob = portfolioData.hobbies || {};
  setVal('hob-intro', hob.intro);

  const c = portfolioData.contactInfo || {};
  setVal('c-heading', c.heading); setVal('c-sub', c.sub);
  setVal('c-email', c.email); setVal('c-linkedin', c.linkedin);
  setVal('c-github', c.github); setVal('c-footer', c.footer);

  renderSkills();
  renderHobbies();
  renderProjects();
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val || '';
}

function g(id) { return document.getElementById(id)?.value || ''; }

// ── DATA GETTERS ──
function getHeroData()    { return { badge:g('h-badge'), line1:g('h-line1'), line2:g('h-line2'), line3:g('h-line3'), desc:g('h-desc'), s1:g('h-s1'), s2:g('h-s2'), s3:g('h-s3') }; }
function getAboutData()   { return { name:g('a-name'), badge:g('a-badge'), p1:g('a-p1'), p2:g('a-p2'), p3:g('a-p3'), tags:g('a-tags') }; }
function getContactData() { return { heading:g('c-heading'), sub:g('c-sub'), email:g('c-email'), linkedin:g('c-linkedin'), github:g('c-github'), footer:g('c-footer') }; }

// ═══════════════════════════════════════════════
// SKILLS
// ═══════════════════════════════════════════════
function getSkills() { return portfolioData.skills || []; }

function renderSkills() {
  const arr  = getSkills();
  const list = document.getElementById('skills-list');
  document.getElementById('skills-count').textContent = arr.length + ' skill' + (arr.length !== 1 ? 's' : '');

  if (!arr.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚡</div>Abhi koi skill nahi. Pehla skill add karo!</div>';
    return;
  }
  list.innerHTML = arr.map(s => `
    <div class="item-row">
      <div class="item-emoji">${s.icon || '⚡'}</div>
      <div class="item-info">
        <div class="item-name">${s.name}</div>
        <div class="item-meta">${(s.list || '').replace(/\n/g,' · ')}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editSkill(${s.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteSkill(${s.id})">🗑</button>
      </div>
    </div>`).join('');
}

function openSkillModal(id = null) {
  document.getElementById('skillModalTitle').textContent = id ? 'Skill Edit Karo' : 'Skill Add Karo';
  document.getElementById('skill-edit-id').value = id || '';
  if (id) {
    const s = getSkills().find(x => x.id === id);
    if (s) { setVal('sk-icon', s.icon); setVal('sk-name', s.name); setVal('sk-list', s.list); }
  } else {
    ['sk-icon','sk-name','sk-list'].forEach(i => setVal(i, ''));
  }
  openModal('skillModal');
}

function editSkill(id) { openSkillModal(id); }

async function deleteSkill(id) {
  if (!confirm('Yeh skill delete karna chahte ho?')) return;
  await saveSection('skills', getSkills().filter(s => s.id !== id));
  renderSkills();
}

async function saveSkill() {
  const name = g('sk-name').trim();
  if (!name) { showToast('Skill ka naam zaroori hai', 'error'); return; }

  const arr    = [...getSkills()];
  const editId = parseInt(document.getElementById('skill-edit-id').value) || 0;
  const obj    = { id: editId || Date.now(), icon: g('sk-icon').trim() || '⚡', name, list: g('sk-list').trim() };

  if (editId) { const idx = arr.findIndex(s => s.id === editId); arr[idx] = obj; }
  else arr.push(obj);

  await saveSection('skills', arr);
  renderSkills();
  closeModal('skillModal');
}

// ═══════════════════════════════════════════════
// HOBBIES
// ═══════════════════════════════════════════════
function getHobbies() { return portfolioData.hobbies || { intro: '', items: [] }; }

async function saveHobbiesIntro() {
  const d = { ...getHobbies(), intro: g('hob-intro') };
  await saveSection('hobbies', d);
  flashMsg('hob-msg');
}

function renderHobbies() {
  const d    = getHobbies();
  setVal('hob-intro', d.intro);
  const list = document.getElementById('hobbies-list');
  const items = d.items || [];
  document.getElementById('hobbies-count').textContent = items.length + ' hobb' + (items.length === 1 ? 'y' : 'ies');

  if (!items.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div>Abhi koi hobby nahi.</div>';
    return;
  }
  list.innerHTML = items.map(h => `
    <div class="item-row">
      <div class="item-emoji">${h.icon || '🎯'}</div>
      <div class="item-info">
        <div class="item-name">${h.name}</div>
        <div class="item-meta">${h.tags || ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editHobby(${h.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteHobby(${h.id})">🗑</button>
      </div>
    </div>`).join('');
}

function openHobbyModal(id = null) {
  document.getElementById('hobbyModalTitle').textContent = id ? 'Hobby Edit Karo' : 'Hobby Add Karo';
  document.getElementById('hobby-edit-id').value = id || '';
  if (id) {
    const h = (getHobbies().items || []).find(x => x.id === id);
    if (h) { setVal('hb-icon', h.icon); setVal('hb-name', h.name); setVal('hb-desc', h.desc); setVal('hb-tags', h.tags); }
  } else {
    ['hb-icon','hb-name','hb-desc','hb-tags'].forEach(i => setVal(i, ''));
  }
  openModal('hobbyModal');
}

function editHobby(id) { openHobbyModal(id); }

async function deleteHobby(id) {
  if (!confirm('Yeh hobby delete karna chahte ho?')) return;
  const d = JSON.parse(JSON.stringify(getHobbies()));
  d.items = (d.items || []).filter(h => h.id !== id);
  await saveSection('hobbies', d);
  renderHobbies();
}

async function saveHobby() {
  const name = g('hb-name').trim();
  if (!name) { showToast('Hobby ka naam zaroori hai', 'error'); return; }

  const d      = JSON.parse(JSON.stringify(getHobbies()));
  const editId = parseInt(document.getElementById('hobby-edit-id').value) || 0;
  const obj    = { id: editId || Date.now(), icon: g('hb-icon').trim() || '🎯', name, desc: g('hb-desc').trim(), tags: g('hb-tags').trim() };

  if (editId) { const idx = d.items.findIndex(h => h.id === editId); d.items[idx] = obj; }
  else d.items.push(obj);

  await saveSection('hobbies', d);
  renderHobbies();
  closeModal('hobbyModal');
}

// ═══════════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════════
function getProjects() { return portfolioData.projects || []; }

function renderProjects() {
  const arr  = getProjects();
  const list = document.getElementById('projects-list');
  document.getElementById('projects-count').textContent = arr.length + ' project' + (arr.length !== 1 ? 's' : '');

  if (!arr.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🚀</div>Abhi koi project nahi.</div>';
    return;
  }
  list.innerHTML = arr.map(p => `
    <div class="item-row">
      <div class="item-emoji">${p.icon || '🚀'}</div>
      <div class="item-info">
        <div class="item-name">${p.name}</div>
        <div class="item-meta">${p.stack || ''}</div>
      </div>
      <div class="item-badge">${p.year || ''}</div>
      <div class="item-actions">
        <button class="btn btn-secondary btn-sm" onclick="editProject(${p.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm"    onclick="deleteProject(${p.id})">🗑</button>
      </div>
    </div>`).join('');
}

function openProjectModal(id = null) {
  document.getElementById('projectModalTitle').textContent = id ? 'Project Edit Karo' : 'Project Add Karo';
  document.getElementById('proj-edit-id').value = id || '';
  if (id) {
    const p = getProjects().find(x => x.id === id);
    if (p) {
      setVal('pr-icon',p.icon); setVal('pr-name',p.name); setVal('pr-year',p.year);
      setVal('pr-desc',p.desc); setVal('pr-demo',p.demo); setVal('pr-github',p.github);
      setVal('pr-stack',p.stack); setVal('pr-bg',p.bg);
    }
  } else {
    ['pr-icon','pr-name','pr-year','pr-desc','pr-demo','pr-github','pr-stack'].forEach(i => setVal(i,''));
    setVal('pr-bg','linear-gradient(135deg,#0e1f35,#0a2540)');
  }
  openModal('projectModal');
}

function editProject(id) { openProjectModal(id); }

async function deleteProject(id) {
  if (!confirm('Yeh project delete karna chahte ho?')) return;
  await saveSection('projects', getProjects().filter(p => p.id !== id));
  renderProjects();
}

async function saveProject() {
  const name = g('pr-name').trim();
  if (!name) { showToast('Project ka naam zaroori hai', 'error'); return; }

  const arr    = [...getProjects()];
  const editId = parseInt(document.getElementById('proj-edit-id').value) || 0;
  const obj    = {
    id:     editId || Date.now(),
    icon:   g('pr-icon').trim() || '💻',
    name,
    year:   g('pr-year').trim() || '2024',
    desc:   g('pr-desc').trim(),
    demo:   g('pr-demo').trim() || '#',
    github: g('pr-github').trim() || '#',
    stack:  g('pr-stack').trim(),
    bg:     g('pr-bg').trim() || 'linear-gradient(135deg,#0e1f35,#0a2540)'
  };

  if (editId) { const idx = arr.findIndex(p => p.id === editId); arr[idx] = obj; }
  else arr.push(obj);

  await saveSection('projects', arr);
  renderProjects();
  closeModal('projectModal');
}

// ═══════════════════════════════════════════════
// MESSAGES INBOX
// ═══════════════════════════════════════════════
async function loadMessages() {
  const list = document.getElementById('messages-list');
  list.innerHTML = '<div class="empty-state"><div class="loading-spinner" style="margin:0 auto 0.5rem"></div>Load ho raha hai...</div>';
  try {
    const data  = await api('GET', '/api/contact');
    const msgs  = data.messages || [];
    const unread = data.unread || 0;

    updateUnreadBadge(unread);

    if (!msgs.length) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">💬</div>Abhi koi message nahi.</div>';
      return;
    }
    list.innerHTML = msgs.map(m => `
      <div class="msg-card ${!m.read ? 'unread' : ''}" id="msg-${m._id}">
        <div class="msg-header">
          <div class="msg-sender">
            ${!m.read ? '<div class="msg-unread-dot"></div>' : ''}
            ${escHtml(m.name)}
          </div>
          <div class="msg-time">${new Date(m.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <div class="msg-email">✉ ${escHtml(m.email)}</div>
        <div class="msg-body">${escHtml(m.message)}</div>
        <div class="msg-actions">
          ${!m.read
            ? `<button class="btn btn-ghost btn-sm" onclick="markRead('${m._id}')">✓ Read Mark Karo</button>`
            : '<span style="font-size:0.72rem;color:var(--text3);font-family:var(--mono);">✓ parh liya</span>'
          }
          <button class="btn btn-danger btn-sm" onclick="deleteMsg('${m._id}')">🗑 Delete</button>
        </div>
      </div>`).join('');
  } catch (err) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div>Messages load nahi hue: ${err.message}</div>`;
  }
}

async function markRead(id) {
  try {
    await api('PATCH', `/api/contact/${id}/read`);
    const card = document.getElementById('msg-' + id);
    if (card) {
      card.classList.remove('unread');
      card.querySelector('.msg-unread-dot')?.remove();
      const actions = card.querySelector('.msg-actions');
      actions.innerHTML = `<span style="font-size:0.72rem;color:var(--text3);font-family:var(--mono);">✓ parh liya</span>
        <button class="btn btn-danger btn-sm" onclick="deleteMsg('${id}')">🗑 Delete</button>`;
    }
    showToast('Read mark ho gaya', 'info');
    refreshUnreadCount();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function deleteMsg(id) {
  if (!confirm('Yeh message delete karna chahte ho?')) return;
  try {
    await api('DELETE', `/api/contact/${id}`);
    document.getElementById('msg-' + id)?.remove();
    showToast('Message delete ho gaya', 'info');
    refreshUnreadCount();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function refreshUnreadCount() {
  try {
    const data = await api('GET', '/api/contact');
    updateUnreadBadge(data.unread || 0);
  } catch {}
}

function updateUnreadBadge(count) {
  const badge = document.getElementById('unreadBadge');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline' : 'none';
  document.getElementById('d-msgs').textContent = count;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
async function changePassword() {
  const oldP = g('s-old'), newP = g('s-new'), conf = g('s-confirm');
  const msgEl = document.getElementById('pwd-msg');
  msgEl.classList.remove('show');

  if (!newP || newP.length < 6) { showPwdMsg('✗ Password kam az kam 6 characters ka hona chahiye', 'var(--red)'); return; }
  if (newP !== conf)            { showPwdMsg('✗ Passwords match nahi karte', 'var(--red)'); return; }

  try {
    await api('POST', '/api/auth/change-password', { oldPassword: oldP, newPassword: newP });
    showPwdMsg('✓ Password update ho gaya!', 'var(--green)');
    ['s-old','s-new','s-confirm'].forEach(i => setVal(i,''));
    showToast('Password successfully change ho gaya!', 'success');
  } catch (err) {
    showPwdMsg('✗ ' + err.message, 'var(--red)');
  }
}

function showPwdMsg(text, color) {
  const el = document.getElementById('pwd-msg');
  el.textContent = text;
  el.style.color = color;
  el.classList.add('show');
}

async function resetAll() {
  if (!confirm('Sab portfolio data defaults par reset karna chahte ho?\n\nYeh wapas nahi ho sakta.')) return;
  try {
    const DEFAULT_SECTIONS = ['hero','about','skills','hobbies','projects','contactInfo'];
    for (const s of DEFAULT_SECTIONS) {
      try { await api('DELETE', '/api/portfolio/' + s); } catch {}
    }
    portfolioData = await loadPortfolioData();
    populateAllForms();
    showToast('Sab data defaults par reset ho gaya', 'info');
  } catch (err) {
    showToast('Reset error: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════
function updateDashStats() {
  document.getElementById('d-projects').textContent = getProjects().length;
  document.getElementById('d-skills').textContent   = getSkills().length;
  document.getElementById('d-hobbies').textContent  = (getHobbies().items || []).length;
}

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'success') {
  const icons = { success:'✓', error:'✗', info:'ℹ' };
  const el    = document.getElementById('toast');
  document.getElementById('toastMsg').textContent  = msg;
  document.getElementById('toastIcon').textContent = icons[type] || '✓';
  el.className = 'toast ' + type;
  clearTimeout(toastTimer);
  void el.offsetWidth; // reflow trigger
  el.classList.add('show');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

function flashMsg(id, text = '✓ Database mein save ho gaya') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── START ──
init();