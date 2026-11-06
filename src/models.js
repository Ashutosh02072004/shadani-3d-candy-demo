// Procedural models: candies, the Shadani can and its label artwork.
// Everything is generated in code so the page ships with no model files.
import * as THREE from 'three';

export const CAN = { R: 0.62, H: 2.86, MOUTH: 2.9 };

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const fibonacciSphere = (n) => {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const r = Math.sqrt(1 - y * y);
    pts.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r));
  }
  return pts;
};

// ---------------------------------------------------------------- candy geometry

const BUMPS = fibonacciSphere(84);
const BUMP_CELL = Math.sqrt((4 * Math.PI) / BUMPS.length) * 0.64;
const SOFTNESS = 24;

// The cobbled "raspberry" sugar-boiled candy: a pressed dome of rounded bumps.
function raspberry(d) {
  // Soft maximum of the nearby bumps, so they meet in smooth valleys, not hard cracks.
  let sum = 1;
  for (const p of BUMPS) {
    const dx = d.x - p.x, dy = d.y - p.y, dz = d.z - p.z;
    const q = 1 - (dx * dx + dy * dy + dz * dz) / (BUMP_CELL * BUMP_CELL);
    if (q > 0) sum += Math.exp(SOFTNESS * q) - 1;
  }
  const dome = Math.pow(Math.min(1, Math.log(sum) / SOFTNESS), 0.72);
  // Flat pressed seam around the equator, where the two moulds met.
  const seam = Math.exp(-Math.pow(d.y / 0.09, 2));
  const r = 1 + 0.075 * dome * (1 - seam) + 0.035 * seam;
  return { r, ao: 0.6 + 0.4 * Math.min(1, dome * 1.7 + seam), squash: 0.88 };
}

// The Jeera Goli: a slightly uneven little ball with a dusted surface.
function goli(d) {
  const n = Math.sin(d.x * 7.1 + d.y * 3.3) * Math.sin(d.y * 6.2 + d.z * 5.1) * Math.sin(d.z * 7.7 + d.x * 2.1);
  const fine = Math.sin(d.x * 23 + d.z * 11 + n * 4) * Math.sin(d.y * 19 + d.x * 13 + n * 5) * Math.sin(d.z * 29 + d.y * 7);
  return { r: 1 + 0.035 * n + 0.003 * fine, ao: 0.86 + 0.14 * (0.5 + 0.5 * fine), squash: 1 };
}

const SHAPES = { raspberry, goli };

export function candyGeometry(style, detail) {
  const shape = SHAPES[style];
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const normals = geo.attributes.normal;
  const colours = new Float32Array(pos.count * 3);
  const d = new THREE.Vector3(), dirA = new THREE.Vector3(), dirB = new THREE.Vector3();
  const t1 = new THREE.Vector3(), t2 = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e = Math.max(0.006, 0.25 / (detail + 1)); // Wider sampling on coarse meshes avoids noisy shading.
  const surface = (dir, out) => {
    const s = shape(dir);
    out.copy(dir).multiplyScalar(s.r);
    out.y *= s.squash;
    return s;
  };
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const s = surface(d, a);
    // Normal by finite differences over the displaced surface.
    t1.set(Math.abs(d.y) > 0.9 ? 1 : 0, Math.abs(d.y) > 0.9 ? 0 : 1, 0).cross(d).normalize();
    t2.crossVectors(d, t1);
    surface(dirA.copy(d).addScaledVector(t1, e).normalize(), b);
    surface(dirB.copy(d).addScaledVector(t2, e).normalize(), c);
    b.sub(a);
    c.sub(a);
    const n = b.cross(c).normalize();
    if (n.dot(d) < 0) n.negate();
    n.addScaledVector(d, 0.45).normalize();
    pos.setXYZ(i, a.x, a.y, a.z);
    normals.setXYZ(i, n.x, n.y, n.z);
    colours[i * 3] = colours[i * 3 + 1] = colours[i * 3 + 2] = s.ao;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeBoundingSphere();
  return geo;
}

