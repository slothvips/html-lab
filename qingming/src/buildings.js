/* 清明上河图 · 营造：屋顶 / 屋舍 / 店铺 / 酒楼 / 城楼 */
(function (QM) {
  'use strict';
  const T = THREE;

  /* ---------- 几何收集器：按材质合并，减少 draw call ---------- */
  function Bag() { this.map = new Map(); }
  Bag.prototype.add = function (mat, geom) {
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(geom);
    return this;
  };
  Bag.prototype.build = function (group) {
    group = group || new T.Group();
    this.map.forEach((geoms, mat) => {
      const mesh = QM.mesh(geoms, mat, true, true, 1.0);
      group.add(mesh);
    });
    return group;
  };
  QM.Bag = Bag;

  /* ---------- 悬山 / 硬山屋顶（举折曲面） ---------- */
  QM.gableRoof = function (w, d, h, oh) {
    oh = oh === undefined ? 1.0 : oh;
    const hw = w / 2 + oh * 0.4, hd = d / 2 + oh;
    const nu = 12, nv = 7;
    const pos = [], uv = [], idx = [];
    let base = 0;
    for (let side = 0; side < 2; side++) {
      const sz = side === 0 ? 1 : -1;
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= nu; i++) {
          const u = -1 + 2 * i / nu;
          const lift = 0.42 * Math.pow(Math.abs(u), 5) * Math.pow(v, 3);
          const y = h * Math.pow(1 - v, 1.45) + lift;
          pos.push(u * hw, y, sz * v * hd);
          uv.push((u * 0.5 + 0.5) * w / 2.35, v * d / 1.15);
        }
      }
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1;
          if (sz > 0) idx.push(a, c, b, b, c, e);
          else idx.push(a, b, c, b, e, c);
        }
      }
      base += (nu + 1) * (nv + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geom: g, hw, hd, h };
  };

  /* ---------- 庑殿屋顶（四阿） ---------- */
  QM.hipRoof = function (w, d, h, oh) {
    oh = oh === undefined ? 1.0 : oh;
    const hw = w / 2 + oh, hd = d / 2 + oh;
    const rx = Math.max(w * 0.12, w / 2 - d * 0.42);
    const nu = 12, nv = 7;
    const pos = [], uv = [], idx = [];
    let base = 0;

    function patch(kind, sz) {
      for (let j = 0; j <= nv; j++) {
        const v = j / nv;
        for (let i = 0; i <= nu; i++) {
          const u = -1 + 2 * i / nu;
          let x, z, lift;
          if (kind === 'main') {
            if (sz > 0) {
              x = u * QM.lerp(rx, hw, v);
              z = v * hd;
            } else {
              x = -u * QM.lerp(rx, hw, v);
              z = -v * hd;
            }
          } else {
            if (sz > 0) {
              x = v * hw; z = u * QM.lerp(0.001, hd, v);
            } else {
              x = -v * hw; z = -u * QM.lerp(0.001, hd, v);
            }
          }
          lift = 0.55 * Math.pow(Math.abs(u), 3) * Math.pow(v, 3.2);
          const y = h * Math.pow(1 - v, 1.42) + lift;
          pos.push(x, y, z);
          uv.push((x + z) * 0.42, v * d / 1.15);
        }
      }
      for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
          const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1;
          if (kind === 'main') {
            if (sz > 0) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
          } else {
            if (sz > 0) idx.push(a, b, c, b, e, c); else idx.push(a, c, b, b, c, e);
          }
        }
      }
      base += (nu + 1) * (nv + 1);
    }
    patch('main', 1); patch('main', -1); patch('hip', 1); patch('hip', -1);

    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { geom: g, hw, hd, h, rx };
  };

  /* 正脊、鸱吻、檐口 */
  QM.roofTrim = function (bag, roof, w, d, opts) {
    opts = opts || {};
    const y = opts.y || 0;
    const ridgeMat = opts.ridgeMat || QM.MAT.ridge;
    const rl = roof.rx !== undefined ? roof.rx * 2 : roof.hw * 2;
    bag.add(ridgeMat, QM.geo.box(rl + 0.5, 0.34, 0.5, 0, y + roof.h + 0.12, 0));
    bag.add(ridgeMat, QM.geo.box(rl + 0.9, 0.14, 0.72, 0, y + roof.h + 0.3, 0));
    // 鸱吻
    [-1, 1].forEach(s => {
      const x = s * (rl / 2 + 0.15);
      bag.add(ridgeMat, QM.geo.box(0.28, 0.75, 0.62, x, y + roof.h + 0.52, 0));
      bag.add(ridgeMat, QM.geo.box(0.24, 0.42, 0.3, x + s * 0.02, y + roof.h + 0.95, 0.08));
      const horn = new T.ConeGeometry(0.22, 0.5, 5);
      horn.rotateZ(s * 0.5);
      horn.translate(x + s * 0.2, y + roof.h + 1.16, 0);
      bag.add(ridgeMat, horn);
    });
    // 檐口（连檐）
    const eaveMat = QM.MAT.woodDark;
    bag.add(eaveMat, QM.geo.box(roof.hw * 2, 0.16, 0.16, 0, y + 0.02, roof.hd));
    bag.add(eaveMat, QM.geo.box(roof.hw * 2, 0.16, 0.16, 0, y + 0.02, -roof.hd));
    bag.add(eaveMat, QM.geo.box(0.16, 0.16, roof.hd * 2, roof.hw, y + 0.02, 0));
    bag.add(eaveMat, QM.geo.box(0.16, 0.16, roof.hd * 2, -roof.hw, y + 0.02, 0));
  };

  /* ---------- 斗拱（简化） ---------- */
  QM.dougong = function (bag, w, d, y, spacing) {
    spacing = spacing || 1.8;
    const nx = Math.max(2, Math.floor(w / spacing));
    for (let i = 0; i <= nx; i++) {
      const x = -w / 2 + (w / nx) * i;
      for (const z of [d / 2, -d / 2]) {
        bag.add(QM.MAT.woodDark, QM.geo.box(0.28, 0.26, 0.95, x, y, z));
        bag.add(QM.MAT.wood, QM.geo.box(0.95, 0.14, 0.22, x, y + 0.2, z));
        bag.add(QM.MAT.woodDark, QM.geo.box(0.16, 0.2, 0.6, x, y + 0.3, z));
      }
    }
    const nz = Math.max(2, Math.floor(d / spacing));
    for (let i = 1; i < nz; i++) {
      const z = -d / 2 + (d / nz) * i;
      for (const x of [w / 2, -w / 2]) {
        bag.add(QM.MAT.woodDark, QM.geo.box(0.95, 0.26, 0.28, x, y, z));
        bag.add(QM.MAT.wood, QM.geo.box(0.22, 0.14, 0.95, x, y + 0.2, z));
      }
    }
  };

  /* ---------- 主体屋舍 ---------- */
  // 返回 Group，正面朝 +Z
  QM.buildHouse = function (o) {
    o = o || {};
    const w = o.w || 8, d = o.d || 6, eave = o.eave || 3.4;
    const storeys = o.storeys || 1;
    const g = new T.Group();
    const bag = new Bag();
    const wallMat = o.wallMat || QM.MAT.plaster;
    const colMat = o.colMat || QM.MAT.wood;
    const roofMat = o.roofMat || QM.MAT.roof;

    // 台基
    bag.add(QM.MAT.stone, QM.geo.box(w + 1.0, 0.45, d + 1.0, 0, 0.22, 0));
    bag.add(QM.MAT.stone, QM.geo.box(w + 0.6, 0.3, d + 0.6, 0, 0.5, 0));

    // 柱网
    const ncol = Math.max(2, Math.round(w / 2.6));
    for (let i = 0; i <= ncol; i++) {
      const x = -w / 2 + (w / ncol) * i;
      [d / 2 - 0.06, -d / 2 + 0.06].forEach(z => {
        bag.add(colMat, QM.geo.cyl(0.17, 0.2, eave, 8, x, eave / 2 + 0.6, z));
      });
    }
    // 墙
    const wallH = eave - 0.1, wallY = eave / 2 + 0.6;
    bag.add(wallMat, QM.geo.box(w - 0.2, wallH, 0.22, 0, wallY, -d / 2 + 0.06));
    if (!o.openFront) {
      bag.add(wallMat, QM.geo.box(w - 0.2, wallH, 0.22, 0, wallY, d / 2 - 0.06));
      // 墙脚木裙板（深色踢脚），避免大片白墙
      bag.add(QM.MAT.woodDark, QM.geo.box(w - 0.05, 0.62, 0.07, 0, 0.99, d / 2 + 0.01));
      bag.add(QM.MAT.wood, QM.geo.box(w - 0.02, 0.07, 0.1, 0, 1.32, d / 2 + 0.01));
      // 墙面木框：竖向分间
      for (let i = 0; i <= 2; i++) {
        const x = -w / 2 + 0.3 + (w - 0.6) * i / 2;
        bag.add(QM.MAT.woodDark, QM.geo.box(0.11, wallH * 0.92, 0.08, x, wallY, d / 2 + 0.02));
      }
      bag.add(QM.MAT.woodDark, QM.geo.box(w - 0.1, 0.09, 0.08, 0, 0.6 + eave * 0.64, d / 2 + 0.02));
    } else {
      // 店面：两侧留墙，中间敞开
      bag.add(wallMat, QM.geo.box(1.5, wallH, 0.24, -w / 2 + 0.75, wallY, d / 2 - 0.06));
      bag.add(wallMat, QM.geo.box(1.5, wallH, 0.24, w / 2 - 0.75, wallY, d / 2 - 0.06));
      // 侧墙脚木裙板
      [-1, 1].forEach(sx => {
        bag.add(QM.MAT.woodDark, QM.geo.box(1.5, 0.62, 0.07, sx * (w / 2 - 0.75), 0.99, d / 2 + 0.01));
        bag.add(QM.MAT.wood, QM.geo.box(1.5, 0.07, 0.1, sx * (w / 2 - 0.75), 1.32, d / 2 + 0.01));
      });
      // 店内：地板、后墙、顶棚
      const iw = w - 3.1;
      [-1, 1].forEach(sx => {
        bag.add(QM.MAT.woodDark, QM.geo.box(0.12, wallH - 0.5, d - 0.5,
          sx * (iw / 2 + 0.06), wallY - 0.1, -d / 2 + 0.35));
      });
      bag.add(QM.MAT.interior, QM.geo.box(iw, wallH - 0.6, 0.1, 0, wallY, -d / 2 + 0.2));
      bag.add(QM.MAT.interior, QM.geo.box(iw, 0.12, d - 0.55, 0, 0.72, 0));
      bag.add(QM.MAT.interior, QM.geo.box(iw, 0.1, d - 0.55, 0, 0.6 + eave - 0.28, 0));
      // 后墙挂画
      const pt = QM.canvasTex(128, 256, (ctx, ww, hh) => {
        ctx.fillStyle = '#e3d8b8'; ctx.fillRect(0, 0, ww, hh);
        ctx.strokeStyle = 'rgba(60,50,34,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, ww - 16, hh - 16);
        ctx.strokeStyle = 'rgba(45,40,30,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const yy = 60 + i * 30;
          ctx.moveTo(30, yy);
          ctx.bezierCurveTo(50, yy - 22, 80, yy + 20, 100, yy - 6);
        }
        ctx.stroke();
      });
      const pm2 = new T.Mesh(new T.PlaneGeometry(0.9, 1.8), new T.MeshStandardMaterial({ map: pt, roughness: 0.95 }));
      pm2.position.set(w * 0.2, 2.55, -d / 2 + 0.27);
      g.add(pm2);
      // 货架（靠后墙）+ 案上货物
      for (let sgi = 0; sgi < 2; sgi++) {
        bag.add(QM.MAT.woodDark, QM.geo.box(iw * 0.55, 0.07, 0.32, -iw * 0.16, 1.36 + sgi * 0.56, -d / 2 + 0.44));
        bag.add(QM.MAT.woodDark, QM.geo.box(0.06, 0.56, 0.32, -iw * 0.16 - iw * 0.26, 1.36 + sgi * 0.56, -d / 2 + 0.44));
        bag.add(QM.MAT.woodDark, QM.geo.box(0.06, 0.56, 0.32, -iw * 0.16 + iw * 0.26, 1.36 + sgi * 0.56, -d / 2 + 0.44));
        bag.add(QM.MAT.woodDark, QM.geo.box(iw * 0.55, 0.06, 0.18, -iw * 0.16, 1.76 + sgi * 0.56, -d / 2 + 0.44));
      }
      for (let gi = 0; gi < 10; gi++) {
        const bx = -iw * 0.39 + (gi % 5) * iw * 0.115;
        const by = 1.52 + Math.floor(gi / 5) * 0.56;
        if (gi % 3 === 0) bag.add(QM.MAT.thatch, QM.geo.cyl(0.11, 0.09, 0.2, 7, bx, by, -d / 2 + 0.44));
        else bag.add(QM.MAT.stone, QM.geo.cyl(0.09, 0.075, 0.22, 7, bx, by, -d / 2 + 0.44));
      }
      // 店内货堆（麻袋、坛）
      for (let gi = 0; gi < 4; gi++) {
        const bx = w * 0.16 + gi * 0.42;
        bag.add(QM.MAT.thatch, QM.geo.box(0.4, 0.42, 0.45, bx, 0.95, -d / 2 + 1.0 + (gi % 2) * 0.1));
      }
      // 门帘
      bag.add(QM.MAT.curtain, QM.geo.plane(w * 0.2, 0.5, -w * 0.16, 0.6 + eave - 0.45, d / 2 - 0.14));
      // 门槛石
      bag.add(QM.MAT.stone, QM.geo.box(iw + 0.1, 0.16, 0.36, 0, 0.66, d / 2 - 0.2));
    }

    // 山墙
    [-1, 1].forEach(s => {
      bag.add(wallMat, QM.geo.box(0.24, eave - 0.1, d - 0.3, s * (w / 2 - 0.06), eave / 2 + 0.6, 0));
      // 山花（三角）
      const sh = new T.Shape();
      sh.moveTo(-d / 2 + 0.15, 0); sh.lineTo(d / 2 - 0.15, 0);
      sh.lineTo(0, (d / 2) * 0.62); sh.closePath();
      const sg = new T.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: false });
      sg.rotateY(Math.PI / 2);
      sg.translate(s * (w / 2 - 0.06), eave + 0.58, 0);
      bag.add(wallMat, sg);
    });

    // 门窗
    const doorW = o.doorW || Math.min(1.9, w * 0.24);
    if (!o.openFront) {
      const dh = eave * 0.66;
      bag.add(QM.MAT.woodDark, QM.geo.box(doorW, dh, 0.1, 0, 0.62 + dh / 2, d / 2 + 0.0));
      bag.add(QM.MAT.woodDark, QM.geo.box(0.14, dh + 0.16, 0.14, -doorW / 2 - 0.07, 0.62 + dh / 2, d / 2 + 0.05));
      bag.add(QM.MAT.woodDark, QM.geo.box(0.14, dh + 0.16, 0.14, doorW / 2 + 0.07, 0.62 + dh / 2, d / 2 + 0.05));
      bag.add(QM.MAT.woodDark, QM.geo.box(doorW + 0.55, 0.16, 0.16, 0, 0.62 + dh + 0.08, d / 2 + 0.05));
      bag.add(QM.MAT.stone, QM.geo.box(doorW + 0.6, 0.16, 0.5, 0, 0.62, d / 2 + 0.2));
      // 两侧大窗：窗框 + 窗棂 + 窗台
      for (let i = 0; i < 2; i++) {
        const x = (i === 0 ? -1 : 1) * (w * 0.29);
        const ww = w * 0.26, wh = eave * 0.38;
        bag.add(QM.MAT.lattice, QM.geo.plane(ww, wh, x, 0.9 + wh / 2 + 0.55, d / 2 + 0.02));
        bag.add(QM.MAT.woodDark, QM.geo.box(ww + 0.16, 0.12, 0.1, x, 0.9 + wh + 0.56, d / 2 + 0.06));
        bag.add(QM.MAT.woodDark, QM.geo.box(ww + 0.16, 0.12, 0.1, x, 0.9 + 0.55, d / 2 + 0.06));
        bag.add(QM.MAT.woodDark, QM.geo.box(0.1, wh + 0.2, 0.1, x - ww / 2 - 0.05, 0.9 + wh / 2 + 0.55, d / 2 + 0.06));
        bag.add(QM.MAT.woodDark, QM.geo.box(0.1, wh + 0.2, 0.1, x + ww / 2 + 0.05, 0.9 + wh / 2 + 0.55, d / 2 + 0.06));
      }
    }

    // 露明木构：檐柱、额枋
    const nPost = Math.max(2, Math.round(w / 2.4));
    for (let i = 0; i <= nPost; i++) {
      const x = -w / 2 + (w / nPost) * i;
      bag.add(QM.MAT.woodDark, QM.geo.box(0.12, eave, 0.12, x, 0.6 + eave / 2, d / 2 + 0.05));
    }
    // 檐底望板（遮住椽间天光）
    bag.add(QM.MAT.woodDark, QM.geo.box(w + 0.7, 0.08, d + 1.05, 0, 0.6 + eave + 0.17, 0));
    // 椽头
    for (let i = 0; i < Math.round(w / 0.55); i++) {
      const x = -w / 2 + 0.3 + i * 0.55;
      bag.add(QM.MAT.woodDark, QM.geo.box(0.1, 0.1, 0.5, x, 0.6 + eave + 0.02, d / 2 + 0.6));
    }

    // 阑额 / 普拍枋
    bag.add(QM.MAT.woodDark, QM.geo.box(w + 0.4, 0.28, 0.3, 0, 0.6 + eave - 0.1, d / 2 - 0.02));
    bag.add(QM.MAT.woodDark, QM.geo.box(w + 0.4, 0.28, 0.3, 0, 0.6 + eave - 0.1, -d / 2 + 0.02));
    bag.add(QM.MAT.wood, QM.geo.box(w + 0.6, 0.2, d + 0.4, 0, 0.6 + eave + 0.02, 0));

    // 屋顶
    let topY = 0.6 + eave + 0.12;
    const roofType = o.roof || 'gable';
    if (storeys === 2) {
      // 腰檐
      const skirt = QM.hipRoof(w + 0.16, d + 0.3, 1.0, 0.62);
      skirt.geom.translate(0, topY, 0);
      bag.add(roofMat, skirt.geom);
      // 二层
      const w2 = w * 0.84, d2 = d * 0.78;
      const h2 = o.eave2 || eave * 0.82;
      bag.add(QM.MAT.stone, QM.geo.box(w2 + 0.5, 0.22, d2 + 0.5, 0, topY + 1.1, 0));
      const nb = Math.max(2, Math.round(w2 / 2.4));
      for (let i = 0; i <= nb; i++) {
        const x = -w2 / 2 + (w2 / nb) * i;
        [d2 / 2 - 0.05, -d2 / 2 + 0.05].forEach(z => {
          bag.add(QM.MAT.woodRed, QM.geo.cyl(0.14, 0.16, h2, 8, x, topY + 1.2 + h2 / 2, z));
        });
      }
      bag.add(wallMat, QM.geo.box(w2, h2 - 0.1, d2, 0, topY + 1.2 + h2 / 2, 0));
      // 二层窗
      for (let i = -1; i <= 1; i++) {
        bag.add(QM.MAT.lattice, QM.geo.plane(w2 * 0.24, h2 * 0.42, i * w2 * 0.3, topY + 1.2 + h2 * 0.55, d2 / 2 + 0.03));
      }
      // 栏杆
      for (let i = 0; i <= Math.round(w2 / 0.7); i++) {
        const x = -w2 / 2 + (w2 / Math.round(w2 / 0.7)) * i;
        bag.add(QM.MAT.woodDark, QM.geo.box(0.08, 0.5, 0.08, x, topY + 1.45, d2 / 2 + 0.15));
      }
      bag.add(QM.MAT.woodDark, QM.geo.box(w2, 0.08, 0.1, 0, topY + 1.7, d2 / 2 + 0.15));
      topY = topY + 1.2 + h2;
      const roof2 = roofType === 'hip' ? QM.hipRoof(w2, d2, o.roofH || 2.3, 0.95) : QM.gableRoof(w2, d2, o.roofH || 2.3, 0.95);
      roof2.geom.translate(0, topY, 0);
      bag.add(roofMat, roof2.geom);
      QM.roofTrim(bag, roof2, w2, d2, { y: topY });
      QM.dougong(bag, w2, d2, topY - 0.75, 2.0);
      topY = topY; // eslint-disable-line
    } else {
      const roof = roofType === 'hip'
        ? QM.hipRoof(w, d, o.roofH || 2.9, o.oh === undefined ? 1.5 : o.oh)
        : QM.gableRoof(w, d, o.roofH || 2.7, o.oh === undefined ? 1.5 : o.oh);
      roof.geom.translate(0, topY, 0);
      bag.add(roofMat, roof.geom);
      QM.roofTrim(bag, roof, w, d, { y: topY });
      if (o.dougong) QM.dougong(bag, w, d, topY - 0.55, 1.9);
      topY += roof.h;
    }

    // 招牌
    if (o.sign && !o.cailou) {
      const tw = Math.min(w * 0.42, 2.45);
      const tex = QM.signTexture(o.sign, { bg: o.signBg || '#e7dcc0', fg: o.signFg || '#241c14', border: o.signBg ? null : '#3a2a18' });
      const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.9 });
      const sy = o.awning ? (0.6 + eave - 0.9) : (0.6 + eave - 0.42);
      const sz = o.awning ? (d / 2 + 1.58) : (d / 2 + 0.2);
      const pl = new T.Mesh(new T.PlaneGeometry(tw, tw * (o.awning ? 0.18 : 0.22)), mat);
      pl.position.set(0, sy, sz);
      g.add(pl);
      bag.add(QM.MAT.woodDark, QM.geo.box(tw + 0.22, tw * (o.awning ? 0.18 : 0.22) + 0.2, 0.12, 0, sy, sz - 0.08));
    }
    // 挑出招幌（垂直于店面的小招牌）
    if (o.openFront && o.sign) {
      const hs = QM.signTexture(o.sign.slice(0, 2), { vertical: true, bg: '#e2d5b4', fg: '#1e1710' });
      const hm = new T.MeshStandardMaterial({ map: hs, roughness: 0.95, side: T.DoubleSide });
      const hp = new T.Mesh(new T.PlaneGeometry(0.42, 1.2), hm);
      hp.position.set(w / 2 - 0.55, 2.75, d / 2 + 1.3);
      hp.rotation.y = Math.PI / 2;
      hp.castShadow = true;
      g.add(hp);
      bag.add(QM.MAT.woodDark, QM.geo.box(0.07, 0.07, 1.7, w / 2 - 0.55, 3.4, d / 2 + 0.55));
      QM.banners.push({ mesh: hp, phase: QM.rr(0, 6.28) });
    }

    // 竖幌
    if (o.banner) {
      const tex = QM.signTexture(o.banner, { vertical: true, bg: o.bannerBg || '#e4d8ba', fg: '#1e1812' });
      const mat = new T.MeshStandardMaterial({ map: tex, roughness: 0.95, side: T.DoubleSide });
      const hgt = Math.min(2.2, 0.5 + o.banner.length * 0.52);
      const b = new T.Mesh(new T.PlaneGeometry(hgt * 0.28, hgt), mat);
      b.position.set(w / 2 - 0.9, 0.6 + eave - 0.9 - hgt / 2, d / 2 + 1.45);
      g.add(b);
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.05, 0.05, hgt + 0.5, 5, w / 2 - 0.9, 0.6 + eave - 0.9 - hgt / 2, d / 2 + 1.5));
      bag.add(QM.MAT.woodDark, QM.geo.box(0.12, 0.12, 1.7, w / 2 - 0.9, 0.6 + eave - 0.2, d / 2 + 0.75));
      if (o.swing) QM.banners.push({ mesh: b, phase: QM.rr(0, 6.28) });
    }
    // 遮阳篷：内缘挂在檐下，向外下斜
    if (o.awning) {
      const half = w * 0.36;
      const zIn = d / 2 + 0.1, yIn = 0.6 + eave - 0.12;
      const zOut = d / 2 + 1.55, yOut = yIn - 0.66;
      const q = [];
      q.push(-half, yIn, zIn, half, yIn, zIn, half, yOut, zOut);
      q.push(-half, yIn, zIn, half, yOut, zOut, -half, yOut, zOut);
      const ag = new T.BufferGeometry();
      ag.setAttribute('position', new T.Float32BufferAttribute(q, 3));
      ag.setAttribute('uv', new T.Float32BufferAttribute([
        0, 1, 1.6, 1, 1.6, 0, 0, 1, 1.6, 0, 0, 0
      ], 2));
      ag.computeVertexNormals();
      bag.add(QM.MAT.awning, ag);
      // 外缘垂帘
      bag.add(QM.MAT.awning, QM.geo.plane(half * 2, 0.22, 0, yOut - 0.11, zOut, 0));
      // 前横杆 + 支柱
      bag.add(QM.MAT.woodDark, QM.geo.box(half * 2 + 0.16, 0.07, 0.07, 0, yOut - 0.01, zOut));
      [-1, 1].forEach(sx => {
        bag.add(QM.MAT.woodDark, QM.geo.cyl(0.045, 0.055, yOut - 0.6, 5, sx * half, 0.6 + (yOut - 0.6) / 2, zOut));
      });
    }
    // 柜台
    if (o.counter) {
      bag.add(QM.MAT.woodDark, QM.geo.box(w * 0.52, 0.9, 0.55, 0, 1.13, d / 2 - 0.55));
      bag.add(QM.MAT.wood, QM.geo.box(w * 0.55, 0.09, 0.68, 0, 1.6, d / 2 - 0.55));
      for (let i = 0; i < 4; i++) {
        bag.add(i % 2 ? QM.MAT.thatch : QM.MAT.stone,
          QM.geo.cyl(0.09, 0.08, 0.2, 6, -w * 0.2 + i * w * 0.13, 1.75, d / 2 - 0.55));
      }
    }
    // 货物：陶罐、竹筐
    if (o.goods) {
      for (let i = 0; i < 7; i++) {
        const x = QM.rr(-w * 0.42, w * 0.42);
        const z = d / 2 - QM.rr(0.3, 1.2);
        if (QM.rand() > 0.5) bag.add(QM.MAT.stone, QM.geo.cyl(0.28, 0.22, 0.5, 8, x, 0.85, z));
        else bag.add(QM.MAT.thatch, QM.geo.cyl(0.34, 0.28, 0.42, 8, x, 0.81, z));
      }
    }
    // 彩楼欢门（酒楼竹架彩帛）
    if (o.cailou) {
      const cw = Math.min(w * 0.62, 6.4), ch = 6.0;
      const zz = d / 2 + 1.5;
      [-cw / 2, cw / 2].forEach(x => {
        bag.add(QM.MAT.woodDark, QM.geo.cyl(0.075, 0.09, ch, 6, x, 0.6 + ch / 2, zz));
        // 斜撑到墙面
        bag.add(QM.MAT.woodDark, QM.beamBetween(
          new T.Vector3(x, 0.6 + ch - 0.1, zz),
          new T.Vector3(x * 1.25, 0.6 + ch - 0.5, d / 2 + 0.1), 0.06, 0.06));
      });
      // 横杆
      [0, -0.85, -1.7].forEach(dy => {
        bag.add(QM.MAT.woodDark, QM.geo.box(cw + 0.3, 0.1, 0.1, 0, 0.6 + ch + dy, zz));
      });
      // 彩帛条（短，只在上横杆）
      const cols = [0x8f3020, 0x22504f, 0xa87a24, 0x4a5a2e, 0x5e3049, 0x9c5a26];
      for (let i = 0; i < 11; i++) {
        const x = -cw / 2 + (cw / 11) * (i + 0.5);
        const m = new T.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.92, side: T.DoubleSide });
        const len = 1.0 + (i * 5 % 4) * 0.22;
        const cloth = new T.PlaneGeometry(0.26, len);
        cloth.translate(0, -len / 2, 0);
        const mesh = new T.Mesh(cloth, m);
        mesh.position.set(x, 0.6 + ch - 0.12, zz - 0.02);
        mesh.castShadow = true;
        g.add(mesh);
      }
      // 彩帛裹杆
      for (let i = 0; i < 4; i++) {
        const m = new T.MeshStandardMaterial({ color: cols[(i + 2) % cols.length], roughness: 0.92, side: T.DoubleSide });
        const band = new T.Mesh(new T.PlaneGeometry(0.62, 0.55), m);
        band.position.set((i % 2 ? 1 : -1) * cw / 2, 0.6 + ch - 1.0 - Math.floor(i / 2) * 1.5, zz + 0.05);
        g.add(band);
      }
      // 顶牌
      const tex = QM.signTexture(o.sign || '正店', { bg: '#5e2620', fg: '#f2e2ba', border: '#d0ae6e' });
      const pm = new T.Mesh(new T.PlaneGeometry(2.3, 0.78), new T.MeshStandardMaterial({ map: tex, roughness: 0.85, side: T.DoubleSide }));
      pm.position.set(0, 0.6 + ch + 0.5, zz + 0.06);
      pm.castShadow = true;
      g.add(pm);
      bag.add(QM.MAT.woodDark, QM.geo.box(2.5, 0.92, 0.08, 0, 0.6 + ch + 0.5, zz - 0.01));
    }

    bag.build(g);
    g.userData.topY = topY;
    return g;
  };

  /* ---------- 茅屋（郊野农舍） ---------- */
  QM.buildFarmhouse = function (o) {
    o = o || {};
    const w = o.w || 7, d = o.d || 5.4, eave = 2.6;
    const g = new T.Group();
    const bag = new Bag();
    bag.add(QM.MAT.stone, QM.geo.box(w + 0.8, 0.35, d + 0.8, 0, 0.18, 0));
    const ncol = Math.max(2, Math.round(w / 2.2));
    for (let i = 0; i <= ncol; i++) {
      const x = -w / 2 + (w / ncol) * i;
      [d / 2 - 0.05, -d / 2 + 0.05].forEach(z => bag.add(QM.MAT.woodDark, QM.geo.cyl(0.13, 0.15, eave, 6, x, eave / 2 + 0.35, z)));
    }
    bag.add(QM.MAT.plaster, QM.geo.box(w - 0.2, eave, 0.2, 0, eave / 2 + 0.35, -d / 2 + 0.07));
    bag.add(QM.MAT.plaster, QM.geo.box(0.2, eave, d - 0.2, -w / 2 + 0.06, eave / 2 + 0.35, 0));
    bag.add(QM.MAT.plaster, QM.geo.box(0.2, eave, d - 0.2, w / 2 - 0.06, eave / 2 + 0.35, 0));
    bag.add(QM.MAT.woodDark, QM.geo.box(1.4, 2.0, 0.14, 0, 1.35, d / 2 - 0.02));
    bag.add(QM.MAT.lattice, QM.geo.plane(1.2, 0.8, w * 0.26, 1.75, d / 2 + 0.02));
    // 草顶
    const roof = QM.gableRoof(w, d, 2.2, 1.0);
    roof.geom.translate(0, 0.35 + eave, 0);
    bag.add(QM.MAT.thatch, roof.geom);
    // 草顶脊
    bag.add(QM.MAT.thatch, QM.geo.box(roof.hw * 2 + 0.2, 0.4, 0.6, 0, 0.35 + eave + 2.25, 0));
    bag.build(g);
    return g;
  };

  /* ---------- 亭 / 摊棚 ---------- */
  QM.buildStall = function (o) {
    o = o || {};
    const w = o.w || 3.6, d = o.d || 2.6, h = o.h || 2.2;
    const g = new T.Group();
    const bag = new Bag();
    const z0 = 0;
    [-w / 2, w / 2].forEach(x => {
      [-d / 2, d / 2].forEach(z => bag.add(QM.MAT.woodDark, QM.geo.cyl(0.05, 0.06, h, 5, x, h / 2, z)));
    });
    bag.add(QM.MAT.awning, QM.geo.plane(w + 0.5, d + 0.6, 0, h + 0.05, 0, -Math.PI / 2));
    // 双坡布顶
    bag.add(QM.MAT.awning, QM.geo.plane(w + 0.6, d * 0.62, 0, h + 0.16, d * 0.26, -Math.PI / 2 + 0.42));
    bag.add(QM.MAT.awning, QM.geo.plane(w + 0.6, d * 0.62, 0, h + 0.16, -d * 0.26, -Math.PI / 2 - 0.42));
    // 案板
    bag.add(QM.MAT.woodDark, QM.geo.box(w * 0.8, 0.1, d * 0.55, 0, h * 0.62, 0));
    bag.add(QM.MAT.wood, QM.geo.box(w * 0.78, 0.7, 0.12, 0, h * 0.3, -d * 0.2));
    bag.build(g);
    return g;
  };

  /* ---------- 大伞（市井遮阳伞） ---------- */
  QM.buildParasol = function (color, size) {
    const g = new T.Group();
    const s = size || 1.0;
    const pole = new T.Mesh(QM.white(new T.CylinderGeometry(0.05, 0.06, 2.6 * s, 5)), QM.MAT.woodDark);
    pole.position.y = 1.3 * s;
    pole.castShadow = true;
    g.add(pole);
    const canopyMat = new T.MeshStandardMaterial({ color: color || 0xb9a274, roughness: 0.96, side: T.DoubleSide });
    const canopy = new T.Mesh(new T.ConeGeometry(1.15 * s, 0.95 * s, 12, 1, true), canopyMat);
    canopy.position.y = 2.35 * s;
    canopy.castShadow = true;
    g.add(canopy);
    const rim = new T.Mesh(QM.white(new T.TorusGeometry(1.13 * s, 0.03, 4, 14)), QM.MAT.woodDark);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 2.03 * s;
    g.add(rim);
    return g;
  };

  QM.banners = QM.banners || [];

  /* ---------- 城门与城墙 ---------- */
  QM.buildGate = function (scene) {
    const gx = QM.CFG.gateX, gz = QM.streetZ(gx);
    const grp = new T.Group();
    const bag = new Bag();
    const wallH = 12.5, thick = 11, span = 34;

    // 城墙主体（沿 Z 方向延伸），用挤出的带洞门台 + 两翼墙
    const shape = new T.Shape();
    shape.moveTo(-span / 2, 0);
    shape.lineTo(span / 2, 0);
    shape.lineTo(span / 2, wallH);
    shape.lineTo(-span / 2, wallH);
    shape.closePath();
    // 门洞
    const gw = 5.2, gh = 5.4, arch = 2.6;
    const hole = new T.Path();
    hole.moveTo(gz - gw, 0);
    hole.lineTo(gz - gw, gh);
    hole.absarc(gz, gh, gw, Math.PI, 0, true);
    hole.lineTo(gz + gw, 0);
    hole.closePath();
    shape.holes.push(hole);
    const gateGeo = new T.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 12 });
    // shape x -> z, extrude z -> x
    gateGeo.rotateY(-Math.PI / 2);
    gateGeo.translate(gx + thick / 2, 0, 0);
    bag.add(QM.MAT.brickWall, gateGeo);

    // 门洞内壁暗色（隧道感）
    bag.add(QM.MAT.dark, QM.geo.box(thick - 2, gh + arch - 0.4, gw * 2, gx + thick / 2, (gh + arch) / 2, gz));
    // 门扇（向内半开）
    [-1, 1].forEach(s => {
      const leaf = QM.geo.box(0.22, gh * 0.96, gw * 0.9, 0, 0, 0);
      const q = new T.Quaternion().setFromEuler(new T.Euler(0, s * 0.5, 0));
      const mtx = new T.Matrix4().compose(
        new T.Vector3(gx + 1.8, gh * 0.48, gz + s * gw * 0.98), q, new T.Vector3(1, 1, 1));
      leaf.applyMatrix4(mtx);
      bag.add(QM.MAT.woodDark, leaf);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          bag.add(QM.MAT.metal, QM.geo.sphere(0.1, gx + 1.68, 1 + i * 1.4, gz + s * (0.7 + j * 1.0)));
        }
      }
    });
    // 门额石
    bag.add(QM.MAT.stone, QM.geo.box(thick + 0.6, 0.5, gw * 2 + 1.6, gx + thick / 2, gh + arch + 0.3, gz));

    // 版筑夯土横带（城台质感）
    const bandMat = new T.MeshStandardMaterial({ color: 0x6e6450, roughness: 0.98 });
    const bxW = gx - thick / 2, bxE = gx + thick / 2;
    for (let y = 1.0; y < wallH - 0.4; y += 0.85) {
      const lip = 0.06;
      const aboveArch = y > gh + arch - 0.2;
      [bxW, bxE].forEach(bx => {
        if (aboveArch) {
          bag.add(bandMat, QM.geo.box(0.08, 0.12, span, bx, y, 0));
        } else {
          const leftLen = (gz - gw - 0.4) - (-span / 2);
          const rightStart = gz + gw + 0.4;
          const rightLen = (span / 2) - rightStart;
          if (leftLen > 0.5) bag.add(bandMat, QM.geo.box(0.08, 0.12, leftLen, bx, y, -span / 2 + leftLen / 2));
          if (rightLen > 0.5) bag.add(bandMat, QM.geo.box(0.08, 0.12, rightLen, bx, y, rightStart + rightLen / 2));
        }
      });
    }
    // 城台石脚
    [-1, 1].forEach(sx => {
      bag.add(QM.MAT.stone, QM.geo.box(0.4, 1.0, span - 1, gx + sx * (thick / 2 + 0.12), 0.5, 0));
    });
    bag.add(QM.MAT.stone, QM.geo.box(thick + 0.9, 0.9, span - 1, gx, 0.45, 0));

    // 女墙
    for (let i = 0; i < 26; i++) {
      const z = gz - span / 2 + 1.2 + i * (span / 26);
      if (Math.abs(z - gz) < gw + 1.2) continue;
      bag.add(QM.MAT.brickWall, QM.geo.box(thick * 0.7, 1.05, 1.0, gx + thick / 2, wallH + 0.5, z));
    }
    bag.add(QM.MAT.brick, QM.geo.box(thick * 0.7, 0.55, span, gx + thick / 2, wallH + 0.16, 0));

    // 城台顶面 + 城楼
    bag.add(QM.MAT.stone, QM.geo.box(thick + 1.2, 0.5, span - 3, gx + thick / 2, wallH + 0.25, 0));
    const towerW = 15, towerD = 9, th = 3.6, ty = wallH + 0.5;
    // 城楼台基
    bag.add(QM.MAT.stone, QM.geo.box(towerW + 1.2, 0.6, towerD + 1.2, gx + thick / 2, ty + 0.3, 0));
    const nb = 6;
    for (let i = 0; i <= nb; i++) {
      const x = -towerW / 2 + (towerW / nb) * i;
      [-towerD / 2 + 0.2, towerD / 2 - 0.2].forEach(z => {
        bag.add(QM.MAT.woodRed, QM.geo.cyl(0.2, 0.22, th, 8, gx + thick / 2 + x, ty + 0.6 + th / 2, z));
      });
    }
    bag.add(QM.MAT.plaster, QM.geo.box(towerW - 0.4, th, 0.3, gx + thick / 2, ty + 0.6 + th / 2, -towerD / 2 + 0.2));
    for (let i = -1; i <= 1; i++) {
      bag.add(QM.MAT.lattice, QM.geo.plane(2.2, 1.8, gx + thick / 2 + i * 3.6, ty + 0.6 + th * 0.52, towerD / 2 + 0.02));
    }
    // 栏杆
    for (let i = 0; i <= 20; i++) {
      const x = -towerW / 2 - 0.4 + (towerW + 0.8) * i / 20;
      bag.add(QM.MAT.woodRed, QM.geo.box(0.1, 0.7, 0.1, gx + thick / 2 + x, ty + 1.0, towerD / 2 + 0.4));
    }
    bag.add(QM.MAT.woodRed, QM.geo.box(towerW + 1, 0.1, 0.12, gx + thick / 2, ty + 1.36, towerD / 2 + 0.4));
    // 檐下斗拱
    QM.dougong(bag, towerW, towerD, ty + 0.6 + th, 2.2);

    // 屋顶（庑殿）
    const roof = QM.hipRoof(towerW, towerD, 4.4, 1.8);
    roof.geom.translate(gx + thick / 2, ty + 0.6 + th + 0.35, 0);
    bag.add(QM.MAT.roofDark, roof.geom);
    QM.roofTrim(bag, roof, towerW, towerD, { y: ty + 0.6 + th + 0.35 });
    // 匾额
    const tex = QM.signTexture('東角子門', { bg: '#3a2a20', fg: '#e8d19a', border: '#b08a4a' });
    const plaque = new T.Mesh(new T.PlaneGeometry(4.2, 1.3), new T.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    plaque.position.set(gx + thick / 2, ty + 0.6 + th - 0.55, towerD / 2 + 0.12);
    grp.add(plaque);

    // 两翼城墙（渐远）
    [-1, 1].forEach(s => {
      for (let i = 0; i < 9; i++) {
        const z = s * (span / 2 + i * 22);
        const hh = wallH * (1 - i * 0.02);
        bag.add(QM.MAT.brickWall, QM.geo.box(thick, hh, 22.2, gx + thick / 2, hh / 2 - 0.1, z));
        for (let k = 0; k < 8; k++) {
          bag.add(QM.MAT.brickWall, QM.geo.box(thick * 0.6, 1.0, 1.0, gx + thick / 2, hh + 0.5, z - 9 + k * 2.6));
        }
      }
    });
    bag.build(grp);
    grp.position.y = 0;
    scene.add(grp);

    // 门楼灯笼杆
    const bannerGroup = new T.Group();
    const pole = new T.Mesh(QM.white(new T.CylinderGeometry(0.08, 0.1, 8, 6)), QM.MAT.woodDark);
    pole.position.set(gx + thick - 1, wallH + 4, gz + span / 2 - 2);
    bannerGroup.add(pole);
    scene.add(bannerGroup);
    return grp;
  };

})(window.QM);
