// Scene setup and the open / rise / return / close choreography.
import * as THREE from 'three';
import gsap from 'gsap';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './style.css';
import logoUrl from './assets/logo.svg';
import { FLAVOURS, productUrl } from './data.js';
import { CAN, buildCan, candyGeometry, candyMaterial, createShared, makeBlob, packGeometry, packMaps, studioEnvironment } from './models.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rupees = (n) => `Rs. ${Number.isInteger(n) ? n : n.toFixed(2)}`;

const ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
const ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M22 9l-5 6M17 9l5 6"/></svg>';

let active = 0;

// ---------------------------------------------------------------- UI

const ui = {
  fill(f) {
    const flat = document.body.classList.contains('no-webgl');
    $('c-weight').textContent = `Net weight ${f.weight}`;
    $('c-name').textContent = f.name;
    $('c-tagline').textContent = f.tagline;
    $('c-tags').innerHTML = f.tags.map((t) => `<li>${t}</li>`).join('');
    $('c-price').textContent = rupees(f.price);
    $('c-was').textContent = rupees(f.was);
    $('c-off').textContent = `${Math.round((1 - f.price / f.was) * 100)}% OFF`;
    $('c-link').href = productUrl(f);
    $('c-link').setAttribute('aria-label', `View ${f.name} on the Shadani store`);
    $('c-pack').hidden = !flat;
    if (flat) { $('c-pack').src = f.image; $('c-pack').alt = `${f.name} pack`; }
  },
  theme(f) {
    const s = document.documentElement.style;
    s.setProperty('--bg1', f.tint[0]);
    s.setProperty('--bg2', f.tint[1]);
    s.setProperty('--accent', f.colour);
    $('word').textContent = f.word;
    document.querySelector('meta[name=theme-color]').content = f.tint[0];
    document.querySelectorAll('.chip').forEach((c, i) => {
      if (FLAVOURS[i] === f) {
        c.setAttribute('aria-current', 'true');
        c.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
      else c.removeAttribute('aria-current');
    });
  },
  card(on) {
    document.body.classList.toggle('card-on', on);
    $('card').setAttribute('aria-hidden', String(!on));
  },
};

// Without WebGL, the chips simply switch the product card.
let request = ({ index = active }) => {
  active = index;
  ui.theme(FLAVOURS[active]);
  ui.fill(FLAVOURS[active]);
  ui.card(true);
};

FLAVOURS.forEach((f, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.innerHTML = `<i style="background:radial-gradient(circle at 35% 30%,color-mix(in srgb,#fff 60%,${f.colour}),${f.colour} 60%)"></i><span>${f.short}</span>`;
  b.addEventListener('click', () => request({ type: 'pick', index: i }));
  $('chips').append(b);
});
$('logo').src = logoUrl;
ui.theme(FLAVOURS[0]);

// On the live Shopify store the same-origin product endpoint gives current prices.
async function refreshPrices() {
  if (!/shadanigroup\.com$/.test(location.hostname)) return;
  await Promise.all(FLAVOURS.map(async (f) => {
    try {
      const p = await (await fetch(`/products/${f.handle}.js`)).json();
      f.price = p.price / 100;
      f.was = (p.compare_at_price || p.price) / 100;
    } catch { /* keep the bundled price */ }
  }));
}
refreshPrices();

// ---------------------------------------------------------------- sound

let soundOn = true;
let audio;
function playPop(freq = 520, gainLevel = 0.16, length = 0.13) {
  if (!soundOn || reduceMotion) return;
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === 'suspended') audio.resume();
  const t = audio.currentTime;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.35, t + length);
  g.gain.setValueAtTime(gainLevel, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  o.connect(g).connect(audio.destination);
  o.start(t);
  o.stop(t + length);
}
const paintSound = () => {
  $('sound').innerHTML = soundOn ? ICON_ON : ICON_OFF;
  $('sound').setAttribute('aria-pressed', String(soundOn));
};
paintSound();
$('sound').addEventListener('click', () => { soundOn = !soundOn; paintSound(); });

// ---------------------------------------------------------------- WebGL start, with fallback

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch { /* handled below */ }

if (!renderer) {
  document.body.classList.add('no-webgl', 'ready');
  request({ index: 0 });
} else {
  document.fonts.load('800 100px "Baloo 2"').finally(start);
}