// Candies inside the can are plain spheres with the same surface baked into a
// height map, so a full can stays cheap while still showing every bump.
export function packGeometry(style) {
  const geo = new THREE.SphereGeometry(1, 22, 14);
  geo.scale(1, SHAPES[style](new THREE.Vector3(0, 1, 0)).squash, 1);
  return geo;
}

export function packMaps(style) {
  const W = 512, H = 256;
  const bump = new Uint8Array(W * H * 4), ao = new Uint8Array(W * H * 4);
  const d = new THREE.Vector3();
  for (let y = 0; y < H; y++) {
    const phi = ((y + 0.5) / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const theta = ((x + 0.5) / W) * Math.PI * 2;
      d.set(-Math.cos(theta) * Math.sin(phi), -Math.cos(phi), Math.sin(theta) * Math.sin(phi));
      const s = SHAPES[style](d);
      const i = (y * W + x) * 4;
      bump[i] = bump[i + 1] = bump[i + 2] = Math.min(255, Math.max(0, ((s.r - 0.94) / 0.14) * 255));
      ao[i] = ao[i + 1] = ao[i + 2] = s.ao * 255;
      bump[i + 3] = ao[i + 3] = 255;
    }
  }
  const tex = (data) => {
    const t = new THREE.DataTexture(data, W, H);
    t.wrapS = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  };
  return { bump: tex(bump), ao: tex(ao) };
}

