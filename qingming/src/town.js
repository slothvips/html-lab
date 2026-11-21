/* 清明上河图 · 街市布局：店铺 / 酒楼 / 摊位 / 农舍 */
(function (QM) {
  'use strict';
  const T = THREE;

  const SIGNS = ['王家紙馬', '趙家藥鋪', '香藥', '李家茶坊', '張家酒', '餅店', '肉鋪', '布帛',
    '紙札', '飲子', '香鋪', '劉家香藥', '腳店', '雜貨', '米鋪', '木器', '成衣', '鞍轡'];

  function stallCluster(scene, x, z, rotY) {
    const g = new T.Group();
    const parasol = QM.buildParasol(QM.pick([0xe0d3ad, 0xc9b48c, 0xd9c39a]), QM.rr(0.9, 1.2));
    parasol.position.set(0, 0, 0);
    g.add(parasol);
    const table = new QM.Bag();
    table.add(QM.MAT.woodDark, QM.geo.box(2.0, 0.1, 1.0, 0, 0.85, 0));
    table.add(QM.MAT.wood, QM.geo.box(0.1, 0.85, 0.1, -0.85, 0.42, 0.4));
    table.add(QM.MAT.wood, QM.geo.box(0.1, 0.85, 0.1, 0.85, 0.42, 0.4));
    table.add(QM.MAT.wood, QM.geo.box(0.1, 0.85, 0.1, -0.85, 0.42, -0.4));
    table.add(QM.MAT.wood, QM.geo.box(0.1, 0.85, 0.1, 0.85, 0.42, -0.4));
    // 货品
    for (let i = 0; i < 5; i++) {
      table.add(QM.rand() > 0.5 ? QM.MAT.thatch : QM.MAT.stone, QM.geo.cyl(0.16, 0.13, 0.22, 7, QM.rr(-0.8, 0.8), 1.0, QM.rr(-0.3, 0.3)));
    }
    table.build(g);
    // 摊主
    const seller = QM.makePerson({ colorIdx: QM.ri(0, 9), hat: 'jin', amp: 0.25, pose: QM.pick(['fold', 'carry', 'lean']) });
    seller.position.set(-1.5, 0, -0.6);
    seller.rotation.y = 0.9;
    g.add(seller);
    g.userData.seller = seller;
    g.position.set(x, QM.heightAt(x, z), z);
    g.rotation.y = rotY || 0;
    scene.add(g);
    return g;
  }

  QM.buildTown = function (scene) {
    const streetZ = QM.streetZ;
    const placed = [];
    const rowY = 0.50;

    // 地标（自西向东）
    const landmarks = [
      {
        x: -132, w: 9, d: 7, eave: 3.2, storeys: 1, sign: '茶', openFront: true, awning: true,
        banner: '茶', goods: true, counter: true
      },
      {
        x: -96, w: 10, d: 7.5, eave: 3.6, storeys: 1, sign: '王家紙馬', openFront: true, awning: true, goods: true, counter: true
      },
      {
        x: -58, w: 11, d: 8, eave: 3.5, storeys: 2, sign: '十千腳店', cailou: true, openFront: true,
        banner: '新酒', goods: true, roofH: 2.5, counter: true
      },
      {
        x: -22, w: 9, d: 7, eave: 3.4, storeys: 1, sign: '趙家藥鋪', openFront: true, goods: true, awning: true, counter: true
      },
      {
        x: 44, w: 8.5, d: 6.5, eave: 3.2, storeys: 1, sign: '腳店', openFront: true, awning: true, goods: true, counter: true
      },
      {
        x: 62, w: 10, d: 7.5, eave: 3.5, storeys: 2, sign: '劉家上色沉檀揀香', openFront: true, roofH: 2.4
      },
      {
        x: 96, w: 12, d: 8, eave: 3.8, storeys: 2, sign: '孫羊正店', cailou: true, openFront: true, banner: '正店', roofH: 2.6, counter: true, goods: true
      },
      {
        x: 130, w: 9, d: 7, eave: 3.3, storeys: 1, sign: '王家羅明匹帛鋪', openFront: true, goods: true, awning: true, counter: true
      },
      {
        x: 158, w: 10, d: 7.5, eave: 3.6, storeys: 2, sign: '久住王員外家', openFront: false, roofH: 2.4
      },
      {
        x: 188, w: 9, d: 7, eave: 3.4, storeys: 1, sign: '趙太丞家', openFront: true, awning: true, counter: true, goods: true
      },
      {
        x: 214, w: 8, d: 6.5, eave: 3.2, storeys: 1, sign: '香藥', openFront: true, goods: true, awning: true, counter: true
      }
    ];

    landmarks.forEach((L, i) => {
      const z0 = streetZ(L.x) - QM.CFG.streetHalf - 0.7 - L.d / 2;
      const h = QM.buildHouse({
        w: L.w, d: L.d, eave: L.eave, storeys: L.storeys, roofH: L.roofH,
        roof: i % 4 === 2 ? 'hip' : 'gable',
        sign: L.sign, banner: L.banner, openFront: L.openFront, awning: L.awning,
        cailou: L.cailou, goods: L.goods, counter: L.openFront, swing: true,
        wallMat: i % 3 === 0 ? QM.MAT.plaster : QM.MAT.plaster, colMat: QM.MAT.wood
      });
      h.position.set(L.x, rowY, z0);
      h.rotation.y = QM.rr(-0.015, 0.015);
      scene.add(h);
      placed.push([L.x - L.w / 2 - 0.8, L.x + L.w / 2 + 0.8]);

      // 门前摊位
      if (i % 2 === 0) stallCluster(scene, L.x + L.w / 2 + QM.rr(1.5, 3), streetZ(L.x) + QM.rr(3, 5), QM.rr(-0.4, 0.4));
    });

    // 补白：沿街小铺（铺面相连，不重叠）
    const spans = placed.map(p => [p[0], p[1]]);
    let fx = -164;
    while (fx < 242) {
      const w = QM.rr(7.2, 8.6), d = QM.rr(5.5, 7.5);
      const cx = fx + w / 2;
      const clash = spans.some(sp => cx + w / 2 > sp[0] && cx - w / 2 < sp[1]);
      if (clash || Math.abs(cx - QM.CFG.bridgeX) < 16) { fx += 1.6; continue; }
      const storeys = 1;
      const h = QM.buildHouse({
        w, d, eave: QM.rr(3.0, 3.6), storeys,
        roof: QM.rand() < 0.25 ? 'hip' : 'gable',
        sign: QM.rand() < 0.72 ? QM.pick(SIGNS) : null,
        openFront: QM.rand() < 0.94,
        awning: QM.rand() < 0.68,
        goods: QM.rand() < 0.55,
        counter: true,
        banner: QM.rand() < 0.28 ? QM.pick(['酒', '茶', '香', '藥', '米', '布']) : null,
        swing: true
      });
      h.position.set(cx, rowY, streetZ(cx) - QM.CFG.streetHalf - 0.7 - d / 2);
      h.rotation.y = QM.rr(-0.012, 0.012);
      scene.add(h);
      spans.push([cx - w / 2 - 0.1, cx + w / 2 + 0.1]);
      fx = cx + w / 2 + 0.15;
    }

    // 第二排屋舍（增厚街景纵深）
    for (let x = -150; x < 240; x += QM.rr(11, 17)) {
      const w = QM.rr(7, 12), d = QM.rr(6, 9);
      const h = QM.buildHouse({
        w, d, eave: QM.rr(3.2, 4.0), storeys: QM.rand() < 0.25 ? 2 : 1,
        roof: QM.rand() < 0.3 ? 'hip' : 'gable', openFront: false,
        sign: null, goods: false,
        wallMat: QM.rand() < 0.55 ? QM.MAT.woodWall : QM.MAT.plaster
      });
      h.position.set(x, rowY + QM.rr(0, 0.5), streetZ(x) - 24 - d / 2 - QM.rr(0, 6));
      h.rotation.y = QM.rr(-0.05, 0.05);
      scene.add(h);
    }

    // 街边摊（伞、案、货）
    for (let x = -150; x < 244; x += QM.rr(10, 18)) {
      if (Math.abs(x - QM.CFG.bridgeX) < 14) continue;
      const side = QM.rand() < 0.5 ? -1 : 1;
      stallCluster(scene, x, QM.streetZ(x) + side * (QM.CFG.streetHalf - 0.9), QM.rr(-0.5, 0.5));
    }

    // 街南岸：货堆、木箱、陶瓮（合并为单网格）
    const crateG = [], jarG = [];
    for (let x = -150; x < 250; x += QM.rr(5, 9)) {
      const z = QM.streetZ(x) + QM.CFG.streetHalf + QM.rr(1.2, 5.5);
      const r = QM.rand();
      if (r < 0.4) {
        crateG.push(QM.geo.box(0.8, 0.55, 0.7, x, 0.8, z));
        crateG.push(QM.geo.box(0.66, 0.42, 0.6, x + 0.1, 1.28, z + 0.05));
      } else if (r < 0.7) {
        for (let k = 0; k < 3; k++) jarG.push(QM.geo.cyl(0.26, 0.2, 0.5, 8, x + (k % 2) * 0.5, 0.72, z + Math.floor(k / 2) * 0.5));
      } else {
        jarG.push(QM.geo.cyl(0.9, 1.0, 0.75, 10, x, 0.82, z));
        jarG.push(QM.geo.cyl(0.8, 0.92, 0.55, 10, x + 0.9, 0.72, z + 0.4));
      }
    }
    scene.add(QM.mesh(crateG, QM.MAT.thatch, true, true));
    scene.add(QM.mesh(jarG, QM.MAT.stone, true, true));

    // 河岸边摊棚（沿河市集）
    for (let x = -150; x < 235; x += QM.rr(15, 26)) {
      if (Math.abs(x - QM.CFG.bridgeX) < 20) continue;
      const rz = QM.riverZ(x);
      const st = QM.buildStall({ w: QM.rr(2.6, 3.6), d: 2.2, h: 2.1 });
      st.position.set(x, QM.heightAt(x, rz - 17) + 0.1, rz - 17);
      st.rotation.y = QM.rr(-0.3, 0.3);
      scene.add(st);
      if (QM.rand() < 0.6) stallCluster(scene, x + QM.rr(-2, 2), rz - 16.2, QM.rr(-0.5, 0.5));
    }

    // 算命摊（城门附近，画中"神课""看命""决疑"）
    const fortuneSigns = [
      ['神課', 236, -3.2], ['看命', 241, 3.2], ['決疑', 231, 6.0]
    ];
    fortuneSigns.forEach(f => {
      const g = new T.Group();
      const bag = new QM.Bag();
      bag.add(QM.MAT.woodDark, QM.geo.box(1.9, 0.08, 0.8, 0, 0.82, 0));
      bag.add(QM.MAT.wood, QM.geo.box(0.08, 0.8, 0.08, -0.8, 0.4, 0.3));
      bag.add(QM.MAT.wood, QM.geo.box(0.08, 0.8, 0.08, 0.8, 0.4, 0.3));
      bag.add(QM.MAT.wood, QM.geo.box(0.08, 0.8, 0.08, -0.8, 0.4, -0.3));
      bag.add(QM.MAT.wood, QM.geo.box(0.08, 0.8, 0.08, 0.8, 0.4, -0.3));
      // 招幌（竖布）
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.04, 0.04, 2.6, 4, 0.95, 1.3, 0.2));
      bag.build(g);
      const bannerMat = new T.MeshStandardMaterial({
        map: QM.signTexture(f[0], { vertical: true, bg: '#e3d7b6', fg: '#20180f' }),
        side: T.DoubleSide, roughness: 0.95
      });
      const bn = new T.Mesh(new T.PlaneGeometry(0.52, 1.7), bannerMat);
      bn.position.set(0.95, 1.7, 0.28);
      g.add(bn);
      QM.banners.push({ mesh: bn, phase: QM.rr(0, 6.2) });
      const seer = QM.makePerson({ colorIdx: 2, longRobe: true, hat: 'futou', amp: 0.1 });
      seer.position.set(0, 0, -0.75);
      seer.rotation.y = 0;
      g.add(seer);
      const client = QM.makePerson({ colorIdx: 5, hat: 'jin', amp: 0.1 });
      client.position.set(0.1, 0, 0.8);
      client.rotation.y = Math.PI;
      g.add(client);
      g.position.set(f[1], 0.45, QM.streetZ(f[1]) + f[2]);
      g.rotation.y = QM.rr(-0.2, 0.2);
      scene.add(g);
    });

    // 水井
    const well = new T.Group();
    const wb = new QM.Bag();
    wb.add(QM.MAT.stone, QM.geo.cyl(0.9, 1.0, 0.9, 12, 0, 0.45, 0));
    wb.add(QM.MAT.dark, QM.geo.cyl(0.72, 0.72, 0.1, 12, 0, 0.86, 0));
    wb.add(QM.MAT.woodDark, QM.geo.cyl(0.08, 0.09, 2.1, 5, -0.85, 1.05, 0));
    wb.add(QM.MAT.woodDark, QM.geo.cyl(0.08, 0.09, 2.1, 5, 0.85, 1.05, 0));
    wb.add(QM.MAT.woodDark, QM.geo.box(1.9, 0.1, 0.1, 0, 2.05, 0));
    wb.build(well);
    well.position.set(-12, 0.45, 32);
    scene.add(well);
    stallCluster(scene, -15, 34, 0.4);

    // 轿子（两顶）
    for (let i = 0; i < 2; i++) {
      const g = new T.Group();
      const bag = new QM.Bag();
      bag.add(QM.MAT.woodDark, QM.geo.box(1.5, 0.2, 2.1, 0, 0.75, 0));
      bag.add(QM.MAT.woodRed, QM.geo.box(1.3, 1.15, 1.8, 0, 1.42, 0));
      bag.add(QM.MAT.woodDark, QM.geo.box(1.45, 0.15, 1.95, 0, 2.02, 0));
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.06, 0.06, 4.6, 5, 0, 0.98, 0, 0, 0, Math.PI / 2));
      const roof = QM.hipRoof(1.6, 2.2, 0.65, 0.25);
      roof.geom.translate(0, 2.1, 0);
      bag.add(QM.MAT.woodRed, roof.geom);
      bag.build(g);
      const b1 = QM.makePerson({ colorIdx: 4, hat: 'jin', amp: 1 });
      b1.position.set(0, 0, 1.85); b1.rotation.y = Math.PI;
      const b2 = QM.makePerson({ colorIdx: 4, hat: 'jin', amp: 1 });
      b2.position.set(0, 0, -1.85);
      g.add(b1); g.add(b2);
      g.position.set(-30 + i * 90, 0.45, QM.streetZ(-30 + i * 90) + 2.5);
      scene.add(g);
      QM.walkers.push({ g, kind: 'street', x: -30 + i * 90, zOff: 2.5, dir: 1, speed: 0.55 });
    }

    // 城门内：街市延续
    for (let x = 264; x < 372; x += QM.rr(10, 15)) {
      const w = QM.rr(7, 11), d = QM.rr(6, 9);
      const h = QM.buildHouse({
        w, d, eave: QM.rr(3.2, 4.0), storeys: QM.rand() < 0.3 ? 2 : 1,
        roof: QM.rand() < 0.3 ? 'hip' : 'gable',
        openFront: QM.rand() < 0.88, awning: QM.rand() < 0.62,
        sign: QM.rand() < 0.85 ? QM.pick(SIGNS) : null, goods: QM.rand() < 0.5, counter: true,
        banner: QM.rand() < 0.3 ? QM.pick(['酒', '茶', '香', '藥', '米', '布']) : null,
        swing: true
      });
      h.position.set(x, 0.45, streetZ(x) - QM.CFG.streetHalf - 0.7 - d / 2);
      h.rotation.y = QM.rr(-0.02, 0.02);
      scene.add(h);
      stallCluster(scene, x + QM.rr(3, 6), streetZ(x) + QM.rr(2, 4.5), QM.rr(-0.4, 0.4));
    }

    // 郊野：农舍与柴垛
    const farms = [[-250, -18, 0.3], [-205, 38, -0.2], [-168, -52, 0.1], [-120, 55, 0.4], [-278, 52, 0.2]];
    farms.forEach((f, i) => {
      const h = QM.buildFarmhouse({ w: QM.rr(6, 8), d: QM.rr(4.6, 5.6) });
      h.position.set(f[0], QM.heightAt(f[0], f[1]), f[1]);
      h.rotation.y = f[2];
      scene.add(h);
      // 篱笆
      const fence = [];
      for (let k = 0; k < 12; k++) {
        fence.push(QM.geo.cyl(0.04, 0.05, 1.0, 4, f[0] + 5 + (k % 6) * 0.5, QM.heightAt(f[0], f[1]) + 0.5, f[1] + 4 + Math.floor(k / 6) * 0.6));
      }
      fence.push(QM.geo.box(3.2, 0.06, 0.06, f[0] + 6.2, QM.heightAt(f[0], f[1]) + 0.8, f[1] + 4));
      fence.push(QM.geo.box(3.2, 0.06, 0.06, f[0] + 6.2, QM.heightAt(f[0], f[1]) + 0.45, f[1] + 4));
      const fm = QM.mesh(fence, QM.MAT.woodDark, false, false);
      scene.add(fm);
      // 柴垛
      if (i % 2 === 0) {
        const hay = [];
        hay.push(QM.geo.cyl(1.1, 1.3, 1.6, 9, f[0] - 3, QM.heightAt(f[0], f[1]) + 0.8, f[1] + 3));
        hay.push(QM.geo.sphere(1.15, f[0] - 3, QM.heightAt(f[0], f[1]) + 1.7, f[1] + 3, 1, 0.5, 1));
        scene.add(QM.mesh(hay, QM.MAT.thatch, true, false));
      }
    });

    // 田埂上的稻草人
    for (let i = 0; i < 4; i++) {
      const x = QM.rr(-290, -150), z = QM.rr(50, 100);
      const g = [];
      g.push(QM.geo.cyl(0.05, 0.06, 1.7, 4, x, QM.heightAt(x, z) + 0.85, z));
      g.push(QM.geo.box(1.3, 0.06, 0.06, x, QM.heightAt(x, z) + 1.35, z));
      g.push(QM.geo.box(0.35, 0.5, 0.2, x, QM.heightAt(x, z) + 1.2, z));
      g.push(QM.geo.sphere(0.16, x, QM.heightAt(x, z) + 1.66, z));
      g.push(QM.geo.cyl(0.28, 0.3, 0.12, 8, x, QM.heightAt(x, z) + 1.78, z));
      scene.add(QM.mesh(g, QM.MAT.thatch, true, false));
    }

    // 拴马桩 / 货堆
    for (let i = 0; i < 30; i++) {
      const x = QM.rr(-150, 240), z = QM.streetZ(x) + QM.rr(-8.5, 8.5);
      if (Math.abs(z - QM.streetZ(x)) < 2.5) continue;
      const g = [];
      if (QM.rand() < 0.5) {
        g.push(QM.geo.cyl(0.28, 0.3, 1.1, 6, x, 0.95, z));
      } else {
        g.push(QM.geo.box(0.9, 0.5, 0.7, x, 0.7, z));
        g.push(QM.geo.box(0.7, 0.4, 0.6, x + 0.3, 1.15, z + 0.2));
      }
      scene.add(QM.mesh(g, QM.MAT.thatch, true, false));
    }
  };


  /* ================= 汴河岸：码头 / 缆桩 / 货堆 / 脚夫 ================= */
  QM.buildRiverBank = function (scene) {
    const bag = new QM.Bag();
    const wharves = [-34, 68, 176, 238];
    wharves.forEach((x, wi) => {
      const rz = QM.riverZ(x);
      const zIn = rz - 16.5, zOut = rz - 11.0;
      const wHalf = 4.6;
      const deckY = 0.62;
      // 桩
      for (let i = 0; i < 5; i++) {
        const px = x - wHalf + 0.4 + i * (wHalf * 2 - 0.8) / 4;
        [zOut + 0.2, zIn + 0.3, (zIn + zOut) / 2].forEach(pz => {
          bag.add(QM.MAT.woodDark, QM.geo.cyl(0.14, 0.17, 2.0, 6, px, deckY - 1.0, pz));
        });
      }
      // 台面（横板）
      for (let i = 0; i < 9; i++) {
        const pz = zOut + (zIn - zOut) * (i + 0.5) / 9;
        bag.add(QM.MAT.wharf, QM.geo.box(wHalf * 2, 0.14, (zIn - zOut) / 9 - 0.04, x, deckY, pz));
      }
      // 码头灯杆
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.07, 0.09, 3.2, 6, x + wHalf - 0.5, deckY + 1.6, zOut + 0.6));
      bag.add(QM.MAT.woodDark, QM.geo.box(0.7, 0.08, 0.08, x + wHalf - 0.85, deckY + 3.15, zOut + 0.6));
      bag.add(QM.MAT.lantern, QM.geo.cyl(0.16, 0.16, 0.34, 8, x + wHalf - 1.1, deckY + 2.9, zOut + 0.6));
      bag.add(QM.MAT.woodDark, QM.geo.box(wHalf * 2 + 0.2, 0.24, 0.2, x, deckY - 0.1, zOut));
      // 缆桩
      [-1, 1].forEach(sx => {
        [zOut + 0.5, zIn - 0.5].forEach(pz => {
          bag.add(QM.MAT.woodDark, QM.geo.cyl(0.17, 0.2, 0.85, 7, x + sx * (wHalf - 0.35), deckY + 0.42, pz));
          bag.add(QM.MAT.woodDark, QM.geo.cyl(0.24, 0.24, 0.1, 7, x + sx * (wHalf - 0.35), deckY + 0.84, pz));
        });
      });
      // 货堆
      for (let i = 0; i < 7; i++) {
        const px = x + QM.rr(-wHalf + 0.7, wHalf - 0.7);
        const pz = QM.rr(zIn + 0.8, zIn + 3.2);
        if (i % 3 === 0) bag.add(QM.MAT.thatch, QM.geo.box(0.62, 0.42, 0.5, px, deckY + 0.28, pz));
        else if (i % 3 === 1) bag.add(QM.MAT.stone, QM.geo.cyl(0.24, 0.2, 0.5, 8, px, deckY + 0.32, pz));
        else bag.add(QM.MAT.thatch, QM.geo.cyl(0.3, 0.24, 0.45, 8, px, deckY + 0.3, pz));
      }
      // 系船缆 → 最近船
      let best = null, bd = 1e9;
      QM.boats.forEach(b => {
        const d = Math.abs(b.x - x);
        if (d < bd) { bd = d; best = b; }
      });
      if (best && bd < 16) {
        bag.add(QM.MAT.woodDark, QM.beamBetween(
          new T.Vector3(x + wHalf - 0.35, deckY + 0.8, zOut + 0.5),
          new T.Vector3(best.x + 1.2, 0.9, best.z - 0.5), 0.035, 0.035));
      }
      // 脚夫
      for (let k = 0; k < 3; k++) {
        const p = QM.makePerson({
          colorIdx: 4 + (k % 3), hat: k === 0 ? 'douli' : 'jin',
          amp: 0.35, pose: k === 0 ? 'carry' : 'walk', porter: k === 1
        });
        p.position.set(x + QM.rr(-3, 3), deckY + 0.02, QM.rr(zIn + 0.6, zOut + 3));
        p.rotation.y = QM.rr(0, 6.28);
        scene.add(p);
        QM.walkers.push({ g: p, kind: 'static', phase: QM.rr(0, 6.3) });
      }
      // 跳板
      bag.add(QM.MAT.wood, QM.geo.box(1.1, 0.1, 3.4, x - 1.4, deckY - 0.12, zOut - 1.6, 0.18));
    });

    // 沿河缆桩
    for (let x = -150; x < 250; x += QM.rr(9, 14)) {
      const rz = QM.riverZ(x);
      const z = rz - QM.rr(13.6, 14.4);
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.13, 0.16, 0.9, 6, x, 0.42, z));
      bag.add(QM.MAT.woodDark, QM.geo.cyl(0.2, 0.2, 0.08, 6, x, 0.85, z));
    }
    // 岸边货堆
    for (let x = -150; x < 250; x += QM.rr(8, 16)) {
      const rz = QM.riverZ(x);
      const z = rz - QM.rr(13.8, 15.6);
      if (QM.rand() < 0.5) bag.add(QM.MAT.thatch, QM.geo.box(0.7, 0.5, 0.6, x, 0.55, z));
      else bag.add(QM.MAT.stone, QM.geo.cyl(0.28, 0.22, 0.55, 8, x, 0.6, z));
    }
    bag.build(scene);
  };

})(window.QM);
