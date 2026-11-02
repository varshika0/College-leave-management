/* ============ Campus Connect — main application logic ============
   Uses browser localStorage as its database (no server needed).
   Roles: student, staff, hod, admin                          */

/* ---------- Data layer ---------- */
const DB = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem('cc_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { localStorage.setItem('cc_' + key, JSON.stringify(val)); }
};

/* Seed demo accounts (only on first run) */
if (!DB.get('seeded', false)) {
  DB.set('users', [
    { id: 's1', role: 'student', regno: '21CS001', name: 'Aarav Kumar', password: 'student123',
      email: 'aarav@campus.edu', dept: 'B.Sc Computer Science', year: 'III Year',
      phone: '9000000001', father: { name: '', phone: '' }, mother: { name: '', phone: '' },
      address: '' },
    { id: 'st1', role: 'staff', regno: 'STF001', name: 'Ms. Priya', password: 'staff123',
      email: 'priya@campus.edu', dept: 'B.Sc Computer Science' },
    { id: 'h1', role: 'hod', regno: 'HOD001', name: 'Dr. Rajan', password: 'hod123',
      email: 'rajan@campus.edu', dept: 'B.Sc Computer Science' },
    { id: 'a1', role: 'admin', regno: 'ADM001', name: 'Admin', password: 'admin123',
      email: 'admin@campus.edu', dept: '—' }
  ]);
  DB.set('leaves', []);
  DB.set('notifs', []);
  DB.set('seeded', true);
}

const store = {
  users: () => DB.get('users', []),
  saveUsers: (u) => DB.set('users', u),
  leaves: () => DB.get('leaves', []),
  saveLeaves: (l) => DB.set('leaves', l),
  notifs: () => DB.get('notifs', []),
  saveNotifs: (n) => DB.set('notifs', n)
};

let currentUser = null;
let currentRole = null;
let resetTargetId = null;

/* ---------- Screen navigation ---------- */
const $ = (id) => document.getElementById(id);
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

$('enterCampusBtn').addEventListener('click', () => show('roleScreen'));
$('backToSplash').addEventListener('click', () => show('splash'));

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    currentRole = card.dataset.role;
    const meta = {
      student: ['🎓', 'Student Login', 'Login with your Email / Phone / Register Number'],
      staff: ['📚', 'Staff Login', 'Login with your Email / Phone'],
      hod: ['🏛️', 'HOD / Dean Login', 'Login with your Email / Phone'],
      admin: ['⚙️', 'Admin Login', 'Login with your Admin Email']
    }[currentRole];
    $('loginRoleIcon').textContent = meta[0];
    $('loginRoleTitle').textContent = meta[1];
    $('loginRoleHint').textContent = meta[2];
    $('loginError').textContent = '';
    $('loginForm').reset();
    show('loginScreen');
  });
});

$('backToRoles').addEventListener('click', () => show('roleScreen'));
$('backToLogin').addEventListener('click', () => show('loginScreen'));
$('backToLogin2').addEventListener('click', () => show('loginScreen'));
$('forgotBtn').addEventListener('click', () => { $('forgotMsg').textContent = ''; $('forgotForm').reset(); show('forgotScreen'); });

/* ---------- Login (email / phone / register number + password) ---------- */
$('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const idVal = $('loginId').value.trim().toLowerCase();
  const pass = $('loginPass').value;
  const user = store.users().find(u =>
    u.role === currentRole &&
    (u.regno.toLowerCase() === idVal ||
      (u.email && u.email.toLowerCase() === idVal) ||
      (u.phone && u.phone === $('loginId').value.trim()))
  );
  if (!user || user.password !== pass) {
    $('loginError').textContent = 'Wrong Email / Phone / Register Number or password.';
    return;
  }
  currentUser = user;
  openApp();
});

/* ---------- Register (new users create their account) ---------- */
$('registerBtn').addEventListener('click', () => {
  $('registerForm').reset();
  $('regError').textContent = '';
  syncRegFields();
  show('registerScreen');
});
$('backToLogin3').addEventListener('click', () => show('loginScreen'));

function syncRegFields() {
  const role = $('regRole').value;
  $('regYearWrap').style.display = role === 'student' ? '' : 'none';
  $('regRegLabel').textContent = role === 'student' ? 'Register Number' : role === 'staff' ? 'Staff ID' : 'HOD ID';
}
$('regRole').addEventListener('change', syncRegFields);