export function candyMaterial(colour, style, maps) {
  const c = new THREE.Color(colour);
  const glossy = style === 'raspberry';
  const material = new THREE.MeshPhysicalMaterial({
    color: c,
    vertexColors: !maps,
    map: maps ? maps.ao : null,
    bumpMap: maps ? maps.bump : null,
    bumpScale: maps ? (glossy ? 1.3 : 0.5) : 1,
    roughness: glossy ? 0.24 : 0.78,
    clearcoat: glossy ? 1 : 0,
    clearcoatRoughness: 0.13,
    sheen: glossy ? 0 : 0.6,
    sheenRoughness: 0.5,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.5),
    emissive: c,
    emissiveIntensity: glossy ? 0.07 : 0.03,
  });
  // Keep shading normals facing the viewer at the silhouette. Normals that turn
  // away there shade black and show up as a dashed outline around each candy.
  material.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>', `
      #include <clearcoat_normal_fragment_maps>
      {
        vec3 toEye = normalize(vViewPosition);
        float facing = dot(normal, toEye);
        if (facing < 0.08) normal = normalize(normal + toEye * (0.08 - facing));
        #ifdef USE_CLEARCOAT
          float coatFacing = dot(clearcoatNormal, toEye);
          if (coatFacing < 0.08) clearcoatNormal = normalize(clearcoatNormal + toEye * (0.08 - coatFacing));
        #endif
      }`);
  };
  return material;
}

// ---------------------------------------------------------------- label artwork

function drawIcon(g, kind, x, y, s) {
  g.save();
  g.translate(x, y);
  const slice = (rind, flesh, pith) => {
    g.fillStyle = rind; g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill();
    g.fillStyle = pith; g.beginPath(); g.arc(0, 0, s * 0.87, 0, 7); g.fill();
    g.fillStyle = flesh;
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate((i / 8) * Math.PI * 2);
      g.beginPath(); g.moveTo(s * 0.08, 0);
      g.quadraticCurveTo(s * 0.45, s * 0.42, s * 0.78, s * 0.26);
      g.quadraticCurveTo(s * 0.86, 0, s * 0.78, -s * 0.26);
      g.quadraticCurveTo(s * 0.45, -s * 0.42, s * 0.08, 0);
      g.fill(); g.restore();
    }
  };
  const leaf = (lx, ly, l, rot, col) => {
    g.save(); g.translate(lx, ly); g.rotate(rot);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(l * 0.35, -l * 0.55, l * 0.8, -l * 0.35, l, 0);
    g.bezierCurveTo(l * 0.8, l * 0.35, l * 0.35, l * 0.55, 0, 0); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(2, l * 0.03);
    g.beginPath(); g.moveTo(l * 0.06, 0); g.lineTo(l * 0.9, 0); g.stroke();
    g.restore();
  };
  if (kind === 'orange') {
    leaf(s * 0.1, -s * 0.85, s * 0.8, -0.5, '#3F8F3C');
    slice('#EE8A12', '#F9A63A', '#FFF0D8');
  } else if (kind === 'lemon') {
    leaf(s * 0.1, -s * 0.85, s * 0.8, -0.5, '#3F8F3C');
    slice('#E9CB12', '#F8E34A', '#FFFBDD');
  } else if (kind === 'leaf') {
    leaf(-s * 1.05, s * 0.55, s * 2.3, -0.5, '#2E9E5B');
  } else if (kind === 'mango') {
    const m = g.createLinearGradient(-s, s, s, -s);
    m.addColorStop(0, '#F7B514'); m.addColorStop(0.65, '#F58A1F'); m.addColorStop(1, '#D9412B');
    g.fillStyle = m; g.beginPath(); g.moveTo(0, -s);
    g.bezierCurveTo(s * 1.2, -s, s * 1.15, s * 0.55, s * 0.1, s);
    g.bezierCurveTo(-s * 1, s * 1.1, -s * 1.05, -s * 0.3, 0, -s); g.fill();
    leaf(0, -s * 0.95, s * 0.75, -0.25, '#3F8F3C');
  } else if (kind === 'berries') {
    leaf(-s * 0.1, -s * 0.5, s * 0.95, -0.9, '#3F8F3C');
    for (const [bx, by, br] of [[-0.45, 0.1, 0.56], [0.48, 0.0, 0.52], [0.02, 0.62, 0.54]]) {
      const grad = g.createRadialGradient(s * (bx - 0.15), s * (by - 0.2), s * 0.04, s * bx, s * by, s * br);
      grad.addColorStop(0, '#6B5A95'); grad.addColorStop(0.5, '#28204F'); grad.addColorStop(1, '#120D2A');
      g.fillStyle = grad; g.beginPath(); g.arc(s * bx, s * by, s * br, 0, 7); g.fill();
    }
  } else if (kind === 'cumin') {
    const r = rng(7);
    for (let i = 0; i < 46; i++) {
      const a = r() * 7, q = Math.sqrt(r()) * s;
      g.save(); g.translate(Math.cos(a) * q, Math.sin(a) * q * 0.82); g.rotate(r() * 7);
      g.fillStyle = r() > 0.5 ? '#7A5C36' : '#A07F52';
      g.beginPath(); g.ellipse(0, 0, s * 0.17, s * 0.055, 0, 0, 7); g.fill(); g.restore();
    }
  }
  g.restore();
}

export function labelTexture(f, logo, maxAniso) {
  const W = 2048, H = 556;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);

  const face = (cx) => {
    if (logo && logo.width) {
      const lw = 410, lh = lw * (logo.height / logo.width);
      g.drawImage(logo, cx - lw / 2, 34, lw, lh);
    }
    const words = f.id === 'jeera' ? ['JEERA', 'GOLI'] : f.id === 'currant' ? ['BLACK', 'CURRANT'] : [f.word, 'CANDY'];
    const size = f.word.length > 6 ? 92 : 112;
    g.fillStyle = f.labelInk;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = `800 ${size}px "Baloo 2", sans-serif`;
    const left = cx - 236;
    g.fillText(words[0], left, 355);
    g.fillText(words[1], left, 355 + size * 0.98);
    const widest = Math.max(g.measureText(words[0]).width, g.measureText(words[1]).width);
    drawIcon(g, f.icon, Math.max(left + widest + 92, cx + 170), 392, 74);
    // Indian vegetarian mark, as printed on the real pack.
    g.strokeStyle = '#17713F'; g.lineWidth = 5; g.strokeRect(cx - 236, 196, 40, 40);
    g.fillStyle = '#17713F'; g.beginPath(); g.arc(cx - 216, 216, 11, 0, 7); g.fill();
  };
  face(W / 2);
  face(0);
  face(W);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

// ---------------------------------------------------------------- shared parts

function ribTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 4;
  const g = c.getContext('2d');
  for (let x = 0; x < 256; x++) {
    const v = 128 + 127 * Math.sin((x / 256) * Math.PI * 2);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(110, 1);
  return t;
}

function blobTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  r.addColorStop(0, 'rgba(58,10,18,.62)');
  r.addColorStop(0.42, 'rgba(58,10,18,.34)');
  r.addColorStop(0.75, 'rgba(58,10,18,.08)');
  r.addColorStop(1, 'rgba(58,10,18,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Glass alpha is driven by Fresnel and reflections: the body stays clear
// while its edges and highlights read solid, without a costly transmission pass.
function glassMaterial(side) {
  const m = new THREE.MeshPhysicalMaterial({
    color: '#F4F8F8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.035,
    depthWrite: false, side, envMapIntensity: 1.5, clearcoat: 1, clearcoatRoughness: 0.03,
  });
  m.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', `
      float glassFr = pow(1.0 - saturate(abs(dot(normalize(vViewPosition), normal))), 2.6);
      vec3 glassSp = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
      diffuseColor.a = clamp(diffuseColor.a + glassFr * 0.5 + dot(glassSp, vec3(0.333)) * 1.25, 0.0, 0.92);
      #include <opaque_fragment>`);
  };
  return m;
}