async function start() {
  const logo = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = logoUrl;
  });

  let pixelRatio = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.82;
  scene.fog = new THREE.Fog(FLAVOURS[0].tint[1], 15, 30);

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
  const key = new THREE.DirectionalLight('#FFF3E0', 1.5);
  key.position.set(-4, 7, 6);
  const rim = new THREE.DirectionalLight('#FFFFFF', 0.7);
  rim.position.set(5, 4, -5);
  scene.add(key, rim);

  // ------------------------------------------------------------ models

  const shared = createShared(Math.min(renderer.capabilities.getMaxAnisotropy(), 8));
  const small = Math.min(innerWidth, innerHeight) < 700;
  const geos = {};
  for (const style of ['raspberry', 'goli']) {
    geos[style] = {
      pack: packGeometry(style),
      maps: packMaps(style),
      satellite: candyGeometry(style, 20),
      hero: candyGeometry(style, small ? 30 : 44),
    };
  }
  const mats = FLAVOURS.map((f) => candyMaterial(f.colour, f.style));
  const cans = FLAVOURS.map((f, i) => {
    const can = buildCan(f, i, shared, geos[f.style].pack, candyMaterial(f.colour, f.style, geos[f.style].maps), logo);
    scene.add(can.root);
    return can;
  });
  const pickables = cans.map((c) => c.proxy);

  const hero = new THREE.Mesh(geos.raspberry.hero, mats[0]);
  hero.visible = false;
  scene.add(hero);
  const heroShadow = makeBlob(shared, 2.6, 0);
  scene.add(heroShadow);

  const SAT_COUNT = 9;
  const sats = Array.from({ length: SAT_COUNT }, (_, i) => {
    const mesh = new THREE.Mesh(geos.raspberry.satellite, mats[0]);
    mesh.visible = false;
    scene.add(mesh);
    return {
      mesh,
      blend: 0,
      angle: (i / SAT_COUNT) * Math.PI * 2,
      tilt: Math.sin(i * 2.4) * 0.34,
      radius: 1.42 + ((i * 37) % 10) * 0.04,
      size: 0.15 + ((i * 53) % 10) * 0.01,
      spin: new THREE.Vector3(0.6 + (i % 3) * 0.3, 0.8, 0.3),
    };
  });

  // Sparkles
  const SPARK = 70;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(SPARK * 3).fill(-99);
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.width = sparkCanvas.height = 64;
  const sg = sparkCanvas.getContext('2d');
  sg.translate(32, 32);
  sg.fillStyle = '#FFFFFF';
  sg.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 5 : 31;
    const a = (i / 8) * Math.PI * 2;
    sg.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sg.fill();
  const sparkMat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(sparkCanvas), color: '#FFB703', size: 0.2, transparent: true, depthWrite: false, opacity: 0, fog: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  sparks.renderOrder = 6;
  scene.add(sparks);
  const sparkVel = Array.from({ length: SPARK }, () => new THREE.Vector3());

  // ------------------------------------------------------------ candy thumbnails for the chips

  (function renderThumbs() {
    const thumbScene = new THREE.Scene();
    thumbScene.environment = scene.environment;
    const light = new THREE.DirectionalLight('#fff', 1.6);
    light.position.set(-2, 3, 4);
    thumbScene.add(light);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 20);
    cam.position.set(0, 1.4, 4.5);
    cam.lookAt(0, 0, 0);
    const m = new THREE.Mesh(geos.raspberry.satellite, mats[0]);
    thumbScene.add(m);
    renderer.setPixelRatio(1);
    renderer.setSize(128, 128, false);
    renderer.setClearColor(0x000000, 0);
    document.querySelectorAll('.chip i').forEach((el, i) => {
      m.geometry = geos[FLAVOURS[i].style].satellite;
      m.material = mats[i];
      m.rotation.set(0.3, i * 0.9, 0);
      renderer.render(thumbScene, cam);
      el.style.background = `center/cover url(${renderer.domElement.toDataURL('image/png')})`;
    });
    renderer.setPixelRatio(pixelRatio);
  }());

  // ------------------------------------------------------------ layout

  // Everything animated reads from this one state object each frame.
  const stage = {
    angle: 0,   // carousel rotation, in steps of one can
    spread: 0,  // 0 = other cans in view, 1 = cleared away
    heroX: 0,   // sideways shift of the front can while open
    camY: 0,    // vertical framing shift while open
    camZ: 0,    // extra camera distance while open, on portrait screens
    candy: 0,   // 0 = at the can's mouth, 1 = on display
    sink: 1,    // how far the candy has dropped into the can
  };
  const layout = { lidX: -1.22, lidZ: 0.42, openX: -2.45, candyX: 1.15, candyY: 1.95, heroScale: 0.98, baseY: 1.55, openY: 1.55, dist: 15, openDist: 15 };

  function resize() {
    const w = innerWidth, h = innerHeight, aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    if (aspect < 0.95) {
      // Fit the can in a narrow frame above the chips. When open, the camera
      // pulls back so the can and candy both fit above the card.
      layout.dist = Math.max(13.5, 6.4 / aspect);
      layout.openDist = layout.dist * 1.55;
      const tan = Math.tan(THREE.MathUtils.degToRad(13));
      const openHalfW = tan * layout.openDist * aspect;
      layout.openX = -openHalfW * 0.58;
      layout.candyX = openHalfW * 0.38;
      layout.heroScale = Math.min(0.85, openHalfW * 0.35);
      layout.candyY = 2.05;
      layout.baseY = 0.86;
      // Rest the floor just above the card, which covers about the bottom 325px.
      layout.openY = Math.max(0.3, (h / 2 - 345) / (h / (2 * tan * layout.openDist)));
    } else {
      layout.dist = Math.max(11.6, 15.8 / aspect + 3);
      layout.openDist = layout.dist;
      // Keep the can and candy clear of the info card on the right.
      const halfW = Math.tan(THREE.MathUtils.degToRad(13)) * layout.dist * aspect;
      const margin = Math.max(20, Math.min(0.05 * w, 84));
      const cardLeft = (w - margin - Math.min(370, 0.32 * w)) / w;
      const cardEdge = halfW * (cardLeft * 2 - 1);
      layout.heroScale = Math.min(0.86, halfW * 0.2);
      layout.candyX = cardEdge - layout.heroScale * 2.05;
      layout.openX = layout.candyX - layout.heroScale * 2.75;
      layout.candyY = 1.9;
      layout.baseY = 1.32;
      layout.openY = 1.32;
    }
    // The lid rests left of the can if there is room, otherwise in front of it.
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(13)) * layout.openDist * aspect;
    const roomLeft = layout.openX - 1.22 - 0.72 > -halfWidth;
    layout.lidX = roomLeft ? -1.22 : 0.98;
    layout.lidZ = roomLeft ? 0.42 : 0.72;
    camera.updateProjectionMatrix();
    if (isOpen) {
      stage.heroX = layout.openX;
      stage.camY = layout.openY - layout.baseY;
      stage.camZ = layout.openDist - layout.dist;
      cans[active].lid.position.x = layout.lidX;
      cans[active].lid.position.z = layout.lidZ;
    }
  }

  // ------------------------------------------------------------ pointer: drag to spin, tap to open

  const pointer = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const drag = { on: false, moved: 0, x: 0, y: 0, canRot: 0, velY: 0, velX: 0, candyY: 0, candyX: 0 };
  const canvas = $('stage');

  const canAt = (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(pickables.filter((p) => p.parent.visible), false)[0];
    return hit ? hit.object.userData.index : -1;
  };
  canvas.addEventListener('pointerdown', (e) => {
    drag.on = true; drag.moved = 0; drag.x = e.clientX; drag.y = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' && !drag.on) {
      parallax.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      canvas.style.cursor = canAt(e) >= 0 ? 'pointer' : 'default';
    }
    if (!drag.on) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.velY = dx * 0.012;
    drag.velX = dy * 0.012;
    if (stage.candy > 0.5) { drag.candyY += drag.velY; drag.candyX += drag.velX; } else drag.canRot += drag.velY;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!drag.on) return;
    drag.on = false;
    if (drag.moved < 8) {
      const i = canAt(e);
      if (i >= 0) request({ type: 'pick', index: i });
    }
  });
  canvas.addEventListener('pointercancel', () => { drag.on = false; });

  // ------------------------------------------------------------ choreography

  const speed = reduceMotion ? 4 : 1;
  const play = (tl) => new Promise((resolve) => { tl.timeScale(speed); tl.eventCallback('onComplete', resolve); });
  const wrapDiff = (a, b) => {
    const n = FLAVOURS.length;
    return ((((a - b) % n) + n + n / 2) % n) - n / 2;
  };

  function dressCandy(i) {
    const f = FLAVOURS[i];
    hero.geometry = geos[f.style].hero;
    hero.material = mats[i];
    sats.forEach((s) => { s.mesh.geometry = geos[f.style].satellite; s.mesh.material = mats[i]; });
    sparkMat.color.set(f.style === 'goli' ? '#B08A52' : '#FFB703');
  }

  function burstSparks(origin) {
    for (let i = 0; i < SPARK; i++) {
      sparkPos.set([origin.x, origin.y, origin.z], i * 3);
      sparkVel[i].set((Math.random() - 0.5) * 4.4, Math.random() * 3.6 + 0.7, (Math.random() - 0.5) * 3.2);
    }
    gsap.killTweensOf(sparkMat);
    sparkMat.opacity = 1;
    gsap.to(sparkMat, { opacity: 0, duration: 1.25, delay: 0.35, ease: 'power2.in' });
  }

  function openCan() {
    const can = cans[active];
    dressCandy(active);
    ui.fill(FLAVOURS[active]);
    document.body.classList.add('open');
    drag.candyX = drag.candyY = 0;
    const lid = can.lid, home = can.lidHome;
    const tl = gsap.timeline();
    tl.to(stage, { spread: 1, duration: 0.7, ease: 'power2.inOut' }, 0);
    tl.to(stage, { heroX: layout.openX, camY: layout.openY - layout.baseY, camZ: layout.openDist - layout.dist, duration: 0.95, ease: 'power3.inOut' }, 0);
    // Unscrew: one and a quarter turns while the thread lifts the lid.
    tl.to(lid.rotation, { y: -Math.PI * 2.5, duration: 0.8, ease: 'power1.inOut' }, 0.35);
    tl.to(lid.position, { y: home.y + 0.14, duration: 0.8, ease: 'power1.inOut' }, 0.35);
    // Pop off, then fall beside the can and bounce to rest.
    tl.call(() => playPop(620, 0.2), null, 1.15);
    tl.to(lid.position, { y: home.y + 0.85, duration: 0.3, ease: 'power2.out' }, 1.15);
    tl.to(lid.position, { x: layout.lidX, z: layout.lidZ, duration: 0.86, ease: 'power1.inOut' }, 1.15);
    tl.to(lid.rotation, { x: 0.5, z: 0.55, duration: 0.3, ease: 'power1.out' }, 1.15);
    tl.to(lid.position, { y: 0, duration: 0.56, ease: 'bounce.out' }, 1.45);
    tl.to(lid.rotation, { x: 0, z: 0, duration: 0.46, ease: 'back.out(2.4)' }, 1.5);
    tl.to(can.lidShadow.material, { opacity: 0.8, duration: 0.45 }, 1.5);
    tl.call(() => playPop(300, 0.09, 0.08), null, 1.72);
    // The chosen candy climbs out and takes the stage.
    tl.call(() => { hero.visible = true; }, null, 1.25);
    tl.to(stage, { sink: 0, duration: 0.4, ease: 'power2.out' }, 1.25);
    tl.to(stage, { candy: 1, duration: 1.15, ease: 'power3.out' }, 1.5);
    tl.to(heroShadow.material, { opacity: 0.45, duration: 0.8 }, 1.8);
    tl.call(() => {
      burstSparks(new THREE.Vector3(stage.heroX, CAN.MOUTH, 0));
      playPop(760, 0.14, 0.16);
    }, null, 1.52);
    sats.forEach((s, i) => {
      tl.call(() => { s.mesh.visible = true; }, null, 1.62 + i * 0.075);
      tl.to(s, { blend: 1, duration: 1.05, ease: 'power3.out' }, 1.62 + i * 0.075);
    });
    tl.call(() => ui.card(true), null, 1.85);
    return play(tl);
  }

  function closeCan() {
    const can = cans[active];
    const lid = can.lid, home = can.lidHome;
    ui.card(false);
    const tl = gsap.timeline();
    sats.forEach((s, i) => {
      tl.to(s, { blend: 0, duration: 0.5, ease: 'power2.in' }, i * 0.04);
      tl.call(() => { s.mesh.visible = false; }, null, 0.5 + i * 0.04);
    });
    tl.to(heroShadow.material, { opacity: 0, duration: 0.45 }, 0.2);
    tl.to(stage, { candy: 0, duration: 0.8, ease: 'power2.inOut' }, 0.15);
    tl.to(stage, { sink: 1, duration: 0.3, ease: 'power2.in' }, 0.95);
    tl.call(() => { hero.visible = false; playPop(260, 0.1, 0.1); }, null, 1.25);
    // The can takes the weight, and its contents settle.
    tl.to(can.body.scale, { y: 0.975, x: 1.012, z: 1.012, duration: 0.08, ease: 'power1.out' }, 1.2);
    tl.to(can.body.scale, { y: 1, x: 1, z: 1, duration: 0.55, ease: 'elastic.out(1.1,0.35)' }, 1.28);
    tl.to(can.contents.rotation, { y: 0.12, duration: 0.1 }, 1.2);
    tl.to(can.contents.rotation, { y: 0, duration: 0.7, ease: 'elastic.out(1,0.3)' }, 1.3);
    // The lid arcs back and screws down with a soft settle.
    tl.to(can.lidShadow.material, { opacity: 0, duration: 0.3 }, 1.25);
    tl.to(lid.position, { y: home.y + 0.75, duration: 0.42, ease: 'power2.out' }, 1.25);
    tl.to(lid.position, { x: 0, z: 0, duration: 0.62, ease: 'power2.inOut' }, 1.25);
    tl.to(lid.position, { y: home.y + 0.14, duration: 0.24, ease: 'power2.in' }, 1.67);
    tl.to(lid.rotation, { y: 0, duration: 0.62, ease: 'power1.inOut' }, 1.9);
    tl.to(lid.position, { y: home.y, duration: 0.62, ease: 'power1.inOut' }, 1.9);
    tl.call(() => playPop(420, 0.08, 0.07), null, 2.5);
    tl.to(can.body.scale, { y: 0.988, duration: 0.07 }, 2.5);
    tl.to(can.body.scale, { y: 1, duration: 0.4, ease: 'elastic.out(1,0.4)' }, 2.57);
    tl.to(stage, { spread: 0, duration: 0.75, ease: 'power2.inOut' }, 2.3);
    tl.to(stage, { heroX: 0, camY: 0, camZ: 0, duration: 0.85, ease: 'power3.inOut' }, 2.25);
    tl.call(() => document.body.classList.remove('open'), null, 2.35);
    return play(tl);
  }

  function rotateTo(i) {
    const delta = wrapDiff(i, active);
    active = i;
    ui.theme(FLAVOURS[i]);
    return play(gsap.timeline().to(stage, { angle: stage.angle + delta, duration: 0.65 + Math.abs(delta) * 0.13, ease: 'power3.inOut' }));
  }

  // One action at a time. While busy, only the latest request is kept, so
  // repeated clicks can never overlap animations or build up a stale queue.
  let busy = false;
  let isOpen = false;
  let pending = null;

  async function perform(r) {
    busy = true;
    document.body.classList.add('busy');
    const toggleShut = r.type === 'close' || (r.index === active && isOpen);
    if (isOpen) { await closeCan(); isOpen = false; }
    if (!toggleShut) {
      if (r.index !== active) await rotateTo(r.index);
      if (!pending) { await openCan(); isOpen = true; }
    }
    busy = false;
    document.body.classList.remove('busy');
    if (pending) { const next = pending; pending = null; perform(next); }
  }
  request = (r) => { if (busy) pending = r; else perform(r); };

  $('close').addEventListener('click', () => request({ type: 'close' }));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') request({ type: 'close' });
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const n = FLAVOURS.length;
      const base = pending && pending.index !== undefined ? pending.index : active;
      request({ type: 'pick', index: (base + (e.key === 'ArrowRight' ? 1 : n - 1)) % n });
    }
  });

  addEventListener('resize', resize);
  resize();

  // ------------------------------------------------------------ frame loop

  const fogTo = new THREE.Color();
  const mouth = new THREE.Vector3(), display = new THREE.Vector3(), satTarget = new THREE.Vector3();
  let time = 0;
  let slow = 0, frames = 0;
  const STEP = (Math.PI * 2) / FLAVOURS.length;
  const RING = 4.5;

  function update(dt) {
    time += dt;
    const calm = reduceMotion ? 0 : 1;

    // Camera, with gentle parallax
    camera.position.set(calm * parallax.x * 0.32, layout.baseY + 0.72 + stage.camY - calm * parallax.y * 0.16, layout.dist + stage.camZ);
    camera.lookAt(0, layout.baseY + stage.camY, 0);
    scene.fog.near = camera.position.z + 1;
    scene.fog.far = camera.position.z + 16;

    // Carousel
    cans.forEach((can, i) => {
      const a = wrapDiff(i, stage.angle) * STEP;
      const isActive = i === active;
      const push = isActive ? 0 : stage.spread;
      const R = RING * (1 + push * 0.55);
      const scale = 1 - push;
      can.root.visible = scale > 0.01 && Math.abs(a) < (small ? 1.5 : 2.5);
      if (!can.root.visible) return;
      can.root.position.set(Math.sin(a) * R + (isActive ? stage.heroX : 0), 0, (Math.cos(a) - 1) * R);
      can.root.scale.setScalar(scale);
      const idle = calm * Math.sin(time * 0.6 + i) * (isActive ? 0.13 : 0.06);
      can.body.rotation.y = -a * 0.55 + idle + (isActive ? drag.canRot : 0);
      can.lidShadow.position.set(can.lid.position.x, 0.006, can.lid.position.z);
    });
    if (!drag.on) drag.canRot *= Math.exp(-dt * 3.2);

    // Hero candy: from the mouth of the can to its display spot, in an arc
    mouth.set(stage.heroX, CAN.MOUTH - stage.sink * 0.72, 0);
    display.set(layout.candyX, layout.candyY + calm * Math.sin(time * 1.3) * 0.07, 0.3);
    const t = stage.candy;
    hero.position.lerpVectors(mouth, display, t);
    hero.position.y += Math.sin(t * Math.PI) * 0.9;
    hero.scale.setScalar(THREE.MathUtils.lerp(0.16, layout.heroScale, t));
    if (!drag.on) {
      drag.candyY += drag.velY * dt * 8;
      drag.candyX += drag.velX * dt * 8;
      drag.velY *= Math.exp(-dt * 2.4);
      drag.velX *= Math.exp(-dt * 2.4);
    }
    hero.rotation.set(0.5 + Math.sin(time * 0.7) * 0.16 * calm + drag.candyX, time * 0.55 * calm + t * 6.28 + drag.candyY, 0.12);
    heroShadow.position.set(layout.candyX, 0.005, 0.3);
    heroShadow.scale.setScalar(2.2 + Math.sin(time * 1.3) * 0.08 * calm);

    // Satellite candies orbit the hero
    sats.forEach((s) => {
      if (!s.mesh.visible) return;
      const q = s.angle + time * 0.32 * calm;
      const r = s.radius * layout.heroScale;
      satTarget.set(
        display.x + Math.cos(q) * r,
        display.y + Math.sin(q * 1.5) * 0.18 + Math.sin(q) * s.tilt * r,
        display.z + Math.sin(q) * r * 0.75,
      );
      s.mesh.position.lerpVectors(mouth, satTarget, s.blend);
      s.mesh.position.y += Math.sin(s.blend * Math.PI) * 0.7;
      s.mesh.scale.setScalar(THREE.MathUtils.lerp(0.1, s.size, s.blend));
      s.mesh.rotation.set(time * s.spin.x * calm + s.angle, time * s.spin.y * calm, time * s.spin.z * calm);
    });

    // Sparkles
    if (sparkMat.opacity > 0.001) {
      for (let i = 0; i < SPARK; i++) {
        const v = sparkVel[i];
        v.y -= dt * 3.2;
        v.multiplyScalar(Math.exp(-dt * 1.2));
        sparkPos[i * 3] += v.x * dt;
        sparkPos[i * 3 + 1] += v.y * dt;
        sparkPos[i * 3 + 2] += v.z * dt;
      }
      sparkGeo.attributes.position.needsUpdate = true;
    }

    // Fog follows the backdrop tint so distant cans melt into it
    fogTo.set(FLAVOURS[active].tint[1]);
    scene.fog.color.lerp(fogTo, 1 - Math.exp(-dt * 3));
  }

  // Lower the resolution if a device can't hold a smooth frame rate.
  function watchFrameRate(dt) {
    frames++;
    slow += dt;
    if (frames < 50) return;
    if (slow / frames > 1 / 28 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio);
      resize();
    }
    frames = 0;
    slow = 0;
  }

  gsap.ticker.add((_, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    update(dt);
    renderer.render(scene, camera);
    if (!document.body.classList.contains('ready')) document.body.classList.add('ready');
    watchFrameRate(dt);
  });
  gsap.ticker.lagSmoothing(200, 33);

  window.__shadani = { gsap, renderer, stage, state: () => ({ busy, isOpen, active, pending }), request };
}