$('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const err = (m) => { $('regError').textContent = m; };
  err('');
  const role = $('regRole').value;
  const name = $('regName').value.trim();
  const regno = $('regRegno').value.trim();
  const email = $('regEmail').value.trim();
  const phone = $('regPhone').value.trim();
  const pass = $('regPass').value;
  const users = store.users();
  if (pass.length < 6) return err('Password must be at least 6 characters.');
  if (pass !== $('regPass2').value) return err('Passwords do not match.');
  if (!/^[0-9]{10}$/.test(phone)) return err('Enter a valid 10-digit phone number.');
  if (users.some(u => u.regno.toLowerCase() === regno.toLowerCase()))
    return err(role === 'student' ? 'That Register Number already has an account.' : 'That ID already exists.');
  if (users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase()))
    return err('An account with that email already exists — just login instead.');
  if (users.some(u => u.phone === phone))
    return err('An account with that phone number already exists — just login instead.');
  const nu = {
    id: 'u' + Date.now(), role, name, regno, email, phone, password: pass,
    dept: $('regDept').value.trim(),
    year: role === 'student' ? $('regYear').value : '',
    father: { name: '', phone: '' }, mother: { name: '', phone: '' },
    address: '', profileFilled: false
  };
  users.push(nu);
  store.saveUsers(users);
  // Take the new user to login with their email prefilled — they now login with email/phone + password
  currentRole = role;
  const meta = {
    student: ['🎓', 'Student Login', 'Login with your Email / Phone / Register Number'],
    staff: ['📚', 'Staff Login', 'Login with your Email / Phone'],
    hod: ['🏛️', 'HOD / Dean Login', 'Login with your Email / Phone']
  }[role];
  $('loginRoleIcon').textContent = meta[0];
  $('loginRoleTitle').textContent = meta[1];
  $('loginRoleHint').textContent = meta[2];
  $('loginId').value = email;
  $('loginPass').value = '';
  $('loginError').textContent = '';
  toast('Account created! Login with your email or phone + password.');
  show('loginScreen');
});

/* ---------- Forgot password (sends reset link) ---------- */
$('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const idVal = $('forgotEmail').value.trim().toLowerCase();
  const user = store.users().find(u =>
    u.regno.toLowerCase() === idVal ||
    (u.email && u.email.toLowerCase() === idVal) ||
    (u.phone && u.phone === $('forgotEmail').value.trim())
  );
  if (!user) {
    $('forgotMsg').style.color = 'var(--danger)';
    $('forgotMsg').textContent = 'No account found with that Register Number / Email.';
    return;
  }
  resetTargetId = user.id;
  $('forgotMsg').style.color = 'var(--ok)';
  $('forgotMsg').textContent = `Reset link sent to ${user.email}. Opening link…`;
  addNotif(user.id, '🔑 Password reset link sent to your email.');
  setTimeout(() => {
    $('resetForUser').textContent = `Account: ${user.name} (${user.regno})`;
    $('resetForm').reset();
    $('resetMsg').textContent = '';
    show('resetScreen');
  }, 1200);
});

$('resetForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const p1 = $('newPass').value, p2 = $('confirmPass').value;
  if (p1.length < 6) { $('resetMsg').style.color = 'var(--danger)'; $('resetMsg').textContent = 'Password must be at least 6 characters.'; return; }
  if (p1 !== p2) { $('resetMsg').style.color = 'var(--danger)'; $('resetMsg').textContent = 'Passwords do not match.'; return; }
  const users = store.users();
  const u = users.find(x => x.id === resetTargetId);
  if (u) { u.password = p1; store.saveUsers(users); }
  $('resetMsg').style.color = 'var(--ok)';
  $('resetMsg').textContent = 'Password updated! You can login now.';
  setTimeout(() => show('loginScreen'), 1200);
});

/* ---------- Notifications ---------- */
function addNotif(userId, text) {
  const n = store.notifs();
  n.unshift({ id: Date.now() + Math.random(), userId, text, time: new Date().toLocaleString(), read: false });
  store.saveNotifs(n);
  renderNotifs();
}
function renderNotifs() {
  if (!currentUser) return;
  const mine = store.notifs().filter(n => n.userId === currentUser.id);
  const unread = mine.filter(n => !n.read).length;
  $('notifCount').textContent = unread;
  $('notifCount').classList.toggle('hidden', unread === 0);
  $('notifList').innerHTML = mine.length
    ? mine.map(n => `<li>${n.text}<span>${n.time}</span></li>`).join('')
    : '<li>No notifications yet.</li>';
}
$('notifBtn').addEventListener('click', () => {
  const p = $('notifPanel');
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) {
    const n = store.notifs();
    n.forEach(x => { if (x.userId === currentUser.id) x.read = true; });
    store.saveNotifs(n);
    renderNotifs();
  }
});
$('clearNotif').addEventListener('click', () => {
  store.saveNotifs(store.notifs().filter(n => n.userId !== currentUser.id));
  renderNotifs();
});

