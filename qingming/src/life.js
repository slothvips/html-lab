/* 清明上河图 · 人畜舟车 */
(function (QM) {
  'use strict';
  const T = THREE;

  QM.walkers = [];
  QM.boats = [];
  QM.animals = [];

  const HATS = ['futou', 'jin', 'douli', 'none', 'jin', 'futou'];
  QM.COLORS = [0x6b4f36, 0x3b5350, 0x35465a, 0xa8956c, 0x4a4238, 0x8a3b2f,
    0x3f4b34, 0x9c8557, 0x242c33, 0x8a6440, 0xc0b28c, 0x4e5a52,
    0x7a5636, 0x2f3a42, 0xb5a888, 0x5a4632];

  /* ================= 人物 ================= */
  /* ---- 平滑管体：rings 从上到下，radial 径向段数 ---- */
  function ringTube(rings, radial) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < rings.length; i++) {
      const R = rings[i];
      for (let j = 0; j <= radial; j++) {
        const a = (j / radial) * Math.PI * 2;
        const fold = (R.fold && R.fold > 0) ? Math.sin(a * 7 + R.y * 4) * R.fold : 0;
        const rr = R.r + fold;
        pos.push(Math.cos(a) * rr, R.y, Math.sin(a) * rr * (R.zs || 1));
        uv.push(j / radial, i / (rings.length - 1));
      }
    }
    for (let i = 0; i < rings.length - 1; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return fixWinding(g);
  }

  function fixWinding(g) {
    g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal');
    let dot = 0;
    for (let i = 0; i < Math.min(p.count, 80); i++) {
      dot += p.getX(i) * n.getX(i) + p.getZ(i) * n.getZ(i);
    }
    if (dot < 0) {
      const idx = g.getIndex().array;
      for (let i = 0; i < idx.length; i += 3) {
        const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t;
      }
      g.getIndex().needsUpdate = true;
      g.computeVertexNormals();
    }
    return g;
  }

  /* ---- 衣褶 / 高度明暗写入顶点色 ---- */
  function shadePerson(geo) {
    const p = geo.getAttribute('position');
    const c = geo.getAttribute('color');
    if (!c) return geo;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const ang = Math.atan2(z, x);
      const fold = 1 - 0.05 * (0.5 + 0.5 * Math.sin(ang * 7 + y * 5.5));
      const grad = 0.80 + 0.20 * QM.clamp((y - 0.1) / 1.25, 0, 1);
      const k = fold * grad;
      c.setXYZ(i, c.getX(i) * k, c.getY(i) * k, c.getZ(i) * k);
    }
    c.needsUpdate = true;
    return geo;
  }

  /* ---- 头模：球体局部雕刻（眼窝、眼睑、鼻梁、鼻翼、唇、下颌）---- */
  const HEAD_Y = 1.625;
  function remapUV(geo, u0, v0, u1, v1) {
    const uv = geo.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v0 + uv.getY(i) * (v1 - v0));
    }
    return geo;
  }
  function buildHead(detail) {
    const seg = detail ? [44, 32] : [14, 10];
    const g = new T.SphereGeometry(0.098, seg[0], seg[1]);
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) * 0.92;
      let y = p.getY(i) * 1.14;
      let z = p.getZ(i) * 0.99;
      const t = y / 0.112;
      if (t < -0.1) {
        const k = Math.min(1, (-t - 0.1) / 0.9);
        const sc = 1 - 0.40 * Math.pow(k, 1.4);
        x *= sc; z *= sc * 0.95;
        if (z > 0) z += 0.014 * Math.pow(k, 2);
      }
      p.setXYZ(i, x, y, z);
    }
    if (detail) {
      const ops = [
        { x: 0, y: 0.044, z: 0.086, r: 0.055, s: 0.0085 },
        { x: 0.038, y: 0.030, z: 0.086, r: 0.030, s: -0.012 },
        { x: -0.038, y: 0.030, z: 0.086, r: 0.030, s: -0.012 },
        { x: 0.038, y: 0.041, z: 0.090, r: 0.021, s: 0.0055 },
        { x: -0.038, y: 0.041, z: 0.090, r: 0.021, s: 0.0055 },
        { x: 0.038, y: 0.014, z: 0.090, r: 0.019, s: 0.0045 },
        { x: -0.038, y: 0.014, z: 0.090, r: 0.019, s: 0.0045 },
        { x: 0, y: 0.020, z: 0.096, r: 0.020, s: 0.011 },
        { x: 0, y: -0.006, z: 0.104, r: 0.017, s: 0.015 },
        { x: 0.013, y: -0.016, z: 0.098, r: 0.008, s: -0.006 },
        { x: -0.013, y: -0.016, z: 0.098, r: 0.008, s: -0.006 },
        { x: 0.058, y: -0.002, z: 0.064, r: 0.038, s: 0.006 },
        { x: -0.058, y: -0.002, z: 0.064, r: 0.038, s: 0.006 },
        { x: 0, y: -0.030, z: 0.100, r: 0.010, s: -0.0035 },
        { x: 0, y: -0.047, z: 0.094, r: 0.020, s: 0.0062 },
        { x: 0, y: -0.064, z: 0.094, r: 0.018, s: 0.0068 },
        { x: 0, y: -0.056, z: 0.099, r: 0.017, s: -0.0055 },
        { x: 0, y: -0.088, z: 0.082, r: 0.030, s: 0.007 },
        { x: 0.080, y: 0.038, z: 0.020, r: 0.030, s: -0.004 },
        { x: -0.080, y: 0.038, z: 0.020, r: 0.030, s: -0.004 },
        // —— 细化：上睑褶、鼻翼、唇体、鼻唇沟、人中脊 ——
        { x: 0.040, y: 0.050, z: 0.086, r: 0.020, s: 0.0035 },
        { x: -0.040, y: 0.050, z: 0.086, r: 0.020, s: 0.0035 },
        { x: 0.019, y: -0.014, z: 0.094, r: 0.010, s: 0.0062 },
        { x: -0.019, y: -0.014, z: 0.094, r: 0.010, s: 0.0062 },
        { x: 0, y: -0.045, z: 0.095, r: 0.014, s: 0.0052 },
        { x: 0, y: -0.066, z: 0.095, r: 0.013, s: 0.0058 },
        { x: 0.028, y: -0.038, z: 0.090, r: 0.010, s: -0.0035 },
        { x: -0.028, y: -0.038, z: 0.090, r: 0.010, s: -0.0035 },
        { x: 0, y: -0.026, z: 0.100, r: 0.006, s: 0.0022 }
      ];
      const vn = new T.Vector3();
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
        vn.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
        let off = 0;
        for (let k = 0; k < ops.length; k++) {
          const op = ops[k];
          const dx = px - op.x, dy = py - op.y, dz = pz - op.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < op.r * op.r) {
            const f = 1 - Math.sqrt(d2) / op.r;
            off += op.s * f * f;
          }
        }
        if (off !== 0) p.setXYZ(i, px + vn.x * off, py + vn.y * off, pz + vn.z * off);
      }
    }
    g.computeVertexNormals();

    // 耳 + 颈并入头网格（UV 指向皮肤色板）
    const parts = [g];
    [-1, 1].forEach(sx => {
      const ear = new T.SphereGeometry(0.027, 10, 8);
      ear.scale(0.5, 1.12, 0.85);
      ear.translate(sx * 0.092, -0.004, -0.004);
      parts.push(remapUV(ear, 0.02, 0.03, 0.10, 0.16));
    });
    const neckRings = [
      { y: 1.335, r: 0.060 }, { y: 1.40, r: 0.052 }, { y: 1.466, r: 0.050 }
    ].map(r => ({ y: r.y - HEAD_Y - 0.004, r: r.r }));
    const neck = ringTube(neckRings, 12);
    parts.push(remapUV(neck, 0.03, 0.05, 0.09, 0.18));
    const merged = QM.mergeGeoms(parts);
    merged.translate(0, HEAD_Y + 0.004, 0.004);
    merged.computeBoundingSphere();
    return merged;
  }
  const HEAD_HI = buildHead(true);
  const HEAD_MID = buildHead(false);
  QM.headGeo = HEAD_HI;
  QM.headGeoMid = HEAD_MID;

  // 眼球 + 眼睑壳（按肤色三档缓存）
  function eyeGeometry(skin) {
    const items = [];
    [-1, 1].forEach(sx => {
      const ex = sx * 0.039, ey = 0.029, ez = 0.0695;
      items.push({ g: QM.geo.sphere(0.0118, ex, ey, ez, 1, 1, 0.9), c: 0xe6ded2 });
      items.push({ g: QM.geo.sphere(0.0059, ex, ey - 0.0005, ez + 0.0086, 1, 1, 0.5), c: 0x5a4026 });
      items.push({ g: QM.geo.sphere(0.0025, ex, ey - 0.0005, ez + 0.0108, 1, 1, 0.5), c: 0x0b0907 });
      items.push({ g: QM.geo.sphere(0.0016, ex - 0.0034, ey + 0.0032, ez + 0.0112, 1, 1, 0.5), c: 0xffffff });
      const lid = new T.SphereGeometry(0.0152, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.46);
      lid.rotateX(-0.5);
      lid.translate(ex, ey + 0.0015, ez - 0.0005);
      items.push({ g: lid, c: skin });
      const lid2 = new T.SphereGeometry(0.0148, 16, 6, 0, Math.PI * 2, Math.PI * 0.70, Math.PI * 0.26);
      lid2.rotateX(0.2);
      lid2.translate(ex, ey - 0.002, ez - 0.0005);
      items.push({ g: lid2, c: skin });
      // 实体眉弓：三段小枝，深浅分明
      for (let k = 0; k < 3; k++) {
        const bx = ex + (k - 1) * 0.011 * (sx > 0 ? 1 : 1);
        const by = ey + 0.020 + (k === 0 ? -0.002 : 0) + (k === 2 ? -0.004 : 0);
        const seg = new T.SphereGeometry(0.006, 8, 6);
        seg.scale(1.4, 0.5, 0.45);
        seg.rotateZ((k - 1) * 0.28);
        seg.translate(bx, by, 0.0855);
        items.push({ g: seg, c: 0x3b2a1c });
      }
    });
    const g = QM.mergeColored(items);
    g.translate(0, HEAD_Y + 0.004, 0.004);
    return g;
  }
  const EYE_SKIN = [0xb98f66, 0xab8158, 0x9a7049];
  const EYE_GEO = EYE_SKIN.map(c => eyeGeometry(c));

  function personBody(o) {
    const robe = o.color;
    const inner = o.innerColor || new T.Color(robe).lerp(new T.Color(0xd9ccae), 0.55).getHex();
    const belt = o.belt || 0x2b2620;
    const skin = o.skin || 0xb08a63;
    const hair = 0x1b1714;
    const long = !!o.longRobe;
    const items = [];
    const shoulderY = 1.36;
    const headY = 1.625;

    // —— 躯干：车削轮廓（下摆宽、腰收、胸阔、肩收）——
    const prof = [
      [0.00, 0.248], [0.12, 0.244], [0.30, 0.230], [0.45, 0.214],
      [0.58, 0.202], [0.70, 0.205], [0.82, 0.214], [0.92, 0.210], [1.00, 0.182]
    ];
    const yBottom = long ? 0.12 : 0.62;
    const rings = [];
    const NR = 11;
    for (let i = 0; i <= NR; i++) {
      const t = i / NR;
      let r = 0.2;
      for (let k = 0; k < prof.length - 1; k++) {
        if (t >= prof[k][0] && t <= prof[k + 1][0]) {
          const f = (t - prof[k][0]) / (prof[k + 1][0] - prof[k][0]);
          r = QM.lerp(prof[k][1], prof[k + 1][1], QM.smooth(f));
          break;
        }
      }
      const y = QM.lerp(yBottom, shoulderY, t);
      rings.push({ y: y, r: r, zs: 0.72, fold: t < 0.7 ? 0.006 * (1 - t / 0.7) : 0 });
    }
    items.push({ g: ringTube(rings, 14), c: robe });

    // 下摆缘
    items.push({ g: QM.geo.cyl(0.244, 0.246, 0.045, 14, 0, long ? 0.13 : 0.63, 0), c: new T.Color(robe).multiplyScalar(0.78).getHex() });

    // 肩（三角肌）与胸颈过渡
    [-1, 1].forEach(sx => {
      const sh = new T.SphereGeometry(0.088, 10, 8);
      sh.scale(1.0, 0.92, 0.9);
      sh.translate(sx * 0.168, shoulderY - 0.012, 0);
      items.push({ g: sh, c: robe });
    });
    const chest = new T.SphereGeometry(0.185, 12, 8);
    chest.scale(1.0, 0.44, 0.64);
    chest.translate(0, shoulderY - 0.03, 0);
    items.push({ g: chest, c: robe });

    // 交领右衽
    items.push({ g: QM.geo.box(0.075, 0.3, 0.04, 0.035, 1.26, 0.155, 0, 0, 0.38), c: inner });
    items.push({ g: QM.geo.box(0.075, 0.32, 0.04, -0.04, 1.25, 0.16, 0, 0, -0.36), c: new T.Color(robe).multiplyScalar(0.9).getHex() });
    items.push({ g: QM.geo.box(0.22, 0.06, 0.17, 0, 1.4, 0.02), c: inner });

    // 腰带 + 结 + 垂带
    items.push({ g: QM.geo.cyl(0.203, 0.205, 0.09, 14, 0, 0.99, 0, 0, 0, 0), c: belt });
    const beltBand = new T.CylinderGeometry(0.209, 0.209, 0.09, 14, 1, true);
    beltBand.scale(1, 1, 0.72);
    beltBand.translate(0, 0.99, 0);
    items.push({ g: beltBand, c: belt });
    items.push({ g: QM.geo.box(0.09, 0.09, 0.07, 0.055, 0.96, 0.17), c: belt });
    items.push({ g: QM.geo.box(0.045, 0.3, 0.02, 0.075, 0.8, 0.175, 0.05, 0, 0.06), c: belt });
    items.push({ g: QM.geo.box(0.035, 0.24, 0.02, 0.12, 0.82, 0.17, 0.03, 0, 0.1), c: belt });

    // 低模颈（LOD 远景用，藏在实体颈内）
    items.push({ g: ringTube([{ y: 1.335, r: 0.053 }, { y: 1.466, r: 0.046 }], 8), c: skin });

    // 低模头（远处 LOD：藏在高模头内部）
    items.push({ g: QM.geo.sphere(0.082, 0, headY, 0.004, 0.95, 1.14, 0.98), c: skin });

    if (o.beard) {
      const bd = new T.SphereGeometry(0.062, 10, 8);
      bd.scale(0.9, 1.0, 0.55);
      bd.translate(0, headY - 0.128, 0.045);
      items.push({ g: bd, c: hair });
    }
    // 发
    const hairCap = new T.SphereGeometry(0.099, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62);
    hairCap.translate(0, headY + 0.006, -0.008);
    items.push({ g: hairCap, c: hair });

    // 冠帽
    const topY = headY + 0.108;
    if (o.hat === 'futou') {
      const cap = new T.SphereGeometry(0.1, 14, 10);
      cap.scale(1.02, 0.8, 1.02);
      cap.translate(0, topY + 0.045, -0.005);
      items.push({ g: cap, c: 0x17130f });
      const back = new T.BoxGeometry(0.17, 0.14, 0.09);
      back.translate(0, topY + 0.02, -0.062);
      items.push({ g: back, c: 0x17130f });
      items.push({ g: QM.geo.box(0.026, 0.026, 0.28, 0.066, topY - 0.03, -0.18, 0.3), c: 0x17130f });
      items.push({ g: QM.geo.box(0.026, 0.026, 0.28, -0.066, topY - 0.03, -0.18, 0.3), c: 0x17130f });
    } else if (o.hat === 'futouWing') {
      const cap = new T.SphereGeometry(0.1, 14, 10);
      cap.scale(1.02, 0.8, 1.02);
      cap.translate(0, topY + 0.05, -0.005);
      items.push({ g: cap, c: 0x17130f });
      const back = new T.BoxGeometry(0.17, 0.14, 0.09);
      back.translate(0, topY + 0.02, -0.062);
      items.push({ g: back, c: 0x17130f });
      items.push({ g: QM.geo.box(0.4, 0.02, 0.045, 0.3, topY + 0.05, -0.02), c: 0x17130f });
      items.push({ g: QM.geo.box(0.4, 0.02, 0.045, -0.3, topY + 0.05, -0.02), c: 0x17130f });
    } else if (o.hat === 'jin') {
      const cap = new T.SphereGeometry(0.102, 14, 10);
      cap.scale(1.0, 0.82, 1.0);
      cap.translate(0, topY + 0.03, -0.006);
      items.push({ g: cap, c: 0x2a2520 });
      const band = new T.CylinderGeometry(0.103, 0.105, 0.06, 14);
      band.translate(0, topY + 0.002, -0.004);
      items.push({ g: band, c: 0x2a2520 });
      items.push({ g: QM.geo.box(0.03, 0.2, 0.02, 0.06, topY - 0.09, -0.15, 0.25), c: 0x2a2520 });
      items.push({ g: QM.geo.box(0.03, 0.16, 0.02, -0.04, topY - 0.07, -0.155, 0.3), c: 0x2a2520 });
    } else if (o.hat === 'douli') {
      const cone = new T.ConeGeometry(0.26, 0.17, 16);
      cone.translate(0, topY + 0.1, 0);
      items.push({ g: cone, c: 0xb99a5e });
      const brim = new T.CylinderGeometry(0.262, 0.27, 0.02, 16);
      brim.translate(0, topY + 0.02, 0);
      items.push({ g: brim, c: 0xa98b52 });
    }
    return { items, legTop: 0.8, shoulderY, headY };
  }

  function armGeometry(o) {
    const robe = o.color;
    const sleeveBar = new T.Color(robe).multiplyScalar(0.94).getHex();
    const skin = o.skin || 0xb08a63;
    const items = [];
    const sh = new T.SphereGeometry(0.082, 12, 8);
    sh.scale(1, 0.9, 1);
    items.push({ g: sh, c: robe });
    items.push({
      g: ringTube([
        { y: 0.02, r: 0.078 }, { y: -0.14, r: 0.072 }, { y: -0.32, r: 0.068 },
        { y: -0.46, r: 0.092, fold: 0.004 }, { y: -0.58, r: 0.112, fold: 0.006 }, { y: -0.625, r: 0.108 }
      ], 12), c: sleeveBar
    });
    const cuff = new T.CylinderGeometry(0.11, 0.108, 0.035, 12);
    cuff.translate(0, -0.635, 0);
    items.push({ g: cuff, c: new T.Color(robe).multiplyScalar(0.76).getHex() });
    const hand = new T.SphereGeometry(0.043, 10, 8);
    hand.scale(0.9, 1.15, 0.95);
    hand.translate(0, -0.675, 0.012);
    items.push({ g: hand, c: skin });
    return QM.mergeColored(items);
  }

  function legGeometry(o) {
    const pants = o.pantColor || 0x322d26;
    const shoe = 0x1d1915;
    const items = [];
    items.push({
      g: ringTube([
        { y: 0.02, r: 0.088 }, { y: -0.2, r: 0.076 }, { y: -0.42, r: 0.062 },
        { y: -0.62, r: 0.056 }, { y: -0.74, r: 0.052 }
      ], 10), c: pants
    });
    const shoeG = new T.SphereGeometry(0.062, 10, 8);
    shoeG.scale(1.0, 0.62, 1.85);
    shoeG.translate(0, -0.775, 0.05);
    items.push({ g: shoeG, c: shoe });
    return QM.mergeColored(items);
  }

  const armCache = new Map();
  const legCache = new Map();
  function cachedArm(o) {
    const key = o.color + ':' + (o.skin || 0) + ':' + (o.longRobe ? 1 : 0);
    let g = armCache.get(key);
    if (!g) { g = shadePerson(armGeometry(o)); armCache.set(key, g); }
    return g;
  }
  function cachedLeg(o) {
    const key = (o.pantColor || 0) + ':' + (o.longRobe ? 1 : 0);
    let g = legCache.get(key);
    if (!g) { g = shadePerson(legGeometry(o)); legCache.set(key, g); }
    return g;
  }


  /* ---- UV ---- */
  function setFlatUV(g, u, v) {
    let uv = g.getAttribute('uv');
    if (!uv) {
      uv = new T.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2);
      g.setAttribute('uv', uv);
    }
    for (let i = 0; i < uv.count; i++) uv.setXY(i, u, v);
    return g;
  }
  function remapFaceUV(g, idx) {
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (idx * 1024 + uv.getX(i) * 1024) / 3328, uv.getY(i));
    }
    return g;
  }

  /* ---- 骨骼与蒙皮 ---- */
  const BONE_DEF = [
    ['hips', 0, 0.88, 0, null],
    ['spine', 0, 1.12, 0, 'hips'],
    ['chest', 0, 1.33, 0, 'spine'],
    ['neck', 0, 1.47, 0, 'chest'],
    ['head', 0, 1.6, 0, 'neck'],
    ['shoulderL', 0.188, 1.325, 0, 'chest'],
    ['elbowL', 0.19, 1.02, 0, 'shoulderL'],
    ['handL', 0.19, 0.72, 0, 'elbowL'],
    ['shoulderR', -0.188, 1.325, 0, 'chest'],
    ['elbowR', -0.19, 1.02, 0, 'shoulderR'],
    ['handR', -0.19, 0.72, 0, 'elbowR'],
    ['thighL', 0.088, 0.8, 0, 'hips'],
    ['kneeL', 0.09, 0.42, 0, 'thighL'],
    ['footL', 0.09, 0.06, 0, 'kneeL'],
    ['thighR', -0.088, 0.8, 0, 'hips'],
    ['kneeR', -0.09, 0.42, 0, 'thighR'],
    ['footR', -0.09, 0.06, 0, 'kneeR']
  ];
  const BONE_IDX = {};
  BONE_DEF.forEach((b, i) => { BONE_IDX[b[0]] = i; });
  const SEGS = BONE_DEF.map(b => {
    const parent = b[4] ? BONE_DEF[BONE_IDX[b[4]]] : null;
    return parent
      ? [b[1], b[2], b[3], parent[1], parent[2], parent[3], BONE_IDX[b[0]]]
      : [b[1], b[2] - 0.12, b[3], b[1], b[2], b[3], BONE_IDX[b[0]]];
  });

  function distToSeg(px, py, pz, sx, sy, sz, ex, ey, ez) {
    const dx = ex - sx, dy = ey - sy, dz = ez - sz;
    const wx = px - sx, wy = py - sy, wz = pz - sz;
    const dot = wx * dx + wy * dy + wz * dz;
    const len2 = dx * dx + dy * dy + dz * dz;
    const t = len2 > 0 ? QM.clamp(dot / len2, 0, 1) : 0;
    const cx = sx + dx * t, cy = sy + dy * t, cz = sz + dz * t;
    const ax = px - cx, ay = py - cy, az = pz - cz;
    return Math.sqrt(ax * ax + ay * ay + az * az);
  }

  function addSkin(geo) {
    const p = geo.getAttribute('position');
    const si = [], sw = [];
    const cand = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      cand.length = 0;
      for (let k = 0; k < SEGS.length; k++) {
        const sg = SEGS[k];
        const d = distToSeg(x, y, z, sg[0], sg[1], sg[2], sg[3], sg[4], sg[5]);
        cand.push({ b: sg[6], d: d, w: 1 / Math.pow(d + 0.035, 3.2) });
      }
      cand.sort((a, b) => b.w - a.w);
      const a0 = cand[0], a1 = cand[1] || cand[0];
      const sum = a0.w + a1.w;
      si.push(a0.b, a1.b, 0, 0);
      sw.push(a0.w / sum, a1.w / sum, 0, 0);
    }
    geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new T.Float32BufferAttribute(sw, 4));
    return geo;
  }

  function makeSkeleton() {
    const bones = [], map = {};
    BONE_DEF.forEach(b => {
      const bone = new T.Bone();
      bone.name = b[0];
      const parent = b[4] ? BONE_DEF[BONE_IDX[b[4]]] : null;
      // 骨位是局部偏移（相对父骨），BONE_DEF 里存的是绝对坐标
      bone.position.set(
        b[1] - (parent ? parent[1] : 0),
        b[2] - (parent ? parent[2] : 0),
        b[3] - (parent ? parent[3] : 0)
      );
      bones.push(bone);
      map[b[0]] = bone;
    });
    BONE_DEF.forEach((b, i) => {
      if (b[4]) map[b[4]].add(bones[i]);
    });
    // 必须先更新世界矩阵，Skeleton 才能算出正确的绑定逆矩阵
    bones[0].updateMatrixWorld(true);
    return { bones, map, root: bones[0] };
  }

  // 头/眼相对 head 骨（1.6）的局部版本
  const HEAD_HI_B = HEAD_HI.clone(); HEAD_HI_B.translate(0, -1.6, 0);
  const HEAD_MID_B = HEAD_MID.clone(); HEAD_MID_B.translate(0, -1.6, 0);
  const EYE_B = EYE_GEO.map(g => { const c = g.clone(); c.translate(0, -1.6, 0); return c; });

  QM.makePerson = function (o) {
    o = o || {};
    if (o.colorIdx !== undefined && o.color === undefined) {
      o.color = QM.COLORS[o.colorIdx % QM.COLORS.length];
    }
    o.color = o.color || 0x5e4a34;
    const grp = new T.Group();
    const body = personBody(o);
    const bodyGeo = shadePerson(QM.mergeColored(body.items));
    const faceIdx0 = (o.faceIdx !== undefined ? o.faceIdx : (o.colorIdx || 0)) % 3;
    setFlatUV(bodyGeo, 0.9615, 0.5);

    // 手臂/腿几何合并进同一网格（先平移到关节位置）
    const armLg = cachedArm(o).clone();
    armLg.translate(0.188, body.shoulderY - 0.035, 0);
    const armRg = cachedArm(o).clone();
    armRg.translate(-0.188, body.shoulderY - 0.035, 0);
    const legLg = cachedLeg(o).clone();
    legLg.translate(0.088, body.legTop, 0);
    const legRg = cachedLeg(o).clone();
    legRg.translate(-0.088, body.legTop, 0);

    const geo = addSkin(QM.mergeGeoms([bodyGeo, armLg, armRg, legLg, legRg]));
    geo.computeBoundingSphere();

    const sk = makeSkeleton();
    const mesh = new T.SkinnedMesh(geo, QM.MAT.person);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.add(sk.root);
    mesh.bind(new T.Skeleton(sk.bones));
    grp.add(mesh);

    // 头部（贴图头 + 眼球）挂在 head 骨上
    const headMesh = new T.Mesh(HEAD_HI_B, QM.MAT.face[faceIdx0]);
    headMesh.castShadow = false;
    headMesh.receiveShadow = true;
    sk.map.head.add(headMesh);
    const eyeMesh = new T.Mesh(EYE_B[faceIdx0], QM.MAT.eye);
    eyeMesh.castShadow = false;
    sk.map.head.add(eyeMesh);
    grp.userData.head = headMesh;
    grp.userData.eyes = eyeMesh;


    const pose = o.pose || 'walk';
    const B = sk.map;
    const setPose = () => {
      B.shoulderL.rotation.set(0, 0, 0.09);
      B.shoulderR.rotation.set(0, 0, -0.09);
      B.elbowL.rotation.set(-0.12, 0, 0);
      B.elbowR.rotation.set(-0.12, 0, 0);
      if (pose === 'fold') {
        B.shoulderL.rotation.set(-0.95, 0, -0.12);
        B.shoulderR.rotation.set(-0.88, 0, 0.12);
        B.elbowL.rotation.set(-1.05, 0, 0.25);
        B.elbowR.rotation.set(-1.0, 0, -0.25);
      } else if (pose === 'back') {
        B.shoulderL.rotation.set(0.34, 0, -0.2);
        B.shoulderR.rotation.set(0.34, 0, 0.2);
        B.elbowL.rotation.set(-0.35, 0, 0.1);
        B.elbowR.rotation.set(-0.35, 0, -0.1);
      } else if (pose === 'carry') {
        B.shoulderL.rotation.set(-0.85, 0, -0.1);
        B.shoulderR.rotation.set(-0.85, 0, 0.1);
        B.elbowL.rotation.set(-0.45, 0, 0);
        B.elbowR.rotation.set(-0.45, 0, 0);
      } else if (pose === 'lean') {
        B.shoulderL.rotation.set(0.06, 0, 0.1);
        B.shoulderR.rotation.set(-0.5, 0, -0.06);
      } else if (pose === 'sit') {
        B.thighL.rotation.x = -1.35; B.thighR.rotation.x = -1.35;
        B.kneeL.rotation.x = 1.2; B.kneeR.rotation.x = 1.2;
        B.hips.position.y = 0.88 - 0.34;
        B.shoulderL.rotation.set(-0.5, 0, -0.1);
        B.shoulderR.rotation.set(-0.5, 0, 0.1);
      }
    };
    setPose();

    if (o.porter) {
      const pg = [];
      pg.push(QM.geo.box(2.2, 0.07, 0.08, 0, 1.36, -0.1, 0, 0, 0.06));
      [-1, 1].forEach(sx => {
        pg.push(QM.geo.cyl(0.012, 0.012, 0.55, 4, sx * 0.88, 1.1, -0.1));
        pg.push(QM.geo.cyl(0.22, 0.16, 0.4, 8, sx * 0.88, 0.68, -0.1));
        pg.push(QM.geo.cyl(0.225, 0.225, 0.05, 8, sx * 0.88, 0.9, -0.1));
      });
      grp.add(QM.mesh(pg, QM.MAT.thatch, true, false));
    }
    if (o.pole) {
      const pg = [];
      const len = o.pole * 3;
      pg.push(QM.geo.cyl(0.035, 0.05, len, 5, 0.35, 1.0, 0.1, 0.25, 0, 0.2));
      grp.add(QM.mesh(pg, QM.MAT.woodDark, true, false));
    }
    if (o.bundle) {
      const bg = [];
      bg.push(QM.geo.box(0.5, 0.42, 0.32, 0, 1.24, -0.24));
      bg.push(QM.geo.cyl(0.05, 0.05, 0.5, 4, 0, 1.38, -0.12, 0, 0, Math.PI / 2));
      grp.add(QM.mesh(bg, QM.MAT.cloth, true, false));
    }
    grp.userData.bones = B;
    grp.userData.mesh = mesh;
    grp.userData.pose = pose;
    grp.userData.phase = QM.rr(0, 6.28);
    grp.userData.amp = o.amp === undefined ? 1 : o.amp;
    grp.userData.clock = QM.rr(0, 6.28);
    return grp;
  };

  /* ================= 畜类 ================= */
  function animalLegs(grp, positions, mat, len) {
    grp.userData.legs = [];
    positions.forEach(p => {
      const lg = new T.Group();
      lg.add(QM.mesh(QM.geo.box(0.1, len, 0.11, 0, -len / 2, 0), mat, false, false));
      lg.position.set(p[0], p[1], p[2]);
      grp.add(lg);
      grp.userData.legs.push(lg);
    });
  }

  QM.makeDonkey = function (o) {
    o = o || {};
    const grp = new T.Group();
    const hide = new T.MeshStandardMaterial({ color: o.color || 0x6b5a48, roughness: 0.95 });
    const g = [];
    g.push(QM.geo.box(0.62, 0.46, 1.25, 0, 1.02, 0));
    g.push(QM.geo.box(0.4, 0.36, 0.34, 0, 1.08, 0.68, 0.3));
    // 颈
    g.push(QM.beamBetween(new T.Vector3(0, 1.2, 0.5), new T.Vector3(0, 1.5, 0.78), 0.2, 0.2));
    // 头
    g.push(QM.geo.box(0.16, 0.18, 0.42, 0, 1.52, 0.92, 0.25));
    g.push(QM.geo.box(0.12, 0.1, 0.16, 0, 1.44, 1.14));
    // 耳
    [-1, 1].forEach(s => g.push(QM.geo.box(0.05, 0.2, 0.05, s * 0.07, 1.66, 0.84, 0.2, 0, s * 0.25)));
    // 尾
    g.push(QM.geo.box(0.04, 0.36, 0.04, 0, 1.05, -0.64, 0.3));
    grp.add(QM.mesh(g, hide, true, false));
    animalLegs(grp, [
      [0.19, 0.8, 0.42], [-0.19, 0.8, 0.42], [0.19, 0.8, -0.42], [-0.19, 0.8, -0.42]
    ], hide, 0.82);
    if (o.load) {
      const lg = [];
      lg.push(QM.geo.box(0.7, 0.4, 0.5, 0, 1.34, 0.0));
      lg.push(QM.geo.box(0.25, 0.3, 0.35, 0.42, 1.3, -0.1));
      lg.push(QM.geo.box(0.25, 0.3, 0.35, -0.42, 1.3, -0.1));
      grp.add(QM.mesh(lg, QM.MAT.thatch, true, false));
    }
    if (o.rider) {
      const r = QM.makePerson({ longRobe: true, hat: 'futou', colorIdx: 3, amp: 0.2 });
      r.position.set(0, 0.78, -0.05);
      r.scale.setScalar(0.92);
      if (r.userData.bones) {
        r.userData.bones.thighL.rotation.x = -1.1;
        r.userData.bones.thighR.rotation.x = -1.1;
        r.userData.bones.kneeL.rotation.x = 1.0;
        r.userData.bones.kneeR.rotation.x = 1.0;
      }
      grp.add(r);
    }
    grp.userData.height = 1.7;
    return grp;
  };

  QM.makeHorse = function (o) {
    o = o || {};
    const grp = new T.Group();
    const hide = new T.MeshStandardMaterial({ color: o.color || 0x6a4a36, roughness: 0.9 });
    const g = [];
    g.push(QM.geo.box(0.7, 0.62, 1.7, 0, 1.25, 0));
    g.push(QM.geo.box(0.55, 0.5, 0.5, 0, 1.3, 0.9, 0.2));
    g.push(QM.beamBetween(new T.Vector3(0, 1.45, 0.68), new T.Vector3(0, 1.95, 1.02), 0.28, 0.28));
    g.push(QM.geo.box(0.22, 0.24, 0.62, 0, 1.98, 1.2, 0.35));
    [-1, 1].forEach(s => g.push(QM.geo.box(0.06, 0.22, 0.06, s * 0.08, 2.14, 1.02, 0.2, 0, s * 0.2)));
    g.push(QM.geo.box(0.06, 0.75, 0.06, 0, 1.2, -0.88, 0.35));
    // 鬃毛
    for (let i = 0; i < 5; i++) g.push(QM.geo.box(0.06, 0.16, 0.14, 0, 1.72 + i * 0.06, 0.86 + i * 0.07));
    grp.add(QM.mesh(g, hide, true, false));
    // 鞍
    const sg = [];
    sg.push(QM.geo.box(0.72, 0.12, 0.7, 0, 1.6, 0.05));
    sg.push(QM.geo.box(0.78, 0.16, 0.35, 0, 1.66, 0.35));
    sg.push(QM.geo.box(0.5, 0.3, 0.3, 0, 1.72, -0.02));
    grp.add(QM.mesh(sg, QM.MAT.cloth, true, false));
    animalLegs(grp, [
      [0.22, 1.0, 0.55], [-0.22, 1.0, 0.55], [0.22, 1.0, -0.55], [-0.22, 1.0, -0.55]
    ], hide, 1.02);
    if (o.rider !== false) {
      const r = QM.makePerson({ longRobe: true, hat: 'futou', colorIdx: 2, amp: 0.15 });
      r.position.set(0, 1.28, -0.05);
      r.scale.setScalar(0.95);
      if (r.userData.bones) {
        r.userData.bones.thighL.rotation.x = -1.0;
        r.userData.bones.thighR.rotation.x = -0.85;
        r.userData.bones.kneeL.rotation.x = 0.9;
        r.userData.bones.kneeR.rotation.x = 0.8;
      }
      grp.add(r);
    }
    grp.userData.height = 2.2;
    return grp;
  };

  QM.makeCamel = function (o) {
    o = o || {};
    const grp = new T.Group();
    const hide = new T.MeshStandardMaterial({ color: o.color || 0x8a7454, roughness: 0.95 });
    const g = [];
    g.push(QM.geo.box(0.78, 0.72, 1.7, 0, 1.9, 0));
    // 驼峰
    g.push(QM.geo.sphere(0.42, 0, 2.28, 0.38, 1, 1.15, 0.9));
    g.push(QM.geo.sphere(0.38, 0, 2.24, -0.42, 1, 1.1, 0.9));
    // 颈（长而曲）
    const neck = [
      [0, 2.0, 0.8], [0, 2.35, 1.1], [0, 2.55, 1.45], [0, 2.58, 1.75]
    ];
    for (let i = 0; i < neck.length - 1; i++) {
      g.push(QM.beamBetween(new T.Vector3(neck[i][0], neck[i][1], neck[i][2]), new T.Vector3(neck[i + 1][0], neck[i + 1][1], neck[i + 1][2]), 0.24, 0.24));
    }
    g.push(QM.geo.box(0.2, 0.22, 0.5, 0, 2.56, 1.92, 0.15));
    [-1, 1].forEach(s => g.push(QM.geo.box(0.06, 0.16, 0.06, s * 0.07, 2.7, 1.86)));
    g.push(QM.geo.box(0.06, 0.6, 0.06, 0, 1.9, -0.9, 0.3));
    grp.add(QM.mesh(g, hide, true, false));
    animalLegs(grp, [
      [0.24, 1.55, 0.6], [-0.24, 1.55, 0.6], [0.24, 1.55, -0.6], [-0.24, 1.55, -0.6]
    ], hide, 1.55);
    // 货包
    const lg = [];
    lg.push(QM.geo.box(0.9, 0.5, 0.8, 0, 2.2, 0.8));
    lg.push(QM.geo.box(0.5, 0.4, 0.5, 0.55, 2.1, -0.2));
    lg.push(QM.geo.box(0.5, 0.4, 0.5, -0.55, 2.1, -0.2));
    grp.add(QM.mesh(lg, QM.MAT.cloth, true, false));
    grp.userData.height = 2.8;
    return grp;
  };

  QM.makeOx = function () {
    const grp = new T.Group();
    const hide = new T.MeshStandardMaterial({ color: 0x5c4a3a, roughness: 0.95 });
    const g = [];
    g.push(QM.geo.box(0.85, 0.8, 1.9, 0, 1.3, 0));
    g.push(QM.geo.box(0.55, 0.6, 0.5, 0, 1.35, 1.0));
    g.push(QM.geo.box(0.42, 0.45, 0.7, 0, 1.25, 1.35, 0.2));
    // 角
    [-1, 1].forEach(s => {
      const horn = new T.ConeGeometry(0.06, 0.4, 5);
      horn.rotateZ(s * 0.9);
      horn.translate(s * 0.22, 1.62, 1.2);
      g.push(horn);
    });
    g.push(QM.geo.box(0.06, 0.7, 0.06, 0, 1.1, -0.95, 0.2));
    grp.add(QM.mesh(g, hide, true, false));
    animalLegs(grp, [
      [0.26, 0.95, 0.65], [-0.26, 0.95, 0.65], [0.26, 0.95, -0.65], [-0.26, 0.95, -0.65]
    ], hide, 0.95);
    grp.userData.height = 2.0;
    return grp;
  };

  /* ================= 车 ================= */
  QM.makeCart = function (o) {
    o = o || {};
    const grp = new T.Group();
    const bag = new QM.Bag();
    const w = o.w || 1.8, l = o.l || 3.0;
    bag.add(QM.MAT.woodDark, QM.geo.box(w, 0.16, l, 0, 0.95, 0));
    bag.add(QM.MAT.wood, QM.geo.box(w - 0.1, 0.5, l, 0, 1.18, 0));
    // 辐条轮
    [-1, 1].forEach(s => {
      const wheel = new T.Group();
      const rim = new T.Mesh(QM.white(new T.TorusGeometry(0.62, 0.075, 5, 16)), QM.MAT.woodDark);
      rim.rotation.y = Math.PI / 2;
      wheel.add(rim);
      const spokes = [];
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        spokes.push(QM.geo.box(0.06, 1.18, 0.06, 0, 0, 0, 0, 0, a));
      }
      wheel.add(QM.mesh(spokes, QM.MAT.wood, false, false));
      wheel.position.set(s * w / 2, 0.72, o.twoWheel ? -0.2 : 0);
      grp.add(wheel);
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.12, 0.12, 0.22, 6, s * w / 2, 0.72, o.twoWheel ? -0.2 : 0, 0, 0, Math.PI / 2));
    });
    if (o.canopy) {
      // 拱形席棚
      const canopy = new T.Mesh(QM.white(new T.CylinderGeometry(w * 0.58, w * 0.58, l * 0.92, 12, 1, true, 0, Math.PI)), QM.MAT.thatch);
      canopy.rotation.z = Math.PI / 2;
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(0, 1.45, 0);
      canopy.castShadow = true;
      grp.add(canopy);
      for (let i = 0; i < 5; i++) {
        bag.add(QM.MAT.thatch, QM.geo.box(w * 1.16, 0.05, 0.05, 0, 1.45 + w * 0.5, -l * 0.4 + i * l * 0.2));
      }
    }
    if (o.load) {
      bag.add(QM.MAT.cloth, QM.geo.box(w * 0.8, 0.55, l * 0.7, 0, 1.65, 0));
      bag.add(QM.MAT.thatch, QM.geo.box(w * 0.5, 0.4, l * 0.4, 0.15, 1.7, l * 0.3));
    }
    // 辕
    bag.add(QM.MAT.woodDark, QM.geo.cyl(0.06, 0.06, 2.2, 5, 0.55, 0.98, l / 2 + 0.9, Math.PI / 2, 0, 0));
    bag.add(QM.MAT.woodDark, QM.geo.cyl(0.06, 0.06, 2.2, 5, -0.55, 0.98, l / 2 + 0.9, Math.PI / 2, 0, 0));
    bag.build(grp);
    grp.userData.height = 1.9;
    return grp;
  };

  /* ================= 船 ================= */
  function hullGeometry(L, Wd, depth) {
    const NS = 16, NV = 10;
    const pos = [], uv = [], idx = [];
    const sheer = u => 0.35 + 1.25 * Math.pow(Math.abs(2 * u - 1), 2.6);
    for (let i = 0; i <= NS; i++) {
      const u = i / NS;
      const z = (u - 0.5) * L;
      const hw = (Wd / 2) * Math.pow(Math.sin(Math.PI * u), 0.28) * (1 - 0.25 * Math.pow(Math.abs(2 * u - 1), 4));
      const gy = sheer(u);
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const x = (v - 0.5) * 2 * hw;
        const y = gy - depth * Math.pow(Math.sin(Math.PI * v), 1.15) - 0.05;
        pos.push(x, y, z);
        uv.push(u * 6, v * 2);
      }
    }
    for (let i = 0; i < NS; i++) {
      for (let j = 0; j < NV; j++) {
        const a = i * (NV + 1) + j, b = a + 1, c = a + NV + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geo: g, sheer };
  }

  QM.makeBoat = function (o) {
    o = o || {};
    const L = o.L || 20, Wd = o.W || 4.6, depth = 2.0;
    const grp = new T.Group();
    const bag = new QM.Bag();
    const hull = hullGeometry(L, Wd, depth);
    bag.add(QM.MAT.woodDark, hull.geo);

    // 甲板
    const deckSeg = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const z = (u - 0.5) * L * 0.98;
      const hw = (Wd / 2) * Math.pow(Math.sin(Math.PI * u), 0.28) * 0.92;
      const y = hull.sheer(u) - 0.08;
      deckSeg.push(QM.geo.box(hw * 2, 0.12, L / 14, 0, y, z));
    }
    bag.add(QM.MAT.wood, deckSeg);
    // 舷墙
    [-1, 1].forEach(s => {
      for (let i = 0; i < 14; i++) {
        const u = (i + 0.5) / 14;
        const z = (u - 0.5) * L * 0.98;
        const hw = (Wd / 2) * Math.pow(Math.sin(Math.PI * u), 0.28) * 0.94;
        bag.add(QM.MAT.woodDark, QM.geo.box(0.14, 0.4, L / 14 + 0.02, s * hw, hull.sheer(u) + 0.2, z));
      }
    });
    // 船头尾封板
    bag.add(QM.MAT.woodDark, QM.geo.box(0.5, 0.9, 0.5, 0, hull.sheer(0) + 0.2, L / 2 - 0.3));

    // 船舱
    if (o.cabin !== false) {
      const cl = L * 0.36, cw = Wd * 0.74, ch = o.cabinH || 1.5;
      const cz = o.cabinZ === undefined ? -L * 0.06 : o.cabinZ;
      const cy = hull.sheer(0.5) + 0.1;
      bag.add(QM.MAT.wood, QM.geo.box(cw, ch, cl, 0, cy + ch / 2, cz));
      // 拱形篷顶
      const roof = new T.Mesh(QM.white(new T.CylinderGeometry(cw * 0.56, cw * 0.56, cl, 14, 1, true, 0, Math.PI)), QM.MAT.boatMat);
      roof.rotation.z = Math.PI / 2;
      roof.rotation.y = Math.PI / 2;
      roof.position.set(0, cy + ch, cz);
      roof.castShadow = true;
      grp.add(roof);
      // 舱窗
      [-1, 1].forEach(s => {
        for (let i = 0; i < 3; i++) {
          bag.add(QM.MAT.lattice, QM.geo.plane(cl * 0.22, ch * 0.4, s * (cw / 2 + 0.02), cy + ch * 0.55, cz - cl * 0.28 + i * cl * 0.28, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2));
        }
      });
      // 舱门
      bag.add(QM.MAT.woodDark, QM.geo.box(0.7, ch * 0.8, 0.1, 0, cy + ch * 0.4, cz + cl / 2 + 0.02));
    }

    // 桅杆
    const mastH = o.mastH === undefined ? 11 : o.mastH;
    if (mastH > 0) {
      const mast = new T.Group();
      const mp = [];
      mp.push(QM.geo.cyl(0.11, 0.18, mastH, 7, 0, mastH / 2, 0));
      // 帆（卷起）
      mp.push(QM.geo.cyl(0.22, 0.22, mastH * 0.42, 8, 0.5, mastH * 0.55, 0, 0, 0, Math.PI / 2));
      mp.push(QM.geo.box(0.12, 0.12, Wd * 0.9, 0, mastH * 0.78, 0));
      // 横桁
      const yg = QM.geo.cyl(0.07, 0.07, Wd * 1.6, 6, 0, mastH * 0.9, 0, 0, 0, Math.PI / 2);
      mp.push(yg);
      mast.add(QM.mesh(mp, QM.MAT.woodDark, true, false));
      mast.position.set(0, hull.sheer(0.55), L * 0.12);
      mast.rotation.x = o.mastTilt || 0.06;
      grp.add(mast);
      grp.userData.mast = mast;
      // 桅索
      const ropes = [];
      ropes.push(QM.beamBetween(new T.Vector3(0, mastH * 0.95, 0), new T.Vector3(0, hull.sheer(0.9), L * 0.44), 0.035));
      ropes.push(QM.beamBetween(new T.Vector3(0, mastH * 0.95, 0), new T.Vector3(0, hull.sheer(0.12), -L * 0.42), 0.035));
      [-1, 1].forEach(s => ropes.push(QM.beamBetween(new T.Vector3(0, mastH * 0.9, 0), new T.Vector3(s * Wd * 0.44, hull.sheer(0.5) + 0.3, L * 0.1), 0.03)));
      grp.add(QM.mesh(ropes, QM.MAT.woodDark, false, false));
    }

    // 橹 / 桨
    const oars = [];
    [-1, 1].forEach(s => {
      oars.push(QM.geo.cyl(0.06, 0.08, 6.5, 5, s * Wd * 0.5, hull.sheer(0.15) + 0.5, -L * 0.22, 0.5, 0, s * 0.4));
      oars.push(QM.geo.box(0.5, 0.08, 1.1, s * (Wd * 0.5 + 0.4), hull.sheer(0.15) - 0.2, -L * 0.32));
    });
    // 船尾橹
    oars.push(QM.geo.cyl(0.07, 0.09, 8, 5, 0, hull.sheer(0.06) + 0.6, -L * 0.42, 0.42, 0.3, 0));
    bag.add(QM.MAT.wood, oars);

    // 货物
    if (o.cargo) {
      for (let i = 0; i < 8; i++) {
        const t = QM.rand();
        bag.add(QM.MAT.thatch, QM.geo.box(0.9, 0.55, 1.0, QM.rr(-Wd * 0.3, Wd * 0.3), hull.sheer(0.3) + 0.3, -L * 0.34 + i * 0.9));
      }
    }
    // 船头系缆桩
    bag.add(QM.MAT.woodDark, QM.geo.cyl(0.12, 0.14, 0.5, 6, 0, hull.sheer(0.9) + 0.3, L * 0.4));
    bag.build(grp);

    // 水面倒影 / 船影
    if (!QM.boatShadowTex) {
      QM.boatShadowTex = QM.canvasTex(128, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(28,34,28,0.55)');
        g.addColorStop(0.62, 'rgba(34,40,32,0.32)');
        g.addColorStop(1, 'rgba(40,46,38,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
      QM.boatShadowTex.wrapS = QM.boatShadowTex.wrapT = T.ClampToEdgeWrapping;
    }
    const sh = new T.Mesh(
      new T.PlaneGeometry(Wd * 1.9, L * 0.98),
      new T.MeshBasicMaterial({ map: QM.boatShadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = -0.2;
    sh.renderOrder = 1;
    grp.add(sh);

    grp.userData.L = L; grp.userData.W = Wd;
    return grp;
  };

  /* ================= 行人与路 ================= */
  function streetY(x) { return 0.45; }

  QM.addStreetWalker = function (scene, x, opts) {
    const o = opts || {};
    const p = QM.makePerson(o);
    p.scale.setScalar(QM.rr(0.94, 1.06) * (o.child ? 0.6 : 1));
    scene.add(p);
    const w = {
      g: p,
      x: x,
      zOff: o.zOff === undefined ? QM.rr(-4.5, 4.5) : o.zOff,
      dir: o.dir === undefined ? (QM.rand() > 0.5 ? 1 : -1) : o.dir,
      speed: QM.rr(0.55, 1.25) * (o.speed || 1),
      kind: 'street',
      bounds: o.bounds || [-170, 250]
    };
    QM.walkers.push(w);
    return w;
  };

  QM.addBridgeWalker = function (scene, zOff, dir, opts) {
    const p = QM.makePerson(opts || {});
    p.scale.setScalar(QM.rr(0.94, 1.05));
    scene.add(p);
    const w = {
      g: p,
      z: QM.rr(QM.bridge.z0, QM.bridge.z1),
      xOff: zOff,
      dir: dir || 1,
      speed: QM.rr(0.4, 1.15),
      jit: QM.rr(-0.18, 0.18),
      kind: 'bridge'
    };
    QM.walkers.push(w);
    return w;
  };

  /* 桥上凭栏围观者（虹桥名场面） */
  QM.addBridgeOnlookers = function (scene) {
    const B = QM.bridge;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 8; i++) {
        const z = QM.lerp(B.z0 + 2.5, B.z1 - 2.5, (i + QM.rr(0.2, 0.8)) / 10);
        const g = QM.makePerson({ hat: QM.pick(['futou', 'jin', 'none']), longRobe: QM.rand() > 0.5, colorIdx: QM.ri(0, 9), pose: QM.pick(['fold', 'back', 'lean']), amp: 0.15 });
        const wp = B.world(z, side * (B.width / 2 - 0.5));
        g.position.set(wp.x, B.y(z), wp.z);
        g.rotation.y = side * Math.PI / 2 + QM.bridge.angle;
        g.rotation.x = 0.12;
        g.userData.amp = 0.15;
        scene.add(g);
        QM.walkers.push({ g, kind: 'static', phase: QM.rr(0, 6.28) });
      }
    }
  };

  /* ================= 场景人物布置 ================= */
  QM.populate = function (scene) {
    // 街道行人
    for (let i = 0; i < 118; i++) {
      const x = QM.rand() < 0.72 ? QM.rr(-10, 248) : QM.rr(-168, 20);
      const nearBridge = Math.abs(x - QM.CFG.bridgeX) < 14;
      if (nearBridge && QM.rand() > 0.35) continue;
      const official = QM.rand() < 0.07;
      QM.addStreetWalker(scene, x, {
        colorIdx: QM.ri(0, 9),
        longRobe: official || QM.rand() > 0.55,
        hat: official ? 'futouWing' : QM.pick(HATS),
        beard: QM.rand() < 0.18,
        porter: QM.rand() < 0.16,
        bundle: QM.rand() < 0.2,
        pole: QM.rand() < 0.08 ? 1.6 : 0,
        zOff: QM.rr(-5, 5),
        child: QM.rand() < 0.07,
        pose: QM.rand() < 0.1 ? 'carry' : 'walk',
        amp: QM.rand() < 0.15 ? 0.55 : 1
      });
    }
    // 桥面行人
    for (let i = 0; i < 30; i++) {
      QM.addBridgeWalker(scene, QM.rr(-3.6, 3.6), QM.rand() > 0.5 ? 1 : -1, {
        colorIdx: QM.ri(0, 9), longRobe: QM.rand() > 0.5, hat: QM.pick(HATS),
        beard: QM.rand() < 0.15, porter: QM.rand() < 0.1,
        pose: QM.rand() < 0.2 ? 'fold' : 'walk'
      });
    }
    QM.addBridgeOnlookers(scene);
    // 店铺前聚集的人群
    const crowds = [[-56, 1], [96, -2], [130, 2], [188, 1], [60, -1], [-20, 2], [214, -1]];
    crowds.forEach(c => {
      for (let k = 0; k < 5; k++) {
        const g = QM.makePerson({
          colorIdx: QM.ri(0, 9), longRobe: QM.rand() > 0.5, hat: QM.pick(HATS),
          beard: QM.rand() < 0.2, amp: 0.18,
          pose: QM.pick(['stand', 'fold', 'back', 'lean', 'fold'])
        });
        g.position.set(c[0] + QM.rr(-2.4, 2.4), 0.52, QM.streetZ(c[0]) + c[1] + QM.rr(-1, 1));
        g.rotation.y = QM.rr(0, 6.28);
        scene.add(g);
        QM.walkers.push({ g, kind: 'static', phase: QM.rr(0, 6.3) });
      }
    });

    // 桥头看船的人群（南岸）
    for (let i = 0; i < 10; i++) {
      const g = QM.makePerson({ colorIdx: QM.ri(0, 9), longRobe: QM.rand() > 0.6, hat: QM.pick(HATS), amp: 0.2, pose: QM.pick(['fold', 'back', 'lean', 'stand']) });
      g.position.set(QM.bridge.x + QM.rr(-9, 9), 0.5, QM.rr(47, 54));
      g.rotation.y = Math.PI + QM.rr(-0.5, 0.5);
      scene.add(g);
      QM.walkers.push({ g, kind: 'static', phase: QM.rr(0, 6.28) });
    }

    // 郊野：赶驴队伍
    const donkeyPath = [];
    for (let i = 0; i < 6; i++) {
      const d = QM.makeDonkey({ load: i % 2 === 0, color: [0x6b5a48, 0x7a6650, 0x5d4d3c][i % 3] });
      scene.add(d);
      QM.animals.push({
        g: d, kind: 'path', t: -i * 2.6, speed: 0.75,
        path: [[-215, -18], [-160, -12], [-95, -10], [-40, -8], [10, -6]],
        legs: d.userData.legs
      });
    }
    // 郊野：扫墓归来 / 踏青
    for (let i = 0; i < 9; i++) {
      const g = QM.makePerson({ colorIdx: QM.ri(0, 9), longRobe: true, hat: QM.pick(HATS), bundle: QM.rand() < 0.5 });
      g.position.set(QM.rr(-230, -130), 0.6, QM.rr(-30, 25));
      scene.add(g);
      QM.walkers.push({ g, kind: 'roam', cx: g.position.x, cz: g.position.z, r: QM.rr(3, 9), ph: QM.rr(0, 6.28), sp: QM.rr(0.15, 0.35), speed: 0.7 });
    }
    // 骑马者
    const horse = QM.makeHorse({ color: 0x51392a });
    horse.position.set(-52, 0.5, QM.streetZ(-52) - 1.5);
    horse.rotation.y = 0.1;
    scene.add(horse);
    QM.walkers.push({ g: horse, kind: 'street', x: -52, zOff: -1.5, dir: 1, speed: 0.7, yOff: 0.5 });
    const horse2 = QM.makeHorse({ color: 0x7a5a44, rider: false });
    horse2.position.set(118, 0.5, QM.streetZ(118) + 2);
    horse2.rotation.y = Math.PI;
    scene.add(horse2);
    QM.animals.push({ g: horse2, kind: 'static', legs: horse2.userData.legs });

    // 城门：骆驼队
    for (let i = 0; i < 4; i++) {
      const c = QM.makeCamel({});
      c.position.set(QM.CFG.gateX - 34 + i * 6.5, 0.5, QM.streetZ(QM.CFG.gateX) + 1.2);
      c.rotation.y = 0.02;
      c.scale.setScalar(1);
      scene.add(c);
      QM.animals.push({ g: c, kind: 'street', x: QM.CFG.gateX - 34 + i * 6.5, zOff: 1.2, dir: 1, speed: 0.32, legs: c.userData.legs });
    }
    // 牛车
    for (let i = 0; i < 2; i++) {
      const cart = QM.makeCart({ canopy: true, w: 1.9, l: 3.2 });
      const ox = QM.makeOx();
      const x = 60 + i * 55;
      cart.position.set(x, 0.45, QM.streetZ(x) + (i ? 3 : -3));
      ox.position.set(x, 0.45, QM.streetZ(x) + (i ? 3 : -3) + 2.9);
      cart.rotation.y = ox.rotation.y = (i ? -1 : 1) * Math.PI / 2 + 0.05;
      scene.add(cart); scene.add(ox);
      QM.animals.push({ g: ox, kind: 'fill', legs: ox.userData.legs });
      QM.animals.push({ g: cart, kind: 'static' });
    }
    // 独轮车 + 推车人
    for (let i = 0; i < 3; i++) {
      const x = -100 + i * 80;
      const cart = QM.makeCart({ w: 1.0, l: 1.7, load: true, twoWheel: false });
      cart.position.set(x, 0.45, QM.streetZ(x) + 1.5);
      cart.scale.setScalar(0.85);
      cart.rotation.y = Math.PI / 2;
      scene.add(cart);
      QM.animals.push({ g: cart, kind: 'static' });
    }
    // 猪
    for (let i = 0; i < 3; i++) {
      const g = new T.Group();
      const mat = new T.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.95 });
      const bg = [];
      bg.push(QM.geo.sphere(0.36, 0, 0.55, 0, 1.5, 0.82, 1));
      bg.push(QM.geo.sphere(0.19, 0, 0.5, 0.46, 1, 0.9, 1));
      bg.push(QM.geo.box(0.09, 0.1, 0.12, 0, 0.48, 0.62));
      bg.push(QM.geo.box(0.035, 0.16, 0.035, 0, 0.7, -0.5));
      g.add(QM.mesh(bg, mat, true, false));
      g.position.set(-16 + i * 3.2, 0.45, QM.streetZ(-16) + 4.6);
      g.rotation.y = QM.rr(0, 6.28);
      scene.add(g);
    }
  };

  /* ================= 船与汴河 ================= */
  QM.populateRiver = function (scene) {
    // 尾迹贴图
    if (!QM.wakeTex) {
      QM.wakeTex = QM.canvasTex(128, 128, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.quadraticCurveTo(w * 0.55, h * 0.1, w, h * 0.34);
        ctx.lineTo(w, h * 0.66);
        ctx.quadraticCurveTo(w * 0.55, h * 0.9, 0, h * 0.5);
        ctx.fill();
      });
      QM.wakeTex.wrapS = QM.wakeTex.wrapT = T.ClampToEdgeWrapping;
    }
    const B = QM.bridge;
    function boatAt(x, z, rot, opts) {
      const b = QM.makeBoat(opts || {});
      b.position.set(x, 0.25, z);
      b.rotation.y = rot;
      scene.add(b);
      const rec = { g: b, baseY: 0.25, x, z, ph: QM.rr(0, 6.28), drift: (opts && opts.drift) || 0 };
      if (rec.drift) {
        const wk = new T.Mesh(
          new T.PlaneGeometry(14, 5),
          new T.MeshBasicMaterial({ map: QM.wakeTex, transparent: true, opacity: 0.16, depthWrite: false, blending: T.AdditiveBlending })
        );
        wk.rotation.x = -Math.PI / 2;
        wk.rotation.z = Math.PI / 2;
        wk.position.set(x - 6, 0.06, z);
        wk.renderOrder = 2;
        scene.add(wk);
        rec.wake = wk;
      }
      QM.boats.push(rec);
      return b;
    }

    // 虹桥下：正在放倒桅杆的大船（画中核心）
    const big = boatAt(B.x + 2.0 + 33.5 * Math.sin(B.angle), 33.5, Math.PI * 0.5 + 0.04, {
      L: 22, W: 5.0, cargo: true, cabin: true, cabinH: 1.4, drift: 0
    });
    big.userData.mast.rotation.x = 1.35; // 已放倒
    // 船上船工
    const crew = [[-7.5, 1.2], [-5.2, -1.2], [-2.0, 0.8], [1.5, -1.0], [4.6, 1.2], [7.0, -0.8]];
    crew.forEach((c, i) => {
      const p = QM.makePerson({ colorIdx: 4, hat: 'jin', amp: 0.3, pose: i < 3 ? 'carry' : 'walk' });
      p.position.set(B.x + 2.0 + 33.5 * Math.sin(B.angle) + c[0], 0.95, 33.5 + c[1]);
      p.rotation.y = i < 3 ? -Math.PI / 2 : Math.PI / 2;
      p.scale.setScalar(0.95);
      scene.add(p);
      QM.walkers.push({ g: p, kind: 'static', phase: QM.rr(0, 6.3), pulling: i < 2 });
    });
    // 船上拉桅的绳索
    const ropes = [];
    ropes.push(QM.beamBetween(new T.Vector3(B.x + 11.0, 1.2, 32.5), new T.Vector3(B.x + 3.0, 6.2, 32.9), 0.04));
    ropes.push(QM.beamBetween(new T.Vector3(B.x - 5.0, 1.2, 34.8), new T.Vector3(B.x + 3.0, 6.2, 32.9), 0.04));
    scene.add(QM.mesh(ropes, QM.MAT.woodDark, false, false));

    // 其他船只
    boatAt(-96, QM.riverZ(-96) - 2, Math.PI / 2 + 0.06, { L: 18, W: 4.4, cargo: true, drift: 0.22 });
    boatAt(-38, QM.riverZ(-38) + 4, Math.PI / 2 - 0.08, { L: 16, W: 4.0, cargo: true, drift: 0.16 });
    boatAt(6, QM.riverZ(6) - 3.5, Math.PI / 2 + 0.04, { L: 14, W: 3.6, cabinH: 1.3, drift: 0.1 });
    boatAt(72, QM.riverZ(72) + 3, Math.PI / 2 - 0.1, { L: 20, W: 4.8, cargo: true, drift: 0.2 });
    boatAt(120, QM.riverZ(120) - 4, Math.PI / 2 + 0.05, { L: 24, W: 5.2, cargo: true, drift: 0.15 });
    boatAt(168, QM.riverZ(168) + 4.5, Math.PI / 2 - 0.06, { L: 16, W: 4.0, cargo: true, drift: 0.12 });
    boatAt(212, QM.riverZ(212) - 3, Math.PI / 2 + 0.03, { L: 13, W: 3.4, cabinH: 1.2, drift: 0.1 });
    boatAt(-140, QM.riverZ(-140) - 5, Math.PI / 2 + 0.02, { L: 11, W: 3.0, cabin: true, cabinH: 1.0, mastH: 5, drift: 0.08 });

    // 小舟（渔船）
    for (let i = 0; i < 3; i++) {
      const x = -170 + i * 130, z = QM.riverZ(x) + QM.rr(-6, 6);
      const b = QM.makeBoat({ L: 7.5, W: 1.9, cabin: false, mastH: 0, drift: 0.12 });
      b.position.set(x, 0.05, z);
      b.rotation.y = Math.PI / 2 + 0.1;
      scene.add(b);
      QM.boats.push({ g: b, baseY: 0.05, ph: QM.rr(0, 6.2), x, z });
      const p = QM.makePerson({ colorIdx: 4, hat: 'douli', amp: 0.5, pole: 1.7 });
      p.position.set(x, 0.55, z);
      p.scale.setScalar(0.9);
      p.rotation.y = Math.PI / 2 + 0.1;
      scene.add(p);
      QM.walkers.push({ g: p, kind: 'static', phase: QM.rr(0, 6.3) });
    }

    // 码头卸货（纤夫、脚夫）
    for (let i = 0; i < 7; i++) {
      const g = QM.makePerson({ colorIdx: 4, hat: 'jin', porter: true, amp: 0.9 });
      const x = -88 + QM.rr(-6, 6), z = QM.riverZ(-88) + QM.rr(-10, -5);
      g.position.set(x, 1.0, z);
      g.rotation.y = QM.rr(0, 3.14);
      scene.add(g);
      QM.walkers.push({ g, kind: 'static', phase: QM.rr(0, 6.3), carrying: true });
    }
    // 纤夫拉纤
    for (let i = 0; i < 5; i++) {
      const g = QM.makePerson({ colorIdx: 4, hat: 'jin', amp: 1.0 });
      g.position.set(-118 + i * 2.4, 0.6, QM.riverZ(-118) + 16.5);
      g.rotation.y = -0.4;
      g.rotation.x = 0.16;
      scene.add(g);
      QM.walkers.push({ g, kind: 'static', phase: i * 1.1 });
    }
  };

  /* ================= 水面生灵 ================= */
  QM.ducks = [];
  QM.populateDucks = function (scene) {
    const mat = new T.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.75 });
    const beakMat = new T.MeshStandardMaterial({ color: 0xc08a3a, roughness: 0.7 });
    for (let i = 0; i < 10; i++) {
      const g = new T.Group();
      const body = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), mat);
      body.scale.set(1.5, 0.9, 1);
      body.position.y = 0.1;
      g.add(body);
      const head = new T.Mesh(new T.SphereGeometry(0.085, 8, 6), mat);
      head.position.set(0.2, 0.26, 0);
      g.add(head);
      const beak = new T.Mesh(new T.ConeGeometry(0.035, 0.1, 6), beakMat);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.3, 0.25, 0);
      g.add(beak);
      const x = QM.rr(-150, 220);
      const z = QM.riverZ(x) + QM.rr(-8, 8);
      g.position.set(x, 0.1, z);
      scene.add(g);
      QM.ducks.push({ g, cx: x, cz: z, r: QM.rr(1.5, 4.5), ph: QM.rr(0, 6.28), sp: QM.rr(0.12, 0.3) });
    }
  };

  /* ================= 更新 ================= */
  // 头部 LOD：近处用雕刻头（独立网格），远处隐藏、露出体内的低模头
  const HEAD_LOD2 = 24 * 24;
  const HEAD_NEAR2 = 12 * 12;
  QM.updateHeadLOD = function (camPos) {
    for (let i = 0; i < QM.walkers.length; i++) {
      const g = QM.walkers[i].g;
      const u = g.userData;
      if (!u) continue;
      const dx = g.position.x - camPos.x;
      const dz = g.position.z - camPos.z;
      const d2 = dx * dx + dz * dz;
      if (u.mesh) u.mesh.castShadow = d2 < 28 * 28;
      if (u.head) {
        const near = d2 < HEAD_NEAR2;
        u.head.visible = d2 < HEAD_LOD2;
        u.head.geometry = near ? HEAD_HI_B : HEAD_MID_B;
        if (u.eyes) u.eyes.visible = near && d2 < HEAD_LOD2;
      }
    }
  };
