/* 清明上河图 · 材质与程序化贴图 */
(function (QM) {
  'use strict';
  const rand = QM.rng(7717);

  /* ---------- 贴图 ---------- */
  const T = {};

  // 瓦面：板瓦垄 + 筒瓦 + 瓦当行
  T.roof = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#5a5f5d';
    ctx.fillRect(0, 0, w, h);
    // 瓦垄（竖向）
    const col = 32;
    for (let x = 0; x < w; x += col) {
      const g = ctx.createLinearGradient(x, 0, x + col, 0);
      g.addColorStop(0, 'rgba(20,24,24,0.55)');
      g.addColorStop(0.25, 'rgba(150,158,152,0.30)');
      g.addColorStop(0.5, 'rgba(190,196,188,0.18)');
      g.addColorStop(0.75, 'rgba(90,96,92,0.25)');
      g.addColorStop(1, 'rgba(20,24,24,0.55)');
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, col, h);
      // 筒瓦接缝（横向）
      for (let y = 0; y < h; y += 26) {
        ctx.fillStyle = 'rgba(18,20,20,0.30)';
        ctx.fillRect(x, y, col, 2);
        ctx.fillStyle = 'rgba(210,214,206,0.10)';
        ctx.fillRect(x, y + 2, col, 2);
      }
    }
    QM.paperGrain(ctx, w, h, 20, rand);
  }, { repeat: [1, 1] });

  // 木纹
  T.wood = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7d5a3a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = rand() * w;
      ctx.strokeStyle = 'rgba(' + (rand() > 0.5 ? '50,32,18' : '160,120,80') + ',' + (0.05 + rand() * 0.16) + ')';
      ctx.lineWidth = 0.6 + rand() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < h; y += 16) ctx.lineTo(x + Math.sin(y * 0.05 + i) * 3, y);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) { // 节疤
      const x = rand() * w, y = rand() * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + rand() * 4, 6 + rand() * 10, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(48,30,16,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    QM.paperGrain(ctx, w, h, 14, rand);
  });

  // 灰泥墙
  T.plaster = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ded4bd';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 8 + rand() * 40, 6 + rand() * 26, rand() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rand() > 0.5 ? 'rgba(198,186,158,0.07)' : 'rgba(250,246,230,0.07)';
      ctx.fill();
    }
    QM.paperGrain(ctx, w, h, 6, rand);
  });

  // 砖墙（城台 / 台基）
  T.brick = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8e8778';
    ctx.fillRect(0, 0, w, h);
    const rh = 32, bw = 64;
    for (let y = 0, row = 0; y < h; y += rh, row++) {
      for (let x = -bw; x < w + bw; x += bw) {
        const ox = (row % 2) * bw * 0.5;
        ctx.fillStyle = 'rgba(' + (120 + rand() * 30) + ',' + (114 + rand() * 28) + ',' + (100 + rand() * 26) + ',1)';
        ctx.fillRect(x + ox + 2, y + 2, bw - 4, rh - 4);
      }
    }
    ctx.strokeStyle = 'rgba(72,66,54,0.35)';
    ctx.lineWidth = 2;
    for (let y = 0; y < h; y += rh) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    QM.paperGrain(ctx, w, h, 22, rand);
  });

  // 石板街面
  T.paving = QM.canvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7e7566';
    ctx.fillRect(0, 0, w, h);
    const rh = 46;
    for (let y = 0, row = 0; y < h; y += rh, row++) {
      const bw = 52 + (row % 3) * 12;
      for (let x = -bw; x < w + bw; x += bw) {
        const ox = (row % 2) * bw * 0.5;
        const c = 108 + rand() * 40;
        ctx.fillStyle = 'rgb(' + (c + 12) + ',' + (c + 2) + ',' + (c - 16) + ')';
        ctx.fillRect(x + ox + 4, y + 4, bw - 8, rh - 8);
        ctx.strokeStyle = 'rgba(60,54,42,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + ox + 4, y + 4, bw - 8, rh - 8);
        ctx.fillStyle = 'rgba(255,250,235,0.05)';
        ctx.fillRect(x + ox + 3, y + 3, bw - 6, 3);
      }
    }
    for (let i = 0; i < 300; i++) { // 土迹
      ctx.fillStyle = 'rgba(' + (105 + rand() * 40) + ',' + (92 + rand() * 30) + ',' + (62 + rand() * 20) + ',' + (0.05 + rand() * 0.12) + ')';
      ctx.beginPath(); ctx.ellipse(rand() * w, rand() * h, 4 + rand() * 26, 3 + rand() * 14, rand() * 3, 0, 6.3); ctx.fill();
    }
    QM.paperGrain(ctx, w, h, 26, rand);
  });

  // 草地 / 土坡
  T.ground = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#9a985f';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const g = 90 + rand() * 90;
      ctx.fillStyle = 'rgba(' + (g * 0.85) + ',' + g + ',' + (g * 0.55) + ',' + (0.08 + rand() * 0.22) + ')';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 4, 1 + rand() * 3);
    }
    for (let i = 0; i < 90; i++) { // 土斑
      ctx.fillStyle = 'rgba(' + (140 + rand() * 30) + ',' + (122 + rand() * 24) + ',' + (88 + rand() * 20) + ',' + (0.06 + rand() * 0.12) + ')';
      ctx.beginPath(); ctx.ellipse(rand() * w, rand() * h, 6 + rand() * 40, 4 + rand() * 22, rand() * 3, 0, 6.3); ctx.fill();
    }
    QM.paperGrain(ctx, w, h, 18, rand);
  });

  // 茅草
  T.thatch = QM.canvasTex(256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#9a8355';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w, y = rand() * h;
      ctx.strokeStyle = 'rgba(' + (120 + rand() * 80) + ',' + (100 + rand() * 60) + ',' + (55 + rand() * 40) + ',' + (0.3 + rand() * 0.5) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 12, y + 10 + rand() * 18); ctx.stroke();
    }
  });

  // 窗棂（直棂 / 格子）
  T.lattice = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a2c1e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9b489';
    const n = 4;
    for (let i = 0; i <= n; i++) {
      ctx.fillRect(i * (w / n) - 2, 0, 4, h);
      ctx.fillRect(0, i * (h / n) - 2, w, 4);
    }
    QM.paperGrain(ctx, w, h, 12, rand);
  });

  // 木板
  T.planks = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(0, 0, w, h);
    const bh = 30;
    for (let y = 0, i = 0; y < h; y += bh, i++) {
      const c = 118 + rand() * 34;
      ctx.fillStyle = 'rgb(' + (c + 20) + ',' + (c - 8) + ',' + (c - 40) + ')';
      ctx.fillRect(0, y + 2, w, bh - 4);
      ctx.fillStyle = 'rgba(46,30,16,0.55)';
      ctx.fillRect(0, y, w, 2.5);
      // 木纹
      for (let k = 0; k < 26; k++) {
        ctx.strokeStyle = 'rgba(70,48,26,' + (0.05 + rand() * 0.16) + ')';
        ctx.lineWidth = 0.8;
        const yy = y + 4 + rand() * (bh - 8);
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.bezierCurveTo(w * 0.3, yy + (rand() - 0.5) * 4, w * 0.7, yy + (rand() - 0.5) * 4, w, yy); ctx.stroke();
      }
      // 钉
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(30,26,20,0.7)';
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(20 + k * 70, y + bh * 0.5, 2.2, 0, 6.3); ctx.fill(); }
      }
    }
    QM.paperGrain(ctx, w, h, 18, rand);
  });
  T.planks.wrapS = T.planks.wrapT = THREE.RepeatWrapping;

  // 条纹布（遮阳篷 / 摊棚）
  T.awning = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#cfbb92';
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = 'rgba(118,84,52,0.5)';
      ctx.fillRect(x + 4, 0, 7, h);
    }
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = 'rgba(90,74,48,' + (0.03 + rand() * 0.06) + ')';
      ctx.fillRect(rand() * w, rand() * h, 10, 1);
    }
  }, { repeat: [1, 1] });
  T.awning.wrapS = T.awning.wrapT = THREE.RepeatWrapping;


  // 叶簇（团块状，带透明边）
  T.leafCluster = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(3131);
    for (let i = 0; i < 210; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.pow(r(), 0.55) * w * 0.46;
      const x = w / 2 + Math.cos(a) * rad;
      const y = h / 2 + Math.sin(a) * rad * 0.92;
      const s = (4 + r() * 9) * (1 - rad / (w * 0.62));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * 6.28);
      ctx.fillStyle = ['#617a35', '#728b40', '#7f9a4a', '#556c2c', '#8aa055'][Math.floor(r() * 5)];
      ctx.globalAlpha = 0.82 + r() * 0.18;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1, s * 0.55), Math.max(1, s), 0, 0, 6.3);
      ctx.fill();
      ctx.restore();
    }
  }, { srgb: true });

  // 松针簇
  T.needle = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(7171);
    for (let i = 0; i < 90; i++) {
      const x = w / 2 + (r() - 0.5) * w * 0.7;
      const y = h / 2 + (r() - 0.5) * h * 0.7;
      const len = 18 + r() * 34;
      ctx.strokeStyle = ['#3c4f2a', '#4a5f30', '#556b38'][Math.floor(r() * 3)];
      ctx.lineWidth = 1 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * len, y + (r() - 0.5) * len);
      ctx.stroke();
    }
  }, { srgb: true });

  // 土斑（软边）
  T.dirtPatch = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.5);
    g.addColorStop(0, 'rgba(108,92,64,0.95)');
    g.addColorStop(0.55, 'rgba(120,102,72,0.7)');
    g.addColorStop(1, 'rgba(120,102,72,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(4242);
    for (let i = 0; i < 400; i++) {
      const a = r() * 6.28, rad = Math.pow(r(), 0.6) * w * 0.48;
      ctx.fillStyle = 'rgba(' + (120 + r() * 50) + ',' + (104 + r() * 40) + ',' + (70 + r() * 30) + ',' + (0.05 + r() * 0.18) + ')';
      ctx.beginPath();
      ctx.ellipse(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad, 1 + r() * 5, 1 + r() * 4, r() * 3, 0, 6.3);
      ctx.fill();
    }
  }, { srgb: true });

  // 苔痕（软边绿斑）
  T.mossPatch = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const r = QM.rng(818);
    for (let i = 0; i < 520; i++) {
      const a = r() * 6.28, rad = Math.pow(r(), 0.55) * w * 0.46;
      const x = w / 2 + Math.cos(a) * rad, y = h / 2 + Math.sin(a) * rad;
      const s = 2 + r() * 8;
      const fade = 1 - rad / (w * 0.5);
      ctx.fillStyle = 'rgba(' + (86 + r() * 40) + ',' + (104 + r() * 46) + ',' + (54 + r() * 30) + ',' + (0.10 + r() * 0.22) * fade + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.75, r() * 3, 0, 6.3);
      ctx.fill();
    }
  }, { srgb: true });


  // 土地 / 苔色（供地形混合）
  T.earth = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8d7a58';
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(2727);
    for (let i = 0; i < 1400; i++) {
      const c = 96 + r() * 70;
      ctx.fillStyle = 'rgba(' + (c + 18) + ',' + (c - 2) + ',' + (c - 38) + ',' + (0.06 + r() * 0.2) + ')';
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 1 + r() * 7, 1 + r() * 5, r() * 3, 0, 6.3);
      ctx.fill();
    }
    QM.paperGrain(ctx, w, h, 22, r);
  }, { repeat: [1, 1] });
  T.mossGround = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#7c8a52';
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(3737);
    for (let i = 0; i < 1600; i++) {
      const c = 96 + r() * 60;
      ctx.fillStyle = 'rgba(' + (c * 0.8) + ',' + c + ',' + (c * 0.5) + ',' + (0.07 + r() * 0.22) + ')';
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 1 + r() * 5, 1 + r() * 4, r() * 3, 0, 6.3);
      ctx.fill();
    }
    QM.paperGrain(ctx, w, h, 16, r);
  }, { repeat: [1, 1] });


  /* ---------- 人物面部：程序化贴图（球面等距柱状 UV） ---------- */
  function drawFace(ctx, W, H, variant) {
    const cx = 0.25 * W;                 // 正脸子午线
    const skin = ['#b98f66', '#ab8158', '#9a7049'][variant % 3];
    ctx.fillStyle = skin;
    ctx.fillRect(0, 0, W, H);
    const r = QM.rng(6001 + variant * 37);
    // 皮肤斑驳
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = r() * H;
      ctx.fillStyle = 'rgba(' + (170 + r() * 60) + ',' + (130 + r() * 50) + ',' + (100 + r() * 40) + ',' + (0.03 + r() * 0.06) + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, 1 + r() * 5, 1 + r() * 4, r() * 3, 0, 6.3);
      ctx.fill();
    }
    // 两颊红晕
    [-1, 1].forEach(sx => {
      const g = ctx.createRadialGradient(cx + sx * 34, 146, 2, cx + sx * 34, 146, 34);
      g.addColorStop(0, 'rgba(186,104,78,0.16)');
      g.addColorStop(1, 'rgba(196,112,86,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx + sx * 34 - 36, 110, 72, 72);
    });
    // 两侧与后脑阴影（体积感）
    const sideG = ctx.createLinearGradient(0, 0, W, 0);
    sideG.addColorStop(0, 'rgba(90,60,40,0.28)');
    sideG.addColorStop(0.12, 'rgba(90,60,40,0)');
    sideG.addColorStop(0.38, 'rgba(90,60,40,0)');
    sideG.addColorStop(0.5, 'rgba(90,60,40,0.28)');
    sideG.addColorStop(0.62, 'rgba(90,60,40,0)');
    sideG.addColorStop(0.88, 'rgba(90,60,40,0)');
    sideG.addColorStop(1, 'rgba(90,60,40,0.28)');
    ctx.fillStyle = sideG;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(cx, 126);
    ctx.scale(0.92, 0.92);
    ctx.translate(-cx, -138);

    // 眉
    [-1, 1].forEach(sx => {
      const bx = cx + sx * 30;
      ctx.strokeStyle = 'rgba(58,42,28,0.82)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - 22, 82);
      ctx.quadraticCurveTo(bx, 74, bx + 20, 80);
      ctx.stroke();
    });
    // 眼窝阴影（眼球为实体，贴图只留阴影与睑线）
    [-1, 1].forEach(sx => {
      const ex = cx + sx * 30, ey = 99;
      const sg = ctx.createRadialGradient(ex, ey, 3, ex, ey, 20);
      sg.addColorStop(0, 'rgba(96,64,44,0.24)');
      sg.addColorStop(0.7, 'rgba(120,86,60,0.14)');
      sg.addColorStop(1, 'rgba(120,86,60,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(ex - 20, ey - 20, 40, 40);
      ctx.strokeStyle = 'rgba(58,40,28,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - 12, ey - 3);
      ctx.quadraticCurveTo(ex, ey - 8, ex + 12, ey - 2);
      ctx.stroke();
    });
    // 鼻：侧影 + 鼻翼
    const ng = ctx.createLinearGradient(cx - 16, 0, cx + 16, 0);
    ng.addColorStop(0, 'rgba(120,86,58,0)');
    ng.addColorStop(0.42, 'rgba(120,86,58,0.30)');
    ng.addColorStop(0.58, 'rgba(150,110,78,0.34)');
    ng.addColorStop(1, 'rgba(120,86,58,0)');
    ctx.fillStyle = ng;
    ctx.fillRect(cx - 16, 104, 32, 42);
    [-1, 1].forEach(sx => {
      ctx.fillStyle = 'rgba(96,64,44,0.5)';
      ctx.beginPath(); ctx.ellipse(cx + sx * 8, 141, 3.4, 2.4, 0, 0, 6.3); ctx.fill();
    });
    ctx.fillStyle = 'rgba(196,150,112,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, 134, 5, 4, 0, 0, 6.3); ctx.fill();

    // 口
    ctx.fillStyle = 'rgba(150,86,74,0.85)';
    ctx.beginPath(); ctx.ellipse(cx, 180, 11, 3.6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(112,58,50,0.9)';
    ctx.beginPath(); ctx.ellipse(cx, 179, 10.5, 1.9, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(206,150,124,0.5)';
    ctx.beginPath(); ctx.ellipse(cx, 183, 8, 2, 0, 0, 6.3); ctx.fill();

    // 髭须 / 络腮（变体）
    if (variant === 1) {
      ctx.fillStyle = 'rgba(44,32,22,0.55)';
      ctx.beginPath();
      ctx.ellipse(cx, 200, 40, 26, 0, 0, 6.3);
      ctx.fill();
      ctx.fillStyle = 'rgba(52,38,26,0.85)';
      ctx.beginPath(); ctx.ellipse(cx, 172, 17, 4, 0, 0, 6.3); ctx.fill();
    } else if (variant === 2) {
      ctx.strokeStyle = 'rgba(60,44,30,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const x = cx - 30 + r() * 60, y = 196 + r() * 22;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 4, y + 5); ctx.stroke();
      }
    }
    ctx.restore();

    // —— 烘焙环境遮蔽（让平涂的脸出现结构阴影）——
    // 颌下 / 颈影
    const jawG = ctx.createLinearGradient(0, 168, 0, 224);
    jawG.addColorStop(0, 'rgba(70,44,30,0)');
    jawG.addColorStop(1, 'rgba(70,44,30,0.55)');
    ctx.fillStyle = jawG;
    ctx.fillRect(cx - 62, 168, 124, 56);
    // 眉下 / 鼻下 / 下唇下
    ctx.fillStyle = 'rgba(86,54,36,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, 108, 34, 6, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(86,54,36,0.26)';
    ctx.beginPath(); ctx.ellipse(cx, 150, 17, 5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = 'rgba(86,54,36,0.18)';
    ctx.beginPath(); ctx.ellipse(cx, 194, 13, 4, 0, 0, 6.3); ctx.fill();
    // 颞部与耳前
    [-1, 1].forEach(sx => {
      const g = ctx.createRadialGradient(cx + sx * 66, 118, 2, cx + sx * 66, 118, 34);
      g.addColorStop(0, 'rgba(64,42,28,0.18)');
      g.addColorStop(1, 'rgba(64,42,28,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx + sx * 66 - 34, 84, 68, 68);
    });
    // 整体纵向渐变：额头亮、下颌暗
    const vv = ctx.createLinearGradient(0, 40, 0, 240);
    vv.addColorStop(0, 'rgba(255,236,210,0.10)');
    vv.addColorStop(0.55, 'rgba(0,0,0,0)');
    vv.addColorStop(1, 'rgba(58,34,20,0.22)');
    ctx.fillStyle = vv;
    ctx.fillRect(cx - 80, 40, 160, 200);

    // 皮肤色板（耳、颈共用，UV 0.02–0.10 / 0.02–0.20）
    ctx.fillStyle = skin;
    ctx.fillRect(8, 204, 48, 50);
    for (let i = 0; i < 220; i++) {
      const x = 8 + r() * 46, y = 204 + r() * 48;
      ctx.fillStyle = 'rgba(' + (150 + r() * 60) + ',' + (110 + r() * 50) + ',' + (80 + r() * 40) + ',' + (0.04 + r() * 0.07) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, 1 + r() * 4, 1 + r() * 3, 0, 0, 6.3); ctx.fill();
    }

    // 额头发际（顶部渐暗，帽下）
    const topG = ctx.createLinearGradient(0, 0, 0, 46);
    topG.addColorStop(0, 'rgba(38,28,20,0.85)');
    topG.addColorStop(1, 'rgba(38,28,20,0)');
    ctx.fillStyle = topG;
    ctx.fillRect(cx - 60, 0, 120, 46);
  }

  function faceHeight(W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, W, H);
    const cx = 0.25 * W;
    // 鼻梁隆起
    const ng = ctx.createRadialGradient(cx, 124, 2, cx, 124, 26);
    ng.addColorStop(0, '#f0f0f0');
    ng.addColorStop(0.6, '#9a9a9a');
    ng.addColorStop(1, '#808080');
    ctx.fillStyle = ng;
    ctx.fillRect(cx - 26, 98, 52, 52);
    // 眉弓
    [-1, 1].forEach(sx => {
      const g = ctx.createRadialGradient(cx + sx * 30, 82, 2, cx + sx * 30, 82, 26);
      g.addColorStop(0, '#c8c8c8');
      g.addColorStop(1, '#808080');
      ctx.fillStyle = g;
      ctx.fillRect(cx + sx * 30 - 26, 56, 52, 52);
    });
    // 颧骨
    [-1, 1].forEach(sx => {
      const g = ctx.createRadialGradient(cx + sx * 36, 140, 4, cx + sx * 36, 140, 30);
      g.addColorStop(0, '#b4b4b4');
      g.addColorStop(1, '#808080');
      ctx.fillStyle = g;
      ctx.fillRect(cx + sx * 36 - 30, 110, 60, 60);
    });
    // 唇
    ctx.fillStyle = '#8e8e8e';
    ctx.beginPath(); ctx.ellipse(cx, 180, 16, 7, 0, 0, 6.3); ctx.fill();
    // 细孔
    const r = QM.rng(4242);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = 'rgba(' + (r() > 0.5 ? '255,255,255' : '0,0,0') + ',0.05)';
      ctx.fillRect(r() * W, r() * H, 2, 2);
    }
    return c;
  }

  function faceHiRes(variant) {
    return QM.canvasTex(1024, 512, (ctx, w, h) => {
      ctx.save();
      ctx.scale(2, 2);
      drawFace(ctx, 512, 256, variant);
      ctx.restore();
      // 高清层：毛孔、雀斑、血色斑（1024×512 坐标）
      const r = QM.rng(9100 + variant * 71);
      const cx = 0.25 * w;
      for (let i = 0; i < 24000; i++) {
        const x = r() * w, y = r() * h;
        const dx = (x - cx) / 110, dy = (y - 190) / 120;
        if (dx * dx + dy * dy > 1.3) continue;   // 只在面部
        ctx.fillStyle = 'rgba(' + (120 + r() * 70) + ',' + (80 + r() * 50) + ',' + (60 + r() * 40) + ',' + (0.05 + r() * 0.09) + ')';
        ctx.fillRect(x, y, 1.2 + r() * 1.6, 1.2 + r() * 1.6);
      }
      for (let i = 0; i < 900; i++) {
        const x = cx + (r() - 0.5) * 190, y = 120 + r() * 170;
        ctx.fillStyle = 'rgba(' + (150 + r() * 60) + ',' + (70 + r() * 40) + ',' + (60 + r() * 30) + ',' + (0.10 + r() * 0.16) + ')';
        ctx.beginPath();
        ctx.ellipse(x, y, 1.2 + r() * 2.2, 1.2 + r() * 2.2, 0, 0, 6.3);
        ctx.fill();
      }
      // 鼻翼与眼窝的血色
      [[cx, 268], [cx - 62, 200], [cx + 62, 200]].forEach(p => {
        const g2 = ctx.createRadialGradient(p[0], p[1], 2, p[0], p[1], 46);
        g2.addColorStop(0, 'rgba(186,88,72,0.16)');
        g2.addColorStop(1, 'rgba(186,88,72,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(p[0] - 46, p[1] - 46, 92, 92);
      });
    }, { srgb: true });
  }
  T.faceAtlas = null;   // 延迟构建（依赖 face0..2）
  T.face0 = faceHiRes(0);
  T.face1 = faceHiRes(1);
  T.face2 = faceHiRes(2);
  T.faceAtlas = QM.canvasTex(3328, 512, (ctx) => {
    ctx.drawImage(T.face0.image, 0, 0);
    ctx.drawImage(T.face1.image, 1024, 0);
    ctx.drawImage(T.face2.image, 2048, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3072, 0, 256, 512);
  }, { srgb: true });
  T.faceN = QM.normalFromCanvas(faceHeight(512, 256), 1.6);


  // 草丛卡片：三联图集 768×256（每联 256×256，60+ 根叶）
  T.grassCard = QM.canvasTex(768, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const panels = 3, PW = w / panels;
    for (let v = 0; v < panels; v++) {
      const r = QM.rng(8100 + v * 131);
      const ox = v * PW;
      const blades = 62 + v * 8;
      for (let i = 0; i < blades; i++) {
        const bx = ox + PW * 0.5 + (r() - 0.5) * PW * 0.84;
        const hh = h * (0.26 + r() * 0.72);
        const lean = (r() - 0.5) * PW * 0.6;
        const shade = r();
        ctx.strokeStyle = shade < 0.25 ? '#3b461b' : shade < 0.5 ? '#4f5c26' : shade < 0.75 ? '#68772f' : '#87984a';
        ctx.lineWidth = 1.4 + r() * 3.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx, h);
        ctx.quadraticCurveTo(bx + lean * 0.35, h - hh * 0.55, bx + lean, h - hh);
        ctx.stroke();
        if (r() > 0.78) {
          ctx.fillStyle = '#a9b56c';
          ctx.beginPath();
          ctx.ellipse(bx + lean, h - hh, 3, 7, lean * 0.02, 0, 6.3);
          ctx.fill();
        }
      }
      // 底部密度：几笔短草
      for (let i = 0; i < 30; i++) {
        const bx = ox + PW * 0.5 + (r() - 0.5) * PW * 0.9;
        const hh = h * (0.10 + r() * 0.18);
        ctx.strokeStyle = '#44501f';
        ctx.lineWidth = 1.6 + r() * 2;
        ctx.beginPath();
        ctx.moveTo(bx, h);
        ctx.lineTo(bx + (r() - 0.5) * 12, h - hh);
        ctx.stroke();
      }
    }
  }, { srgb: true });

  // 叶脉（贴在实体叶簇上，乘顶点色）
  T.leafVein = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#cfd8b8';
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(4321);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = 'rgba(' + (150 + r() * 60) + ',' + (180 + r() * 50) + ',' + (120 + r() * 50) + ',' + (0.05 + r() * 0.12) + ')';
      ctx.fillRect(r() * w, r() * h, 3 + r() * 8, 2 + r() * 5);
    }
    // 主脉
    ctx.strokeStyle = 'rgba(148,168,110,0.75)';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(w * 0.5, h); ctx.lineTo(w * 0.5, 4); ctx.stroke();
    // 侧脉
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(150,170,112,0.5)';
    for (let i = 0; i < 9; i++) {
      const y = h * (0.12 + i * 0.095);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y);
      ctx.quadraticCurveTo(w * 0.28, y - 8, w * 0.06, y - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y);
      ctx.quadraticCurveTo(w * 0.72, y - 8, w * 0.94, y - 20);
      ctx.stroke();
    }
    QM.paperGrain(ctx, w, h, 10, r);
  }, { srgb: true });

  // 衣料织纹（极轻的明暗，避免平涂）
  T.weave = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e6e2da';
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(515);
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(120,110,96,' + (0.05 + r() * 0.05) + ')';
      ctx.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 4) {
      ctx.fillStyle = 'rgba(255,252,240,' + (0.06 + r() * 0.05) + ')';
      ctx.fillRect(x, 0, 1, h);
    }
    QM.paperGrain(ctx, w, h, 8, r);
  }, { repeat: [3, 3] });

  // 衣料褶皱（作法线高度）
  T.clothFold = QM.canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, w, h);
    const r = QM.rng(9191);
    for (let i = 0; i < 54; i++) {
      const x = r() * w;
      ctx.strokeStyle = (r() > 0.5 ? 'rgba(255,255,255,' : 'rgba(0,0,0,') + (0.05 + r() * 0.12) + ')';
      ctx.lineWidth = 1.2 + r() * 3.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < h; y += 14) ctx.lineTo(x + Math.sin(y * 0.045 + i) * 11, y);
      ctx.stroke();
    }
    for (let i = 0; i < 18; i++) {
      const y = r() * h;
      ctx.strokeStyle = 'rgba(' + (r() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.04 + r() * 0.08) + ')';
      ctx.lineWidth = 1 + r() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 18) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 7);
      ctx.stroke();
    }
    QM.paperGrain(ctx, w, h, 10, r);
  }, { srgb: false });

  // 布（招牌、帐篷）
  T.cloth = QM.canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e6ddc6';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = 'rgba(150,135,105,' + (0.02 + rand() * 0.07) + ')';
      ctx.fillRect(rand() * w, rand() * h, 12, 1);
      ctx.fillRect(rand() * w, rand() * h, 1, 12);
    }
  });

  // 由贴图生成法线（与 UV 完全对齐）
  const N = {
    roof: QM.normalFromCanvas(T.roof.image, 2.6),
    wood: QM.normalFromCanvas(T.wood.image, 1.2),
    plaster: QM.normalFromCanvas(T.plaster.image, 0.5),
    brick: QM.normalFromCanvas(T.brick.image, 1.2),
    paving: QM.normalFromCanvas(T.paving.image, 1.6),
    thatch: QM.normalFromCanvas(T.thatch.image, 1.0),
    planks: QM.normalFromCanvas(T.planks.image, 1.7),
    cloth: QM.normalFromCanvas(T.cloth.image, 0.4),
    awning: QM.normalFromCanvas(T.awning.image, 0.7),
    ground: QM.normalFromCanvas(T.ground.image, 0.9),
    lattice: QM.normalFromCanvas(T.lattice.image, 1.4),
    clothFold: QM.normalFromCanvas(T.clothFold.image, 1.15),
    leafCluster: QM.normalFromCanvas(T.leafCluster.image, 1.0),
    needle: QM.normalFromCanvas(T.needle.image, 0.9)
  };
  QM.TEXN = N;

  QM.TEX = T;

  /* ---------- 材质 ---------- */
  const M = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);

  M.roof = std({ map: T.roof, normalMap: N.roof, normalScale: new THREE.Vector2(1.35, 1.35), color: 0xa8a99f, roughness: 0.86, metalness: 0.0 });
  M.roofDark = std({ map: T.roof, normalMap: N.roof, normalScale: new THREE.Vector2(0.95, 0.95), color: 0x8c8d85, roughness: 0.9 });
  M.ridge = std({ color: 0x4a4d48, roughness: 0.9 });
  M.wood = std({ map: T.wood, normalMap: N.wood, normalScale: new THREE.Vector2(1.15, 1.15), color: 0xa8825c, roughness: 0.7 });
  M.woodDark = std({ map: T.wood, normalMap: N.wood, normalScale: new THREE.Vector2(0.8, 0.8), color: 0x6a4830, roughness: 0.78 });
  M.woodRed = std({ map: T.wood, normalMap: N.wood, normalScale: new THREE.Vector2(0.65, 0.65), color: 0x9c5b44, roughness: 0.72 });
  M.woodWall = std({ map: T.wood, normalMap: N.wood, normalScale: new THREE.Vector2(0.8, 0.8), color: 0x7a5c40, roughness: 0.82 });
  M.plaster = std({ map: T.plaster, normalMap: N.plaster, normalScale: new THREE.Vector2(0.55, 0.55), color: 0xd4c8ab, roughness: 0.95 });
  M.brick = std({ map: T.brick, normalMap: N.brick, normalScale: new THREE.Vector2(1.1, 1.1), color: 0xc8c0ac, roughness: 0.92 });
  M.brickWall = std({ color: 0x7d7360, roughness: 0.97 });
  M.stone = std({ map: T.brick, normalMap: N.brick, normalScale: new THREE.Vector2(0.8, 0.8), color: 0xa9a292, roughness: 0.88 });
  M.paving = std({ map: T.paving, normalMap: N.paving, normalScale: new THREE.Vector2(1.0, 1.0), color: 0xb3a68c, roughness: 0.9 });
  M.ground = std({ map: T.ground, color: 0xffffff, roughness: 1.0 });
  M.thatch = std({ map: T.thatch, normalMap: N.thatch, normalScale: new THREE.Vector2(0.9, 0.9), color: 0xd7c290, roughness: 0.98 });
  M.boatMat = std({ map: T.thatch, color: 0x6d5c3e, roughness: 1.0, side: THREE.DoubleSide });
  M.wharf = std({ map: T.planks, normalMap: N.planks, normalScale: new THREE.Vector2(1.1, 1.1), color: 0xc9a878, roughness: 0.86 });
  M.lantern = std({ color: 0xd8b878, roughness: 0.8, emissive: 0x6a4a18, emissiveIntensity: 1.4 });
  M.lattice = std({ map: T.lattice, normalMap: N.lattice, normalScale: new THREE.Vector2(0.9, 0.9), color: 0xd8c7a4, roughness: 0.85 });
  M.cloth = std({ map: T.cloth, color: 0xd9c9a6, roughness: 0.95, side: THREE.DoubleSide });
  M.curtain = std({ map: T.cloth, normalMap: N.cloth, normalScale: new THREE.Vector2(0.4, 0.4), color: 0x4a5a60, roughness: 0.96, side: THREE.DoubleSide });
  M.awning = std({ map: T.awning, normalMap: N.awning, normalScale: new THREE.Vector2(0.6, 0.6), color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide });
  M.dark = std({ color: 0x2a2620, roughness: 0.9 });
  M.interior = std({ color: 0x33281a, roughness: 0.96, emissive: 0x140c04, emissiveIntensity: 1.0 });
  M.metal = std({ color: 0x5a5b56, roughness: 0.38, metalness: 0.8 });

  // 人物色板（宋人服饰：赭、青、靛、米、灰、暗红）
  M.clothes = [
    0x5e4a34, 0x354a4a, 0x2e3c48, 0x8a7551, 0x453d34,
    0x6b3028, 0x3d4732, 0x6b5b3c, 0x1f262c, 0x6b4f30
  ].map(c => std({ color: c, roughness: 0.94 }));

  M.skin = std({ color: 0xb08a63, roughness: 0.85 });
  M.person = std({ vertexColors: true, map: T.weave, color: 0xffffff, roughness: 0.92, normalMap: N.clothFold, normalScale: new THREE.Vector2(0.5, 0.5) });
  M.pants = std({ color: 0x3a352c, roughness: 0.95 });
  M.hair = std({ color: 0x241f1a, roughness: 0.9 });

  // 合并几何带顶点 AO，统一开启顶点色
  ['roof', 'roofDark', 'ridge', 'wood', 'woodDark', 'woodRed', 'woodWall', 'plaster',
   'brick', 'brickWall', 'stone', 'paving', 'thatch', 'awning', 'cloth', 'wharf',
   'lattice', 'curtain', 'interior', 'boatMat', 'metal', 'lantern'].forEach(k => {
    if (M[k]) M[k].vertexColors = true;
  });

  // 叶簇材质（三档色相 + 透光感的自发光）
  const leafMat = (tint, emis, ei) => std({
    map: T.leafCluster, normalMap: N.leafCluster, normalScale: new THREE.Vector2(0.55, 0.55),
    alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.88,
    color: tint, emissive: emis, emissiveIntensity: ei
  });
  M.leafA = leafMat(0xffffff, 0x1f2c0c, 0.45);
  M.leafB = leafMat(0xdfe9c4, 0x24330f, 0.55);
  M.leafC = leafMat(0xc6d9a2, 0x1a2508, 0.35);
  M.pine = std({
    map: T.needle, normalMap: N.needle, normalScale: new THREE.Vector2(0.5, 0.5),
    alphaTest: 0.38, side: THREE.DoubleSide, roughness: 0.9,
    color: 0xe6efd8, emissive: 0x18220a, emissiveIntensity: 0.4
  });
  M.dirt = std({ map: T.dirtPatch, alphaTest: 0.22, roughness: 1.0, color: 0xa8946f });
  M.moss = std({ map: T.mossPatch, alphaTest: 0.18, roughness: 1.0, color: 0xa8b07a });
  M.puddle = std({ color: 0x2c3a38, roughness: 0.1, metalness: 0.2, alphaTest: 0.1, transparent: false });

  // 植被风摆 + 双面法线（叶/草朝上取光）
  QM.foliageWind = function (mat, amp, freq) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.4));`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 wpF = (modelMatrix * vec4(transformed, 1.0)).xyz;
          float ph = wpF.x * 0.55 + wpF.z * 0.42;
          float sway = sin(uTime * ${freq.toFixed(2)} + ph) * 0.65
                     + sin(uTime * ${(freq * 1.7).toFixed(2)} + ph * 1.9) * 0.35;
          transformed.x += sway * ${amp.toFixed(3)} * uv.y;
          transformed.z += sway * ${(amp * 0.55).toFixed(3)} * uv.y;`);
      mat.userData.windShader = shader;
    };
    mat.needsUpdate = true;
    return mat;
  };

  // 面部材质（三款贴图）
  M.face = [0, 1, 2].map(i => new THREE.MeshPhysicalMaterial({
    map: T['face' + i], normalMap: T.faceN, normalScale: new THREE.Vector2(1.1, 1.1),
    roughness: 0.52, metalness: 0.0, vertexColors: false,
    color: 0xf2dcc8, emissive: 0x2a120a, emissiveIntensity: 0.08,
    sheen: 0.55, sheenRoughness: 0.65, sheenColor: new THREE.Color(0x9a5540),
    clearcoat: 0.05, clearcoatRoughness: 0.7
  }));

  // 皮肤 shader：边缘透光（rim）＋次表面暖色底
  M.face.forEach(m => {
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <output_fragment>',
        `#include <output_fragment>
         {
           vec3 vdirS = normalize(vViewPosition);
           float rimS = pow(1.0 - clamp(dot(normalize(normal), vdirS), 0.0, 1.0), 2.2);
           gl_FragColor.rgb += vec3(0.55, 0.16, 0.09) * rimS * 0.20;
           gl_FragColor.rgb += vec3(0.035, 0.012, 0.006);
         }`
      );
    };
    m.customProgramCacheKey = () => 'skinrim';
    m.needsUpdate = true;
  });

  // 眼球/眼睑（顶点色：巩膜、虹膜、瞳孔、高光、皮肤眼睑）
  M.eye = std({ vertexColors: true, color: 0xffffff, roughness: 0.22, metalness: 0.0 });

  // 距离抖动淡出（与 billboard 卡片交叉过渡）
  QM.ditherFade = function (mat, near, far) {
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader) => {
      if (prev) prev(shader);
      shader.vertexShader = 'varying vec3 vWPosD;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWPosD = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
      shader.fragmentShader = 'varying vec3 vWPosD;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
         float dfd = smoothstep(${near.toFixed(1)}, ${far.toFixed(1)}, length(vWPosD - cameraPosition));
         if (dfd > 0.001 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) < dfd) discard;`
      );
    };
    mat.needsUpdate = true;
    return mat;
  };

  // 人物合并材质：面部图集 + 顶点色（身体/眼采样白色区）
  M.personAtlas = std({
    map: T.faceAtlas,
    vertexColors: true,
    roughness: 0.78,
    metalness: 0,
    emissive: 0x1a0e08,
    emissiveIntensity: 0.10
  });

  QM.MAT = M;

  /* ---------- 灯光 ---------- */
  QM.makeLights = function (scene) {
    const hemi = new THREE.HemisphereLight(0xd3e2e6, 0x95896a, 0.42);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1d8, 3.05);
    sun.position.set(60, 90, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -70;
    sun.shadow.camera.right = 70;
    sun.shadow.camera.top = 70;
    sun.shadow.camera.bottom = -70;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 260;
    sun.shadow.bias = -0.0012;
    sun.shadow.normalBias = 0.35;
    scene.add(sun);
    scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0xbcd6de, 0.5);
    fill.position.set(-60, 40, -50);
    scene.add(fill);

    // 天光反弹（暖色，从地面向上）
    const bounce = new THREE.DirectionalLight(0xd9c49a, 0.28);
    bounce.position.set(0, -30, 20);
    scene.add(bounce);

    return { hemi, sun, fill, bounce };
  };

})(window.QM);