/* ---------- App shell ---------- */
function openApp() {
  $('headerUserName').textContent = `${currentUser.name} · ${currentUser.role.toUpperCase()}`;
  renderNotifs();
  buildNav();
  show('appScreen');
  goTab(navFor(currentUser.role)[0].id);
}
$('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  $('notifPanel').classList.add('hidden');
  show('roleScreen');
});

function navFor(role) {
  if (role === 'student') return [
    { id: 'apply', label: '📝 Apply Leave' },
    { id: 'status', label: '📊 My Leave Status' },
    { id: 'profile', label: '👤 My Profile' }
  ];
  if (role === 'staff') return [
    { id: 'pending', label: '📥 Applications' },
    { id: 'profile', label: '👤 My Profile' }
  ];
  if (role === 'hod') return [
    { id: 'pending', label: '📥 Approve / Reject' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'profile', label: '👤 My Profile' }
  ];
  return [
    { id: 'manage', label: '🛠️ Manage Users' },
    { id: 'allleave', label: '📄 All Leave Records' },
    { id: 'reports', label: '📈 Reports' },
    { id: 'profile', label: '👤 My Profile' }
  ];
}
function buildNav() {
  const nav = $('appNav');
  nav.innerHTML = '';
  navFor(currentUser.role).forEach(item => {
    const b = document.createElement('button');
    b.className = 'nav-btn';
    b.textContent = item.label;
    b.dataset.tab = item.id;
    b.addEventListener('click', () => goTab(item.id));
    nav.appendChild(b);
  });
}
let currentTab = null;
function goTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const main = $('appMain');
  if (tab === 'apply') main.innerHTML = viewApply();
  else if (tab === 'status') main.innerHTML = viewStatus();
  else if (tab === 'profile') main.innerHTML = viewProfile();
  else if (tab === 'pending') main.innerHTML = viewPending();
  else if (tab === 'reports') main.innerHTML = viewReports();
  else if (tab === 'manage') main.innerHTML = viewManage();
  else if (tab === 'allleave') main.innerHTML = viewAllLeave();
  bindAppEvents(tab);
}

/* ---------- Helpers ---------- */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(msg) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function today() { return new Date().toISOString().slice(0, 10); }

/* Duplicate certificate detector: did this exact file (fingerprint)
   already appear in any other leave record — same student or not? */
function duplicatesOf(leaf) {
  if (!leaf.fingerprint) return [];
  return store.leaves().filter(l =>
    l.id !== leaf.id && l.fingerprint && l.fingerprint === leaf.fingerprint
  );
}
/* ---------- AI certificate authenticity (staff/HOD verification) ---------- */
const VERDICT_META = {
  likely_real: { label: '✅ AI: Looks authentic', cls: 'ai-real' },
  suspicious:  { label: '⚠️ AI: Suspicious',      cls: 'ai-susp' },
  likely_fake: { label: '🚫 AI: Likely fake',      cls: 'ai-fake' }
};

function guessKind(l) {
  const s = `${l.reason || ''} ${l.attachmentName || ''}`;
  if (/duty|\bod\b/i.test(s)) return 'On-duty (OD) letter';
  if (/med|sick|hospital|fever|clinic/i.test(s)) return 'Medical certificate';
  return 'Leave certificate';
}

function aiCheckHtml(l) {
  if (l.aiError) return `<div class="ai-panel ai-err">🤖 ${esc(l.aiError)}</div>`;
  if (!l.aiCheck) return '';
  const m = VERDICT_META[l.aiCheck.verdict] || VERDICT_META.suspicious;
  return `<div class="ai-panel ${m.cls}">
    <div class="ai-head">${m.label} <span class="ai-conf">${l.aiCheck.confidence}% confidence</span></div>
    <ul>${(l.aiCheck.reasons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <div class="ai-at">Checked by AI on ${esc(l.aiCheck.at)} — verify yourself before deciding.</div>
  </div>`;
}

