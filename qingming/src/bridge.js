/* 清明上河图 · 虹桥（无柱木拱桥） */
(function (QM) {
  'use strict';
  const T = THREE;

  const B = {
    x: 24,
    z0: 6.5,
    z1: 43.5,
    width: 7.8,
    rise: 7.6,
    base: 2.2
  };
  B.angle = 0.17;                       // 斜跨汴河（约 10°）
  // 桥上局部坐标 (z, 横向偏移 off) → 世界坐标
  B.world = function (z, off) {
    const a = B.angle, c = Math.cos(a), s2 = Math.sin(a);
    return {
      x: B.x + off * c + z * s2,
      z: -off * s2 + z * c
    };
  };
  B.y = function (z) {
    const t = QM.clamp((z - B.z0) / (B.z1 - B.z0), 0, 1);
    return B.base + B.rise * Math.pow(Math.sin(Math.PI * t), 0.86);
  };
  // 含两端引桥的行人落脚高度
  B.pathY = function (z) {
    if (z >= B.z0 && z <= B.z1) return B.y(z);
    if (z < B.z0) {
      const k = QM.clamp((B.z0 - z) / 4.2, 0, 1);
      return QM.lerp(B.y(B.z0), 0.62, k);
    }
    const k = QM.clamp((z - B.z1) / 4.2, 0, 1);
    return QM.lerp(B.y(B.z1), 0.62, k);
  };
  QM.bridge = B;

  QM.buildBridge = function (scene) {
    const g = new T.Group();
    const bag = new QM.Bag();
    const hw = B.width / 2;
    const zA = B.z0 + 1.0, zB = B.z1 - 1.0;
    const N = 30;

    /* 桥面：木板条 */
    const deckMat = new T.MeshStandardMaterial({ map: QM.TEX.planks, color: 0xb0936c, roughness: 0.9 });
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const z = QM.lerp(zA, zB, i / N);
      const y = B.y(z);
      pos.push(-hw, y, z, hw, y, z);
      uvs.push(0, i * 0.26, 1.7, i * 0.26);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const deckGeo = new T.BufferGeometry();
    deckGeo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    deckGeo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    deckGeo.setIndex(idx);
    deckGeo.computeVertexNormals();
    const deck = new T.Mesh(deckGeo, deckMat);
    deck.receiveShadow = true; deck.castShadow = true;
    g.add(deck);

    // 桥面板厚 + 侧封板
    const posU = [], idxU = [];
    for (let i = 0; i <= N; i++) {
      const z = QM.lerp(zA, zB, i / N);
      const y = B.y(z);
      posU.push(-hw - 0.02, y - 0.42, z, -hw - 0.02, y, z);
      posU.push(hw + 0.02, y - 0.42, z, hw + 0.02, y, z);
    }
    const gU = new T.BufferGeometry();
    gU.setAttribute('position', new T.Float32BufferAttribute(posU, 3));
    gU.computeVertexNormals();
    bag.add(QM.MAT.woodDark, gU);

    // 桥头挡板
    bag.add(QM.MAT.woodDark, QM.geo.box(B.width + 0.3, 0.5, 0.5, 0, B.y(zA) - 0.2, zA));

    /* 木拱：多点折线拱肋（编木拱意象） */
    const ribX = [-hw + 0.85, -2.6, 2.6, hw - 0.85];
    ribX.forEach((rx, ri) => {
      const pts = [];
      for (let i = 0; i <= 22; i++) {
        const z = QM.lerp(zA + 0.5, zB - 0.5, i / 22);
        pts.push(new T.Vector3(rx, B.y(z) - 0.55, z));
      }
      // 主拱木（粗）
      for (let i = 0; i < pts.length - 1; i++) {
        bag.add(QM.MAT.woodDark, QM.beamBetween(pts[i], pts[i + 1], 0.34, 0.42));
      }
      // 上下副拱 + 斜撑（交错编织）
      for (let i = 0; i < pts.length - 1; i++) {
        const p = pts[i], q = pts[i + 1];
        const a = p.clone().add(new T.Vector3(0, -1.45, 0));
        const b = q.clone().add(new T.Vector3(0, -1.45, 0));
        bag.add(QM.MAT.woodDark, QM.beamBetween(a, b, 0.26, 0.3));
        if (i % 2 === 0) {
          bag.add(QM.MAT.wood, QM.beamBetween(p, q.clone().add(new T.Vector3(0, -1.45, 0)), 0.2, 0.24));
        } else {
          bag.add(QM.MAT.wood, QM.beamBetween(p.clone().add(new T.Vector3(0, -1.45, 0)), q, 0.2, 0.24));
        }
        if (i % 3 === 0) bag.add(QM.MAT.wood, QM.beamBetween(p.clone().add(new T.Vector3(0, -0.5, 0)), q.clone().add(new T.Vector3(0, -1.0, 0)), 0.16, 0.2));
      }
      // 拱脚石
      bag.add(QM.MAT.stone, QM.geo.box(1.0, 1.6, 1.4, rx, B.base - 1.2, zA + 0.2));
      bag.add(QM.MAT.stone, QM.geo.box(1.0, 1.6, 1.4, rx, B.base - 1.2, zB - 0.2));
    });

    // 横向联系梁
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const z = QM.lerp(zA + 1, zB - 1, t);
      const y = B.y(z) - 0.75;
      bag.add(QM.MAT.woodDark, QM.geo.box(B.width - 1.4, 0.24, 0.24, 0, y, z));
      bag.add(QM.MAT.wood, QM.geo.box(B.width - 2.2, 0.14, 0.16, 0, y - 1.1, z));
    }

    /* 栏杆 */
    const posts = Math.round((zB - zA) / 1.25);
    for (let s = -1; s <= 1; s += 2) {
      const x = s * (hw - 0.25);
      for (let i = 0; i <= posts; i++) {
        const z = QM.lerp(zA, zB, i / posts);
        const y = B.y(z);
        bag.add(QM.MAT.woodDark, QM.geo.box(0.16, 1.1, 0.16, x, y + 0.55, z));
        bag.add(QM.MAT.wood, QM.geo.box(0.2, 0.1, 0.2, x, y + 1.12, z));
      }
      for (let i = 0; i < posts; i++) {
        const z1 = QM.lerp(zA, zB, i / posts), z2 = QM.lerp(zA, zB, (i + 1) / posts);
        const p1 = new T.Vector3(x, B.y(z1) + 1.06, z1);
        const p2 = new T.Vector3(x, B.y(z2) + 1.06, z2);
        bag.add(QM.MAT.woodRed, QM.beamBetween(p1, p2, 0.12, 0.15));
        const p3 = new T.Vector3(x, B.y(z1) + 0.55, z1);
        const p4 = new T.Vector3(x, B.y(z2) + 0.55, z2);
        bag.add(QM.MAT.woodDark, QM.beamBetween(p3, p4, 0.08, 0.1));
      }
    }

    /* 桥头石阶与翼墙 */
    [-1, 1].forEach(s => {
      const z = s < 0 ? B.z0 + 1.4 : B.z1 - 1.4;
      bag.add(QM.MAT.stone, QM.geo.box(B.width + 2.2, 1.6, 3.2, 0, 0.35, z + s * 1.2));
    });

    // 引桥坡道
    [-1, 1].forEach(s => {
      const zEnd = s < 0 ? B.z0 : B.z1;
      const zFar = s < 0 ? B.z0 - 4.2 : B.z1 + 4.2;
      const yFar = 0.62;
      const pts = [], uvs = [], ids = [];
      const M = 8;
      for (let i = 0; i <= M; i++) {
        const k = i / M;
        const z = QM.lerp(zEnd, zFar, k);
        const y = QM.lerp(B.y(zEnd), yFar, k);
        pts.push(-hw, y, z, hw, y, z);
        uvs.push(0, k * 2, 1, k * 2);
      }
      for (let i = 0; i < M; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        ids.push(a, c, b, b, c, d);
      }
      const rg = new T.BufferGeometry();
      rg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      rg.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
      rg.setIndex(ids);
      rg.computeVertexNormals();
      const rm = new T.Mesh(QM.white(rg), QM.MAT.paving);
      rm.receiveShadow = true;
      g.add(rm);
      // 坡道侧墙
      for (const sx of [-hw, hw]) {
        const side = [];
        for (let i = 0; i <= M; i++) {
          const k = i / M;
          const z = QM.lerp(zEnd, zFar, k);
          const y = QM.lerp(B.y(zEnd), yFar, k);
          side.push(sx, y, z, sx, 0.3, z);
        }
        const sg = new T.BufferGeometry();
        sg.setAttribute('position', new T.Float32BufferAttribute(side, 3));
        sg.computeVertexNormals();
        bag.add(QM.MAT.stone, sg);
      }
    });

    bag.build(g);

    // 桥头华表（十字木表，画中虹桥标志物）
    const biaos = new QM.Bag();
    [[-1, 0], [1, 0]].forEach(([sx]) => {
      [B.z0 - 1.6, B.z1 + 1.6].forEach(pz => {
        const bx = sx * (hw + 2.6);
        biaos.add(QM.MAT.woodDark, QM.geo.cyl(0.11, 0.14, 7.6, 8, bx, 4.0, pz));
        biaos.add(QM.MAT.woodDark, QM.geo.box(2.0, 0.13, 0.13, bx, 7.05, pz));
        biaos.add(QM.MAT.woodDark, QM.geo.box(0.13, 0.13, 2.0, bx, 6.55, pz));
        biaos.add(QM.MAT.wood, QM.geo.box(0.5, 0.9, 0.12, bx, 5.6, pz));
        biaos.add(QM.MAT.woodDark, QM.geo.cyl(0.22, 0.26, 0.3, 8, bx, 0.4, pz));
      });
    });
    biaos.build(g);

    // 桥中摊位与伞（市井）
    const stallSpots = [
      [-2.8, 11.0], [2.6, 11.6], [-2.6, 38.4], [2.8, 37.8]
    ];
    stallSpots.forEach((sp, i) => {
      const z = sp[1], x = sp[0];
      const y = B.y(z);
      const parasol = QM.buildParasol([0xb9a274, 0x9c875c, 0xc4ad80][i % 3], 0.85);
      parasol.position.set(x, y, z);
      g.add(parasol);
      const stall = QM.buildStall({ w: 1.9, d: 1.5, h: 1.35 });
      stall.position.set(x, y + 0.05, z);
      stall.rotation.y = QM.rr(-0.3, 0.3);
      g.add(stall);
    });


    // 斜桥两端引道：与北岸石板路、南岸土路衔接（按 B.world 偏移）
    const apronMat = new T.MeshStandardMaterial({ map: QM.TEX.paving, color: 0x9a8f78, roughness: 0.96 });
    function apron(zIn, zOut, halfW, yIn, yOut, mat) {
      const NZ = 10, NX = 4;
      const pos = [], uv = [], idx = [];
      for (let j = 0; j <= NZ; j++) {
        const t = j / NZ;
        const z = QM.lerp(zIn, zOut, t);
        const y = QM.lerp(yIn, yOut, t * t * (3 - 2 * t));
        for (let i = 0; i <= NX; i++) {
          const off = (i / NX - 0.5) * 2 * halfW;
          const wpt = B.world(z, off);
          // 外侧两列贴地形，避免悬空
          const edge = Math.abs(i / NX - 0.5) > 0.36 ? 0.85 : 1;
          const yy = QM.lerp(y, Math.min(y, QM.heightAt(wpt.x, wpt.z) + 0.02), edge * (1 - t) * 0.6);
          pos.push(wpt.x, yy, wpt.z);
          uv.push(i / NX, t);
        }
      }
      for (let j = 0; j < NZ; j++) {
        for (let i = 0; i < NX; i++) {
          const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const g2 = new T.BufferGeometry();
      g2.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g2.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      g2.setIndex(idx);
      g2.computeVertexNormals();
      const m = new T.Mesh(g2, mat || apronMat);
      m.receiveShadow = true;
      return m;
    }

    g.position.x = B.x;
    g.position.y = 0;
    g.rotation.y = B.angle;
    scene.add(g);

    // 引道铺面（世界坐标，不随桥旋转）
    scene.add(apron(B.z0 - 4.2, -3.6, hw + 0.8, 0.62, QM.CFG.streetY - 0.005));
    scene.add(apron(B.z1 + 4.2, 55.5, hw + 1.4, 0.62, QM.heightAt(B.x + 55.5 * Math.sin(B.angle), 55.5) + 0.02,
      new T.MeshStandardMaterial({ color: 0x9d8f6c, roughness: 1.0 })));
    QM.bridgeGroup = g;

    // 桥头旗杆（酒旗）
    const pg = new T.Group();
    const pole = new QM.Bag();
    pole.add(QM.MAT.woodDark, QM.geo.cyl(0.1, 0.13, 9, 6, 0, 4.5, 0));
    pole.add(QM.MAT.woodDark, QM.geo.box(0.1, 0.1, 3.2, 0, 8.2, 1.4));
    const flagMat = new T.MeshStandardMaterial({
      map: QM.signTexture('新酒', { vertical: true, bg: '#5d6a52', fg: '#f0e6c8' }),
      side: T.DoubleSide, roughness: 0.95
    });
    const flag = new T.Mesh(new T.PlaneGeometry(1.2, 3.0), flagMat);
    flag.position.set(0, 6.6, 1.1);
    pg.add(flag);
    QM.banners.push({ mesh: flag, phase: 1.2 });
    pole.build(pg);
    pg.position.set(B.x - hw - 3.4, 0.45, B.z0 + 4.0);
    scene.add(pg);

    return g;
  };

})(window.QM);
