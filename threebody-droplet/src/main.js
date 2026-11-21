/* ============================================================
   水滴 · 末日之战  —  three.js cinematic reconstruction
   《三体 Ⅱ · 黑暗森林》 末日之战
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================ 常量 ============================ */
const TOTAL = 82;

const TL = {
  establish: [0, 13.2],
  hero:      [13.2, 21],
  face:      [21, 24.4],
  salvo:     [24.4, 31],
  accel:     [31, 40],
  wide:      [40, 49],
  chase:     [49, 58],
  grave:     [58, 70],
  bye:       [70, 82],
};

const FLEET = { NX: 50, NZ: 40, DX: 100, DZ: 90, LEN: 42 };
const FLEET_N = FLEET.NX * FLEET.NZ;       // 2000 艘
const ATTACK0 = 31, ATTACK1 = 58;
const IDLE = new THREE.Vector3(-300, 300, -1180);

/* 可复现随机 */
let _seed = 20260117;
const rnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const easeIO = x => { x = clamp(x, 0, 1); return -(Math.cos(Math.PI * x) - 1) / 2; };

/* ============================ 渲染器 ============================ */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true,
  stencil: false,
});
const DPR = Math.min(window.devicePixelRatio || 1, 1.8);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.6, 600000);

/* ============================ 纹理工具 ============================ */
function canvasTex(w, h, draw, opt = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = opt.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opt.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

const glowTex = canvasTex(256, 256, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0.000, 'rgba(255,255,255,1)');
  g.addColorStop(0.055, 'rgba(255,252,244,1)');
  g.addColorStop(0.130, 'rgba(255,236,205,0.86)');
  g.addColorStop(0.260, 'rgba(255,180,110,0.40)');
  g.addColorStop(0.500, 'rgba(255,130,60,0.12)');
  g.addColorStop(1.000, 'rgba(255,90,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});

const ringTex = canvasTex(256, 256, (ctx, w, h) => {
  ctx.translate(w / 2, h / 2);
  const g = ctx.createRadialGradient(0, 0, w * 0.30, 0, 0, w * 0.5);
  g.addColorStop(0.00, 'rgba(160,210,255,0)');
  g.addColorStop(0.55, 'rgba(190,225,255,0.30)');
  g.addColorStop(0.82, 'rgba(255,255,255,0.85)');
  g.addColorStop(1.00, 'rgba(255,180,120,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = w * 0.055;
  ctx.shadowColor = 'rgba(200,230,255,0.9)';
  ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.arc(0, 0, w * 0.42, 0, Math.PI * 2); ctx.stroke();
});

const starTex = canvasTex(64, 64, (ctx, w, h) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.62, 'rgba(200,220,255,0.10)');
  g.addColorStop(1, 'rgba(160,190,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
});

/* ============================ 光照 ============================ */
const jupiterPos = new THREE.Vector3(-20000, 2000, -75000);
const SUN_DIR = new THREE.Vector3(-0.94, 0.26, 0.20).normalize();
const sunLight = new THREE.DirectionalLight(0xfff3e2, 4.4);
sunLight.position.copy(SUN_DIR).multiplyScalar(40000);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x1b2838, 0.85));
// 舰队正面补光（来自探测器方向），让镜面里能看清舰体
const noseFill = new THREE.DirectionalLight(0x9bbedf, 2.2);
noseFill.position.set(0, 900, -40000);
scene.add(noseFill);
// 木星反照的冷光
const planetFill = new THREE.DirectionalLight(0x6d8fc4, 0.55);
planetFill.position.copy(jupiterPos.clone().normalize().multiplyScalar(30000));
scene.add(planetFill);

/* ============================ 星空 ============================ */
function buildStars() {
  const g = new THREE.Group();
  // 深空点星
  const N = 16000;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const th = Math.acos(urand(-1, 1));
    const ph = urand(0, Math.PI * 2);
    const r = urand(90000, 180000);
    pos[i * 3] = r * Math.sin(th) * Math.cos(ph);
    pos[i * 3 + 1] = r * Math.cos(th);
    pos[i * 3 + 2] = r * Math.sin(th) * Math.sin(ph);
    const k = rnd();
    c.setHSL(k < 0.72 ? urand(0.55, 0.63) : urand(0.05, 0.11),
      k < 0.72 ? urand(0.05, 0.3) : urand(0.3, 0.6), urand(0.45, 0.95));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.55, map: starTex, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false,
  });
  g.add(new THREE.Points(geo, mat));

  // 银河带
  const M = 9000;
  const p2 = new Float32Array(M * 3), c2 = new Float32Array(M * 3);
  const axis = new THREE.Vector3(0.42, 0.72, 0.55).normalize();
  const e1 = new THREE.Vector3(0, 0, 1).cross(axis).normalize();
  const e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();
  for (let i = 0; i < M; i++) {
    const a = urand(0, Math.PI * 2);
    const rr2 = Math.abs(gauss()) * 0.11;
    const d = new THREE.Vector3()
      .addScaledVector(e1, Math.cos(a)).addScaledVector(e2, Math.sin(a))
      .multiplyScalar(1).normalize()
      .addScaledVector(axis, urand(-0.35, 0.35) + rr2 * 2.2)
      .normalize().multiplyScalar(urand(95000, 175000));
    p2[i * 3] = d.x; p2[i * 3 + 1] = d.y; p2[i * 3 + 2] = d.z;
    const k = rnd();
    c2[i * 3] = 0.55 + 0.35 * k; c2[i * 3 + 1] = 0.62 + 0.3 * k; c2[i * 3 + 2] = 0.9;
  }
  const geo2 = new THREE.BufferGeometry();
  geo2.setAttribute('position', new THREE.BufferAttribute(p2, 3));
  geo2.setAttribute('color', new THREE.BufferAttribute(c2, 3));
  g.add(new THREE.Points(geo2, new THREE.PointsMaterial({
    size: 2.4, map: starTex, vertexColors: true, transparent: true, opacity: 0.42,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false,
  })));
  return g;
}
function urand(a, b) { return a + (b - a) * rnd(); }
function gauss() { return (rnd() + rnd() + rnd() - 1.5) / 1.5; }
scene.add(buildStars());

/* ============================ 太阳 ============================ */
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: new THREE.Color(2.4, 2.15, 1.9), transparent: true,
  blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
}));
sunSprite.position.copy(SUN_DIR).multiplyScalar(150000);
sunSprite.scale.setScalar(21000);
scene.add(sunSprite);
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, color: new THREE.Color(0.26, 0.34, 0.52), transparent: true, opacity: 0.38,
  blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false,
}));
sunHalo.position.copy(sunSprite.position);
sunHalo.scale.setScalar(42000);
scene.add(sunHalo);

