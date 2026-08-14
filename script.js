/* ══════════════════════════════════════════
   PORTFOLIO — script.js (Upgraded & Working)
   ══════════════════════════════════════════ */

const API_BASE_URL = window.location.origin;
let portfolioData = {}; // Global store for loaded backend configuration

// ─── SCROLL PROGRESS BAR ───
const scrollLine = document.getElementById('scrollLine');
if (scrollLine) {
  window.addEventListener('scroll', () => {
    const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    scrollLine.style.width = pct + '%';
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ─── CUSTOM CURSOR ───
const dot  = document.getElementById('cursorDot');
const ring = document.getElementById('cursorRing');
let mx = -100, my = -100, rx = -100, ry = -100;

if (dot && ring) {
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function animCursor() {
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(animCursor);
  })();
  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => { ring.style.width='60px'; ring.style.height='60px'; ring.style.borderColor='rgba(0,229,255,0.7)'; });
    el.addEventListener('mouseleave', () => { ring.style.width='36px'; ring.style.height='36px'; ring.style.borderColor='rgba(0,229,255,0.4)'; });
  });
}

// ─── SCROLL REVEAL ───
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 100);
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

// ─── CONTACT FORM (Connected with MongoDB API) ───
async function submitForm() {
  const name  = document.getElementById('fname').value.trim();
  const email = document.getElementById('femail').value.trim();
  const msg   = document.getElementById('fmessage').value.trim();
  const msgEl = document.getElementById('formMsg');
  const submitBtn = document.querySelector('.contact-form button');

  if (!msgEl) return;
  msgEl.className = 'form-msg';

  if (!name || !email || !msg) {
    msgEl.textContent = '⚠ Please fill in all fields.';
    msgEl.classList.add('error'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    msgEl.textContent = '⚠ Please enter a valid email address.';
    msgEl.classList.add('error'); return;
  }

  try {
    // Disable submit button during processing
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const response = await fetch(`${API_BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message: msg })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      msgEl.textContent = "✓ Message sent successfully! Saved to Database.";
      msgEl.className = 'form-msg success';
      
      // Clear Input Form Fields
      document.getElementById('fname').value = '';
      document.getElementById('femail').value = '';
      document.getElementById('fmessage').value = '';
    } else {
      throw new Error(result.error || 'Failed to submit form.');
    }
  } catch (err) {
    msgEl.textContent = `❌ Server Error: ${err.message}`;
    msgEl.className = 'form-msg error';
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  }
}

// Attach explicitly to window scope so HTML 'onclick' handles find it safely
window.submitForm = submitForm;

// ─── NAVBAR ACTIVE HIGHLIGHT ON SCROLL ───
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
});

/* ══════════════════════════════════════════
   DEFAULT STATIC DATA (FALLBACK)
   ══════════════════════════════════════════ */
const DEFAULTS = {
  hero: {
    badge: 'Available for work',
    line1: 'Building', line2: 'Digital', line3: 'Solutions',
    desc: 'Software Engineer specializing in full-stack web development and AI-based systems. Passionate about building scalable, efficient, and user-friendly applications.',
    s1: '10+', s2: '2+', s3: '5+'
  },
  about: {
    name: 'Muhammad Hussnain Tanveer', badge: 'Engineer',
    p1: "I'm a passionate Software Engineer with strong expertise in web development and AI-based applications. I focus on building clean, efficient, and scalable digital solutions.",
    p2: 'I have experience in both frontend and backend technologies, enabling me to develop complete full-stack applications.',
    p3: 'Currently, I am working on innovative projects like SignTalk — an AI-based sign language recognition system.',
    tags: 'Problem Solver, AI Enthusiast, Clean Code, Full Stack, Team Player, Continuous Learner'
  },
  skills: [
    { id:1, icon:'🎨', name:'Frontend',   list:'HTML · CSS · JavaScript\nReact · Bootstrap\nResponsive Design' },
    { id:2, icon:'⚙️', name:'Backend',    list:'Node.js · Express\nREST APIs · Authentication' },
    { id:3, icon:'🗄️', name:'Database',   list:'MySQL · Firebase · MongoDB' },
    { id:4, icon:'🛠️', name:'Tools',      list:'Git · VS Code · Postman' },
    { id:5, icon:'📱', name:'Mobile',     list:'Android Development\nAPI Integration' },
    { id:6, icon:'🤖', name:'AI / ML',    list:'TensorFlow · OpenCV\nSpeech & Vision Models' }
  ],
  hobbies: {
    intro: "Beyond the code editor, here's what keeps me energized, inspired, and balanced in life.",
    items: [
      { id:1, icon:'📖', name:'Reading & Books', desc:'I love diving into tech books, self-improvement titles, and science fiction novels. Reading keeps my thinking sharp and curiosity alive.', tags:'Tech Books, Self-Help, Sci-Fi' },
      { id:2, icon:'🎮', name:'Gaming',           desc:'Gaming is my go-to way to unwind. I enjoy strategy games and action RPGs that challenge my decision-making.', tags:'Strategy, Action RPG, Open World' },
      { id:3, icon:'🎵', name:'Music',            desc:'Music is my constant companion while coding. I listen to lo-fi beats, instrumentals, and classical compositions.', tags:'Lo-fi, Instrumental, Classical' },
      { id:4, icon:'✈️', name:'Travelling',       desc:'Exploring new places broadens my perspective and fuels my creativity. Every journey teaches me something new.', tags:'Exploration, Culture, Adventure' }
    ]
  },
  projects: [
    { id:1, icon:'🤟', name:'SignTalk (AI Project)',          year:'2026', desc:'AI-based sign language recognition system converting gestures into text.',    demo:'#', github:'#', stack:'TensorFlow, OpenCV, Python',  bg:'linear-gradient(135deg,#0e1f35,#0a2540)' },
    { id:2, icon:'🍽️', name:'Restaurant Management System',  year:'2024', desc:'Full-stack system for managing orders, users, and menus.',                    demo:'#', github:'#', stack:'Node.js, Express, MySQL',     bg:'linear-gradient(135deg,#1a0e2e,#2d1452)' },
    { id:3, icon:'📊', name:'Admin Dashboard',                year:'2024', desc:'Interactive dashboard with analytics and user management.',                   demo:'#', github:'#', stack:'React, Chart.js',            bg:'linear-gradient(135deg,#0d1f1a,#0a2e20)' }
  ],
  contact: {
    heading: "Let's build something great together.",
    sub: 'Feel free to contact me for projects, collaboration, or opportunities.',
    email: 'hussnain@email.com', linkedin: 'linkedin.com/in/hussnain',
    github: 'github.com/hussnain', footer: 'Muhammad Hussnain Tanveer'
  }
};

function getData(key) {
  return portfolioData[key] || DEFAULTS[key];
}

/* ══════════════════════════════════════════
   RENDER FUNCTIONS
   ══════════════════════════════════════════ */

function renderSkills() {
  const skills = getData('skills');
  const grid = document.getElementById('skillsGrid');
  if (!grid) return;
  grid.innerHTML = skills.map(s => `
    <div class="skill-card">
      <div class="skill-icon">${s.icon}</div>
      <div class="skill-name">${s.name}</div>
      <div class="skill-list">${s.list.replace(/\n/g, '<br>')}</div>
    </div>`).join('');
  grid.querySelectorAll('.skill-card').forEach(el => revealObs.observe(el));
}

function renderHobbies() {
  const d = getData('hobbies');
  const intro = document.querySelector('.hobbies-intro');
  if (intro) intro.textContent = d.intro;
  const grid = document.getElementById('hobbiesGrid') || document.querySelector('.hobbies-grid');
  if (!grid) return;
  grid.innerHTML = d.items.map(h => `
    <div class="hobby-card">
      <div class="hobby-icon-wrap"><span class="hobby-icon">${h.icon}</span></div>
      <div class="hobby-body">
        <div class="hobby-name">${h.name}</div>
        <p class="hobby-desc">${h.desc}</p>
        <div class="hobby-tags">${h.tags.split(',').map(t =>
          `<span class="h-tag">${t.trim()}</span>`).join('')}</div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.hobby-card').forEach(el => revealObs.observe(el));
}

function renderProjects() {
  const projects = getData('projects');
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-thumb" style="background:${p.bg}">${p.icon}</div>
      <div class="project-body">
        <div class="project-meta">
          <div class="project-name">${p.name}</div>
          <div class="project-year">${p.year}</div>
        </div>
        <p class="project-desc">${p.desc}</p>
        <div class="project-stack">${(p.stack||'').split(',').map(t =>
          `<span class="stack-chip">${t.trim()}</span>`).join('')}</div>
        <div class="project-links">
          <a href="${p.demo}">⬡ Live Demo</a>
          <a href="${p.github}">⌥ GitHub</a>
        </div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.project-card').forEach(el => revealObs.observe(el));
}

function renderContact() {
  const d = getData('contact');
  const ch = document.querySelector('.contact-info h3');
  if (ch) ch.textContent = d.heading;
  const cp = document.querySelector('.contact-info > p');
  if (cp) cp.textContent = d.sub;
  const links = document.querySelectorAll('.contact-link');
  if (links[0]) { links[0].href = 'mailto:' + d.email; if(links[0].querySelector('div') && links[0].querySelector('div').nextSibling) { links[0].lastChild.textContent = d.email; } }
  if (links[1]) { links[1].href = 'https://' + d.linkedin; }
  if (links[2]) { links[2].href = 'https://' + d.github; }
  const footer = document.querySelector('footer span');
  if (footer) footer.textContent = d.footer;
}

function renderAbout() {
  const d = getData('about');
  const h3 = document.querySelector('.about-text h3');
  if (h3) h3.textContent = `Hi, I'm ${d.name} 👋`;
  const fl = document.querySelector('.avatar-float');
  if (fl) fl.textContent = d.badge;
  const ps = document.querySelectorAll('.about-text p');
  if (ps[0]) ps[0].textContent = d.p1;
  if (ps[1]) ps[1].textContent = d.p2;
  if (ps[2]) ps[2].textContent = d.p3;
  const tagsWrap = document.querySelector('.about-tags');
  if (tagsWrap && d.tags) {
    tagsWrap.innerHTML = d.tags.split(',').map(t =>
      `<span class="tag">${t.trim()}</span>`).join('');
  }
}

function renderHero() {
  const d = getData('hero');
  const tag = document.querySelector('.hero-tag');
  if (tag) tag.innerHTML = `${tag.innerHTML.split(d.badge)[0] || ''}${d.badge}`;
  const h1 = document.querySelector('#hero h1');
  if (h1) h1.innerHTML = `${d.line1}<br><span class="line2">${d.line2}</span><span class="stroke"> ${d.line3}</span>`;
  const desc = document.querySelector('.hero-desc');
  if (desc) desc.textContent = d.desc;
  const nums = document.querySelectorAll('.stat-num');
  if (nums[0]) nums[0].textContent = d.s1;
  if (nums[1]) nums[1].textContent = d.s2;
  if (nums[2]) nums[2].textContent = d.s3;
}

/* ── INIT — Run asynchronously on page load ── */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch live configurations directly from Dynamic REST API Backend
    const response = await fetch(`${API_BASE_URL}/api/portfolio`);
    if (response.ok) {
      portfolioData = await response.json();
    } else {
      console.warn("⚠️ API sent error response status. Using fallbacks.");
    }
  } catch (err) {
    console.warn("⚠️ Backend API offline. Using hardcoded configurations.", err);
  } finally {
    // Render website with either Live DB info or fallbacks smoothly
    renderHero();
    renderAbout();
    renderSkills();
    renderHobbies();
    renderProjects();
    renderContact();
    document.dispatchEvent(new CustomEvent('portfolio:rendered'));
  }
});