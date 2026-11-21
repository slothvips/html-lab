/* 清明上河图 · 天地：地形 / 汴河 / 街市 / 远山 / 天光 */
(function (QM) {
  'use strict';
  const T = THREE;

  /* ---------- 场景布局参数 ---------- */
  QM.CFG = {
    X0: -320, X1: 330,
    riverHalf: 13.5,
    streetZ: -7,
    streetHalf: 7,
    bridgeX: 22,
    gateX: 252,
    waterY: 0.0
  };

  QM.riverZ = function (x) {
    return 18 + 10 * Math.sin(x * 0.0105) + 5 * Math.sin(x * 0.024 + 1.4);
  };
  QM.streetZ = function (x) {
    // 过虹桥后街道缓缓内折（远离河岸），仿画卷中街市渐入城的走势
    const bend = QM.smooth(QM.clamp((x - 40) / 170, 0, 1)) * 4.2;
    return -7 + 1.5 * Math.sin(x * 0.018) - bend;
  };

  // 地形高度
  QM.heightAt = function (x, z) {
    const rz = QM.riverZ(x);
    const d = Math.abs(z - rz);
    let h = 1.15 + (QM.fbm(x * 0.012, z * 0.012, 3) - 0.5) * 2.0;
    // 河床
    if (d < QM.CFG.riverHalf + 3.2) {
      const t = QM.clamp((d - (QM.CFG.riverHalf - 5.0)) / 8.2, 0, 1);
      h = QM.lerp(-2.6, h, QM.smooth(t));
    }
    h = Math.max(h, d < QM.CFG.riverHalf ? h : 0.92);
    // 街面走廊压平（含临街屋舍基址）
    const sx = QM.streetZ(x);
    const dz = z - sx;
    const townMask =
      QM.smooth(QM.clamp((dz + 42) / 12, 0, 1)) *
      QM.smooth(QM.clamp((14 - dz) / 10, 0, 1)) *
      QM.clamp((x + 250) / 60, 0, 1) * QM.clamp((QM.CFG.gateX + 150 - x) / 60, 0, 1);
    h = QM.lerp(h, 0.50, townMask);
    // 南岸道路（桥头）
    const southMask = Math.max(0, 1 - Math.abs(z - 46) / 8) * Math.max(0, 1 - Math.abs(x - 22) / 30);
    h = QM.lerp(h, 0.45, southMask * 0.9);
    return h;
  };

  // 统一地面高度：街面 / 地形 / 桥端共用
  QM.CFG.streetY = 0.52;
  QM.groundY = function (x, z) {
    const dz = Math.abs(z - QM.streetZ(x));
    if (x > -190 && x < 385 && dz < QM.CFG.streetHalf) return QM.CFG.streetY;
    return QM.heightAt(x, z);
  };

  /* ---------- 天穹 ---------- */
  QM.buildSky = function (scene) {
    const geo = new T.SphereGeometry(900, 32, 20);
    const mat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uTop: { value: new T.Color(0x7e9dae) },
        uMid: { value: new T.Color(0xc2d2d2) },
        uBot: { value: new T.Color(0xf2e9cf) },
        uSun: { value: new T.Vector3(0.46, 0.82, 0.58).normalize() }
      },
      vertexShader: `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        uniform vec3 uTop,uMid,uBot,uSun;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y,0.0,1.0);
          vec3 col = mix(uBot, uMid, smoothstep(0.0,0.10,h));
          col = mix(col, uTop, smoothstep(0.10,0.55,h));
          float s = max(dot(d, normalize(uSun)),0.0);
          col += vec3(1.0,0.93,0.75) * pow(s, 22.0) * 0.35;
          col += vec3(1.0,0.95,0.8) * pow(s, 4.0) * 0.06;
          gl_FragColor = vec4(col,1.0);
        }`
    });
    const sky = new T.Mesh(geo, mat);
    sky.renderOrder = -10;
    scene.add(sky);

    // 薄云（程序化贴图）
    const cloudTex = QM.canvasTex(512, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const r = QM.rng(99);
      for (let i = 0; i < 26; i++) {
        const x = r() * w, y = h * 0.35 + r() * h * 0.5, rad = 40 + r() * 90;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, 'rgba(255,255,250,0.13)');
        g.addColorStop(1, 'rgba(255,255,250,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.3); ctx.fill();
      }
    });
    cloudTex.wrapS = cloudTex.wrapT = T.ClampToEdgeWrapping;
    const cloudMat = new T.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.85, fog: false });
    const clouds = [];
    for (let i = 0; i < 7; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(420, 150), cloudMat);
      m.position.set(QM.rr(-300, 300), 95 + QM.rr(-10, 35), QM.rr(-260, 120));
      m.rotation.y = QM.rr(-0.3, 0.3);
      m.rotation.x = -0.12;
      m.renderOrder = -9;
      scene.add(m);
      clouds.push(m);
    }
    QM.clouds = clouds;
    return { sky, clouds };
  };

  /* ---------- 地形 ---------- */
  QM.buildTerrain = function (scene) {
    const W = 720, D = 460, segX = 300, segZ = 200;
    const geo = new T.PlaneGeometry(W, D, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const cDry = new T.Color(0xc6bd90), cGreen = new T.Color(0x93a268), cMud = new T.Color(0x8a7657),
      cRoad = new T.Color(0xb3a281), cDeep = new T.Color(0x3e4438);
    const tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + 5, z = pos.getZ(i) + -20;
      const y = QM.heightAt(x, z);
      pos.setX(i, x); pos.setZ(i, z); pos.setY(i, y);
      const rz = QM.riverZ(x);
      const d = Math.abs(z - rz);
      tmp.copy(cDry);
      // 植被斑驳
      const n = QM.fbm(x * 0.05, z * 0.05, 3);
      tmp.lerp(cGreen, QM.clamp((n - 0.35) * 1.5, 0, 1) * 0.7);
      // 裸露土斑（多倍频，无硬边）
      const dirt1 = QM.fbm(x * 0.055 + 17, z * 0.055 - 9, 3);
      const dirt2 = QM.fbm(x * 0.14 - 5, z * 0.14 + 3, 2);
      const dMix = QM.smooth(QM.clamp((dirt1 - 0.52) / 0.22, 0, 1)) * (0.55 + dirt2 * 0.45);
      tmp.lerp(cMud, dMix * 0.42);
      // 苔痕（低洼处偏绿）
      const moss = QM.fbm(x * 0.09 - 23, z * 0.09 + 11, 2);
      tmp.lerp(cGreen, QM.smooth(QM.clamp((moss - 0.58) / 0.25, 0, 1)) * 0.22);
      // 河岸湿泥
      if (d < QM.CFG.riverHalf + 8) tmp.lerp(cMud, QM.clamp(1 - (d - QM.CFG.riverHalf + 3) / 10, 0, 1));
      if (d < QM.CFG.riverHalf - 1) tmp.lerp(cDeep, 0.75);
      tmp.lerp(cRoad, 0.35 * QM.clamp(1 - Math.abs(y - 0.42) / 0.35, 0, 1));
      tmp.multiplyScalar(0.92 + n * 0.16);
      colors.push(tmp.r, tmp.g, tmp.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({
      map: QM.TEX.ground, vertexColors: true, roughness: 1, metalness: 0
    });
    mat.map.repeat.set(34, 22);
    mat.normalMap = QM.TEXN.ground.clone();
    mat.normalMap.needsUpdate = true;
    mat.normalMap.repeat.set(34, 22);
    mat.normalScale.set(0.8, 0.8);
    // 细节纹理混合：土 / 苔 / 草 三张按世界坐标噪声混合
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uEarth = { value: QM.TEX.earth };
      shader.uniforms.uMoss = { value: QM.TEX.mossGround };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPosT;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPosT = (modelMatrix * vec4(transformed,1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          varying vec3 vWPosT;
          uniform sampler2D uEarth;
          uniform sampler2D uMoss;
          float thash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float tnoise(vec2 p){
            vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(thash(i),thash(i+vec2(1,0)),f.x), mix(thash(i+vec2(0,1)),thash(i+vec2(1,1)),f.x), f.y);
          }`)
        .replace('#include <map_fragment>', `
          vec4 gTex = texture2D(map, vUv);
          vec4 eTex = texture2D(uEarth, vUv * 1.7 + vec2(0.31, 0.17));
          vec4 mTex = texture2D(uMoss, vUv * 2.3 + vec2(0.61, 0.23));
          float nA = tnoise(vWPosT.xz * 0.045);
          float nB = tnoise(vWPosT.xz * 0.11 + 5.0);
          float nC = tnoise(vWPosT.xz * 0.023 - 3.0);
          float dirtW = smoothstep(0.60, 0.86, nA * 0.7 + nC * 0.3);
          float mossW = smoothstep(0.62, 0.88, nB) * (1.0 - dirtW);
          vec3 gL = pow(gTex.rgb, vec3(2.2));
          vec3 eL = pow(eTex.rgb, vec3(2.2));
          vec3 mL = pow(mTex.rgb, vec3(2.2));
          vec3 blended = gL;
          blended = mix(blended, eL, dirtW * 0.62);
          blended = mix(blended, mL, mossW * 0.38);
          diffuseColor.rgb *= blended;
        `);
    };
    const terrain = new T.Mesh(geo, mat);
    terrain.receiveShadow = true;
    scene.add(terrain);
    QM.terrain = terrain;
    return terrain;
  };

  /* ---------- 汴河水面 ---------- */
  QM.buildWater = function (scene) {
    const geo = new T.PlaneGeometry(760, 500, 120, 80);
    geo.rotateX(-Math.PI / 2);
    const uniforms = {
      uTime: { value: 0 },
      uDeep: { value: new T.Color(0x415855) },
      uShallow: { value: new T.Color(0x6d8272) },
      uSky: { value: new T.Color(0x9fb6b8) },
      uBank: { value: new T.Color(0x8a8f6e) },
      uSunDir: { value: new T.Vector3(0.46, 0.82, 0.58).normalize() },
      uFogColor: { value: new T.Color(0xd7d3b8) },
      uFogNear: { value: 90 },
      uFogFar: { value: 460 },
      tReflect: { value: null },
      uTexMatrix: { value: new T.Matrix4() },
      uReflect: { value: 0.0 }
    };
    const mat = new T.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        uniform mat4 uTexMatrix;
        varying vec3 vWorld;
        varying vec2 vUv;
        varying vec4 vReflect;
        void main(){
          vec4 wp = modelMatrix * vec4(position,1.0);
          vReflect = uTexMatrix * wp;
          float w = sin(wp.x*0.42 + uTime*1.15)*0.045
                  + sin(wp.z*0.55 - uTime*0.95)*0.035
                  + sin((wp.x+wp.z)*0.23 + uTime*0.6)*0.03;
          wp.y += w;
          vWorld = wp.xyz;
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeep,uShallow,uSky,uSunDir,uFogColor,uBank;
        uniform float uFogNear,uFogFar,uReflect;
        uniform sampler2D tReflect;
        varying vec3 vWorld;
        varying vec2 vUv;
        varying vec4 vReflect;

        float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p);
          f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }
        float height(vec2 p, float t){
          float h = sin(p.x*0.33 + t*1.05)*0.10 + sin(p.y*0.62 - t*0.9)*0.075;
          h += sin((p.x*1.3-p.y*0.7) + t*1.7)*0.022;
          h += (noise(p*0.9 + vec2(t*0.35, -t*0.22))-0.5)*0.05;
          h += (noise(p*2.6 - vec2(t*0.5, t*0.3))-0.5)*0.018;
          return h;
        }
        void main(){
          vec2 p = vWorld.xz;
          float t = uTime;
          float e = 0.22;
          float h0 = height(p, t);
          float hx = height(p+vec2(e,0.0), t);
          float hz = height(p+vec2(0.0,e), t);
          vec3 N = normalize(vec3(-(hx-h0)/e, 1.0, -(hz-h0)/e));

          vec3 V = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - clamp(dot(N,V),0.0,1.0), 2.4);

          // 顺流的水纹
          float flow = noise(vec2(p.x*0.35 - t*0.55, p.y*3.2));
          float flow2 = noise(vec2(p.x*0.09 - t*0.12, p.y*1.4));
          float streak = smoothstep(0.55,0.95,flow*0.7+flow2*0.5);

          vec3 col = mix(uDeep, uShallow, 0.28 + flow2*0.5);
          // 河道中心深、近岸浅
          float rz = 18.0 + 10.0*sin(vWorld.x*0.0105) + 5.0*sin(vWorld.x*0.024+1.4);
          float dEdge = abs(vWorld.z - rz);
          float nearBank = smoothstep(7.5, 13.4, dEdge);
          col = mix(col, uBank, nearBank*0.55);
          col = mix(col, uSky, fres*0.32);

          // —— 平面反射（镜像相机渲染）——
          if (uReflect > 0.5) {
            vec2 ruv = vReflect.xy / max(vReflect.w, 0.0001);
            ruv += N.xz * 0.03;                        // 涟漪扰动
            ruv.y += sin(vWorld.x*0.8 + uTime*1.4) * 0.0025;
            vec3 refl = texture2D(tReflect, ruv).rgb;
            refl = mix(refl, texture2D(tReflect, ruv + N.xz * 0.008).rgb, 0.4);
            refl *= vec3(0.80, 0.90, 0.88);            // 水体吸收
            col = mix(col, refl, clamp(fres * 0.55 + 0.26, 0.0, 0.82));
          }

          // 岸边浪花线
          float band = 1.0 - smoothstep(0.0, 0.85, abs(dEdge - 13.1));
          float foamN = noise(vec2(vWorld.x*1.1 - uTime*0.5, vWorld.z*2.2));
          col += vec3(0.86,0.89,0.82) * band * (0.25 + foamN*0.55) * 0.5;
          // 岸脚暗影
          col *= 1.0 - (1.0 - smoothstep(9.5, 13.6, dEdge)) * 0.08;
          col += vec3(0.95,0.97,0.9) * streak * 0.16;

          float spec = pow(max(dot(reflect(-normalize(uSunDir), N), V),0.0), 120.0);
          col += vec3(1.0,0.96,0.84) * spec * 2.2;
          float glint = pow(spec, 0.4) * 0.10;
          col += vec3(1.0,0.98,0.9) * glint;

          // 近岸浅色
          float fogF = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
          col = mix(col, uFogColor, fogF);
          gl_FragColor = vec4(col, 0.96);
        }`
    });
    const water = new T.Mesh(geo, mat);
    water.position.y = QM.CFG.waterY;
    water.receiveShadow = false;
    scene.add(water);
    QM.water = water;
    return water;
  };

  /* ---------- 街市石板路 ---------- */
  function roadRibbon(scene, zFn, x0, x1, half, y, material, segs) {
    segs = segs || 220;
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const x = QM.lerp(x0, x1, i / segs);
      const z = zFn(x);
      pos.push(x, y, z - half);
      pos.push(x, y, z + half);
      const v = (x - x0) / 6.0;
      uvs.push(0, v, half * 2 / 5.6, v);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    const cols = new Float32Array((segs + 1) * 2 * 3).fill(1);
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new T.Mesh(g, material);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  QM.buildStreets = function (scene) {
    const mat = QM.MAT.paving.clone();
    mat.map = QM.TEX.paving.clone();
    mat.map.needsUpdate = true;
    mat.map.repeat.set(1, 1);
    mat.normalMap = QM.TEXN.paving.clone();
    mat.normalMap.needsUpdate = true;
    mat.normalMap.repeat.set(1, 1);
    mat.color.setHex(0x8f8368);
    QM.street = roadRibbon(scene, QM.streetZ, -190, 385, QM.CFG.streetHalf, QM.CFG.streetY, mat, 340);

    // 南岸小路
    roadRibbon(scene, () => 47, 0, 60, 3.2, 0.54, mat, 40);

    // 街沿石
    const curbGeoms = [];
    for (let x = -188; x < 258; x += 3.0) {
      const z = QM.streetZ(x);
      curbGeoms.push(QM.geo.box(3.05, 0.42, 0.9, x, 0.35, z - QM.CFG.streetHalf - 0.35));
      curbGeoms.push(QM.geo.box(3.05, 0.42, 0.9, x, 0.35, z + QM.CFG.streetHalf + 0.35));
    }
    const curb = QM.mesh(curbGeoms, QM.MAT.stone, false, true);
    scene.add(curb);
    return QM.street;
  };

  /* ---------- 远山与田野 ---------- */
  QM.buildFar = function (scene) {
    // 远山：数层低多边形山影
    const layers = [
      { z: -430, h: 26, col: 0xa8b4ac, op: 1 },
      { z: -520, h: 38, col: 0xb4beb2, op: 1 },
      { z: -610, h: 52, col: 0xc0c8ba, op: 1 }
    ];
    const grp = new T.Group();
    layers.forEach((L, li) => {
      const pts = [];
      const x0 = -430, x1 = 430, n = 40;
      for (let i = 0; i <= n; i++) {
        const x = QM.lerp(x0, x1, i / n);
        const h = L.h * (0.45 + 0.55 * QM.fbm(x * 0.004 + li * 7, 1.3, 4));
        pts.push(new T.Vector3(x, h, L.z + Math.sin(x * 0.008 + li) * 24));
      }
      const pos = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        pos.push(a.x, 0, a.z, b.x, 0, b.z, b.x, b.y, b.z);
        pos.push(a.x, 0, a.z, b.x, b.y, b.z, a.x, a.y, a.z);
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: L.col, fog: true, side: T.DoubleSide, transparent: L.op < 1, opacity: L.op }));
      scene.add(m);
    });
    scene.add(grp);

    // 田垄
    const fieldTex = QM.canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#8c8a5c';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 18) {
        ctx.fillStyle = 'rgba(70,66,40,0.35)';
        ctx.fillRect(0, y, w, 6);
        ctx.fillStyle = 'rgba(190,186,130,0.20)';
        ctx.fillRect(0, y + 8, w, 4);
      }
    }, { repeat: [3, 3] });
    const fieldMat = new T.MeshStandardMaterial({ map: fieldTex, color: 0xc8c090, roughness: 1 });
    const fields = [
      [-250, 62, 70, 40, 0.12], [-165, 74, 54, 32, -0.2], [-95, 96, 44, 26, 0.3],
      [120, 70, 48, 26, 0.1], [205, 78, 60, 30, -0.15], [-300, 30, 50, 34, 0.2]
    ];
    fields.forEach(f => {
      const g = new T.PlaneGeometry(f[2], f[3], 14, 10);
      g.rotateX(-Math.PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const lx = p.getX(i), lz = p.getZ(i);
        const wx = f[0] + lx * Math.cos(f[4]) - lz * Math.sin(f[4]);
        const wz = f[1] + lx * Math.sin(f[4]) + lz * Math.cos(f[4]);
        p.setY(i, QM.heightAt(wx, wz) + 0.05);
      }
      g.computeVertexNormals();
      const m = new T.Mesh(g, fieldMat);
      m.position.set(f[0], 0, f[1]);
      m.rotation.y = f[4];
      m.receiveShadow = true;
      scene.add(m);
    });

    // 乡间土路
    const dirtTex = QM.canvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#9d8e6c';
      ctx.fillRect(0, 0, w, h);
      const r = QM.rng(66);
      for (let i = 0; i < 700; i++) {
        const c = 110 + r() * 60;
        ctx.fillStyle = 'rgba(' + (c + 10) + ',' + (c - 6) + ',' + (c - 34) + ',' + (0.1 + r() * 0.25) + ')';
        ctx.fillRect(r() * w, r() * h, 1 + r() * 6, 1 + r() * 4);
      }
    }, { repeat: [1, 8] });
    const dirtMat = new T.MeshStandardMaterial({ map: dirtTex, color: 0xb0a181, roughness: 1 });
    const roadPath = [[-320, 44], [-270, 34], [-230, 26], [-200, 18], [-176, 10]];
    const rpos = [], ruv = [], ridx = [];
    for (let i = 0; i < roadPath.length; i++) {
      const p = roadPath[i];
      const y = QM.heightAt(p[0], p[1]) + 0.07;
      rpos.push(p[0], y, p[1] - 2.4, p[0], y, p[1] + 2.4);
      ruv.push(i * 1.2, 0, i * 1.2, 1);
    }
    for (let i = 0; i < roadPath.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      ridx.push(a, c, b, b, c, d);
    }
    const rg = new T.BufferGeometry();
    rg.setAttribute('position', new T.Float32BufferAttribute(rpos, 3));
    rg.setAttribute('uv', new T.Float32BufferAttribute(ruv, 2));
    rg.setIndex(ridx);
    rg.computeVertexNormals();
    const rm = new T.Mesh(rg, dirtMat);
    rm.receiveShadow = true;
    scene.add(rm);

    // 河岸石块与木桩
    const rocks = [], posts = [];
    for (let i = 0; i < 95; i++) {
      const x = QM.rr(-190, 260);
      const side = QM.rand() > 0.5 ? -1 : 1;
      const z = QM.riverZ(x) + side * QM.rr(13.2, 16.5);
      const s = QM.rr(0.35, 0.8);
      rocks.push(QM.geo.sphere(s, x, QM.heightAt(x, z) + s * 0.35, z, 1.5, 0.55, 1.1));
    }
    scene.add(QM.mesh(rocks, QM.MAT.stone, false, true));

    for (let i = 0; i < 26; i++) { // 码头木桩
      const x = QM.rr(-60, 120);
      const z = QM.riverZ(x) + QM.rr(12.6, 14.2);
      posts.push(QM.geo.cyl(0.22, 0.26, QM.rr(2.2, 3.4), 6, x, 0.8, z, QM.rr(-0.08, 0.08), 0, QM.rr(-0.08, 0.08)));
    }
    scene.add(QM.mesh(posts, QM.MAT.woodDark, true, true));

    // 街前夯土散水
    const apronMat = new T.MeshStandardMaterial({ color: 0xa79a76, roughness: 1 });
    const aprons = [];
    for (let x = -170; x < 258; x += 4) {
      const z = QM.streetZ(x) - QM.CFG.streetHalf - 1.4;
      aprons.push(QM.geo.plane(4.1, 6.4, x, 0.49, z, -Math.PI / 2));
    }
    scene.add(QM.mesh(aprons, apronMat, false, true));

    // 岸边苇丛：3D 苇叶（长而窄，带穗）
    const reedMat = new T.MeshStandardMaterial({
      vertexColors: true, side: T.DoubleSide, roughness: 0.93, color: 0xffffff
    });
    QM.foliageWind(reedMat, 0.14, 1.2);
    QM.reedMat = reedMat;
    const reedGeom = [];
    for (let i = 0; i < 240; i++) {
      const x = QM.rr(-300, 300);
      const side = QM.rand() > 0.5 ? -1 : 1;
      const z = QM.riverZ(x) + side * QM.rr(13.8, 17.5);
      const tuft = QM.bladeTuft(x, z, {
        blades: QM.ri(4, 6), hMin: 0.9, hMax: 1.9, wMin: 0.016, wMax: 0.028,
        segs: 5, base: 0x4f5a28, tip: 0xb9ae6a
      });
      tuft.forEach(g => reedGeom.push(g));
    }
    scene.add(QM.mesh(reedGeom, reedMat, false, false));
  };


  /* ---------- 地表贴花：土路斑 / 苔痕 / 水洼 ---------- */
  QM.buildGroundDetail = function (scene) {
    const dirt = [], moss = [], puddles = [];
    const patch = (list, cx, cz, size, ratio, yOff, flat) => {
      const g = new T.PlaneGeometry(size, size * ratio, 5, 5);
      g.rotateX(-Math.PI / 2);
      g.rotateY(QM.rr(0, 6.283));
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const wx = cx + p.getX(k), wz = cz + p.getZ(k);
        const wy = flat ? yOff : QM.heightAt(wx, wz) + yOff;
        p.setX(k, wx); p.setZ(k, wz); p.setY(k, wy);
      }
      list.push(g);
    };
    for (let i = 0; i < 260; i++) {
      const x = QM.rr(-310, 310), z = QM.rr(-110, 130);
      const h = QM.heightAt(x, z);
      if (h < 0.9) continue;
      if (Math.abs(z - QM.streetZ(x)) < 9 && x > -190 && x < 260) continue;
      patch(dirt, x, z, QM.rr(2.4, 7.5), QM.rr(0.55, 1.25), 0.045);
    }
    for (let i = 0; i < 150; i++) {
      const x = QM.rr(-310, 310), z = QM.rr(-110, 130);
      const h = QM.heightAt(x, z);
      if (h < 0.95) continue;
      if (Math.abs(z - QM.streetZ(x)) < 8 && x > -190 && x < 260) continue;
      patch(moss, x, z, QM.rr(1.6, 5.0), QM.rr(0.5, 1.0), 0.05);
    }
    for (let i = 0; i < 26; i++) {
      const x = QM.rr(-190, 260);
      const rz = QM.riverZ(x);
      const z = rz - QM.rr(14.2, 16.6);
      patch(puddles, x, z, QM.rr(1.4, 3.4), QM.rr(0.55, 1.0), 0.02, true);
    }

    const dirtM = new T.Mesh(QM.mergeGeoms(dirt), QM.MAT.dirt);
    dirtM.renderOrder = 2; dirtM.receiveShadow = true;
    scene.add(dirtM);
    const mossM = new T.Mesh(QM.mergeGeoms(moss), QM.MAT.moss);
    mossM.renderOrder = 2; mossM.receiveShadow = true;
    scene.add(mossM);
    const pudM = new T.Mesh(QM.mergeGeoms(puddles), QM.MAT.puddle);
    pudM.renderOrder = 3;
    scene.add(pudM);
  };

  /* ---------- 更远处城墙剪影 ---------- */
  QM.buildFarCity = function (scene) {
    const geoms = [];
    // 城墙外的街巷剪影（简化为屋顶群）
    for (let i = 0; i < 90; i++) {
      const x = QM.rr(180, 420);
      const z = QM.rr(-150, -60);
      const w = QM.rr(6, 16), d = QM.rr(5, 12), h = QM.rr(3, 7);
      geoms.push(QM.geo.box(w, h, d, x, QM.heightAt(x, z) + h / 2, z));
      // 坡顶
      const rg = new T.ConeGeometry(w * 0.72, 2.2, 4);
      rg.rotateY(Math.PI / 4);
      rg.translate(x, QM.heightAt(x, z) + h + 1.1, z);
      geoms.push(rg);
    }
    const m = QM.mesh(geoms, new T.MeshStandardMaterial({ color: 0x9c9788, roughness: 1 }), false, false);
    m.material.fog = true;
    scene.add(m);
  };

})(window.QM);