export function createShared(maxAniso) {
  const { R, H } = CAN;
  const prof = [[0, 0], [R - 0.1, 0], [R - 0.025, 0.018], [R, 0.09], [R, H - 0.02], [R - 0.012, H], [R - 0.05, H + 0.01], [R - 0.05, H + 0.06]];
  const bodyGeo = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 72);
  const lidProf = [[0.57, 0], [0.636, 0], [0.648, 0.03], [0.648, 0.27], [0.635, 0.3], [0.6, 0.325], [0.5, 0.33], [0, 0.33]];
  const lidGeo = new THREE.LatheGeometry(lidProf.map(([x, y]) => new THREE.Vector2(x, y)), 72);
  return {
    bodyGeo,
    lidGeo,
    labelGeo: new THREE.CylinderGeometry(R + 0.005, R + 0.005, 1.04, 72, 1, true, Math.PI),
    foilGeo: new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.05, 72, 1, true),
    baseGeo: new THREE.CylinderGeometry(R - 0.03, R - 0.08, 0.06, 48),
    proxyGeo: new THREE.CylinderGeometry(R + 0.1, R + 0.1, H + 0.45, 12),
    blobGeo: new THREE.PlaneGeometry(1, 1),
    glassFront: glassMaterial(THREE.FrontSide),
    glassBack: glassMaterial(THREE.BackSide),
    lidMat: new THREE.MeshPhysicalMaterial({ color: '#F7F7F4', roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.4, bumpMap: ribTexture(), bumpScale: 0.6 }),
    foilMat: new THREE.MeshStandardMaterial({ color: '#C9CDD1', metalness: 0.95, roughness: 0.28 }),
    baseMat: new THREE.MeshPhysicalMaterial({ color: '#EFF4F4', roughness: 0.12, transparent: true, opacity: 0.45, depthWrite: false }),
    proxyMat: new THREE.MeshBasicMaterial({ visible: false }),
    blobTex: blobTexture(),
    maxAniso,
  };
}

