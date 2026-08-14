/* ══════════════════════════════════════════
   ANIMATIONS + 3D — animations-3d.js
   Adds: 3D rotating hero shape (Three.js),
   3D tilt-on-hover for cards, animated counters,
   magnetic buttons, and section reveal polish.
   ══════════════════════════════════════════ */

/* ─────────────────────────────────────────
   1) 3D ROTATING HERO OBJECT (Three.js)
───────────────────────────────────────── */
(function initHero3D() {
  const container = document.getElementById('hero3d');
  if (!container || typeof THREE === 'undefined') return;

  function build() {
    container.innerHTML = '';
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    // Main wireframe icosahedron (cyan)
    const geo1 = new THREE.IcosahedronGeometry(1.7, 0);
    const mat1 = new THREE.MeshBasicMaterial({ color: 0x00e5ff, wireframe: true, transparent: true, opacity: 0.55 });
    const mesh1 = new THREE.Mesh(geo1, mat1);
    scene.add(mesh1);

    // Inner smaller solidish octahedron (pink) for depth
    const geo2 = new THREE.OctahedronGeometry(0.85, 0);
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xff3d6b, wireframe: true, transparent: true, opacity: 0.45 });
    const mesh2 = new THREE.Mesh(geo2, mat2);
    scene.add(mesh2);

    // Orbiting ring / torus
    const geo3 = new THREE.TorusGeometry(2.3, 0.015, 12, 100);
    const mat3 = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.25 });
    const mesh3 = new THREE.Mesh(geo3, mat3);
    mesh3.rotation.x = Math.PI / 2.4;
    scene.add(mesh3);

    // Scattered particle points
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.5 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      mesh1.rotation.x += 0.0035;
      mesh1.rotation.y += 0.0045;
      mesh2.rotation.x -= 0.004;
      mesh2.rotation.y -= 0.003;
      mesh3.rotation.z += 0.0018;
      particles.rotation.y += 0.0008;

      camera.position.x += (mouseX * 1.3 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 1.3 - camera.position.y) * 0.03;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (window.innerWidth <= 900) {
        container.style.display = 'none';
        return;
      }
      container.style.display = 'block';
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);
  }

  if (window.innerWidth > 900) {
    build();
  } else {
    container.style.display = 'none';
  }
})();

/* ─────────────────────────────────────────
   2) 3D TILT-ON-HOVER FOR CARDS
───────────────────────────────────────── */
function apply3DTilt(selector, intensity) {
  intensity = intensity || 10;
  document.querySelectorAll(selector).forEach((card) => {
    if (card.dataset.tiltBound) return; // avoid double-binding on re-render
    card.dataset.tiltBound = 'true';
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2, cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -intensity;
      const rotateY = ((x - cx) / cx) * intensity;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function initAllTilts() {
  apply3DTilt('.skill-card', 8);
  apply3DTilt('.project-card', 7);
  apply3DTilt('.hobby-card', 6);
  apply3DTilt('.avatar-box', 10);
}

// About avatar is static in HTML — bind immediately
document.addEventListener('DOMContentLoaded', () => {
  apply3DTilt('.avatar-box', 10);
});

// Skills / Projects / Hobbies are injected dynamically by script.js —
// re-bind tilt every time data finishes rendering.
document.addEventListener('portfolio:rendered', initAllTilts);

/* ─────────────────────────────────────────
   3) ANIMATED STAT COUNTERS
───────────────────────────────────────── */
function animateCounters() {
  document.querySelectorAll('.stat-num').forEach((el) => {
    if (el.dataset.counted) return;
    const raw = el.textContent.trim();
    const match = raw.match(/^(\d+)(.*)$/);
    if (!match) return;
    el.dataset.counted = 'true';
    const target = parseInt(match[1], 10);
    const suffix = match[2] || '';
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(tick);
  });
}
document.addEventListener('portfolio:rendered', () => {
  setTimeout(animateCounters, 250);
});

/* ─────────────────────────────────────────
   4) MAGNETIC BUTTONS (subtle pull toward cursor)
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
});

/* ─────────────────────────────────────────
   5) SECTION TITLES — REVEAL ON SCROLL
───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const titleObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('title-visible');
        titleObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('.section-header').forEach((el) => titleObs.observe(el));
});