QM.updateLife = function (dt, t) {
    for (let i = 0; i < QM.walkers.length; i++) {
      const w = QM.walkers[i];
      const u = w.g.userData;
      const legL = u.legL, legR = u.legR;

      if (w.kind === 'street') {
        if (!w.bounds) w.bounds = [-170, 250];
        w.x += w.dir * w.speed * dt;
        if (w.x > w.bounds[1]) { w.x = w.bounds[1]; w.dir = -1; }
        if (w.x < w.bounds[0]) { w.x = w.bounds[0]; w.dir = 1; }
        const z = QM.streetZ(w.x) + w.zOff;
        w.g.position.set(w.x, (w.yOff || QM.CFG.streetY), z);
        const dz = (QM.streetZ(w.x + w.dir) - QM.streetZ(w.x));
        w.g.rotation.y = w.dir > 0 ? Math.PI / 2 - Math.atan2(dz, 1) * 1.0 : -Math.PI / 2 - Math.atan2(dz, 1);
        // 防止穿墙：在街面范围内
        if (Math.abs(w.zOff) > 5.2) w.zOff *= 0.999;
        u.clock += dt * w.speed * 6.2;
      } else if (w.kind === 'bridge') {
        w.z += w.dir * w.speed * dt;
        if (w.z > QM.bridge.z1 + 3) { w.z = QM.bridge.z1 + 3; w.dir = -1; }
        if (w.z < QM.bridge.z0 - 3) { w.z = QM.bridge.z0 - 3; w.dir = 1; }
        const B = QM.bridge;
        w.g.position.set(B.world(w.z, w.xOff).x, B.pathY(w.z), B.world(w.z, w.xOff).z);
        w.g.rotation.y = (w.dir > 0 ? 0 : Math.PI) + (w.jit || 0) + QM.bridge.angle;
        u.clock += dt * w.speed * 6.2;
      } else if (w.kind === 'roam') {
        w.ph += dt * w.sp;
        const x = w.cx + Math.cos(w.ph) * w.r;
        const z = w.cz + Math.sin(w.ph) * w.r * 0.7;
        w.g.position.set(x, QM.heightAt(x, z), z);
        w.g.rotation.y = -w.ph + Math.PI / 2;
        u.clock += dt * 4;
      } else {
        u.clock += dt * 1.2;
      }

      const c = u.clock;
      const B = u.bones;
      const pose = u.pose || 'walk';
      if (B) {
        if (pose !== 'sit') {
          const amp = u.amp;
          const sw = Math.sin(c) * 0.55 * amp;
          B.thighL.rotation.x = sw;
          B.thighR.rotation.x = -sw;
          B.kneeL.rotation.x = Math.max(0, -sw) * 0.95;
          B.kneeR.rotation.x = Math.max(0, sw) * 0.95;
          if (pose === 'walk') {
            B.shoulderL.rotation.x = -sw * 0.8;
            B.shoulderR.rotation.x = sw * 0.8;
            B.elbowL.rotation.x = -0.16 - Math.abs(sw) * 0.35;
            B.elbowR.rotation.x = -0.16 - Math.abs(sw) * 0.35;
          }
          B.hips.position.y = 0.88 + Math.abs(Math.sin(c)) * 0.028 * amp;
          B.spine.rotation.z = Math.sin(c) * 0.03 * amp;
          B.spine.rotation.x = 0.03 + (w.pulling ? 0.22 : 0) + Math.abs(sw) * 0.02;
          B.chest.rotation.z = -Math.sin(c) * 0.024 * amp;
          B.head.rotation.z = -Math.sin(c) * 0.02;
          B.head.rotation.x = 0.02;
        }
      }
    }

    // 畜类
    for (let i = 0; i < QM.animals.length; i++) {
      const a = QM.animals[i];
      const g = a.g;
      if (a.kind === 'path' && a.path) {
        a.t += a.speed * dt * 0.1;
        const p = a.path;
        const seg = QM.clamp(a.t, 0, p.length - 1.001);
        const i0 = Math.floor(seg), f = seg - i0;
        const x = QM.lerp(p[i0][0], p[i0 + 1][0], f);
        const z = QM.lerp(p[i0][1], p[i0 + 1][1], f);
        g.position.set(x, QM.heightAt(x, z), z);
        g.rotation.y = Math.atan2(p[i0 + 1][0] - p[i0][0], p[i0 + 1][1] - p[i0][1]);
        if (a.t > p.length - 1) a.t = 0;
        g.userData.clock = (g.userData.clock || 0) + dt * 5;
      } else if (a.kind === 'street') {
        a.x += a.dir * a.speed * dt;
        if (a.x > 240) a.dir = -1;
        if (a.x < 30) a.dir = 1;
        g.position.x = a.x;
        g.position.z = QM.streetZ(a.x) + a.zOff;
        g.rotation.y = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        g.userData.clock = (g.userData.clock || 0) + dt * 3.4;
      } else {
        g.userData.clock = (g.userData.clock || 0) + dt;
      }
      const legs = a.legs;
      if (legs) {
        const c = g.userData.clock || 0;
        for (let k = 0; k < legs.length; k++) {
          legs[k].rotation.x = Math.sin(c + k) * 0.32;
        }
      }
      if (g.userData.height) {
        g.position.y = (g.position.y || 0.45) + 0;
      }
      // 骑者的身体随行
      if (g.children) {
        for (const ch of g.children) {
          if (ch.userData && ch.userData.bones && ch.userData.amp > 0.1) {
            ch.userData.clock = (ch.userData.clock || 0) + dt;
            const bb = ch.userData.bones;
            bb.thighL.rotation.x = Math.sin(ch.userData.clock * 2) * 0.08 - 1;
            bb.thighR.rotation.x = -Math.sin(ch.userData.clock * 2) * 0.08 - 1;
          }
        }
      }
    }

    // 鸭子游动
    for (let i = 0; i < QM.ducks.length; i++) {
      const d = QM.ducks[i];
      d.ph += dt * d.sp;
      const x = d.cx + Math.cos(d.ph) * d.r;
      const z = d.cz + Math.sin(d.ph) * d.r * 0.6;
      d.g.position.set(x, 0.1 + Math.sin(t * 2.2 + i) * 0.02, z);
      d.g.rotation.y = -d.ph + Math.PI / 2;
    }

    // 船只：起伏、横摇、顺流漂移
    for (let i = 0; i < QM.boats.length; i++) {
      const b = QM.boats[i];
      const ph = b.ph + t * 1.15;
      b.g.position.y = b.baseY + Math.sin(ph) * 0.13 + Math.sin(ph * 2.3) * 0.03;
      b.g.rotation.z = Math.sin(ph * 0.8) * 0.022;
      b.g.rotation.x = Math.cos(ph * 0.95) * 0.012;
      b.g.rotation.y = (b.baseRot === undefined ? (b.baseRot = b.g.rotation.y) : b.baseRot)
        + Math.sin(ph * 0.5) * 0.012;
      if (b.drift) {
        b.g.position.x += b.drift * dt;
        if (b.g.position.x > b.x + 30) b.g.position.x = b.x - 30;
      }
      if (b.wake) {
        const k = 0.75 + Math.sin(ph * 1.7) * 0.25;
        b.wake.material.opacity = 0.16 * k;
        b.wake.position.x = b.g.position.x - 6;
      }
    }
  };

})(window.QM);
