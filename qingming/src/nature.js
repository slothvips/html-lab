/* 清明上河图 · 草木：垂柳 / 枯枝 / 松 / 桃 / 草 / 柳絮 / 飞鸟 */
(function (QM) {
  'use strict';
  const T = THREE;

  /* ---------- 柳条贴图 ---------- */
  const willowTex = QM.canvasTex(128, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    // 枝
    ctx.strokeStyle = '#6d5f3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, 0);
    for (let y = 0; y < h; y += 16) ctx.lineTo(w * 0.5 + Math.sin(y * 0.03) * 6, y);
    ctx.stroke();
    // 叶
    const r = QM.rng(4242);
    for (let i = 0; i < 90; i++) {
      const y = r() * h;
      const x = w * 0.5 + (r() - 0.5) * 46;
      const s = 5 + r() * 5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 2.2);
      ctx.fillStyle = ['#8b9a55', '#7d8c48', '#9aa861', '#6f7f40'][Math.floor(r() * 4)];
      ctx.globalAlpha = 0.85 + r() * 0.15;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.42, s * 1.3, 0, 0, 6.3);
      ctx.fill();
      ctx.restore();
    }
  });
  willowTex.wrapS = willowTex.wrapT = T.ClampToEdgeWrapping;

  const blossomTex = QM.canvasTex(128, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(818);
    for (let i = 0; i < 120; i++) {
      const x = r() * w, y = r() * h;
      ctx.fillStyle = ['#e8cfd4', '#f0dde0', '#dcbcc4', '#f4e6e6'][Math.floor(r() * 4)];
      ctx.globalAlpha = 0.75 + r() * 0.25;
      ctx.beginPath();
      ctx.arc(x, y, 2 + r() * 4, 0, 6.3);
      ctx.fill();
    }
  });
  blossomTex.wrapS = blossomTex.wrapT = T.ClampToEdgeWrapping;

  const leafTex = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(555);
    for (let i = 0; i < 150; i++) {
      const x = r() * w, y = r() * h;
      ctx.fillStyle = ['#7a8848', '#68763c', '#8d9a58', '#5d6b34'][Math.floor(r() * 4)];
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + r() * 4, 2 + r() * 3, r() * 3, 0, 6.3);
      ctx.fill();
    }
  });
  leafTex.wrapS = leafTex.wrapT = T.ClampToEdgeWrapping;

  const MATW = new T.MeshStandardMaterial({ map: willowTex, transparent: true, alphaTest: 0.35, side: T.DoubleSide, roughness: 0.95, color: 0xdfe0c0 });
  const MATB = new T.MeshStandardMaterial({ map: blossomTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.95 });
  const MATL = new T.MeshStandardMaterial({ map: leafTex, transparent: true, alphaTest: 0.3, side: T.DoubleSide, roughness: 0.95 });
  QM.MAT.willow = MATW;

  /* ---------- 垂柳 ---------- */
  QM.willowGeom = function (x, z, scale) {
    const s = scale || 1;
    const parts = { trunk: [], leaf: [] };
    const cl = [];
    const solid = [];
    const baseY = QM.heightAt(x, z);
    const h = 4.4 * s;
    const lean = QM.rr(-0.3, 0.3);
    // 主干
    parts.trunk.push(QM.geo.cyl(0.22 * s, 0.44 * s, h, 7, x, baseY + h / 2, z, lean * 0.3, 0, lean));
    parts.trunk.push(QM.geo.cyl(0.36 * s, 0.16 * s, 0.6 * s, 6, x, baseY + 0.05, z));
    // 主枝
    const nb = 6;
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * Math.PI * 2 + QM.rr(-0.3, 0.3);
      const len = QM.rr(1.6, 2.8) * s;
      const bx = x + Math.cos(a) * len * 0.55, bz = z + Math.sin(a) * len * 0.55;
      const by = baseY + h * 0.92;
      parts.trunk.push(QM.beamBetween(
        new T.Vector3(x, baseY + h * QM.rr(0.6, 0.92), z),
        new T.Vector3(bx, by + QM.rr(0.1, 0.7), bz), 0.14 * s, 0.12 * s));
      // 垂条：实体叶串（沿下垂曲线的小叶簇，逐渐变小）
      const nS = 14;
      for (let k = 0; k < nS; k++) {
        const tt = k / nS;
        const px = QM.lerp(x, bx, 0.55 + tt * 0.45) + QM.rr(-0.5, 0.5) * s;
        const pz = QM.lerp(z, bz, 0.55 + tt * 0.45) + QM.rr(-0.5, 0.5) * s;
        const topY = by + QM.rr(-0.55, 0.35);
        const len2 = QM.rr(2.2, 4.2) * s;
        const segs = 7;
        for (let j = 0; j < segs; j++) {
          const tj = j / (segs - 1);
          solid.push(QM.solidLeafCluster(
            px + Math.sin(tj * 3.1 + tt * 6) * 0.13,
            topY - len2 * tj - 0.1,
            pz + Math.cos(tj * 2.7 + tt * 5) * 0.13,
            (0.10 - tj * 0.035) * s,
            0x7e8f45, Math.floor(px * 53 + pz * 29 + j * 7)
          ));
        }
      }
      // 远景卡片（LOD 用）
      for (let k = 0; k < 4; k++) {
        const cz = by - QM.rr(0.6, 2.2);
        const g = new T.PlaneGeometry(QM.rr(1.1, 1.9) * s, QM.rr(0.9, 1.5) * s);
        g.rotateY(QM.rr(0, 3.14));
        g.translate(bx + QM.rr(-1, 1), cz, bz + QM.rr(-1, 1));
        cl.push(g);
      }
    }
    // 冠部叶团（垂丝面片）
    for (let i = 0; i < 26; i++) {
      const a = QM.rr(0, 6.28), r = QM.rr(0, 2.2) * s;
      const g = new T.PlaneGeometry(QM.rr(0.8, 1.5) * s, QM.rr(0.8, 1.4) * s);
      g.rotateY(QM.rr(0, 3.14));
      g.rotateX(QM.rr(-0.4, 0.4));
      g.translate(x + Math.cos(a) * r, baseY + h * 0.92 + QM.rr(-0.8, 1.2) * s, z + Math.sin(a) * r);
      parts.leaf.push(g);
    }
    // 分层叶簇：枝端团块（交叉面片）+ 冠心大团
    const nb2 = 6;
    for (let i = 0; i < nb2; i++) {
      const a = (i / nb2) * Math.PI * 2 + QM.rr(-0.3, 0.3);
      const len = QM.rr(1.6, 2.8) * s;
      const bx = x + Math.cos(a) * len * 0.55, bz = z + Math.sin(a) * len * 0.55;
      const by = baseY + h * 0.92 + QM.rr(0.1, 0.7);
      for (let k = 0; k < 9; k++) {
        const sz = QM.rr(0.16, 0.30) * s;
        const ox = bx + QM.rr(-0.9, 0.9) * s, oz = bz + QM.rr(-0.9, 0.9) * s;
        const oy = by + QM.rr(-1.4, 0.15) * s;
        solid.push(QM.solidLeafCluster(ox, oy, oz, sz, 0x7f8f45, Math.floor(ox * 31 + oz * 17)));
      }
    }
    for (let i = 0; i < 26; i++) {
      const a = QM.rr(0, 6.28), rr2 = QM.rr(0, 1.9) * s;
      const sz = QM.rr(0.18, 0.34) * s;
      solid.push(QM.solidLeafCluster(
        x + Math.cos(a) * rr2, baseY + h * QM.rr(0.84, 1.02) + QM.rr(-0.7, 0.4) * s, z + Math.sin(a) * rr2,
        sz, 0x84944a, Math.floor(a * 97 + i * 13)));
    }
    for (let i = 0; i < 10; i++) {
      const a = QM.rr(0, 6.28), rr2 = QM.rr(0, 1.9) * s;
      const sz = QM.rr(1.6, 2.6) * s;
      const g = new T.PlaneGeometry(sz, sz * 0.8);
      g.rotateY(QM.rr(0, 3.14));
      g.rotateX(QM.rr(-0.4, 0.4));
      g.translate(x + Math.cos(a) * rr2, baseY + h * QM.rr(0.86, 1.04) + QM.rr(-0.4, 0.8) * s, z + Math.sin(a) * rr2);
      cl.push(g);
    }
    parts.cluster = cl;
    parts.solid = solid;
    return parts;
  };

  /* ---------- 早春枯树（榆、槐） ---------- */
  QM.bareGeom = function (x, z, scale, seed) {
    const s = scale || 1;
    const r = QM.rng(seed || 1);
    const trunk = [], leaf = [];
    const baseY = QM.heightAt(x, z);
    const h = 5.2 * s;
    trunk.push(QM.geo.cyl(0.16 * s, 0.4 * s, h, 6, x, baseY + h / 2, z, 0, 0, (r() - 0.5) * 0.12));
    const branch = (px, py, pz, dir, len, rad, depth) => {
      const ex = px + dir.x * len, ey = py + dir.y * len, ez = pz + dir.z * len;
      trunk.push(QM.beamBetween(new T.Vector3(px, py, pz), new T.Vector3(ex, ey, ez), rad, rad * 0.9));
      if (depth <= 0) {
        if (r() > 0.25) {
          const sz = (0.9 + r() * 0.7) * s;
          for (let k = 0; k < 3; k++) {
            const g = new T.PlaneGeometry(sz, sz * 0.8);
            g.rotateY(r() * 3.14 + k * 1.3);
            g.rotateX((r() - 0.5) * 0.6);
            g.translate(ex, ey + (r() - 0.5) * 0.2, ez);
            leaf.push(g);
          }
        }
        return;
      }
      const n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const d = new T.Vector3(dir.x + (r() - 0.5) * 1.2, dir.y + (r() - 0.2) * 0.7, dir.z + (r() - 0.5) * 1.2).normalize();
        branch(ex, ey, ez, d, len * (0.6 + r() * 0.2), rad * 0.62, depth - 1);
      }
    };
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28;
      branch(x, baseY + h * (0.55 + r() * 0.3), z,
        new T.Vector3(Math.cos(a) * 0.8, 0.9, Math.sin(a) * 0.8).normalize(),
        1.8 * s, 0.09 * s, 3);
    }
    return { trunk, leaf, cluster: [] };
  };

  /* ---------- 松 ---------- */
  QM.pineGeom = function (x, z, scale) {
    const s = scale || 1;
    const trunk = [], leaf = [];
    const baseY = QM.heightAt(x, z);
    trunk.push(QM.geo.cyl(0.18 * s, 0.34 * s, 5.4 * s, 6, x, baseY + 2.7 * s, z));
    for (let i = 0; i < 5; i++) {
      const y = baseY + (3.0 + i * 0.7) * s;
      const rr = (2.4 - i * 0.36) * s;
      for (let k = 0; k < 6; k++) {
        const a = QM.rr(0, 6.28);
        const g = new T.PlaneGeometry(rr, rr * 0.72);
        g.rotateX(-0.2 + QM.rr(-0.2, 0.2));
        g.rotateY(QM.rr(0, 3.14));
        g.translate(x + Math.cos(a) * rr * 0.32, y + QM.rr(-0.2, 0.25), z + Math.sin(a) * rr * 0.32);
        leaf.push(g);
      }
    }
    return { trunk, leaf, cluster: [] };
  };

  /* ---------- 桃 / 李 ---------- */
  QM.blossomGeom = function (x, z, scale, seed) {
    const s = scale || 1;
    const r = QM.rng(seed || 3);
    const b = QM.bareGeom(x, z, scale * 0.85, seed);
    const baseY = QM.heightAt(x, z);
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28, rad = r() * 2.0 * s;
      const g = new T.PlaneGeometry(1.3 * s, 1.3 * s);
      g.rotateY(r() * 3.14);
      g.translate(x + Math.cos(a) * rad, baseY + (3.2 + r() * 2.0) * s, z + Math.sin(a) * rad);
      b.leaf.push(g);
    }
    return b;
  };


  /* ---------- 3D 草叶：弯曲、锥度、折脊、顶点色 ---------- */
  QM.bladeTuft = function (x, z, opts) {
    const o = opts || {};
    const baseY = QM.heightAt(x, z);
    const nBlades = o.blades || QM.ri(3, 5);
    const hMin = o.hMin || 0.35, hMax = o.hMax || 0.85;
    const wMin = o.wMin || 0.022, wMax = o.wMax || 0.045;
    const segs = o.segs || 4;
    const cBase = new T.Color(o.base || 0x53602c);
    const cTip = new T.Color(o.tip || 0x9aad5a);
    const geoms = [];
    for (let b = 0; b < nBlades; b++) {
      const ang = QM.rr(0, 6.283);
      const h = QM.rr(hMin, hMax);
      const w0 = QM.rr(wMin, wMax);
      const lean = QM.rr(0.10, 0.42) * h;
      const ox = x + QM.rr(-0.12, 0.12), oz = z + QM.rr(-0.12, 0.12);
      const dx = Math.cos(ang), dz = Math.sin(ang);
      const px = -dz, pz = dx;
      const pos = [], uv = [], col = [];
      const ring = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const bend = lean * t * t;
        const w = w0 * Math.pow(1 - t, 0.55) + 0.0015;
        const cx = ox + dx * bend;
        const cz = oz + dz * bend;
        const cy = baseY + h * t - 0.18 * lean * t * t;
        ring.push({ cx, cy, cz, w, t });
      }
      for (let i = 0; i <= segs; i++) {
        const R = ring[i];
        const c = cBase.clone().lerp(cTip, R.t);
        // 左 / 中(折脊) / 右
        pos.push(R.cx + px * R.w, R.cy, R.cz + pz * R.w);
        pos.push(R.cx, R.cy + R.w * 0.9, R.cz);
        pos.push(R.cx - px * R.w, R.cy, R.cz - pz * R.w);
        uv.push(0, R.t, 0.5, R.t, 1, R.t);
        col.push(c.r, c.g, c.b, c.r * 1.06, c.g * 1.06, c.b * 1.06, c.r, c.g, c.b);
      }
      const idx = [];
      for (let i = 0; i < segs; i++) {
        const a = i * 3, b2 = (i + 1) * 3;
        idx.push(a, b2, a + 1, a + 1, b2, b2 + 1);
        idx.push(a + 1, b2 + 1, a + 2, a + 2, b2 + 1, b2 + 2);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      geoms.push(g);
    }
    return geoms;
  };

  /* ---------- 远景草丛卡片（billboard + 抖动淡出） ---------- */
  const CARD_MAT = new T.MeshStandardMaterial({
    map: QM.TEX.grassCard,
    alphaTest: 0.42,
    side: T.DoubleSide,
    roughness: 0.95,
    metalness: 0.0,
    color: 0xd8dcc4
  });
  CARD_MAT.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = 'uniform float uTime;\nattribute vec3 center;\nvarying float vCardDist;\n' +
      shader.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec3 toCamC = cameraPosition - center;
          float distC = length(toCamC);
          toCamC /= max(distC, 0.001);
          // 卡片面向相机 → 法线取 -视线方向（世界空间）
          vec3 objectNormal = -toCamC;
        `)
        .replace('#include <begin_vertex>', `
          vec3 rightC = normalize(cross(vec3(0.0, 1.0, 0.0), toCamC));
          float swayC = sin(uTime * 1.6 + center.x * 0.55 + center.z * 0.4) * 0.07 * uv.y;
          vec3 transformed = center + rightC * position.x + vec3(0.0, 1.0, 0.0) * position.y;
          transformed.x += swayC;
          transformed.z += swayC * 0.5;
          vCardDist = distC;
        `);
    shader.fragmentShader = 'varying float vCardDist;\n' +
      shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
        #include <clipping_planes_fragment>
        float dfdC = smoothstep(7.0, 16.0, vCardDist) * smoothstep(150.0, 116.0, vCardDist);
        if (dfdC < 0.999) {
          float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (dith > dfdC) discard;
        }
      `);
    CARD_MAT.userData.shader = shader;
  };
  CARD_MAT.customProgramCacheKey = () => 'grasscard';
  QM.cardMat = CARD_MAT;

  function mergeCards(list) {
    const pos = [], uv = [], cen = [], idx = [];
    let base = 0;
    list.forEach(g => {
      const p = g.attributes.position, u = g.attributes.uv, c = g.attributes.center;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        uv.push(u.getX(i), u.getY(i));
        cen.push(c.getX(i), c.getY(i), c.getZ(i));
      }
      const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx.push(gi[i] + base);
      base += p.count;
    });
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    out.setAttribute('center', new T.Float32BufferAttribute(cen, 3));
    out.setIndex(idx);
    out.computeBoundingSphere();
    return out;
  }

  function cardGeometry(x, baseY, z, w, h, variant) {
    const pos = [-w * 0.5, 0, 0, w * 0.5, 0, 0, w * 0.5, h, 0, -w * 0.5, h, 0];
    const v0 = (variant || 0) / 3, v1 = v0 + 1 / 3;
    const uv = [v0, 0, v1, 0, v1, 1, v0, 1];
    const center = [x, baseY, z, x, baseY, z, x, baseY, z, x, baseY, z];
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setAttribute('center', new T.Float32BufferAttribute(center, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }

  /* ---------- 实体小叶簇（每簇 4 片，带折脊与顶点色） ---------- */
  QM.solidLeafCluster = function (cx, cy, cz, size, tint, seed) {
    const r = QM.rng(seed || 7);
    const pos = [], col = [], uv = [];
    const cBase = new T.Color(tint).multiplyScalar(0.60);
    const cTip = new T.Color(tint).multiplyScalar(1.20);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + r() * 0.7;
      const len = size * (0.75 + r() * 0.55);
      const wid = len * (0.30 + r() * 0.14);
      const tilt = 0.20 + r() * 0.40;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ox = cx + ca * size * 0.15, oz = cz + sa * size * 0.15;
      const oy = cy + (r() - 0.5) * size * 0.18;
      const pts = [
        [0, 0, 0],
        [-wid, len * 0.38, 0],
        [0, len, 0],
        [wid, len * 0.38, 0],
        [0, len * 0.42, wid * 0.38]
      ];
      const world = pts.map((p, k) => {
        const ty = p[1] * Math.cos(tilt) - p[2] * Math.sin(tilt);
        const tz = p[1] * Math.sin(tilt) + p[2] * Math.cos(tilt);
        return [ox + p[0] * ca - tz * sa, oy + ty, oz + p[0] * sa + tz * ca,
          k === 2 ? 1 : (k === 4 ? 0.62 : 0.34)];
      });
      const tris = [[0, 1, 4], [1, 2, 4], [0, 4, 3], [3, 4, 2], [0, 4, 3], [0, 1, 4]];
      const uvs = [[0.5, 0], [0.06, 0.34], [0.5, 1], [0.94, 0.34], [0.5, 0.62]];
      for (let t = 0; t < tris.length; t++) {
        for (let k = 0; k < 3; k++) {
          const vi = tris[t][k];
          const v = world[vi];
          pos.push(v[0], v[1], v[2]);
          uv.push(uvs[vi][0], uvs[vi][1]);
          const cc = cBase.clone().lerp(cTip, v[3]);
          col.push(cc.r, cc.g, cc.b);
        }
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };

  /* ---------- 草地与人影斑驳 ---------- */
  const grassTex = QM.canvasTex(64, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(313);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = ['#7f8b4c', '#6d7a3e', '#95a05c'][Math.floor(r() * 3)];
      ctx.lineWidth = 1.6 + r();
      ctx.beginPath();
      const x = w * 0.5 + (r() - 0.5) * 50;
      ctx.moveTo(x, h);
      ctx.quadraticCurveTo(x + (r() - 0.5) * 30, h * 0.5, x + (r() - 0.5) * 44, h * (0.05 + r() * 0.3));
      ctx.stroke();
    }
  });
  grassTex.wrapS = grassTex.wrapT = T.ClampToEdgeWrapping;
  const grassMat = new T.MeshStandardMaterial({
    vertexColors: true, side: T.DoubleSide, roughness: 0.92, color: 0xffffff
  });
  QM.foliageWind(grassMat, 0.11, 1.7);
  QM.ditherFade(grassMat, 30.0, 40.0);
  QM.grassMat = grassMat;

  /* ---------- 组装 ---------- */
  QM.buildNature = function (scene) {
    const trunks = [], leaves = [], blossoms = [], pineLeaf = [], grass = [], solidLeaves = [];
    const clusters = [[], [], []];
    let treeIdx = 0;

    const treeLOD = [];
    const addWillow = (x, z, s) => {
      const p = QM.willowGeom(x, z, s);
      p.trunk.forEach(g => trunks.push(g));
      p.leaf.forEach(g => leaves.push(g));
      treeLOD.push({ solid: p.solid || [], cards: p.cluster || [], x: x, z: z });
      treeIdx++;
    };
    const addBare = (x, z, s, seed) => {
      const p = QM.bareGeom(x, z, s, seed);
      p.trunk.forEach(g => trunks.push(g));
      treeLOD.push({ solid: p.solid || [], cards: p.cluster || [], x: x, z: z });
      treeIdx++;
    };
    const addBlossom = (x, z, s, seed) => {
      const p = QM.blossomGeom(x, z, s, seed);
      p.trunk.forEach(g => trunks.push(g));
      p.leaf.forEach(g => blossoms.push(g));
    };
    const addPine = (x, z, s) => {
      const p = QM.pineGeom(x, z, s);
      p.trunk.forEach(g => trunks.push(g));
      p.leaf.forEach(g => pineLeaf.push(g));
    };

    // 河岸垂柳（南北两岸，避开虹桥）
    for (let x = -190; x < 268; x += QM.rr(9, 16)) {
      if (Math.abs(x - QM.CFG.bridgeX) < 12) continue;
      const rz = QM.riverZ(x);
      if (x > 30 && x < 245) {
        addWillow(x, rz - QM.rr(15.5, 19), QM.rr(0.85, 1.2));
      } else {
        addWillow(x, rz - QM.rr(15.5, 20), QM.rr(0.9, 1.35));
        if (QM.rand() > 0.35) addWillow(x + QM.rr(-4, 4), rz + QM.rr(15.5, 22), QM.rr(0.8, 1.25));
      }
    }
    // 乡路两侧树列
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const x = QM.lerp(-310, -175, t) + QM.rr(-6, 6);
      const z = QM.lerp(44, 9, t) + (i % 2 ? 5 : -5) + QM.rr(-2, 2);
      if (QM.rand() < 0.55) addBare(x, z, QM.rr(0.85, 1.35), i + 40);
      else if (QM.rand() < 0.5) addBlossom(x, z, QM.rr(0.7, 1.05), i + 70);
      else addWillow(x, z, QM.rr(0.8, 1.15));
    }
    // 郊野树木
    for (let i = 0; i < 60; i++) {
      const x = QM.rr(-300, 240);
      const z = QM.rr(-110, 120);
      const rz = QM.riverZ(x);
      if (Math.abs(z - rz) < 22) continue;
      if (Math.abs(z - QM.streetZ(x)) < 26 && x > -180 && x < 250) continue;
      const r = QM.rand();
      if (r < 0.32) addBare(x, z, QM.rr(0.8, 1.3), i + 7);
      else if (r < 0.52) addBlossom(x, z, QM.rr(0.7, 1.1), i + 11);
      else if (r < 0.7) addPine(x, z, QM.rr(0.8, 1.3));
      else addWillow(x, z, QM.rr(0.8, 1.2));
    }
    // 街边树（少量，避免挡街）
    for (let x = -120; x < 240; x += QM.rr(34, 52)) {
      addBare(x + QM.rr(-4, 4), QM.streetZ(x) + QM.CFG.streetHalf + QM.rr(2.5, 5), QM.rr(0.8, 1.15), Math.floor(x) + 5);
    }
    // 城墙外松林
    for (let i = 0; i < 14; i++) {
      addPine(QM.rr(200, 300), QM.rr(-80, -40), QM.rr(1.0, 1.5));
    }
    // 草丛：成片聚集（沿街/河岸），按 40 单位分块以便 LOD
    const CH = 40;
    const chunks = new Map();
    const chunkOf = (x, z) => {
      const key = Math.floor(x / CH) + ',' + Math.floor(z / CH);
      let c = chunks.get(key);
      if (!c) { c = { hi: [], lo: [] }; chunks.set(key, c); }
      return c;
    };
    for (let i = 0; i < 3000; i++) {
      let x, z;
      const r = QM.rand();
      if (r < 0.42) {
        // 沿街两旁的草带
        x = QM.rr(-200, 262);
        z = QM.streetZ(x) + (QM.rand() < 0.5 ? -1 : 1) * QM.rr(8.5, 24);
      } else if (r < 0.82) {
        // 河岸草带
        x = QM.rr(-260, 280);
        z = QM.riverZ(x) + (QM.rand() < 0.5 ? -1 : 1) * QM.rr(14.5, 30);
      } else {
        x = QM.rr(-300, 300);
        z = QM.rr(-120, 130);
      }
      const rz = QM.riverZ(x);
      if (Math.abs(z - rz) < 14.2) continue;
      // 噪声密度：成片成簇，避免均匀撒点
      if (QM.fbm(x * 0.021 + 7, z * 0.021 - 3, 2) < 0.40) continue;
      const c = chunkOf(x, z);
      const hMax = QM.rr(0.45, 0.8);
      const tuft = QM.bladeTuft(x, z, {
        blades: QM.ri(6, 9), hMin: 0.26, hMax: hMax,
        wMin: 0.024, wMax: 0.05,
        base: 0x3c471c, tip: 0x8da052
      });
      tuft.forEach(g => c.hi.push(g));
      // 远景草丛卡片（billboard）
      const cw = QM.rr(1.0, 1.8), chh = QM.rr(0.9, 1.5);
      c.lo.push(cardGeometry(x, QM.heightAt(x, z) + 0.02, z, cw, chh, QM.ri(0, 2)));
    }
    // 田野补白卡：让远处草甸连成片（只进 lo 层）
    for (let i = 0; i < 3200; i++) {
      const x = QM.rr(-310, 310), z = QM.rr(-120, 135);
      const rz = QM.riverZ(x);
      if (Math.abs(z - rz) < 13.5) continue;
      if (QM.fbm(x * 0.018 - 11, z * 0.018 + 5, 2) < 0.38) continue;
      const c = chunkOf(x, z);
      const cw = QM.rr(1.6, 2.8), chh = QM.rr(1.1, 2.0);
      c.lo.push(cardGeometry(x, QM.heightAt(x, z) + 0.02, z, cw, chh, QM.ri(0, 2)));
    }
    const grassChunks = [];
    chunks.forEach((c) => {
      if (c.hi.length) {
        const hi = QM.mesh(c.hi, grassMat, false, false);
        const lo = new T.Mesh(mergeCards(c.lo), CARD_MAT);
        lo.frustumCulled = false;   // 卡片几何在局部原点，需关闭视锥剔除
        lo.visible = false;
        scene.add(hi); scene.add(lo);
        grassChunks.push({ hi, lo });
      }
    });
    QM.grassChunks = grassChunks;

    const treeMat = new T.MeshStandardMaterial({ map: QM.TEX.wood, color: 0x6e5a40, roughness: 0.95 });
    if (trunks.length) scene.add(QM.mesh(trunks, treeMat, true, true));
    if (leaves.length) scene.add(QM.mesh(leaves, MATW, true, false));
    const leafMats = [QM.MAT.leafA, QM.MAT.leafB, QM.MAT.leafC];
    clusters.forEach((list, i) => {
      if (list.length) scene.add(QM.mesh(list, leafMats[i], true, false));
    });
    if (treeLOD.length) {
      const solidMat = new T.MeshStandardMaterial({
        map: QM.TEX.leafVein, vertexColors: true, side: T.DoubleSide,
        roughness: 0.72, metalness: 0,
        emissive: 0x24350e, emissiveIntensity: 0.5
      });
      treeLOD.forEach(t => {
        if (t.solid.length) {
          t.solidMesh = QM.mesh(t.solid, solidMat, true, false);
          scene.add(t.solidMesh);
        }
        if (t.cards.length) {
          t.cardMesh = QM.mesh(t.cards, MATB, true, false);
          t.cardMesh.visible = false;
          scene.add(t.cardMesh);
        }
      });
      QM.treeLOD = treeLOD;
    }
    if (blossoms.length) scene.add(QM.mesh(blossoms, MATB, true, false));
    if (pineLeaf.length) scene.add(QM.mesh(pineLeaf, QM.MAT.pine, true, false));


    /* 柳絮（浮尘） */
    const n = 700;
    const parr = new Float32Array(n * 3);
    const seedArr = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      parr[i * 3] = QM.rr(-220, 260);
      parr[i * 3 + 1] = QM.rr(1, 22);
      parr[i * 3 + 2] = QM.rr(-40, 80);
      seedArr[i] = QM.rr(0, 100);
    }
    const pg = new T.BufferGeometry();
    pg.setAttribute('position', new T.BufferAttribute(parr, 3));
    const sprite = QM.canvasTex(32, 32, (ctx, w, h) => {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 15);
      g.addColorStop(0, 'rgba(255,252,238,0.95)');
      g.addColorStop(0.5, 'rgba(245,240,220,0.5)');
      g.addColorStop(1, 'rgba(245,240,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    const pmat = new T.PointsMaterial({
      size: 0.34, map: sprite, transparent: true, depthWrite: false,
      opacity: 0.75, sizeAttenuation: true, color: 0xfff6dd
    });
    const points = new T.Points(pg, pmat);
    points.frustumCulled = false;
    scene.add(points);
    QM.catkins = { points, base: parr.slice(), seed: seedArr, n };

    /* 飞鸟 */
    const birds = new T.Group();
    const birdMat = new T.MeshBasicMaterial({ color: 0x3f3a32, side: T.DoubleSide });
    const birdList = [];
    for (let i = 0; i < 7; i++) {
      const b = new T.Group();
      const wingGeo = new T.BufferGeometry();
      const v = [
        0, 0, 0, 1, 0.05, -0.35, 0.55, 0.0, 0.5,
        0, 0, 0, 0.55, 0.0, 0.5, 1, 0.05, -0.35
      ];
      const vv = [];
      v.forEach(px => vv.push(px));
      wingGeo.setAttribute('position', new T.Float32BufferAttribute(vv, 3));
      wingGeo.computeVertexNormals();
      const m1 = new T.Mesh(wingGeo, birdMat);
      const m2 = new T.Mesh(wingGeo, birdMat);
      m2.scale.x = -1;
      b.add(m1); b.add(m2);
      b.scale.setScalar(0.55);
      b.userData = { w: m1, w2: m2, ph: QM.rr(0, 6.28), r: QM.rr(30, 70), y: QM.rr(28, 48), sp: QM.rr(0.06, 0.12), cx: QM.rr(-120, 180), cz: QM.rr(-60, 20) };
      birds.add(b);
      birdList.push(b);
    }
    scene.add(birds);
    QM.birds = birdList;
  };

  /* 草层 LOD：近处 3D 叶片，远处低模草丛，150m 外不画 */
  QM.updateTreeLOD = function (camPos) {
    const list = QM.treeLOD;
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      const dx = t.x - camPos.x, dz = t.z - camPos.z;
      const d2 = dx * dx + dz * dz;
      const near = d2 < 42 * 42;
      if (t.solidMesh) t.solidMesh.visible = near;
      if (t.cardMesh) t.cardMesh.visible = !near && d2 < 190 * 190;
    }
  };

  QM.updateGrassLOD = function (camPos) {
    const chunks = QM.grassChunks;
    if (!chunks) return;
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const bs = c.hi.geometry.boundingSphere;
      if (!bs) continue;
      const dx = bs.center.x - camPos.x;
      const dz = bs.center.z - camPos.z;
      const d2 = dx * dx + dz * dz;
      const near = d2 < 1444;      // 38m
      const mid = d2 < 22500;      // 150m
      c.hi.visible = near;
      c.lo.visible = mid;
    }
  };

  QM.animateNature = function (t) {
    if (QM.catkins) {
      const c = QM.catkins;
      const arr = c.points.geometry.attributes.position.array;
      for (let i = 0; i < c.n; i++) {
        const s = c.seed[i];
        arr[i * 3] = c.base[i * 3] + Math.sin(t * 0.35 + s) * 6 + t * 0.55;
        if (arr[i * 3] > 280) c.base[i * 3] -= 520;
        arr[i * 3 + 1] = c.base[i * 3 + 1] + Math.sin(t * 0.5 + s * 1.7) * 1.2;
        arr[i * 3 + 2] = c.base[i * 3 + 2] + Math.cos(t * 0.3 + s) * 3;
      }
      c.points.geometry.attributes.position.needsUpdate = true;
    }
    if (QM.birds) {
      QM.birds.forEach(b => {
        const u = b.userData;
        const a = t * u.sp + u.ph;
        b.position.set(u.cx + Math.cos(a) * u.r, u.y + Math.sin(a * 2.1) * 1.6, u.cz + Math.sin(a) * u.r * 0.6);
        b.rotation.y = -a + Math.PI / 2;
        const flap = Math.sin(t * 7 + u.ph) * 0.55;
        u.w.rotation.z = flap;
        u.w2.rotation.z = -flap;
      });
    }
    // 幌子摆动
    if (QM.banners) {
      QM.banners.forEach(b => {
        b.mesh.rotation.z = Math.sin(t * 1.6 + b.phase) * 0.09;
        b.mesh.rotation.y = Math.sin(t * 0.9 + b.phase) * 0.16;
      });
    }
    if (QM.clouds) {
      QM.clouds.forEach((c, i) => { c.position.x += 0.02 + i * 0.004; if (c.position.x > 480) c.position.x = -480; });
    }
  };

})(window.QM);