/* ============================ 木星 ============================ */
const jupiterTex = canvasTex(1024, 512, (ctx, w, h) => {
  ctx.fillStyle = '#8d6a48'; ctx.fillRect(0, 0, w, h);
  const bands = [];
  let y = 0;
  while (y < h) { const bh = rr(4, 26); bands.push([y, bh]); y += bh; }
  for (const [by, bh] of bands) {
    const t = by / h;
    const v = 0.5 + 0.5 * Math.sin(t * 42 + rnd() * 6);
    const warm = 0.5 + 0.5 * Math.sin(t * 13 + 1.7);
    const r = Math.round(86 + 88 * v + 26 * warm);
    const g = Math.round(62 + 72 * v + 16 * warm);
    const b = Math.round(44 + 58 * v);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, by - 1, w, bh + 2);
  }
  // 湍流
  ctx.globalAlpha = 0.5;
  ctx.filter = 'blur(3px)';
  for (let i = 0; i < 2600; i++) {
    const yy = rnd() * h, ww = rr(60, 420), hh = rr(1.5, 7);
    const v = rnd();
    ctx.fillStyle = v > 0.5 ? `rgba(${230 + 20 * v},${205 + 30 * v},${170 + 40 * v},0.30)`
      : `rgba(${100 + 40 * v},${70 + 30 * v},${48 + 20 * v},0.30)`;
    ctx.beginPath();
    ctx.ellipse(rr(0, w), yy, ww, hh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = 'none';
  // 大红斑
  const sx = w * 0.63, sy = h * 0.63;
  const g2 = ctx.createRadialGradient(sx, sy, 4, sx, sy, 118);
  g2.addColorStop(0, 'rgba(196,86,48,0.98)');
  g2.addColorStop(0.45, 'rgba(170,78,46,0.86)');
  g2.addColorStop(0.75, 'rgba(190,130,96,0.35)');
  g2.addColorStop(1, 'rgba(190,150,110,0)');
  ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(sx, sy); ctx.scale(1, 0.52);
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, 118, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // 极区变暗
  const g3 = ctx.createLinearGradient(0, 0, 0, h);
  g3.addColorStop(0, 'rgba(30,26,30,0.55)');
  g3.addColorStop(0.18, 'rgba(30,26,30,0)');
  g3.addColorStop(0.82, 'rgba(30,26,30,0)');
  g3.addColorStop(1, 'rgba(30,26,30,0.6)');
  ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
}, { repeat: true });

const jupiter = new THREE.Mesh(
  new THREE.SphereGeometry(11000, 96, 64),
  new THREE.MeshStandardMaterial({ map: jupiterTex, roughness: 0.92, metalness: 0.0 })
);
jupiter.position.copy(jupiterPos);
jupiter.rotation.set(0.06, 0.6, 0.18);
scene.add(jupiter);

/* 大气边缘光 */
const atmoMat = new THREE.ShaderMaterial({
  uniforms: { uSun: { value: SUN_DIR.clone() } },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vP;
    void main(){
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uSun;
    varying vec3 vN; varying vec3 vP;
    void main(){
      vec3 N = normalize(vN);
      vec3 V = normalize(cameraPosition - vP);
      float rim = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
      float lit = smoothstep(-0.45, 0.6, dot(N, uSun));
      vec3 col = mix(vec3(0.06, 0.10, 0.22), vec3(1.0, 0.80, 0.56), lit);
      gl_FragColor = vec4(col * rim * 1.5, 1.0);
    }`,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(11000 * 1.012, 64, 48), atmoMat);
atmosphere.position.copy(jupiterPos);
scene.add(atmosphere);

/* 木卫 */
const moonGroup = new THREE.Group();
moonGroup.position.copy(jupiter.position);
const MOONS = [
  { n: 'Io', d: 16000, r: 260, c: 0x7a6a3e, a: 0.6, s: 0.045 },
  { n: 'Europa', d: 23500, r: 230, c: 0x8c949c, a: 2.1, s: 0.032 },
  { n: 'Ganymede', d: 31500, r: 330, c: 0x5e544a, a: 4.0, s: 0.024 },
  { n: 'Callisto', d: 39000, r: 300, c: 0x4a423a, a: 5.4, s: 0.018 },
];
const moonMeshes = [];
for (const m of MOONS) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(m.r, 24, 16),
    new THREE.MeshStandardMaterial({ color: m.c, roughness: 1, metalness: 0 })
  );
  moonGroup.add(mesh);
  moonMeshes.push({ mesh, m });
}
scene.add(moonGroup);

/* ============================ 舰队 ============================ */
const fleetGroup = new THREE.Group();
scene.add(fleetGroup);

function buildShipGeometry(kind = 0, low = false) {
  const H = [], E = [];
  const scaleL = [1.0, 1.26, 1.62][kind] || 1.0;
  if (low) {
    // 反射代理：只保留剪影，约 40 面
    const b = new THREE.CylinderGeometry(3.1, 3.9, 34, 6, 1);
    b.rotateX(Math.PI / 2); b.scale(1, 0.52, 1);
    H.push(b);
    const bw = new THREE.ConeGeometry(3.1, 18, 6);
    bw.rotateX(Math.PI / 2); bw.scale(1, 0.52, 1); bw.translate(0, 0, 26);
    H.push(bw);
    for (const sg of [-1, 1]) {
      const w = new THREE.BoxGeometry(0.4, 1.6, 17);
      w.rotateY(sg * 0.26); w.translate(sg * 4.6, 0.1, -9);
      H.push(w);
      const pod = new THREE.BoxGeometry(3.4, 2.6, 20);
      pod.translate(sg * 6.6, -0.3, -4);
      H.push(pod);
    }
    const deck = new THREE.BoxGeometry(5.4, 1.4, 26);
    deck.translate(0, 2.2, -1);
    H.push(deck);
    const eng = new THREE.CylinderGeometry(3.6, 3.2, 4, 8);
    eng.rotateX(Math.PI / 2); eng.translate(0, 0, -18);
    H.push(eng);
    const gl = new THREE.BoxGeometry(6.4, 2.6, 0.4);
    gl.translate(0, 0, -20.2);
    E.push(gl);
    const hullL = mergeGeometries(H, false);
    const glowL = mergeGeometries(E, false);
    hullL.translate(0, 0, -8); glowL.translate(0, 0, -8);
    hullL.scale(scaleL, scaleL, scaleL); glowL.scale(scaleL, scaleL, scaleL);
    return { hull: hullL, glow: glowL };
  }
  const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx || ry || rz) g.rotateX(rx), g.rotateY(ry), g.rotateZ(rz);
    g.translate(x, y, z); return g;
  };
  const cyl = (r1, r2, h, seg, x, y, z) => {
    const g = new THREE.CylinderGeometry(r1, r2, h, seg);
    g.rotateX(Math.PI / 2); g.translate(x, y, z); return g;
  };
  const cone = (r, h, seg, x, y, z) => {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.rotateX(Math.PI / 2); g.translate(x, y, z); return g;
  };

  /* 主船体：六面棱柱，细长楔形 */
  const body = new THREE.CylinderGeometry(2.95, 3.7, 32, 6, 1);
  body.rotateX(Math.PI / 2); body.scale(1, 0.52, 1);
  H.push(body);
  const bow = new THREE.ConeGeometry(2.95, 18, 6);
  bow.rotateX(Math.PI / 2); bow.scale(1, 0.52, 1); bow.translate(0, 0, 25);
  H.push(bow);
  H.push(cone(0.32, 12, 5, 0, 0, 40));                   // 撞角
  H.push(box(4.9, 0.85, 26, 0, 2.0, -1));                 // 上甲板
  H.push(box(2.6, 0.7, 20, 0, -1.95, -3));                // 龙骨
  H.push(box(3.4, 0.55, 10, 0, 1.85, 11, -0.09));         // 艏部斜甲板
  H.push(box(1.7, 1.0, 22, 0, 2.85, -4));                 // 背脊
  H.push(box(2.7, 1.25, 5.4, 0, 3.35, 5.5));              // 舰桥
  H.push(box(1.9, 0.8, 3.6, 0, 4.15, 5.2));
  H.push(box(0.9, 0.6, 2.2, 0, 4.6, 3.4));

  /* 后掠翼板（轮廓的主特征）*/
  for (const s of [-1, 1]) {
    H.push(box(0.34, 1.5, 16, s * 4.4, 0.1, -9, 0, s * 0.26, s * 0.09));
    H.push(box(0.3, 0.9, 5, s * 6.3, 0.5, -14.5, 0, s * 0.26, s * 0.09));
    H.push(box(0.6, 0.34, 12, s * 3.2, -0.3, -9, 0, s * 0.2));
    H.push(box(0.5, 0.5, 4.5, s * 2.4, 1.2, 8));          // 侧舷舱段
  }

  /* 炮塔 */
  for (const s of [-1, 1]) {
    for (const zz of [7, -3]) {
      H.push(cyl(0.8, 0.95, 1.0, 6, s * 2.5, 2.5, zz));
      H.push(box(0.22, 0.22, 3.0, s * 2.5, 2.75, zz + 1.2));
    }
  }

  /* 引擎组 */
  H.push(cyl(3.4, 3.0, 3.2, 8, 0, 0, -17.2));
  for (const x of [0, -3.3, 3.3]) {
    H.push(cyl(0.85, 1.75, 2.6, 8, x, 0, -19.4));
    H.push(cyl(1.8, 1.8, 0.5, 8, x, 0, -20.3));
  }
  H.push(box(0.3, 0.3, 6, -1.2, 3.6, -13));               // 天线
  H.push(box(0.3, 0.3, 8, 1.2, 3.6, -12));

  /* 发光件 */
  for (const s of [-1, 1]) {
    for (let i = 0; i < 9; i++) {                          // 舷窗：断续小窗
      E.push(box(0.14, 0.3, 1.15, s * 4.08, 1.15, 7.4 - i * 1.75));
    }
    for (let i = 0; i < 5; i++) {
      E.push(box(0.14, 0.24, 0.9, s * 4.5, 0.42, -3 - i * 1.7));
    }
  }
  E.push(box(1.4, 0.26, 0.15, 0, 4.05, 8.2));              // 舰桥窗
  for (const x of [0, -3.3, 3.3]) {
    const d = new THREE.CircleGeometry(1.62, 10);
    d.rotateY(Math.PI); d.translate(x, 0, -20.55);
    E.push(d);
  }
  const sensor = new THREE.SphereGeometry(0.38, 6, 4);
  sensor.translate(0, 0, 34);
  E.push(sensor);

  /* ---- 巡洋舰 / 旗舰的额外结构 ---- */
  if (kind >= 1) {
    for (const s of [-1, 1]) {
      H.push(box(2.0, 2.4, 15, s * 6.5, -0.3, -4));        // 侧舷武器舱
      H.push(box(0.9, 1.0, 9, s * 5.6, 1.9, 3));
      H.push(cyl(0.85, 1.0, 1.1, 6, s * 3.2, 2.7, -7));
      H.push(box(0.22, 0.22, 3.2, s * 3.2, 2.95, -5.6));
    }
    H.push(box(2.9, 1.7, 6.2, 0, 3.9, 5.2));               // 加高舰桥
    H.push(box(2.1, 0.9, 4.0, 0, 4.9, 4.8));
    H.push(box(0.5, 0.5, 9, -2.6, 3.4, -12));
    H.push(box(0.5, 0.5, 9, 2.6, 3.4, -12));
    E.push(box(2.1, 0.28, 0.16, 0, 4.75, 7.3));
  }
  if (kind >= 2) {
    H.push(box(8.6, 1.5, 21, 0, 1.4, -3));                 // 宽肩甲板
    H.push(box(6.0, 1.1, 13, 0, 2.4, 2));
    H.push(box(4.4, 3.4, 7.2, 0, 4.6, 1.5));               // 指挥塔
    H.push(box(3.2, 2.4, 5.4, 0, 6.9, 0.8));
    H.push(box(2.0, 1.6, 3.6, 0, 8.6, 0.4));
    H.push(box(0.4, 3.2, 0.4, -1.6, 10.4, -0.6));          // 桅杆
    H.push(box(0.4, 4.0, 0.4, 1.6, 10.8, -0.6));
    H.push(box(3.4, 0.4, 3.0, 0, 9.9, -1.2));
    for (const s of [-1, 1]) {
      H.push(box(1.3, 2.0, 11, s * 8.6, 0.6, -7));         // 外侧推进舱
      H.push(box(0.5, 1.6, 13, s * 11.4, 0.4, -8, 0, s * 0.2));
      for (const zz of [9, 0, -9]) {
        H.push(cyl(1.0, 1.15, 1.2, 6, s * 4.4, 2.4, zz));
        H.push(box(0.26, 0.26, 3.6, s * 4.4, 2.65, zz + 1.4));
      }
      E.push(box(1.1, 0.3, 0.16, s * 2.3, 6.9, 6.0));
    }
    for (const x of [-7.4, 7.4]) {                          // 外侧引擎
      H.push(cyl(0.7, 1.5, 2.4, 8, x, 0, -18.6));
      H.push(cyl(1.55, 1.55, 0.45, 8, x, 0, -19.5));
    }
    E.push(box(3.0, 0.3, 0.16, 0, 8.0, 3.4));
  }

  const scale = [1.0, 1.26, 1.62][kind] || 1.0;
  const hull = mergeGeometries(H, false);
  const glow = mergeGeometries(E, false);
  hull.translate(0, 0, -8);
  glow.translate(0, 0, -8);
  hull.scale(scale, scale, scale);
  glow.scale(scale, scale, scale);
  return { hull, glow };
}

/* ============================ 舰体装甲板纹理 ============================ */
const panelTex = canvasTex(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#98a3b0'; ctx.fillRect(0, 0, w, h);
  // 大尺度磨损噪声
  for (let i = 0; i < 420; i++) {
    const r = rr(24, 130), x = rr(0, w), y = rr(0, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = rr(-26, 22);
    g.addColorStop(0, `rgba(${150 + v},${161 + v},${174 + v},0.20)`);
    g.addColorStop(1, 'rgba(150,161,174,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }
  // 大块装甲面（明暗不一）
  for (let i = 0; i < 22; i++) {
    const v = rr(-18, 16);
    ctx.fillStyle = `rgba(${150 + v * 2.2},${162 + v * 2.2},${176 + v * 2.2},0.8)`;
    ctx.fillRect(rr(0, w), rr(0, h), rr(40, 170), rr(26, 120));
  }
  // 稀疏板缝
  ctx.lineWidth = 2.0; ctx.strokeStyle = 'rgba(22,28,38,0.75)';
  for (let i = 0; i < 11; i++) {
    const y = rr(0, h);
    ctx.beginPath(); ctx.moveTo(rr(-40, w * 0.5), y); ctx.lineTo(rr(w * 0.5, w + 40), y); ctx.stroke();
    const x = rr(0, w);
    ctx.beginPath(); ctx.moveTo(x, rr(-40, h * 0.5)); ctx.lineTo(x, rr(h * 0.5, h + 40)); ctx.stroke();
  }
  ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(22,28,38,0.45)';
  for (let i = 0; i < 16; i++) {
    const y = rr(0, h);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rr(w * 0.4, w), y); ctx.stroke();
  }
  // 检修口 / 铆钉
  for (let i = 0; i < 34; i++) {
    ctx.fillStyle = 'rgba(52,60,72,0.55)';
    ctx.fillRect(rr(0, w), rr(0, h), rr(12, 34), rr(7, 20));
  }
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = 'rgba(38,44,54,0.4)';
    ctx.fillRect(rr(0, w), rr(0, h), 2, 2);
  }
  // 使用痕迹
  for (let i = 0; i < 46; i++) {
    const x = rr(0, w), y = rr(0, h);
    const g = ctx.createLinearGradient(x, y, x, y + rr(40, 140));
    g.addColorStop(0, 'rgba(40,36,32,0.22)');
    g.addColorStop(1, 'rgba(40,36,32,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, rr(2, 5), 140);
  }
}, { repeat: true });

const hullMat = new THREE.MeshStandardMaterial({
  color: 0xaebbca, metalness: 0.52, roughness: 0.5, envMapIntensity: 1.2,
  emissive: 0x1d2836, emissiveIntensity: 1.0,
});
hullMat.onBeforeCompile = (sh) => {
  sh.uniforms.uPanel = { value: panelTex };
  sh.uniforms.uPanelScale = { value: 0.092 };
  sh.vertexShader = 'varying vec3 vObjP;\nvarying vec3 vObjN;\n' + sh.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n  vObjP = position;\n  vObjN = normal;'
  );
  sh.fragmentShader = 'varying vec3 vObjP;\nvarying vec3 vObjN;\nuniform sampler2D uPanel;\nuniform float uPanelScale;\n' +
    sh.fragmentShader
      .replace('#include <map_fragment>', `
        vec3 tpw = pow(abs(normalize(vObjN + vec3(0.0001))), vec3(6.0));
        tpw /= (tpw.x + tpw.y + tpw.z);
        vec3 panel = texture2D(uPanel, vObjP.zy * uPanelScale).rgb * tpw.x
                   + texture2D(uPanel, vObjP.xz * uPanelScale).rgb * tpw.y
                   + texture2D(uPanel, vObjP.xy * uPanelScale).rgb * tpw.z;
        diffuseColor.rgb *= panel * 1.3;
        diffuseColor.rgb *= 0.86 + 0.30 * (panel.g);
      `)
      .replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        roughnessFactor *= 0.84 + 0.36 * panel.g;
      `)
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        // 边缘冷光：把舰体从黑底里勾出来
        float rimF = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.6);
        totalEmissiveRadiance += vec3(0.22, 0.40, 0.72) * rimF * 0.55;
      `);
};
hullMat.customProgramCacheKey = () => 'fleetHull';

/* 舷窗/引擎发光：单独一套实例，碎舰会被压暗 */
const engineMat = new THREE.MeshBasicMaterial({ color: 0x86b0d6, toneMapped: true });

/* ---- 三个舰级：驱逐舰 / 巡洋舰 / 旗舰，按编队层级排布 ---- */
const shipClass = new Uint8Array(FLEET_N);
const shipInst = new Int32Array(FLEET_N);
const classCount = [0, 0, 0];
for (let i = 0; i < FLEET_N; i++) {
  const ix = i % FLEET.NX, iz = (i / FLEET.NX) | 0;
  const bx = ix % 10, bz = iz % 10;
  let c = 0;
  if (bx === 5 && bz === 5) c = 2;                        // 分队中心：旗舰
  else if (bx === 0 || bx === 9 || bz === 0 || bz === 9) c = 1;  // 分队外围：巡洋舰
  shipClass[i] = c;
  shipInst[i] = classCount[c]++;
}
const classMeshes = [0, 1, 2].map(ci => {
  const g = buildShipGeometry(ci);
  const hull = new THREE.InstancedMesh(g.hull, hullMat, Math.max(1, classCount[ci]));
  const glow = new THREE.InstancedMesh(g.glow, engineMat, Math.max(1, classCount[ci]));
  hull.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hull.frustumCulled = false; glow.frustumCulled = false;
  fleetGroup.add(hull, glow);
  return { hull, glow, n: classCount[ci] };
});
const hullMesh = classMeshes[0].hull;     // 兼容：大部分逻辑仍指向驱逐舰
const engineMesh = classMeshes[0].glow;

/* 反射用的低模代理（只在 CubeCamera 渲染时替换，省 6 遍全模型绘制） */
const proxyMeshes = [0, 1, 2].map(ci => {
  const g = buildShipGeometry(ci, true);
  const hull = new THREE.InstancedMesh(g.hull, hullMat, Math.max(1, classCount[ci]));
  const glow = new THREE.InstancedMesh(g.glow, engineMat, Math.max(1, classCount[ci]));
  hull.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  hull.frustumCulled = false; glow.frustumCulled = false;
  hull.visible = false; glow.visible = false;
  fleetGroup.add(hull, glow);
  return { hull, glow };
});

const setShipMat = (i, m) => {
  const c = classMeshes[shipClass[i]], o = shipInst[i];
  c.hull.setMatrixAt(o, m); c.glow.setMatrixAt(o, m);
  const p = proxyMeshes[shipClass[i]];
  p.hull.setMatrixAt(o, m); p.glow.setMatrixAt(o, m);
};
const setShipColor = (i, col) => classMeshes[shipClass[i]].hull.setColorAt(shipInst[i], col);
const setGlowColor = (i, col) => classMeshes[shipClass[i]].glow.setColorAt(shipInst[i], col);
const touchShips = () => {
  for (const c of classMeshes) {
    c.hull.instanceMatrix.needsUpdate = true;
    c.glow.instanceMatrix.needsUpdate = true;
    c.hull.instanceColor.needsUpdate = true;
    c.glow.instanceColor.needsUpdate = true;
  }
  for (const p of proxyMeshes) {
    p.hull.instanceMatrix.needsUpdate = true;
    p.glow.instanceMatrix.needsUpdate = true;
  }
};

const shipPos = new Float32Array(FLEET_N * 3);
const shipCol = new Float32Array(FLEET_N * 3);
const shipAlive = new Uint8Array(FLEET_N).fill(1);
const shipDeath = new Float32Array(FLEET_N).fill(1e9);
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(),
  _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3(1, 1, 1), _e = new THREE.Euler();
const _col = new THREE.Color();

for (let i = 0; i < FLEET_N; i++) {
  const ix = i % FLEET.NX, iz = Math.floor(i / FLEET.NX);
  const x = (ix - (FLEET.NX - 1) / 2) * FLEET.DX + rr(-3, 3);
  const z = (iz - (FLEET.NZ - 1) / 2) * FLEET.DZ + rr(-3, 3);
  const y = rr(-4, 4);
  shipPos[i * 3] = x; shipPos[i * 3 + 1] = y; shipPos[i * 3 + 2] = z;
  _e.set(0, Math.PI + rr(-0.012, 0.012), rr(-0.01, 0.01));
  _q.setFromEuler(_e);
  _v3.set(x, y, z);
  _m4.compose(_v3, _q, _s3);
  setShipMat(i, _m4);
  const k = rnd();
  const warm = shipClass[i] === 2 ? 0.02 : 0;
  _col.setHSL(0.58 + 0.03 * (k - 0.5) - warm, 0.06 + 0.08 * rnd(), 0.52 + 0.34 * rnd());
  setShipColor(i, _col);
  proxyMeshes[shipClass[i]].hull.setColorAt(shipInst[i], _col);
  shipCol[i * 3] = _col.r; shipCol[i * 3 + 1] = _col.g; shipCol[i * 3 + 2] = _col.b;
  setGlowColor(i, _col.setRGB(1, 1, 1));
}
touchShips();

/* ============================ 水滴 ============================ */
const DROP_LEN = 16;
const dropGroup = new THREE.Group();
scene.add(dropGroup);

const dropProfile = [];
const NSEG = 128;
const NOSE = 0.895;                         // 鼻尖从这里开始收成圆头
const rAt = (u) => Math.pow(Math.sin(Math.PI * u), 0.68) * Math.pow(1 - u, 0.34);
const rNose = rAt(NOSE);
for (let i = 0; i <= NSEG; i++) {
  const u = i / NSEG;                     // 0 = 尾, 1 = 尖端
  let rn;
  if (u <= NOSE) {
    rn = rAt(u) / 0.792;
  } else {
    // 圆润的鼻尖：一段椭圆弧，切线过渡到腮线
    const k = (u - NOSE) / (1 - NOSE);
    rn = (rNose / 0.792) * Math.sqrt(Math.max(0, 1 - k * k));
  }
  dropProfile.push(new THREE.Vector2(Math.max(0.0001, rn * 5.65), u * DROP_LEN));
}
const dropGeo = new THREE.LatheGeometry(dropProfile, 128);
dropGeo.rotateX(Math.PI / 2);
dropGeo.translate(0, 0, -DROP_LEN / 2);
dropGeo.computeVertexNormals();

const dropEnvRT = new THREE.WebGLCubeRenderTarget(512, {
  type: THREE.HalfFloatType, generateMipmaps: false,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
});
const dropCubeCam = new THREE.CubeCamera(0.5, 400000, dropEnvRT);
scene.add(dropCubeCam);

const dropMat = new THREE.ShaderMaterial({
  uniforms: {
    uEnv: { value: dropEnvRT.texture },
    uSun: { value: SUN_DIR.clone() },
    uIntensity: { value: 1.18 },
  },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vP;
    void main(){
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform samplerCube uEnv; uniform vec3 uSun; uniform float uIntensity;
    varying vec3 vN; varying vec3 vP;
    void main(){
      vec3 N = normalize(vN);
      vec3 V = normalize(cameraPosition - vP);
      vec3 R = reflect(-V, N);

      // 镜面本体：反射环境，但整体压暗——真实镜面比背景暗一档，
      // 否则映出来的星空和球外星空一样亮，看起来就成了「透明玻璃」。
      vec3 env = textureCube(uEnv, R).rgb;
      env = min(env, vec3(9.0));
      env *= 0.46;
      env = pow(max(env, vec3(0.0)) * 2.2, vec3(0.86));
      env *= vec3(0.94, 0.98, 1.06);          // 冷银偏色：金属感

      // 跟随光源的宽高光（抛光金属的标志），没有它镜面会像玻璃
      vec3 H = normalize(uSun + V);
      float ndh = clamp(dot(N, H), 0.0, 1.0);
      float sheen = pow(ndh, 42.0) * 0.85 + pow(ndh, 190.0) * 1.6;
      // 太阳的锐利镜像点
      float glint = pow(max(dot(R, uSun), 0.0), 220.0);

      vec3 col = env * uIntensity
               + vec3(0.82, 0.90, 1.0) * sheen
               + vec3(1.0, 0.97, 0.92) * glint * 2.4;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const dropMesh = new THREE.Mesh(dropGeo, dropMat);
dropMesh.frustumCulled = false;
dropGroup.add(dropMesh);

// 水滴尾迹
const TRAIL_N = 64;
const trailPos = new Float32Array(TRAIL_N * 3);
const trailCol = new Float32Array(TRAIL_N * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false,
}));
trail.frustumCulled = false;
scene.add(trail);
const trailHist = [];

/* ============================ 粒子系统 ============================ */
const PCOUNT = 18000;
const pPos = new Float32Array(PCOUNT * 3);
const pVel = new Float32Array(PCOUNT * 3);
const pCol = new Float32Array(PCOUNT * 3);
const pSize = new Float32Array(PCOUNT);
const pAlpha = new Float32Array(PCOUNT);
const pLife = new Float32Array(PCOUNT);
const pMax = new Float32Array(PCOUNT);
const pDrag = new Float32Array(PCOUNT);
const pA0 = new Float32Array(PCOUNT);
let pCursor = 0;

const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('aColor', new THREE.BufferAttribute(pCol, 3));
pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSize, 1));
pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlpha, 1));
pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);

const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 1000 } },
  vertexShader: /* glsl */`
    attribute vec3 aColor; attribute float aSize; attribute float aAlpha;
    varying vec3 vColor; varying float vAlpha;
    uniform float uScale;
    void main(){
      vColor = aColor; vAlpha = aAlpha;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(aSize * uScale / max(0.001, -mv.z), 0.0, 900.0);
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vColor; varying float vAlpha;
    void main(){
      if (vAlpha < 0.004) discard;
      float d = length(gl_PointCoord - vec2(0.5));
      float a = smoothstep(0.5, 0.0, d);
      a = pow(a, 1.7);
      gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
    }`,
  transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(pGeo, pMat);
particles.frustumCulled = false;
scene.add(particles);

function spawnParticle(px, py, pz, vx, vy, vz, r, g, b, size, life, drag, a0 = 1) {
  const i = pCursor; pCursor = (pCursor + 1) % PCOUNT;
  pPos[i * 3] = px; pPos[i * 3 + 1] = py; pPos[i * 3 + 2] = pz;
  pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
  pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b;
  pSize[i] = size; pAlpha[i] = a0; pLife[i] = life; pMax[i] = life; pDrag[i] = drag; pA0[i] = a0;
  pAlive++;
}

let pAlive = 0;
function updateParticles(dt) {
  if (pAlive === 0) return;
  let alive = 0;
  for (let i = 0; i < PCOUNT; i++) {
    if (pLife[i] <= 0) { if (pAlpha[i] !== 0) pAlpha[i] = 0; continue; }
    pLife[i] -= dt;
    if (pLife[i] <= 0) { pAlpha[i] = 0; continue; }
    const d = Math.exp(-pDrag[i] * dt);
    pVel[i * 3] *= d; pVel[i * 3 + 1] *= d; pVel[i * 3 + 2] *= d;
    pPos[i * 3] += pVel[i * 3] * dt;
    pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt;
    pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
    alive++;
    const k = pLife[i] / pMax[i];
    pAlpha[i] = pA0[i] * (k > 0.92 ? (1 - k) / 0.08 : Math.pow(k, 1.5));
  }
  pAlive = alive;
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.aColor.needsUpdate = true;
  pGeo.attributes.aSize.needsUpdate = true;
  pGeo.attributes.aAlpha.needsUpdate = true;
}

/* 闪光精灵池 */
class SpritePool {
  constructor(tex, n) {
    this.items = []; this.i = 0;
    for (let k = 0; k < n; k++) {
      const m = new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, color: 0xffffff,
      });
      const s = new THREE.Sprite(m);
      s.visible = false; s.frustumCulled = false;
      scene.add(s);
      this.items.push({ s, m, t: 0, dur: 1, s0: 1, s1: 2, o0: 1 });
    }
  }
  spawn(pos, s0, s1, dur, color, opacity = 1) {
    const it = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
    it.s.position.copy(pos);
    it.s.visible = true;
    it.t = 0; it.dur = dur; it.s0 = s0; it.s1 = s1; it.o0 = opacity;
    it.m.color.set(color);
    it.m.opacity = opacity;
    it.s.scale.setScalar(s0);
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.s.visible) continue;
      it.t += dt;
      const k = it.t / it.dur;
      if (k >= 1) { it.s.visible = false; it.m.opacity = 0; continue; }
      const sc = it.s0 + (it.s1 - it.s0) * Math.pow(k, 0.55);
      it.s.scale.setScalar(sc);
      it.m.opacity = it.o0 * Math.pow(1 - k, 1.7);
    }
  }
}
/* 等离子火球池：比 sprite 更有体积感 */
const fireGeo = new THREE.SphereGeometry(1, 18, 14);
const fireMatProto = new THREE.ShaderMaterial({
  uniforms: {
    uHot: { value: new THREE.Color(1.0, 0.95, 0.82) },
    uCool: { value: new THREE.Color(1.0, 0.28, 0.06) },
    uOpacity: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vN; varying vec3 vP;
    void main(){
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uHot; uniform vec3 uCool; uniform float uOpacity;
    varying vec3 vN; varying vec3 vP;
    void main(){
      vec3 N = normalize(vN);
      vec3 V = normalize(cameraPosition - vP);
      float f = clamp(1.0 - abs(dot(N, V)), 0.0, 1.0);
      float core = pow(1.0 - f, 2.2);
      vec3 col = mix(uCool, uHot, core);
      float a = uOpacity * (0.12 + 0.88 * core);
      gl_FragColor = vec4(col * a, a);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const FirePool = (() => {
  const items = [];
  for (let i = 0; i < 46; i++) {
    const m = fireMatProto.clone();
    const mesh = new THREE.Mesh(fireGeo, m);
    mesh.visible = false; mesh.frustumCulled = false;
    scene.add(mesh);
    items.push({ mesh, m, t: 0, dur: 1, r0: 1, r1: 2, op: 1 });
  }
  let cur = 0;
  return {
    items,
    spawn(pos, r0, r1, dur, op = 1) {
      const it = items[cur]; cur = (cur + 1) % items.length;
      it.mesh.position.copy(pos);
      it.mesh.visible = true;
      it.t = 0; it.dur = dur; it.r0 = r0; it.r1 = r1; it.op = op;
      it.mesh.scale.setScalar(r0);
      it.m.uniforms.uOpacity.value = op;
    },
    update(dt) {
      for (const it of items) {
        if (!it.mesh.visible) continue;
        it.t += dt;
        const k = it.t / it.dur;
        if (k >= 1) { it.mesh.visible = false; continue; }
        const sc = it.r0 + (it.r1 - it.r0) * Math.pow(k, 0.45);
        it.mesh.scale.setScalar(sc);
        it.m.uniforms.uOpacity.value = it.op * Math.pow(1 - k, 1.6);
      }
    },
  };
})();

const flashPool = new SpritePool(glowTex, 150);
const ringPool = new SpritePool(ringTex, 64);

/* ============================ 光束 ============================ */
const beamPos = new Float32Array(FLEET_N * 6);
const beamCol = new Float32Array(FLEET_N * 6);
for (let i = 0; i < FLEET_N; i++) {
  beamCol[i * 6] = 0.04; beamCol[i * 6 + 1] = 0.06; beamCol[i * 6 + 2] = 0.10;
  beamCol[i * 6 + 3] = 0.75; beamCol[i * 6 + 4] = 0.92; beamCol[i * 6 + 5] = 1.0;
}
const beamGeo = new THREE.BufferGeometry();
beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPos, 3));
beamGeo.setAttribute('color', new THREE.BufferAttribute(beamCol, 3));
beamGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
const beamMat = new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
  depthWrite: false, toneMapped: false,
});
const beams = new THREE.LineSegments(beamGeo, beamMat);
beams.frustumCulled = false;
scene.add(beams);

/* ============================ 水滴轨迹 ============================ */
const attackPts = [
  [-1280, 380, -980], [-2150, 250, -1250], [500, -520, -1600], [2150, 320, -720],
  [1150, 820, 320], [-950, -220, 950], [-2300, 520, 1600], [-650, 900, 320],
  [1450, -700, -180], [2600, 240, 1250], [850, 640, 2150], [-1900, -280, 1150],
  [-2600, 720, -260], [420, 240, -880], [2850, 520, 220],
].map(p => new THREE.Vector3(...p));
const attackCurve = new THREE.CatmullRomCurve3(attackPts, false, 'catmullrom', 0.42);
const attackLen = attackCurve.getLength();

const HOVER = new THREE.Vector3(720, 1500, 780);

/* ============================ 毁灭时刻表 ============================ */
let deathOrder = [];
let deathPtr = 0;
(function computeDeaths() {
  const S = 900;
  const pts = [], times = [];
  for (let i = 0; i <= S; i++) {
    const x = i / S;
    const u = easeIO(x);
    pts.push(attackCurve.getPointAt(u));
    times.push(ATTACK0 + x * (ATTACK1 - ATTACK0));
  }
  for (let i = 0; i < FLEET_N; i++) {
    const px = shipPos[i * 3], py = shipPos[i * 3 + 1], pz = shipPos[i * 3 + 2];
    let best = 1e18, bt = ATTACK1;
    for (let s = 0; s < pts.length; s += 3) {
      const p = pts[s];
      const d = (p.x - px) ** 2 + (p.y - py) ** 2 + (p.z - pz) ** 2;
      if (d < best) { best = d; bt = times[s]; }
    }
    shipDeath[i] = Math.min(ATTACK1 + 1.2, bt + Math.sqrt(best) / 520 + rr(0, 0.35));
  }
  deathOrder = Array.from({ length: FLEET_N }, (_, i) => i)
    .sort((a, b) => shipDeath[a] - shipDeath[b]);
})();

/* ============================ 后处理 ============================ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const BLOOM_SCALE = 0.72;
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * BLOOM_SCALE, innerHeight * BLOOM_SCALE), 0.78, 0.7, 0.72);
composer.addPass(bloom);
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVig: { value: 0.9 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uVig;
    varying vec2 vUv;
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5; float d = length(c);
      float ca = 0.0022 * d * d;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca).b;
      float vig = smoothstep(1.02, 0.30, d * 1.25);
      col *= mix(1.0, vig, uVig);
      float g = fract(sin(dot(uv * uRes + uTime * 57.0, vec2(12.9898, 78.233))) * 43758.5453);
      col += (g - 0.5) * 0.016;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);
composer.addPass(new OutputPass());

/* ============================ 声音 ============================ */
class Sound {
  constructor() { this.ctx = null; this.on = true; this.lastBoom = 0; }
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.0;
    this.master.connect(ctx.destination);

    // 噪声源缓冲
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // 低频持续音
    this.drone = ctx.createGain(); this.drone.gain.value = 0.0;
    this.drone.connect(this.master);
    for (const f of [36.5, 55, 82.5]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f < 40 ? 0.5 : 0.16;
      o.connect(g); g.connect(this.drone); o.start();
    }
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.09;
    n.connect(lp); lp.connect(this.windGain); this.windGain.connect(this.master); n.start();
    this.drone.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 3);
    this.master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2.5);
  }
  boom(strength = 1) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = this.noise;
    n.playbackRate.value = 1;
    const bp = ctx.createBiquadFilter(); bp.type = 'lowpass';
    bp.frequency.setValueAtTime(1400 * strength, t);
    bp.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * strength, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    n.connect(bp); bp.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 1.2);

    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.42 * strength, t + 0.02);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(og); og.connect(this.master); o.start(t); o.stop(t + 1.5);
  }
  whoosh() {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.20, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    n.connect(bp); bp.connect(g); g.connect(this.master);
    n.start(t); n.stop(t + 2.6);
  }
  setEnabled(v) {
    this.on = v;
    if (this.master) this.master.gain.value = v ? 0.85 : 0;
  }
}
const sound = new Sound();

/* ============================ 状态 ============================ */
let t = 0;
let playing = false;
let started = false;
let freeCam = false;
let lastNow = performance.now();
let lastShot = -1;
let subIdx = -2;
let lastBoomAt = -1;
let lastWhoosh = -99;
const shake = { amp: 0, seed: 1 };

const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false;
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.maxDistance = 60000;
controls.minDistance = 20;

/* ============================ 水滴运动 ============================ */
const _dropPos = new THREE.Vector3();
const _dropPrev = new THREE.Vector3();
const _dropDir = new THREE.Vector3(0, 0, 1);

function attackU(x) { return easeIO(clamp(x, 0, 1)); }

function updateDrop(t) {
  let pos = _dropPos, dir = _dropDir;
  if (t < 24.4) {
    pos.copy(IDLE);
    pos.x += Math.sin(t * 0.35) * 6;
    pos.y += Math.sin(t * 0.5) * 4;
    dir.set(0.05, 0.02, 0.998).normalize();
  } else if (t < ATTACK0) {
    const k = easeIO((t - 24.4) / (ATTACK0 - 24.4));
    const a = IDLE.clone();
    a.x += Math.sin(24.4 * 0.35) * 6;
    pos.lerpVectors(a, attackCurve.getPointAt(0), k);
    const p2 = attackCurve.getPointAt(0.012 * k);
    dir.subVectors(p2, pos).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0.05, 0.02, 0.998);
  } else if (t < ATTACK1) {
    const x = (t - ATTACK0) / (ATTACK1 - ATTACK0);
    const u = attackU(x);
    pos.copy(attackCurve.getPointAt(u));
    const u2 = Math.min(1, u + 0.004);
    dir.subVectors(attackCurve.getPointAt(u2), pos).normalize();
    if (dir.lengthSq() < 0.5) dir.set(0, 0, 1);
  } else if (t < 65) {
    const k = easeIO((t - ATTACK1) / (65 - ATTACK1));
    const end = attackCurve.getPointAt(1);
    pos.lerpVectors(end, HOVER, k);
    dir.set(0.1, 0.55, 0.1).normalize().lerp(new THREE.Vector3(0, 1, 0), k).normalize();
  } else {
    // 悬停 → 转向飞离
    const k = clamp((t - 65) / 17, 0, 1);
    const out = new THREE.Vector3(16000, 9000, 22000);
    const lift = smooth(clamp(k / 0.35, 0, 1));
    pos.copy(HOVER); pos.y += lift * 900; pos.addScaledVector(out, Math.pow(k, 5.5) * 0.30);
    dir.copy(out).normalize().lerp(new THREE.Vector3(0, 1, 0), 1 - lift * 0.85).normalize();
  }
  dropGroup.position.copy(pos);
  const look = pos.clone().add(dir);
  dropGroup.lookAt(look);
  dropCubeCam.position.copy(pos);
  return pos;
}

/* ============================ 毁灭 ============================ */
let killed = 0;
let lastBoomWall = 0;

function explodeShip(i, dt) {
  if (!shipAlive[i]) return;
  shipAlive[i] = 0; killed++;
  const px = shipPos[i * 3], py = shipPos[i * 3 + 1], pz = shipPos[i * 3 + 2];
  _v3.set(px, py, pz);

  // 变成翻滚的残骸：保留舰体，随机姿态 + 压扁 + 烧黑
  const ox = px + rr(-70, 70), oy = py + rr(-60, 60), oz = pz + rr(-70, 70);
  _v3.set(ox, oy, oz);
  _e.set(rr(0, 6.28), rr(0, 6.28), rr(0, 6.28));
  _q.setFromEuler(_e);
  _m4.compose(_v3, _q, _s3.set(rr(0.4, 0.85), rr(0.3, 0.7), rr(0.4, 0.95)));
  setShipMat(i, _m4);
  setShipColor(i, _col.setHSL(rr(0.02, 0.09), rr(0.2, 0.5), rr(0.03, 0.10)));
  proxyMeshes[shipClass[i]].hull.setColorAt(shipInst[i], _col);
  setGlowColor(i, _col.setRGB(0.03, 0.04, 0.05));
  touchShips();

  // 穿甲闪光（沿水滴方向拉出一串）
  for (let k = 0; k < 3; k++) {
    _v3.set(px, py, pz).addScaledVector(_dropDir, -k * 9);
    flashPool.spawn(_v3, 26 - k * 6, 46 - k * 8, 0.24 + k * 0.05, 0xdfeeff, 0.9);
  }
  _v3.set(px, py, pz);
  FirePool.spawn(_v3, 12, 130 + rr(0, 60), 1.15, 1.0);
  FirePool.spawn(_v3, 6, 52 + rr(0, 20), 0.55, 0.9);
  flashPool.spawn(_v3, 6, 74, 0.30, 0xdfeeff, 1.0);
  flashPool.spawn(_v3, 10, 190 + rr(0, 80), 0.45, 0xffb066, 0.55);
  ringPool.spawn(_v3, 40, 320, 1.5, 0x8fb8ff, 0.18);

  // 碎片
  const n = 30;
  for (let k = 0; k < n; k++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(urand(-1, 1));
    const sp = Math.pow(rnd(), 0.55) * 160;
    const vx = Math.sin(ph) * Math.cos(th) * sp;
    const vy = Math.cos(ph) * sp * 0.8;
    const vz = Math.sin(ph) * Math.sin(th) * sp;
    const hot = rnd();
    spawnParticle(px + vx * 0.05, py + vy * 0.05, pz + vz * 0.05,
      vx, vy, vz,
      1.0, 0.36 + hot * 0.52, 0.08 + hot * 0.32,
      rr(3, 11), rr(1.2, 4.2), rr(0.5, 1.4));
  }
  // 燃烧的残骸云（长时间、大尺寸）
  for (let k = 0; k < 3; k++) {
    const ox = rr(-1, 1), oy = rr(-1, 1), oz = rr(-1, 1);
    spawnParticle(px + ox * 130, py + oy * 110, pz + oz * 130,
      ox * 16, oy * 16, oz * 16,
      1.0, 0.30 + rnd() * 0.2, 0.05,
      rr(18, 58), rr(16, 34), 0.12, 0.30);
  }
  // 大火球残留（照亮整片战场）
  spawnParticle(px, py, pz, rr(-5, 5), rr(-3, 3), rr(-5, 5),
    1.0, 0.42, 0.11, rr(150, 270), rr(7, 13), 0.25, 0.085);

  // 声音（节流）
  const now = performance.now();
  if (now - lastBoomWall > 55) { lastBoomWall = now; sound.boom(clamp(0.35 + rnd() * 0.65, 0, 1) * 0.7); }
  // 镜头震动
  const d = camera.position.distanceTo(_v3);
  shake.amp = Math.min(14, shake.amp + clamp(320 / (d + 60), 0, 1) * 1.6);
}

/* ============================ 摄像机 ============================ */
const camPos = new THREE.Vector3();
const camTgt = new THREE.Vector3();
const camPosS = new THREE.Vector3();
const camTgtS = new THREE.Vector3();
let shotIdx = -1;

const _tmpA = new THREE.Vector3(), _tmpB = new THREE.Vector3();

function shotEstablish(p) {
  // 前段：穿行于战舰阵列之间；后段：拉升展示整个方阵
  const a = clamp(p / 0.52, 0, 1);
  const b = clamp((p - 0.42) / 0.58, 0, 1);
  _tmpA.set(-2150, 210, 2500);
  _tmpB.set(-500, 420, 2750);
  camPos.lerpVectors(_tmpA, _tmpB, easeIO(a));
  _tmpB.set(-300, 2250, 5700);
  camPos.lerp(_tmpB, easeIO(b));
  camPos.x += Math.sin(p * 2.4) * 60;
  camPos.y += Math.cos(p * 1.8) * 34;
  _tmpA.set(-400, 60, -300);
  _tmpB.set(-900, 950, -1500);
  camTgt.lerpVectors(_tmpA, _tmpB, easeIO(b));
  camera.fov = 46 - b * 6;
}
function shotHero(p) {
  const ang = 0.40 + p * 0.85;
  const rad = 40 + Math.pow(Math.max(0, p - 0.34) / 0.66, 1.4) * 350;
  const h = 12 + p * 44;
  camPos.set(
    IDLE.x + Math.sin(ang) * rad * 0.95,
    IDLE.y + h,
    IDLE.z + Math.cos(ang) * rad
  );
  camTgt.copy(IDLE);
  camTgt.x -= rad * 0.05;
  camTgt.y += rad * 0.02;
  camTgt.y -= 1.5;
  camera.fov = 34 - p * 4;
}
function shotFace(p) {
  camPos.set(IDLE.x - 18 + p * 8, IDLE.y + 9 - p * 4, IDLE.z - 74 + p * 20);
  camTgt.set(IDLE.x + 40, IDLE.y - 16, IDLE.z + 620);
  camera.fov = 38;
}
function shotSalvo(p) {
  _tmpA.set(-1900 + p * 300, 3900 - p * 200, 1500);
  _tmpB.set(-700 + p * 500, 1350 - p * 100, -1400);
  camPos.copy(_tmpA);
  camTgt.copy(_tmpB);
  camera.fov = 52 - p * 3;
}
function shotAccel(p, t) {
  const pos = _dropPos;
  const side = new THREE.Vector3(0.2, 1, 0).cross(_dropDir).normalize();
  const rad = 120 - p * 34;
  camPos.copy(pos).addScaledVector(_dropDir, -rad).addScaledVector(side, 34 - p * 10);
  camPos.y += 26 - p * 8;
  camTgt.copy(pos);
  camera.fov = 46;
}
function shotWide(p) {
  const az = -0.42 + p * 0.38;
  const el = 0.56 - p * 0.05;
  const d = 5600 - p * 420;
  camPos.set(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d);
  camTgt.set(0, 120, 0);
  camera.fov = 46;
}
function shotChase(p) {
  const pos = _dropPos;
  const side = new THREE.Vector3(0.3, 1, 0).cross(_dropDir).normalize();
  const rad = 68 - p * 12;
  camPos.copy(pos).addScaledVector(_dropDir, -rad).addScaledVector(side, 34);
  camPos.y += 155;
  camTgt.copy(pos).addScaledVector(_dropDir, 40);
  camTgt.y -= 55;
  camera.fov = 54;
}
function shotGrave(p) {
  const k = easeIO(p);
  _tmpA.set(1300, 320, 1250);
  _tmpB.set(4600, 3600, 6400);
  camPos.lerpVectors(_tmpA, _tmpB, k);
  camPos.x += Math.sin(p * 3) * 90 * (1 - p);
  camTgt.set(0, 180, 0);
  camera.fov = 40 + k * 11;
}
function shotBye(p) {
  // 从残骸一侧仰望：水滴 + 身后的火场，一起入画
  const f = new THREE.Vector3(0.53, 0.30, 0.73).normalize();
  const side = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize();
  const away = _dropPos.clone().setY(_dropPos.y * 0.55).normalize();
  const d = 210 - p * 70;
  camPos.copy(_dropPos).addScaledVector(away, d * 0.85).addScaledVector(side, d * 0.62);
  camPos.y += 30;
  camTgt.copy(_dropPos).addScaledVector(away, -d * 0.5).addScaledVector(side, -d * 0.2);
  camera.fov = 38;
}

const SHOTS = [
  { t0: 0, t1: 13.2, fn: shotEstablish, damp: 14 },
  { t0: 13.2, t1: 21, fn: shotHero, damp: 16 },
  { t0: 21, t1: 24.4, fn: shotFace, damp: 16 },
  { t0: 24.4, t1: 31, fn: shotSalvo, damp: 14 },
  { t0: 31, t1: 40, fn: shotAccel, damp: 12 },
  { t0: 40, t1: 49, fn: shotWide, damp: 10 },
  { t0: 49, t1: 58, fn: shotChase, damp: 18 },
  { t0: 58, t1: 70, fn: shotGrave, damp: 10 },
  { t0: 70, t1: 999, fn: shotBye, damp: 12 },
];

function updateCamera(t, dt) {
  let idx = SHOTS.length - 1;
  for (let i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0 && t < SHOTS[i].t1) { idx = i; break; }
  const s = SHOTS[idx];
  const p = clamp((t - s.t0) / (s.t1 - s.t0), 0, 1);
  camPos.set(0, 0, 0); camTgt.set(0, 0, 0); camera.fov = 42;
  s.fn(p, t);
  if (idx !== shotIdx) {
    shotIdx = idx;
    camPosS.copy(camPos); camTgtS.copy(camTgt);
  } else {
    const k = 1 - Math.exp(-s.damp * dt);
    camPosS.lerp(camPos, k);
    camTgtS.lerp(camTgt, k);
  }
  camera.position.copy(camPosS);
  if (shake.amp > 0.02) {
    camera.position.x += (rnd() - 0.5) * shake.amp;
    camera.position.y += (rnd() - 0.5) * shake.amp;
    camera.position.z += (rnd() - 0.5) * shake.amp;
  }
  camera.lookAt(camTgtS);
  // 细微的手持漂移：让镜头像人端着，而不是轨道机
  const ft = performance.now() * 0.001;
  const amp = clamp(camera.position.distanceTo(camTgtS) * 0.0022, 0.12, 5.0);
  camera.translateX((Math.sin(ft * 0.63) * 0.6 + Math.sin(ft * 1.71) * 0.4) * amp);
  camera.translateY((Math.cos(ft * 0.81) * 0.5 + Math.sin(ft * 2.13) * 0.3) * amp);
  camera.rotateZ(Math.sin(ft * 0.47) * 0.0009 + Math.sin(ft * 1.3) * 0.0004);
  camera.updateMatrixWorld();
}

/* ============================ 字幕 / HUD ============================ */
const SUBS = [
  [0.8, 6.9, '木星轨道外侧。联合舰队的<b>两千艘</b>恒星级战舰，列成方阵。'],
  [7.2, 13.0, '这是人类文明，几乎全部的力量。'],
  [13.6, 17.8, '探测器「水滴」，长 3.5 米。表面绝对光滑，<b>全反射</b>。'],
  [18.2, 20.9, '像一滴完美的、凝固的水银。'],
  [21.4, 24.2, '丁仪的声音在频道里炸开——<em>「傻孩子们，快跑啊！」</em>'],
  [24.8, 27.6, '两千艘战舰同时开火，炮火汇成一片光海。'],
  [27.9, 30.8, '水滴穿过火网。它的表面，没有留下任何痕迹。'],
  [31.4, 34.8, '它开始加速。'],
  [35.2, 39.4, '一艘接一艘。像烧红的铁丝，穿过黄油。'],
  [40.0, 45.0, '方阵在燃烧。火光从一端蔓延到另一端。'],
  [45.4, 50.6, '没有一艘战舰能拦住它，也没有一艘能逃开。'],
  [52.0, 57.4, '三十分钟。'],
  [58.8, 63.4, '两千艘战舰，变成一片无声的残骸。'],
  [64.0, 69.4, '人类的太空舰队，全军覆没。'],
  [71.0, 76.0, '它调转方向，飞向太阳系内侧。'],
];
const subEl = document.getElementById('subLine');
const fleetNumEl = document.getElementById('fleetNum');
const fleetStateEl = document.getElementById('fleetState');
const dropSpeedEl = document.getElementById('dropSpeed');
const clockEl = document.getElementById('clock');
const endTitleEl = document.getElementById('endTitle');
const fillEl = document.getElementById('fill');
const knobEl = document.getElementById('knob');
const tcEl = document.getElementById('tc');
const ctrlEl = document.getElementById('ctrl');
const uiEls = [document.getElementById('telL'), document.getElementById('telR')];

function updateSubs(t) {
  if (!started) { subEl.classList.remove('on'); return; }
  let idx = -1;
  for (let i = 0; i < SUBS.length; i++) {
    if (t >= SUBS[i][0] && t <= SUBS[i][1]) { idx = i; break; }
  }
  if (idx !== subIdx) {
    subIdx = idx;
    if (idx < 0) subEl.classList.remove('on');
    else { subEl.innerHTML = SUBS[idx][2]; subEl.classList.add('on'); }
  } else if (idx >= 0 && t > SUBS[idx][1] - 0.45) {
    subEl.classList.remove('on');
  } else if (idx >= 0) {
    subEl.classList.add('on');
  }
}

function fmtClock(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

let lastHud = 0;
function updateHud(t, dt) {
  if (Math.abs(t - lastHud) < 0.06) return;
  lastHud = t;
  fleetNumEl.textContent = (FLEET_N - killed).toLocaleString('en-US');
  if (killed > 0 && killed < FLEET_N) {
    fleetStateEl.textContent = '正在损失';
    fleetStateEl.classList.add('alarm');
  } else if (killed >= FLEET_N) {
    fleetStateEl.textContent = '覆灭';
    fleetStateEl.classList.add('alarm');
  } else {
    fleetStateEl.textContent = '列阵待命';
    fleetStateEl.classList.remove('alarm');
  }
  if (t > 24.4 && t < 66) {
    const m = clamp((t - 24.4) / (66 - 24.4), 0, 1) * 30 * 60;
    clockEl.textContent = 'T+ ' + fmtClock(m);
    clockEl.style.opacity = 1;
  } else if (t >= 66) {
    clockEl.textContent = 'T+ 30:00';
    clockEl.style.opacity = 1;
  } else {
    clockEl.style.opacity = 0;
  }
  // 速度
  if (t >= ATTACK0 && t < ATTACK1) {
    const sp = (attackLen / (ATTACK1 - ATTACK0)) * Math.abs(Math.sin(Math.PI * clamp((t - ATTACK0) / (ATTACK1 - ATTACK0), 0, 1)));
    dropSpeedEl.textContent = (30 + sp * 0.012).toFixed(1) + ' km/s';
  } else if (t >= ATTACK1) {
    dropSpeedEl.textContent = '0.0 km/s';
  } else {
    dropSpeedEl.textContent = (0.4 + 0.1 * Math.sin(t)).toFixed(1) + ' km/s';
  }
  // 进度
  const r = clamp(t / TOTAL, 0, 1);
  fillEl.style.width = (r * 100) + '%';
  knobEl.style.left = (r * 100) + '%';
  tcEl.textContent = fmtClock(t) + ' / 01:22';
  endTitleEl.classList.toggle('on', t > 77.6);
}

/* ============================ 循环 ============================ */
const SIZE = new THREE.Vector2();

/* 分辨率：Retina 上 devicePixelRatio=2 会把缓冲放到 4.5M 像素，
   这里封顶 1.6 并允许自适应缩放到 0.72（≈1.15x），由帧率驱动。 */
const DPR_CAP = Math.min(window.devicePixelRatio || 1, 1.6);
let renderScale = DPR_CAP > 1.4 ? 0.9 : 1.0;
let perfAcc = 0, perfFrames = 0, lastScaleAt = 0;

function applyResolution() {
  const w = innerWidth, h = innerHeight;
  const pr = Math.max(0.7, DPR_CAP * renderScale);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  bloom.setSize(w * BLOOM_SCALE, h * BLOOM_SCALE);
  renderer.getSize(SIZE);
  gradePass.uniforms.uRes.value.set(w, h);
}
function onResize() { applyResolution(); }
addEventListener('resize', onResize);
applyResolution();

function adaptResolution(dt, now) {
  perfAcc += dt; perfFrames++;
  if (perfAcc < 1.4) return;
  const fps = perfFrames / perfAcc;
  perfAcc = 0; perfFrames = 0;
  if (now - lastScaleAt < 2600) return;
  if (fps < 54 && renderScale > 0.72) {
    renderScale = Math.max(0.72, renderScale - 0.12);
    lastScaleAt = now; applyResolution();
  } else if (fps > 59.5 && renderScale < 1.0) {
    renderScale = Math.min(1.0, renderScale + 0.08);
    lastScaleAt = now; applyResolution();
  }
}

function resetField() {
  killed = 0;
  for (let i = 0; i < FLEET_N; i++) {
    shipAlive[i] = 1;
    _e.set(0, Math.PI, 0); _q.setFromEuler(_e);
    _v3.set(shipPos[i * 3], shipPos[i * 3 + 1], shipPos[i * 3 + 2]);
    _m4.compose(_v3, _q, _s3.set(1, 1, 1));
    setShipMat(i, _m4);
    setShipColor(i, _col.setRGB(shipCol[i * 3], shipCol[i * 3 + 1], shipCol[i * 3 + 2]));
    setGlowColor(i, _col.setRGB(1, 1, 1));
  }
  touchShips();
  deathPtr = 0;
  pLife.fill(0); pAlpha.fill(0);
  pGeo.attributes.aAlpha.needsUpdate = true;
  for (const it of flashPool.items) { it.s.visible = false; it.m.opacity = 0; }
  for (const it of ringPool.items) { it.s.visible = false; it.m.opacity = 0; }
  trailHist.length = 0;
  shotIdx = -1;
  lastShot = -1;
}

function seek(newT) {
  const nt = clamp(newT, 0, TOTAL);
  const back = nt < t;
  t = nt;
  if (back) {
    resetField();
    for (let i = 0; i < FLEET_N; i++) {
      if (shipDeath[i] <= t) {
        shipAlive[i] = 0; killed++;
        _v3.set(shipPos[i * 3] + rr(-70, 70), shipPos[i * 3 + 1] + rr(-60, 60), shipPos[i * 3 + 2] + rr(-70, 70));
        _e.set(rr(0, 6.28), rr(0, 6.28), rr(0, 6.28)); _q.setFromEuler(_e);
        _m4.compose(_v3, _q, _s3.set(rr(0.4, 0.85), rr(0.3, 0.7), rr(0.4, 0.95)));
        setShipMat(i, _m4);
        setShipColor(i, _col.setHSL(rr(0.02, 0.09), rr(0.2, 0.5), rr(0.03, 0.10)));
        setGlowColor(i, _col.setRGB(0.03, 0.04, 0.05));
      }
    }
    touchShips();
    deathPtr = 0;
    while (deathPtr < FLEET_N && shipDeath[deathOrder[deathPtr]] <= t) deathPtr++;
    // 补余烬
    for (let k = 0; k < 260; k++) {
      const i = deathOrder[Math.floor(rnd() * Math.max(1, deathPtr))];
      if (i === undefined) break;
      spawnParticle(shipPos[i * 3] + rr(-140, 140), shipPos[i * 3 + 1] + rr(-120, 120), shipPos[i * 3 + 2] + rr(-140, 140),
        rr(-10, 10), rr(-10, 10), rr(-10, 10), 1.0, 0.32, 0.07, rr(70, 200), rr(14, 34), 0.1, 0.5);
    }
  } else {
    while (deathPtr < FLEET_N && shipDeath[deathOrder[deathPtr]] <= t) {
      explodeShip(deathOrder[deathPtr]); deathPtr++;
    }
  }
  subIdx = -2;
  shake.amp = 0;
  updateSubs(t);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dtRaw = (now - lastNow) / 1000;
  lastNow = now;
  const dt = clamp(dtRaw, 0.0001, 0.05);

  if (playing) t += dt;
  else if (!started) { t += dt * 0.35; if (t > 11.5) t = 0; }
  if (t >= TOTAL && playing) { t = TOTAL; setPlaying(false); }

  const pos = updateDrop(t);

  // 舰船毁灭
  while (deathPtr < FLEET_N && shipDeath[deathOrder[deathPtr]] <= t) {
    explodeShip(deathOrder[deathPtr]);
    deathPtr++;
  }

  // 尾迹
  if (t > ATTACK0 - 1.2) {
    trailHist.unshift(pos.clone());
    if (trailHist.length > TRAIL_N) trailHist.pop();
    for (let i = 0; i < TRAIL_N; i++) {
      const p = trailHist[Math.min(i, trailHist.length - 1)] || pos;
      trailPos[i * 3] = p.x; trailPos[i * 3 + 1] = p.y; trailPos[i * 3 + 2] = p.z;
      const a = Math.pow(1 - i / TRAIL_N, 2.0) * 2.4;
      trailCol[i * 3] = 0.55 * a; trailCol[i * 3 + 1] = 0.78 * a; trailCol[i * 3 + 2] = 1.0 * a;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.color.needsUpdate = true;
    trail.visible = true;
  } else {
    trail.visible = false;
  }

  // 光束
  let firing = 0, beamAll = false;
  if (t > 24.4 && t < 31) { firing = 1; beamAll = true; }
  // 31 秒之后进入方阵内部，不再齐射（否则满屏交叉光束）
  if (firing > 0.001) {
    for (let i = 0; i < FLEET_N; i++) {
      const o = i * 6;
      if (!shipAlive[i] || (!beamAll && i % 11 !== 0)) {
        beamPos[o] = beamPos[o + 3] = 0;
        beamCol[o] = beamCol[o + 3] = 0;
        continue;
      }
      beamCol[o] = 0.05; beamCol[o + 1] = 0.08; beamCol[o + 2] = 0.13;
      beamCol[o + 3] = 0.7; beamCol[o + 4] = 0.9; beamCol[o + 5] = 1.0;
      const px = shipPos[i * 3], py = shipPos[i * 3 + 1], pz = shipPos[i * 3 + 2];
      beamPos[o] = px; beamPos[o + 1] = py; beamPos[o + 2] = pz - 20;
      beamPos[o + 3] = pos.x + rr(-28, 28);
      beamPos[o + 4] = pos.y + rr(-28, 28);
      beamPos[o + 5] = pos.z + rr(-28, 28);
    }
    beamGeo.attributes.position.needsUpdate = true;
    beamGeo.attributes.color.needsUpdate = true;
    beamMat.opacity = firing * (beamAll ? 0.17 : 0.1) * (0.86 + 0.14 * Math.sin(now * 0.02));
    beams.visible = true;
  } else {
    beams.visible = false;
  }

  // 齐射汇聚点炽光
  if (t > 24.4 && t < 32.5) {
    const k = t < 31 ? 1 : clamp(1 - (t - 31) / 1.5, 0, 1);
    if (Math.random() < 0.5) {
      flashPool.spawn(pos, 14, 30, 0.14, 0xbcd8ff, 0.22 * k);
    }
  }

  // 毁灭开始时的一记震撼
  if (t > ATTACK0 + 0.1 && lastBoomAt < ATTACK0) {
    lastBoomAt = t; shake.amp = 6; sound.boom(1); sound.whoosh();
  }
  // 加速度声（只触发一次）
  if (t > 24.4 && t < 30 && lastWhoosh < 24.4) { lastWhoosh = t; sound.whoosh(); }

  shake.amp *= Math.exp(-dt * 2.4);
  if (perf.particles) updateParticles(dt);
  FirePool.update(dt);
  flashPool.update(dt);
  ringPool.update(dt);

  // 木卫公转
  for (const { mesh, m } of moonMeshes) {
    const a = m.a + t * m.s;
    mesh.position.set(Math.cos(a) * m.d, Math.sin(a * 0.4) * m.d * 0.12, Math.sin(a) * m.d);
  }

  if (!freeCam) updateCamera(t, dt);

  // 水滴环境反射
  if (perf.cube && camera.position.distanceTo(pos) < 1400 && (frameCount++ % 3 === 0)) {
    dropGroup.visible = false; trail.visible = false;
    const pv = particles.visible; particles.visible = false;   // 反射里不需要粒子，省 6 遍填充
    classMeshes.forEach(c => { c.hull.visible = false; c.glow.visible = false; });
    proxyMeshes.forEach(c => { c.hull.visible = true; c.glow.visible = true; });
    dropCubeCam.update(renderer, scene);
    proxyMeshes.forEach(c => { c.hull.visible = false; c.glow.visible = false; });
    classMeshes.forEach(c => { c.hull.visible = true; c.glow.visible = true; });
    particles.visible = pv;
    dropGroup.visible = true; trail.visible = trailHist.length > 1;
  }

  // 粒子尺寸
  const h = renderer.domElement.height;
  pMat.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

  gradePass.uniforms.uTime.value = now * 0.001;
  softwareFov();
  if (perf.post) composer.render(dt); else renderer.render(scene, camera);

  updateSubs(t);
  updateHud(t, dt);
  adaptResolution(dt, now);
}
const perf = { cube: true, bloom: true, ships: true, particles: true, post: true };
let frameCount = 0;
let _lastFov = 0;
function softwareFov() {
  if (Math.abs(camera.fov - _lastFov) > 0.001) {
    camera.updateProjectionMatrix();
    _lastFov = camera.fov;
  }
}

/* ============================ 交互 ============================ */
function setPlaying(v) {
  playing = v;
  const b = document.getElementById('btnPlay');
  b.textContent = v ? '暂停' : '播放';
}

document.getElementById('btnPlay').onclick = () => {
  if (!started) return;
  setPlaying(!playing);
};
document.getElementById('btnReplay').onclick = () => {
  resetField(); t = 0; lastBoomAt = -1; lastWhoosh = -99;
  subIdx = -2; updateSubs(0);
  setPlaying(true);
};
document.getElementById('btnSound').onclick = (e) => {
  sound.setEnabled(!sound.on);
  e.currentTarget.textContent = sound.on ? '声音 开' : '声音 关';
  e.currentTarget.classList.toggle('active', sound.on);
};
document.getElementById('btnFree').onclick = (e) => {
  freeCam = !freeCam;
  controls.enabled = freeCam;
  e.currentTarget.classList.toggle('active', freeCam);
  if (freeCam) {
    controls.target.copy(_dropPos);
    camera.position.copy(_dropPos).add(new THREE.Vector3(240, 140, 240));
    controls.update();
  } else {
    shotIdx = -1;
  }
};

const bar = document.getElementById('bar');
let dragging = false;
function barSeek(ev) {
  const r = bar.getBoundingClientRect();
  const x = clamp((ev.clientX - r.left) / r.width, 0, 1);
  seek(x * TOTAL);
}
bar.addEventListener('pointerdown', e => { dragging = true; barSeek(e); });
addEventListener('pointermove', e => { if (dragging) barSeek(e); });
addEventListener('pointerup', () => { dragging = false; });

// 时间轴刻度
(() => {
  const marks = document.getElementById('marks');
  for (const k of ['establish', 'hero', 'face', 'salvo', 'accel', 'wide', 'chase', 'grave', 'bye']) {
    const d = document.createElement('div');
    d.className = 'mk';
    d.style.left = (TL[k][0] / TOTAL * 100) + '%';
    marks.appendChild(d);
  }
})();

const introEl = document.getElementById('intro');
document.getElementById('begin').onclick = () => {
  introEl.classList.add('hide');
  started = true;
  t = 0;
  setPlaying(true);
  sound.init();
  ctrlEl.classList.add('on');
  uiEls.forEach(e => e.classList.add('on'));
  clockEl.style.opacity = 1;
  setTimeout(() => { introEl.style.display = 'none'; }, 1700);
};

addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (started) setPlaying(!playing); }
  if (e.code === 'ArrowRight') seek(t + 5);
  if (e.code === 'ArrowLeft') seek(t - 5);
  if (e.code === 'KeyC') document.getElementById('btnFree').click();
});

/* ============================ 启动 ============================ */
// 预建环境贴图（给金属舰体用）
(function buildEnv() {
  const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(10, 500000, rt);
  cam.position.set(0, 2000, 0);
  classMeshes.forEach(c => { c.hull.visible = false; c.glow.visible = false; });
  cam.update(renderer, scene);
  classMeshes.forEach(c => { c.hull.visible = true; c.glow.visible = true; });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromCubemap(rt.texture);
  scene.environment = env.texture;
  scene.environmentIntensity = 1.05;
  pmrem.dispose(); rt.dispose();
})();

// 预编译
camera.position.set(-5700, 2500, 7500);
camera.lookAt(0, 0, 0);
updateDrop(0);
renderer.compile(scene, camera);

document.getElementById('loading').classList.add('hide');
setTimeout(() => { const l = document.getElementById('loading'); if (l) l.style.display = 'none'; }, 900);

// URL 快进（调试 / 截图）：?t=48&play=1
const q = new URLSearchParams(location.search);
if (q.has('t')) {
  introEl.classList.add('hide');
  introEl.style.display = 'none';
  const ld = document.getElementById('loading');
  ld.classList.add('hide'); ld.style.display = 'none';
  started = true;
  ctrlEl.classList.add('on');
  uiEls.forEach(e => e.classList.add('on'));
  clockEl.style.opacity = 1;
  seek(parseFloat(q.get('t')) || 0);
  setPlaying(q.get('play') === '1');
} else {
  setPlaying(false);
}

window.__ob = {
  seek, play: () => setPlaying(true), pause: () => setPlaying(false),
  get t() { return t; }, get killed() { return killed; },
  get state() { return { t, killed, started, playing, freeCam, deathPtr, subIdx, renderScale, pr: renderer.getPixelRatio() }; },
  setTime(v) { seek(v); },
  setScale(v) { renderScale = v; applyResolution(); },
  scene, camera, renderer, dropGroup, sunSprite, sunHalo, jupiter, flashPool, composer, bloom, gradePass, dropEnvRT, dropMat, dropMesh, hullMesh, perf, classMeshes, particles,
};
requestAnimationFrame(frame);