export function makeBlob(shared, size, opacity = 1) {
  const m = new THREE.Mesh(
    shared.blobGeo,
    new THREE.MeshBasicMaterial({ map: shared.blobTex, transparent: true, depthWrite: false, opacity }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.scale.setScalar(size);
  m.renderOrder = -1;
  return m;
}

// A pool of light on the floor, with a fine ring, so the front can has a stage.
export function makeStagePool() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  r.addColorStop(0, 'rgba(255,255,255,.95)');
  r.addColorStop(0.5, 'rgba(255,255,255,.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 3;
  g.beginPath(); g.arc(256, 256, 176, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, fog: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  mesh.renderOrder = -2;
  mesh.scale.setScalar(5.2);
  return mesh;
}

// ---------------------------------------------------------------- the can

// Candies hidden behind the label are skipped, which keeps the triangle count down.
function packCandies(f, geo, mat, seed) {
  const { R, H } = CAN;
  const small = f.style === 'goli';
  const size = small ? 0.098 : 0.158;
  const gap = size * (small ? 1.75 : 1.5);
  const rings = small ? [[R - 0.12, 19], [R - 0.3, 11]] : [[R - 0.175, 10], [R - 0.42, 4]];
  const r = rng(seed);
  const placed = [];
  let layer = 0;
  for (let y = size + 0.07; y < H - 0.26; y += gap, layer++) {
    if (y > 0.94 + size * 0.5 && y < 2.06 - size * 0.5) continue;
    for (const [rad, n] of rings) {
      for (let i = 0; i < n; i++) {
        const a = ((i + (layer % 2) * 0.5) / n) * Math.PI * 2 + (r() - 0.5) * 0.14;
        placed.push([Math.cos(a) * rad, y + (r() - 0.5) * gap * 0.3, Math.sin(a) * rad]);
      }
    }
  }
  const mesh = new THREE.InstancedMesh(geo, mat, placed.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  placed.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28);
    dummy.scale.setScalar(size * (0.94 + r() * 0.12));
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    const v = 0.9 + r() * 0.14;
    mesh.setColorAt(i, col.setRGB(v, v, v));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildCan(f, index, shared, candyGeo, candyMat, logo) {
  const { H } = CAN;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const contents = packCandies(f, candyGeo, candyMat, 40 + index * 13);
  body.add(contents);

  const base = new THREE.Mesh(shared.baseGeo, shared.baseMat);
  base.position.y = 0.04;
  base.renderOrder = 1;
  body.add(base);

  const back = new THREE.Mesh(shared.bodyGeo, shared.glassBack);
  back.renderOrder = 2;
  body.add(back);

  const labelMap = labelTexture(f, logo, shared.maxAniso);
  const label = new THREE.Mesh(shared.labelGeo, new THREE.MeshPhysicalMaterial({
    map: labelMap, emissiveMap: labelMap, emissive: '#ffffff', emissiveIntensity: 0.3,
    roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.7,
  }));
  label.position.y = 1.5;
  body.add(label);
  for (const y of [0.97, 2.03]) {
    const foil = new THREE.Mesh(shared.foilGeo, shared.foilMat);
    foil.position.y = y;
    body.add(foil);
  }

  const front = new THREE.Mesh(shared.bodyGeo, shared.glassFront);
  front.renderOrder = 3;
  body.add(front);

  const lid = new THREE.Group();
  lid.add(new THREE.Mesh(shared.lidGeo, shared.lidMat));
  const lidHome = new THREE.Vector3(0, H - 0.015, 0);
  lid.position.copy(lidHome);
  root.add(lid);

  root.add(makeBlob(shared, 2.7));
  const lidShadow = makeBlob(shared, 1.5, 0);
  root.add(lidShadow);

  const proxy = new THREE.Mesh(shared.proxyGeo, shared.proxyMat);
  proxy.position.y = (H + 0.45) / 2;
  proxy.userData.index = index;
  root.add(proxy);

  return { root, body, lid, lidHome, lidShadow, contents, proxy };
}

// Studio lighting captured into an environment map: long softboxes give the
// glass its vertical highlights, and the dark strips define its edges.
export function studioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: '#CDBFB4', side: THREE.BackSide }));
  room.position.y = 3;
  scene.add(room);
  const panel = (w, h, x, y, z, intensity, colour = '#FFFFFF') => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(colour).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 1, 0);
    scene.add(m);
  };
  panel(2.2, 9, -7, 3, 5, 9, '#FFF6EA');
  panel(1.1, 9, 7.5, 3, 4, 7);
  panel(9, 9, 0, 8.8, 0, 3.2, '#FFF6EA');
  panel(1.2, 9, 3, 3, 9.5, 3.5);
  panel(1.3, 9, -9.6, 3, -1, 0.04);
  panel(1.3, 9, 9.6, 3, -1, 0.04);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.025).texture;
  pmrem.dispose();
  return env;
}