function loadDataUrlBytes(durl) {
  const bin = atob(durl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      res(window.pdfjsLib);
    };
    s.onerror = () => rej(new Error('could not load the PDF renderer'));
    document.head.appendChild(s);
  });
}

/* Convert the attachment to an image the AI vision API can read
   (images pass through; PDFs have their first page rendered). */
async function attachmentToImage(l) {
  const t = l.attachmentType || '';
  if (t.startsWith('image/')) return l.attachmentData;
  if (t === 'application/pdf') {
    const pdfjs = await loadPdfJs();
    const doc = await pdfjs.getDocument({ data: loadDataUrlBytes(l.attachmentData) }).promise;
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 2 });
    const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    return cv.toDataURL('image/jpeg', 0.9);
  }
  throw new Error('Unsupported file type — AI check needs a JPG/PNG or PDF certificate.');
}

/* Keep payloads small: re-encode big images to a ≤1568px JPEG. */
function shrinkImage(dataUrl) {
  if (dataUrl.length <= 4500000) return Promise.resolve(dataUrl);
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1568 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => res(dataUrl);
    img.src = dataUrl;
  });
}

async function runAiCheck(id) {
  const leaves = store.leaves();
  const l = leaves.find(x => x.id == id);
  if (!l) return;
  if (!l.attachment) { toast('No attachment on this application'); return; }
  const btn = document.querySelector(`.aiCheck[data-id="${id}"]`);
  if (btn) { btn.disabled = true; btn.textContent = '🤖 Analyzing…'; }
  try {
    let img = await attachmentToImage(l);
    img = await shrinkImage(img);
    const stu = store.users().find(u => u.id === l.studentId) || {};
    const resp = await fetch('/api/ai-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: img,
        context: {
          kind: guessKind(l), student: stu.name, dept: stu.dept,
          reason: l.reason, from: l.from, to: l.to, fileName: l.attachmentName
        }
      })
    });
    const out = await resp.json().catch(() => ({}));
    if (!resp.ok || !out.ok) {
      l.aiError = out.error || `AI check failed (HTTP ${resp.status}). Try again.`;
      l.aiCheck = null;
    } else {
      l.aiCheck = {
        verdict: out.verdict,
        confidence: Math.round(out.confidence),
        reasons: out.reasons || [],
        at: new Date().toLocaleString()
      };
      l.aiError = null;
      const stuName = stu.name || 'student';
      if (out.verdict === 'likely_fake')
        addNotif(currentUser.id, `🚫 AI flagged ${stuName}'s certificate as LIKELY FAKE (${out.confidence}% confidence).`);
    }
  } catch (err) {
    l.aiError = 'Could not prepare the document for AI: ' + (err.message || err);
    l.aiCheck = null;
  }
  store.saveLeaves(leaves);
  goTab(currentTab || 'pending');
}

function flagged(l) {
  return l.aiCheck && l.aiCheck.verdict !== 'likely_real';
}

function dupFlagHtml(leaf) {
  const dups = duplicatesOf(leaf);
  if (!dups.length) return '';
  const users = store.users();
  const others = dups.map(l => {
    const s = users.find(u => u.id === l.studentId);
    const name = s ? s.name : 'Unknown';
    const same = l.studentId === leaf.studentId;
    return `${name} (${same ? 'same student' : 'different student'}) on ${l.from}`;
  });
  return `<div class="dup-flag">⚠️ <b>This document was already used</b> — detected in ${dups.length} earlier application(s): ${others.join('; ')}. Possible fake/reused certificate.</div>`;
}

/* ---------- Student: Apply leave ---------- */
function viewApply() {
  return `
  <div class="card">
    <h3>Apply for Leave</h3>
    <form id="leaveForm">
      <label>What are you applying leave for?</label>
      <textarea id="leaveReason" rows="3" placeholder="" required></textarea>
      <label>From date</label>
      <input type="date" id="leaveFrom" min="${today()}" required>
      <label>To date</label>
      <input type="date" id="leaveTo" min="${today()}" required>
      <label>Attachment — Medical certificate / OD letter <i>(optional)</i></label>
      <input type="file" id="leaveFile" accept=".pdf,.jpg,.jpeg,.png">
      <button type="submit" class="primary-btn">Submit</button>
    </form>
  </div>`;
}

