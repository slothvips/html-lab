/* 清明上河图 · 工具层 */
(function (QM) {
  'use strict';

  QM.THREE = THREE;
  // 颜色按 sRGB 解读，避免整体泛白
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;

  /* ---------- 随机与噪声 ---------- */
  QM.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  QM.rand = QM.rng(20240404);
  QM.rr = (a, b) => a + QM.rand() * (b - a);
  QM.ri = (a, b) => Math.floor(QM.rr(a, b + 1));
  QM.pick = (arr) => arr[Math.floor(QM.rand() * arr.length)];
  QM.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  QM.lerp = (a, b, t) => a + (b - a) * t;
  QM.smooth = (t) => t * t * (3 - 2 * t);

  function hash2(x, y) {
    let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  }
  QM.hash2 = hash2;
  QM.noise2 = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = QM.smooth(xf), v = QM.smooth(yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return QM.lerp(QM.lerp(a, b, u), QM.lerp(c, d, u), v);
  };
  QM.fbm = function (x, y, oct) {
    let s = 0, amp = 0.5, f = 1;
    oct = oct || 4;
    for (let i = 0; i < oct; i++) { s += amp * QM.noise2(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return s;
  };

  /* ---------- 几何合并 ---------- */
  // 合并若干 BufferGeometry（统一转非索引，省去索引偏移的坑）
  QM.mergeGeoms = function (list, ao) {
    list = list.flat();
    const arrays = { position: [], normal: [], uv: [], color: [] };
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      const g = list[i].index ? list[i].toNonIndexed() : list[i];
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      const uv = g.getAttribute('uv');
      const gc = g.getAttribute('color');
      if (!p) continue;
      for (let k = 0; k < p.count * 3; k++) arrays.position.push(p.array[k]);
      if (n) for (let k = 0; k < n.count * 3; k++) arrays.normal.push(n.array[k]);
      else for (let k = 0; k < p.count * 3; k++) arrays.normal.push(0);
      if (uv) for (let k = 0; k < uv.count * 2; k++) arrays.uv.push(uv.array[k]);
      else for (let k = 0; k < p.count * 2; k++) arrays.uv.push(0);
      // 顶点 AO：贴地压暗 + 朝下面压暗（近似天光遮蔽）
      for (let k = 0; k < p.count; k++) {
        let shade = 1;
        if (ao) {
          const y = arrays.position[(count + k) * 3 + 1];
          const ny = arrays.normal[(count + k) * 3 + 1];
          const hAO = 0.56 + 0.44 * QM.clamp(y / 3.0, 0, 1);
          const nAO = 0.76 + 0.24 * QM.clamp(ny * 0.5 + 0.5, 0, 1);
          shade = 1 - (1 - hAO * nAO) * ao;
        }
        if (gc) {
          arrays.color.push(gc.array[k * 3] * shade, gc.array[k * 3 + 1] * shade, gc.array[k * 3 + 2] * shade);
        } else {
          arrays.color.push(shade, shade, shade);
        }
      }
      count += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(arrays.position, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(arrays.normal, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(arrays.uv, 2));
    out.setAttribute('color', new THREE.Float32BufferAttribute(arrays.color, 3));
    out.computeBoundingSphere();
    return out;
  };

  // 补齐白顶点色（供 vertexColors 材质使用）
  QM.white = function (geo) {
    if (!geo.getAttribute('color')) {
      const n = geo.getAttribute('position').count;
      const arr = new Float32Array(n * 3);
      arr.fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    return geo;
  };


  /* ---------- 几何 ---------- */
  QM.geo = {};
  QM.geo.box = function (w, h, d, x, y, z, rx, ry, rz) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    return g;
  };
  QM.geo.cyl = function (rt, rb, h, seg, x, y, z, rx, ry, rz) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg || 8);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
    m.compose(new THREE.Vector3(x || 0, y || 0, z || 0), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    return g;
  };
  QM.geo.sphere = function (r, x, y, z, sx, sy, sz) {
    const g = new THREE.SphereGeometry(r, 10, 8);
    g.scale(sx || 1, sy || 1, sz || 1);
    g.translate(x || 0, y || 0, z || 0);
    return g;
  };
  QM.geo.plane = function (w, h, x, y, z, rx, ry) {
    const g = new THREE.PlaneGeometry(w, h);
    if (rx === undefined) rx = 0;
    g.rotateX(rx);
    if (ry) g.rotateY(ry);
    g.translate(x || 0, y || 0, z || 0);
    return g;
  };

  QM.mesh = function (geoms, mat, castShadow, receiveShadow, ao) {
    const g = Array.isArray(geoms) ? QM.mergeGeoms(geoms, ao) : geoms;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = !!castShadow;
    m.receiveShadow = !!receiveShadow;
    return m;
  };

  /* ---------- 顶点色合并 ---------- */
  QM.mergeColored = function (items) {
    const pos = [], nor = [], uv = [], col = [];
    const c = new THREE.Color();
    items.forEach(it => {
      const g = it.g.index ? it.g.toNonIndexed() : it.g;
      const p = g.getAttribute('position');
      const n = g.getAttribute('normal');
      const u = g.getAttribute('uv');
      if (!p) return;
      c.set(it.c).convertSRGBToLinear();
      for (let i = 0; i < p.count * 3; i++) pos.push(p.array[i]);
      for (let i = 0; i < p.count * 3; i++) nor.push(n ? n.array[i] : 0);
      for (let i = 0; i < p.count * 2; i++) uv.push(u ? u.array[i] : 0);
      for (let i = 0; i < p.count; i++) col.push(c.r, c.g, c.b);
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  };

  // 两点之间的梁
  QM.beamBetween = function (p1, p2, w, h, extra) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 1e-4) return new THREE.BufferGeometry();
    const g = new THREE.BoxGeometry(w, h === undefined ? w : h, len);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.normalize());
    const m = new THREE.Matrix4().compose(
      p1.clone().add(p2).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)
    );
    g.applyMatrix4(m);
    return g;
  };

  /* ---------- Canvas 贴图 ---------- */
  QM.canvasTex = function (w, h, draw, opts) {
    opts = opts || {};
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (opts.repeat) t.repeat.set(opts.repeat[0], opts.repeat[1]);
    t.anisotropy = 8;
    if (opts.srgb !== false) t.encoding = THREE.sRGBEncoding;
    if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
    return t;
  };

  QM.paperGrain = function (ctx, w, h, amount, rand) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rand() - 0.5) * amount;
      d[i] = QM.clamp(d[i] + n, 0, 255);
      d[i + 1] = QM.clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = QM.clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  };

  // 由亮度高度场生成法线贴图（切线空间）
  QM.normalFromCanvas = function (canvas, strength) {
    const w = canvas.width, h = canvas.height;
    const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d');
    const img = octx.createImageData(w, h);
    const d = img.data;
    const H = (x, y) => {
      x = (x + w) % w; y = (y + h) % h;
      const i = (y * w + x) * 4;
      return (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114) / 255;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
        const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
        let nx = -dx, ny = dy, nz = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const i = (y * w + x) * 4;
        d[i] = (nx / len * 0.5 + 0.5) * 255;
        d[i + 1] = (ny / len * 0.5 + 0.5) * 255;
        d[i + 2] = (nz / len * 0.5 + 0.5) * 255;
        d[i + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(out);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    t.encoding = THREE.LinearEncoding;
    return t;
  };

  QM.FONT = '"Songti SC","STSong","SimSun","Noto Serif SC",serif';

  /* 牌匾 / 幌子文字贴图 */
  QM.signTexture = function (text, opts) {
    opts = opts || {};
    const vertical = !!opts.vertical;
    const n = text.length;
    const W = vertical ? 128 : 512;
    const H = vertical ? 512 : 128;
    return QM.canvasTex(W, H, (ctx, w, h) => {
      // 世界整体 X 镜像，文字需预翻转才能正读
      if (QM.MIRROR_TEXT !== false) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.fillStyle = opts.bg || '#e8dfc8';
      ctx.fillRect(0, 0, w, h);
      // 木质/布质底纹
      for (let i = 0; i < 240; i++) {
        ctx.fillStyle = 'rgba(90,70,40,' + (0.02 + Math.random() * 0.05) + ')';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 20, 1 + Math.random() * 2);
      }
      ctx.fillStyle = opts.fg || '#2a2018';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (vertical) {
        const fs = Math.min(w * 0.72, h / n * 0.82);
        ctx.font = '600 ' + fs + 'px ' + QM.FONT;
        for (let i = 0; i < n; i++) {
          ctx.fillText(text[i], w / 2, h * (i + 0.5) / n);
        }
      } else {
        const fs = Math.min(h * 0.62, w / n * 0.9);
        ctx.font = '600 ' + fs + 'px ' + QM.FONT;
        ctx.fillText(text, w / 2, h / 2 + 2);
      }
      if (opts.border) {
        ctx.strokeStyle = opts.border; ctx.lineWidth = 6;
        ctx.strokeRect(5, 5, w - 10, h - 10);
      }
    });
  };

})(window.QM = window.QM || {});