/* ---------- Student: Status history ---------- */
function viewStatus() {
  const mine = store.leaves().filter(l => l.studentId === currentUser.id).reverse();
  if (!mine.length) return `<div class="card"><h3>My Leave Status</h3><p style="color:var(--muted)">No leave applications yet.</p></div>`;
  return `
  <div class="card">
    <h3>My Leave Status History</h3>
    ${mine.map(l => `
      <div class="leave-item">
        <div class="row">
          <div>
            <div class="leave-reason">${esc(l.reason)}</div>
            <div class="leave-meta">${l.from} → ${l.to} · ${l.days} day(s) · ${l.attachment ? '📎 ' + esc(l.attachmentName) : 'No attachment'}</div>
            ${l.reviewerNote ? `<div class="leave-meta">Reviewer: ${esc(l.reviewerNote)}</div>` : ''}
          </div>
          <span class="pill ${l.status}">${l.status}</span>
        </div>
      </div>`).join('')}
  </div>`;
}

/* ---------- Student/Admin: Profile ---------- */
function viewProfile() {
  const u = currentUser;
  const isStudent = u.role === 'student';
  if (isStudent && !u.profileFilled) {
    return `
    <div class="card">
      <h3>Complete Your Profile</h3>
      <p style="color:var(--muted);font-size:.83rem;margin-bottom:10px">Fill in your personal details to view your full profile.</p>
      <form id="profileForm">
        <div class="profile-grid">
          <div><label>Department</label><input id="pfDept" value="${esc(u.dept)}" required></div>
          <div><label>Year</label>
            <select id="pfYear">${['I Year', 'II Year', 'III Year', 'IV Year'].map(y => `<option ${u.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
          </div>
          <div><label>Student phone number</label><input id="pfPhone" value="${esc(u.phone || '')}" required></div>
          <div><label>Address</label><input id="pfAddress" value="${esc(u.address || '')}" required></div>
          <div><label>Father's name</label><input id="pfFatherName" required></div>
          <div><label>Father's phone number</label><input id="pfFatherPhone" required></div>
          <div><label>Mother's name</label><input id="pfMotherName" required></div>
          <div><label>Mother's phone number</label><input id="pfMotherPhone" required></div>
        </div>
        <button type="submit" class="primary-btn">Save Profile</button>
      </form>
    </div>`;
  }
  if (isStudent) {
    return `
    <div class="card">
      <h3>My Profile</h3>
      <div class="profile-grid">
        <div><label>Name</label><div class="view-only">${esc(u.name)}</div></div>
        <div><label>Register Number</label><div class="view-only">${esc(u.regno)}</div></div>
        <div><label>Email</label><div class="view-only">${esc(u.email)}</div></div>
        <div><label>Department</label><div class="view-only">${esc(u.dept)}</div></div>
        <div><label>Year</label><div class="view-only">${esc(u.year)}</div></div>
        <div><label>Student phone</label><div class="view-only">${esc(u.phone)}</div></div>
        <div><label>Address</label><div class="view-only">${esc(u.address)}</div></div>
        <div><label>Father</label><div class="view-only">${esc(u.father.name)} · ${esc(u.father.phone)}</div></div>
        <div><label>Mother</label><div class="view-only">${esc(u.mother.name)} · ${esc(u.mother.phone)}</div></div>
      </div>
      <button class="secondary-btn" id="editProfileBtn" style="margin-top:16px">Edit profile</button>
    </div>`;
  }
  return `
  <div class="card">
    <h3>My Profile</h3>
    <div class="profile-grid">
      <div><label>Name</label><div class="view-only">${esc(u.name)}</div></div>
      <div><label>ID</label><div class="view-only">${esc(u.regno)}</div></div>
      <div><label>Email</label><div class="view-only">${esc(u.email)}</div></div>
      <div><label>Department</label><div class="view-only">${esc(u.dept)}</div></div>
      <div><label>Role</label><div class="view-only">${esc(u.role.toUpperCase())}</div></div>
    </div>
  </div>`;
}

/* ---------- Staff/HOD: pending applications ---------- */
function viewPending() {
  let list = store.leaves();
  if (currentUser.role === 'staff') list = list.filter(l => l.status === 'pending');
  const users = store.users();
  if (!list.length) return `<div class="card"><h3>Applications</h3><p style="color:var(--muted)">No applications right now.</p></div>`;
  return `
  <div class="card">
    <h3>${currentUser.role === 'hod' ? 'Approve / Reject Leave' : 'Applications (forwarded to HOD)'}</h3>
    ${list.map(l => {
      const st = users.find(u => u.id === l.studentId) || { name: 'Unknown', regno: '—', dept: '—' };
      return `
      <div class="leave-item">
        <div class="row">
          <div>
            <div class="leave-reason">${esc(st.name)} (${esc(st.regno)}) — ${esc(st.dept)}</div>
            <div class="leave-meta">${esc(l.reason)}</div>
            <div class="leave-meta">${l.from} → ${l.to} · ${l.days} day(s)</div>
            ${l.attachment ? `<button class="link-btn small viewAttach" data-id="${l.id}">📎 View attachment</button>` : ''}
            ${dupFlagHtml(l)}
            ${aiCheckHtml(l)}
          </div>
          <span class="pill ${l.status}">${l.status}</span>
        </div>
        ${currentUser.role === 'hod' ? `
        <div class="action-btns">
          ${l.attachment ? `<button class="mini-btn alt aiCheck" data-id="${l.id}">🤖 AI Check</button>` : ''}
          <button class="mini-btn ok actApp" data-id="${l.id}" ${!['pending','forwarded'].includes(l.status) ? 'disabled' : ''}>✓ Accept</button>
          <button class="mini-btn no actRej" data-id="${l.id}" ${!['pending','forwarded'].includes(l.status) ? 'disabled' : ''}>✗ Reject</button>
        </div>` : `
        <div class="action-btns">
          ${l.attachment ? `<button class="mini-btn alt aiCheck" data-id="${l.id}">🤖 AI Check</button>` : ''}
          <button class="mini-btn alt actFwd" data-id="${l.id}" ${l.status !== 'pending' ? 'disabled' : ''}>Forward to HOD</button>
        </div>`}
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------- Reports ---------- */
function viewReports() {
  const leaves = currentUser.role === 'admin' ? store.leaves()
    : store.leaves().filter(l => { const s = store.users().find(u => u.id === l.studentId); return s && s.dept === currentUser.dept; });
  const app = leaves.filter(l => l.status === 'approved').length;
  const rej = leaves.filter(l => l.status === 'rejected').length;
  const pend = leaves.filter(l => l.status === 'pending').length;
  return `
  <div class="stats-row">
    <div class="stat"><b>${leaves.length}</b><span>Total</span></div>
    <div class="stat"><b style="color:var(--ok)">${app}</b><span>Approved</span></div>
    <div class="stat"><b style="color:var(--danger)">${rej}</b><span>Rejected</span></div>
    <div class="stat"><b style="color:var(--warn)">${pend}</b><span>Pending</span></div>
  </div>
  <div class="card table-scroll">
    <h3>Leave Report</h3>
    <table>
      <tr><th>Student</th><th>Dept</th><th>From</th><th>To</th><th>Status</th></tr>
      ${leaves.map(l => {
        const s = store.users().find(u => u.id === l.studentId) || { name: '—', dept: '—' };
        return `<tr><td>${esc(s.name)}</td><td>${esc(s.dept)}</td><td>${l.from}</td><td>${l.to}</td><td><span class="pill ${l.status}">${l.status}</span></td></tr>`;
      }).join('') || '<tr><td colspan="5">No records.</td></tr>'}
    </table>
  </div>`;
}

/* ---------- Admin: manage users ---------- */
function viewManage() {
  const users = store.users();
  return `
  <div class="card">
    <h3>Add User</h3>
    <form id="addUserForm">
      <div class="profile-grid">
        <div><label>Role</label>
          <select id="auRole">
            <option value="student">Student</option>
            <option value="staff">Staff</option>
            <option value="hod">HOD</option>
          </select>
        </div>
        <div><label>Name</label><input id="auName" required></div>
        <div><label>Register No / Staff ID</label><input id="auReg" required></div>
        <div><label>Email</label><input id="auEmail" type="email" required></div>
        <div><label>Department</label><input id="auDept" required></div>
        <div><label>Password</label><input id="auPass" required></div>
      </div>
      <button type="submit" class="primary-btn">Add User</button>
    </form>
  </div>
  <div class="card table-scroll">
    <h3>All Users</h3>
    <table>
      <tr><th>Name</th><th>ID</th><th>Role</th><th>Dept</th><th></th></tr>
      ${users.map(u => `
        <tr>
          <td>${esc(u.name)}</td><td>${esc(u.regno)}</td>
          <td><span class="pill ${u.role === 'hod' ? 'forwarded' : u.role === 'student' ? 'pending' : 'approved'}">${u.role}</span></td>
          <td>${esc(u.dept)}</td>
          <td>${u.role !== 'admin' ? `<button class="link-btn small delUser" data-id="${u.id}" style="color:var(--danger)">Delete</button>` : ''}</td>
        </tr>`).join('')}
    </table>
  </div>`;
}

function viewAllLeave() {
  const leaves = store.leaves();
  return `
  <div class="card table-scroll">
    <h3>All Leave Records</h3>
    <table>
      <tr><th>Student</th><th>Reason</th><th>From</th><th>To</th><th>Status</th><th></th></tr>
      ${leaves.map(l => {
        const s = store.users().find(u => u.id === l.studentId) || { name: '—' };
        return `<tr>
          <td>${esc(s.name)}</td><td>${esc(l.reason)}</td>
          <td>${l.from}</td><td>${l.to}</td>
          <td><span class="pill ${l.status}">${l.status}</span></td>
          <td>${l.attachment ? `<button class="link-btn small viewAttach" data-id="${l.id}">📎</button> <button class="mini-btn alt aiCheck" data-id="${l.id}">🤖</button>` : ''} ${dupFlagHtml(l)} ${aiCheckHtml(l)}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="6">No records.</td></tr>'}
    </table>
  </div>`;
}

/* ---------- Event binding per tab ---------- */
function bindAppEvents(tab) {
  const leaveForm = $('leaveForm');
  if (leaveForm) {
    leaveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const from = $('leaveFrom').value, to = $('leaveTo').value;
      if (to < from) { toast('To date must be after From date'); return; }
      const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
      const file = $('leaveFile').files[0];
      const leaves = store.leaves();
      const record = {
        id: Date.now(), studentId: currentUser.id,
        reason: $('leaveReason').value.trim(), from, to, days,
        status: 'pending', attachment: false, attachmentName: '', attachmentType: '', attachmentData: '',
        fingerprint: ''
      };
      if (file) {
        record.attachment = true;
        record.attachmentName = file.name;
        record.attachmentType = file.type;
        // Duplicate certificate detector: unique SHA-256 fingerprint of the file bytes
        try {
          const buf = await file.arrayBuffer();
          const hashBuf = await crypto.subtle.digest('SHA-256', buf);
          record.fingerprint = Array.from(new Uint8Array(hashBuf))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (err) {
          console.warn('Fingerprint unavailable', err);
        }
        const reader = new FileReader();
        reader.onload = () => {
          record.attachmentData = reader.result;
          leaves.push(record); store.saveLeaves(leaves);
          afterLeaveSubmit(record);
        };
        reader.readAsDataURL(file);
      } else {
        leaves.push(record); store.saveLeaves(leaves);
        afterLeaveSubmit(record);
      }
    });
  }

  const profileForm = $('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const users = store.users();
      const u = users.find(x => x.id === currentUser.id);
      Object.assign(u, {
        dept: $('pfDept').value.trim(), year: $('pfYear').value,
        phone: $('pfPhone').value.trim(), address: $('pfAddress').value.trim(),
        father: { name: $('pfFatherName').value.trim(), phone: $('pfFatherPhone').value.trim() },
        mother: { name: $('pfMotherName').value.trim(), phone: $('pfMotherPhone').value.trim() },
        profileFilled: true
      });
      store.saveUsers(users);
      currentUser = u;
      toast('Profile saved!');
      goTab('profile');
    });
  }
  const editBtn = $('editProfileBtn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const u = currentUser;
      $('appMain').innerHTML = `
      <div class="card">
        <h3>Edit Profile</h3>
        <form id="profileForm">
          <div class="profile-grid">
            <div><label>Department</label><input id="pfDept" value="${esc(u.dept)}" required></div>
            <div><label>Year</label>
              <select id="pfYear">${['I Year', 'II Year', 'III Year', 'IV Year'].map(y => `<option ${u.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select>
            </div>
            <div><label>Student phone number</label><input id="pfPhone" value="${esc(u.phone || '')}" required></div>
            <div><label>Address</label><input id="pfAddress" value="${esc(u.address || '')}" required></div>
            <div><label>Father's name</label><input id="pfFatherName" value="${esc(u.father?.name || '')}" required></div>
            <div><label>Father's phone number</label><input id="pfFatherPhone" value="${esc(u.father?.phone || '')}" required></div>
            <div><label>Mother's name</label><input id="pfMotherName" value="${esc(u.mother?.name || '')}" required></div>
            <div><label>Mother's phone number</label><input id="pfMotherPhone" value="${esc(u.mother?.phone || '')}" required></div>
          </div>
          <button type="submit" class="primary-btn">Save Profile</button>
        </form>
      </div>`;
      bindAppEvents('profile');
    });
  }

  // AI Check
  document.querySelectorAll('.aiCheck').forEach(btn => {
    btn.addEventListener('click', () => runAiCheck(btn.dataset.id));
  });

  // Approve / Reject / Forward
  document.querySelectorAll('.actApp,.actRej,.actFwd').forEach(btn => {
    btn.addEventListener('click', () => {
      const leaves = store.leaves();
      const l = leaves.find(x => x.id == btn.dataset.id);
      if (!l) return;
      if (btn.classList.contains('actApp') || btn.classList.contains('actRej')) {
        if (!['pending', 'forwarded'].includes(l.status)) {
          toast(`This leave is already ${l.status.toUpperCase()} — no action needed.`);
          return;
        }
      }
      if (btn.classList.contains('actFwd') && flagged(l)) {
        if (!confirm(`AI marked this document "${l.aiCheck.verdict}" (${l.aiCheck.confidence}% confidence). Forward to HOD anyway?`)) return;
      }
      if (btn.classList.contains('actApp') && flagged(l)) {
        if (!confirm(`AI marked this document "${l.aiCheck.verdict}" (${l.aiCheck.confidence}% confidence). Accept this leave anyway?`)) return;
      }
      if (btn.classList.contains('actApp')) { l.status = 'approved'; l.reviewer = currentUser.name; toast('Leave approved ✓'); }
      if (btn.classList.contains('actRej')) { l.status = 'rejected'; l.reviewer = currentUser.name; toast('Leave rejected ✗'); }
      if (btn.classList.contains('actFwd')) { l.status = 'forwarded'; toast('Forwarded to HOD'); }
      store.saveLeaves(leaves);
      const stu = store.users().find(u => u.id === l.studentId);
      if (stu) addNotif(stu.id, `Your leave (${l.from}→${l.to}) is now: ${l.status.toUpperCase()} by ${currentUser.name}.`);
      goTab('pending');
    });
  });

  document.querySelectorAll('.viewAttach').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = store.leaves().find(x => x.id == btn.dataset.id);
      if (!l) return;
      $('attachTitle').textContent = l.attachmentName || 'Attachment';
      const body = $('attachBody');
      if (l.attachmentType.startsWith('image/')) body.innerHTML = `<img src="${l.attachmentData}" style="width:100%;border-radius:10px">`;
      else if (l.attachmentType === 'application/pdf') body.innerHTML = `<embed src="${l.attachmentData}" type="application/pdf" style="width:100%;height:400px">`;
      else body.innerHTML = `<a href="${l.attachmentData}" download="${esc(l.attachmentName)}" style="color:var(--accent)">Download attachment</a>`;
      $('attachModal').classList.remove('hidden');
    });
  });

  const addForm = $('addUserForm');
  if (addForm) {
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const users = store.users();
      const reg = $('auReg').value.trim();
      if (users.some(u => u.regno.toLowerCase() === reg.toLowerCase())) { toast('That ID already exists'); return; }
      users.push({
        id: 'u' + Date.now(), role: $('auRole').value, name: $('auName').value.trim(),
        regno: reg, email: $('auEmail').value.trim(), dept: $('auDept').value.trim(),
        password: $('auPass').value
      });
      store.saveUsers(users);
      toast('User added ✓');
      goTab('manage');
    });
  }
  document.querySelectorAll('.delUser').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Delete this user?')) return;
      store.saveUsers(store.users().filter(u => u.id !== btn.dataset.id));
      toast('User deleted');
      goTab('manage');
    });
  });
}

function afterLeaveSubmit(record) {
  // Notify coordinator (staff) and HOD of the student's department
  const stu = currentUser;
  store.users().forEach(u => {
    if ((u.role === 'staff' || u.role === 'hod') && u.dept === stu.dept) {
      addNotif(u.id, `📝 New leave from ${stu.name} (${stu.regno}): ${record.reason.slice(0, 60)} — ${record.from} to ${record.to}`);
    }
  });
  addNotif(stu.id, `Your leave application was submitted and sent to your coordinator/HOD.`);
  toast('Leave submitted! Coordinator & HOD notified.');
  goTab('status');
}

/* ---------- Attachment preview close ---------- */
$('attachClose').addEventListener('click', () => $('attachModal').classList.add('hidden'));
