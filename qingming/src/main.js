/* 清明上河图 · 主控：渲染 / 巡游 / 后期 / 界面 */
(function (QM) {
  'use strict';
  const T = THREE;

  const CHAPTERS = [
    {
      s: 0.0, name: '郊野', sub: '城郊 · 清明',
      text: '疏林薄霧，農舍田疇。一隊馱炭的驢隊沿小路行來，掃墓踏青的人們自城郊返程。柳梢初綠，春寒未盡。'
    },
    {
      s: 0.19, name: '汴河', sub: '漕運 · 舟楫',
      text: '汴河為北宋漕運命脈。河上舟楫相銜，縴夫挽舟，腳夫卸糧；岸邊茶棚酒肆，旗招臨風。'
    },
    {
      s: 0.38, name: '虹橋', sub: '編木為拱 · 無柱飛梁',
      text: '虹橋以編木為拱，如長虹臥波。橋面百肆雜陳，行人摩肩。橋下一艘大船正欲放倒桅杆，船工挽索呼號，橋上觀者憑欄——此為全卷最緊張處。'
    },
    {
      s: 0.60, name: '街市', sub: '百肆 · 人煙',
      text: '過了虹橋，街市漸密。十千腳店、孫羊正店彩樓歡門高張，香藥鋪、匹帛鋪、茶坊酒肆鱗次櫛比。轎子、獨輪車、牛車往來不絕。'
    },
    {
      s: 0.82, name: '城門', sub: '東角子門 · 駱駝隊',
      text: '東角子門城樓巍然，城牆逶迤。駱駝隊正穿門而入，門前有算命攤三處，曰神課、看命、決疑。城內街巷更深，畫卷至此而止。'
    }
  ];

  const CAM_POS = [
    [228.0, 27, 68], [190.0, 23, 57], [150.0, 20, 49], [110.0, 18, 43],
    [70.0, 17, 39], [30.0, 18, 44], [-12.0, 21, 52], [-60.0, 18, 48],
    [-88.0, 18, 42], [-112.0, 16, 36], [-142.0, 15, 34], [-174.0, 15, 33],
    [-206.0, 17, 36], [-234.0, 19, 40], [-260.0, 18, 38], [-288.0, 19, 38]
  ];
  const CAM_TGT = [
    [205.0, 4, 12], [176.0, 4, 10], [141.0, 3, 8], [101.0, 4, 14],
    [61.0, 4, 10], [21.0, 5, 12], [-10.0, 6, 18], [-26.0, 7, 27],
    [-44.0, 6, 14], [-108.0, 5, -4], [-142.0, 5, -8], [-172.0, 5, -8],
    [-212.0, 6, -9], [-250.0, 9, -10], [-268.0, 7, -8], [-292.0, 7, -6]
  ];

  const state = {
    s: 0, playing: true, mode: 'tour', speed: 1 / 165,
    yaw: 0, pitch: 0, dist: 40, freeTarget: new T.Vector3(),
    catchUp: false, soundOn: true, chapter: -1, elapsed: 0, scroll: false
  };

  let scene, camera, renderer, rt, postScene, postCam, postMat, sun, water, clock, worldRoot;
  let reflectRT, reflCam, texMatrix, reflReady = false;
  let posCurve, tgtCurve, ready = false;

  const el = id => document.getElementById(id);

  /* ---------- 后期 ---------- */
  function initPost() {
    rt = new T.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: T.LinearFilter, magFilter: T.LinearFilter,
      type: T.HalfFloatType, samples: 4
    });
    rt.texture.encoding = T.LinearEncoding;

    postScene = new T.Scene();
    postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postMat = new T.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: rt.texture },
        uRes: { value: new T.Vector2(window.innerWidth, window.innerHeight) },
        uTime: { value: 0 },
        uPaper: { value: 1.0 },
        uFade: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uRes;
        uniform float uTime, uPaper, uFade;
        varying vec2 vUv;

        vec3 toSRGB(vec3 c){ return pow(max(c,0.0), vec3(1.0/2.2)); }
        vec3 toLinear(vec3 c){ return pow(max(c,0.0), vec3(2.2)); }
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float lum(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }

        void main(){
          vec3 raw = texture2D(tDiffuse, vUv).rgb;
          vec3 c = toSRGB(raw);

          // 绢本暖调 · 略褪朱
          float l = lum(c);
          c = mix(c, vec3(l)*vec3(1.035,1.0,0.945), 0.18);
          c *= vec3(1.03, 1.0, 0.955);
          c = mix(c, c*vec3(1.0,0.99,0.955) + vec3(0.02,0.016,0.006), 0.35);
          c = pow(c, vec3(0.96, 0.97, 1.02));

          // 墨线（轮廓压暗）
          vec2 px = 1.0 / uRes;
          float l0 = lum(c);
          float lx = lum(texture2D(tDiffuse, vUv + vec2(px.x*1.2, 0.0)).rgb);
          float ly = lum(texture2D(tDiffuse, vUv + vec2(0.0, px.y*1.2)).rgb);
          float edge = max(abs(l0-lx), abs(l0-ly));
          float ink = smoothstep(0.07, 0.34, edge) * 0.22 * uPaper;
          c *= (1.0 - ink);
          // 轮廓处微暖
          c = mix(c, c * vec3(0.92,0.88,0.80), ink*0.6);

          // 纸纹
          float grain = hash(floor(vUv * uRes * 0.85) + floor(uTime*3.0));
          c += (grain - 0.5) * 0.022 * uPaper;
          // 纤维
          float fiber = sin(vUv.y*900.0 + sin(vUv.x*33.0)*2.0)*0.5+0.5;
          c += (fiber-0.5) * 0.006 * uPaper;

          // 暗角
          vec2 d = vUv - 0.5;
          float v = smoothstep(0.86, 0.24, length(d*vec2(1.06,1.0)));
          c *= mix(0.80, 1.0, v);

          // 开场淡入
          c *= uFade;

          gl_FragColor = vec4(c, 1.0);
        }`
    });
    const quad = new T.Mesh(new T.PlaneGeometry(2, 2), postMat);
    quad.frustumCulled = false;
    postScene.add(quad);
  }

  /* ---------- 构建 ---------- */
  async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function buildWorld() {
    const loadTxt = el('loadTxt');
    const step = async (txt, fn) => {
      loadTxt.textContent = txt;
      await delay(24);
      fn();
      await delay(0);
    };

    scene = new T.Scene();
    // 全场景 X 镜像：与原卷「右起左行」的左右关系一致（郊野在右、城门在左）
    worldRoot = new T.Group();
    worldRoot.scale.x = -1;
    scene.add(worldRoot);
    QM.worldRoot = worldRoot;
    scene.fog = new T.Fog(0xdcd8c0, 210, 780);
    scene.background = new T.Color(0xcfcfb8);

    camera = new T.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.5, 1200);
    camera.position.set(-238, 20, 60);

    renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    el('app').appendChild(renderer.domElement);

    initPost();
    initReflection();

    const lights = QM.makeLights(scene);
    sun = lights.sun;

    await step('鋪展絹本…', () => { QM.skyMesh = QM.buildSky(scene).sky; QM.buildFar(scene); });
    await step('開鑿汴河…', () => { QM.buildTerrain(worldRoot); QM.buildWater(worldRoot); QM.buildStreets(worldRoot); });
    await step('架設虹橋…', () => { QM.buildBridge(worldRoot); });
    await step('營造城門…', () => { QM.buildGate(worldRoot); });
    await step('佈置街市…', () => { QM.buildTown(worldRoot); });
    await step('種柳植桃…', () => { QM.buildNature(worldRoot); });
    await step('往來人畜…', () => { QM.populate(worldRoot); QM.populateRiver(worldRoot);
    QM.populateDucks(worldRoot); });
    await step('泊舟卸貨…', () => { QM.buildRiverBank(worldRoot); });

    posCurve = new T.CatmullRomCurve3(CAM_POS.map(p => new T.Vector3(p[0], p[1], p[2])), false, 'centripetal');
    tgtCurve = new T.CatmullRomCurve3(CAM_TGT.map(p => new T.Vector3(p[0], p[1], p[2])), false, 'centripetal');

    // 由天穹生成 IBL 环境贴图（PBR 环境光）
    try {
      const pmrem = new T.PMREMGenerator(renderer);
      const envScene = new T.Scene();
      const skySphere = new T.Mesh(new T.SphereGeometry(50, 24, 12), QM.skyMesh.material);
      envScene.add(skySphere);
      const groundDome = new T.Mesh(
        new T.SphereGeometry(48, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        new T.MeshBasicMaterial({ color: 0x8d7f5e, side: T.BackSide })
      );
      envScene.add(groundDome);
      const envRT = pmrem.fromScene(envScene, 0, 0.1, 200);
      scene.environment = envRT.texture;
      pmrem.dispose();
      Object.keys(QM.MAT).forEach(k => {
        const m = QM.MAT[k];
        if (m && m.isMaterial && m.envMapIntensity !== undefined) m.envMapIntensity = 0.26;
      });
    } catch (e) {
      console.warn('IBL 生成失败', e);
    }

    reflReady = !!(QM.water && QM.water.material.uniforms.tReflect);
    clock = new T.Clock();
    ready = true;
    window.addEventListener('resize', onResize);
    bindUI();
    el('enter').disabled = false;
    el('loadTxt').textContent = '卷已展，請入畫中';
    requestAnimationFrame(loop);
  }

  /* ---------- 平面反射（镜像相机） ---------- */
  function initReflection() {
    reflectRT = new T.WebGLRenderTarget(1, 1, {
      minFilter: T.LinearFilter, magFilter: T.LinearFilter, type: T.HalfFloatType
    });
    reflectRT.texture.encoding = T.LinearEncoding;
    reflCam = new T.PerspectiveCamera(38, 1, 1, 900);
    texMatrix = new T.Matrix4();
    reflectRT.setSize(Math.max(2, Math.floor(window.innerWidth * 0.45)), Math.max(2, Math.floor(window.innerHeight * 0.45)));
  }

  const _camPos = new T.Vector3(), _reflUp = new T.Vector3(), _reflTgt = new T.Vector3(), _fwd = new T.Vector3();
  let reflFrame = 0;

  function updateReflection() {
    const w = QM.water;
    if (!reflReady || !w) return;
    _camPos.setFromMatrixPosition(camera.matrixWorld);
    if (_camPos.y <= 0.3) return;
    // 关于 y=0 平面镜像
    reflCam.position.set(_camPos.x, -_camPos.y, _camPos.z);
    _reflUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    _reflUp.y = -_reflUp.y;
    reflCam.up.copy(_reflUp);
    _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    _reflTgt.copy(_camPos).add(_fwd);
    _reflTgt.y = -_reflTgt.y;
    reflCam.lookAt(_reflTgt);
    reflCam.fov = camera.fov;
    reflCam.aspect = camera.aspect;
    reflCam.near = 1;
    reflCam.far = 900;
    reflCam.updateProjectionMatrix();
    reflCam.updateMatrixWorld();

    texMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    texMatrix.multiply(reflCam.projectionMatrix);
    texMatrix.multiply(reflCam.matrixWorldInverse);
    texMatrix.multiply(w.matrixWorld);

    // 每两帧更新一次反射，省一半开销
    const doRender = (reflFrame++ % 4) === 0;
    if (!doRender && w.material.uniforms.tReflect.value) return;

    // 反射通道：隐藏水面与柳絮，避免自反射与闪烁
    w.visible = false;
    if (QM.catkins) QM.catkins.points.visible = false;
    // 反射里隐藏人物，省一次蒙皮与阴影
    const hidden = [];
    if (QM.walkers) {
      for (let i = 0; i < QM.walkers.length; i++) {
        const g = QM.walkers[i].g;
        if (g.visible && g.userData && g.userData.bones) { g.visible = false; hidden.push(g); }
      }
    }
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(reflectRT);
    renderer.clear();
    renderer.render(scene, reflCam);
    renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = true;
    w.visible = true;
    if (QM.catkins) QM.catkins.points.visible = true;
    for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;

    const u = w.material.uniforms;
    u.tReflect.value = reflectRT.texture;
    u.uTexMatrix.value.copy(texMatrix);
    u.uReflect.value = 1.0;
  }

  /* ---------- 相机 ---------- */
  const tmpPos = new T.Vector3(), tmpTgt = new T.Vector3();

  function tourCamera(dt) {
    const s = QM.clamp(state.s, 0, 1);
    posCurve.getPointAt && posCurve.getPointAt(s, tmpPos);
    tgtCurve.getPointAt(s, tmpTgt);
    if (state.catchUp) {
      camera.position.lerp(tmpPos, 0.055);
      camera.lookAt(tmpTgt);
      if (camera.position.distanceTo(tmpPos) < 0.6) state.catchUp = false;
    } else {
      camera.position.copy(tmpPos);
      camera.lookAt(tmpTgt);
    }
    if (state.scroll) {
      // 画卷视角：长焦远距，压缩透视，接近手卷的平行投影观感
      tmpPos.sub(tmpTgt).multiplyScalar(2.45).add(tmpTgt);
      camera.position.copy(tmpPos);
      camera.lookAt(tmpTgt);
    }
    state.freeTarget.copy(tmpTgt);
    const off = camera.position.clone().sub(tmpTgt);
    state.dist = off.length();
    state.yaw = Math.atan2(off.x, off.z);
    state.pitch = Math.asin(QM.clamp(off.y / state.dist, -1, 1));
  }

  function freeCamera() {
    const cp = Math.cos(state.pitch);
    camera.position.set(
      state.freeTarget.x + Math.sin(state.yaw) * cp * state.dist,
      state.freeTarget.y + Math.sin(state.pitch) * state.dist,
      state.freeTarget.z + Math.cos(state.yaw) * cp * state.dist
    );
    camera.lookAt(state.freeTarget);
  }

  function enterFree() {
    state.mode = 'free';
    state.playing = false;
    el('playBtn').classList.remove('on');
    el('playBtn').textContent = '巡游';
    el('hint').classList.remove('gone');
    setTimeout(() => el('hint').classList.add('gone'), 5200);
  }

  function resumeTour() {
    state.mode = 'tour';
    state.playing = true;
    state.catchUp = true;
    el('playBtn').classList.add('on');
    el('playBtn').textContent = '暫停';
  }

  /* ---------- 界面 ---------- */
  function chapterAt(s) {
    let idx = 0;
    for (let i = 0; i < CHAPTERS.length; i++) if (s >= CHAPTERS[i].s - 0.001) idx = i;
    return idx;
  }

  function updateCaption(force) {
    const idx = chapterAt(state.s);
    if (idx === state.chapter && !force) return;
    state.chapter = idx;
    const c = CHAPTERS[idx];
    const cap = el('caption');
    cap.classList.remove('show');
    setTimeout(() => {
      el('capTitle').innerHTML = c.sub + '<span>' + c.name + '</span>';
      el('capText').textContent = c.text;
      cap.classList.add('show');
    }, 260);
    document.querySelectorAll('.chapters button').forEach((b, i) => b.classList.toggle('active', i === idx));
  }

  function bindUI() {
    const seek = el('seek');
    const setSeekFromEvent = (e) => {
      const r = seek.getBoundingClientRect();
      const f = QM.clamp((e.clientX - r.left) / r.width, 0, 1);
      state.s = f;
      state.mode = 'tour';
      state.catchUp = false;
      state.playing = false;
      el('playBtn').classList.remove('on');
      el('playBtn').textContent = '巡游';
    };
    let draggingSeek = false;
    seek.addEventListener('pointerdown', e => { draggingSeek = true; setSeekFromEvent(e); });
    window.addEventListener('pointermove', e => { if (draggingSeek) setSeekFromEvent(e); });
    window.addEventListener('pointerup', () => { draggingSeek = false; });

    el('playBtn').addEventListener('click', () => {
      if (state.mode === 'free') { resumeTour(); return; }
      state.playing = !state.playing;
      el('playBtn').classList.toggle('on', state.playing);
      el('playBtn').textContent = state.playing ? '暫停' : '巡游';
    });

    el('soundBtn').addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      QM.audio.setMuted(!state.soundOn);
      el('soundBtn').classList.toggle('on', state.soundOn);
      el('soundBtn').textContent = state.soundOn ? '聲' : '靜';
    });

    el('scrollBtn').addEventListener('click', () => {
      state.scroll = !state.scroll;
      el('scrollBtn').classList.toggle('on', state.scroll);
      camera.fov = state.scroll ? 16 : 38;
      camera.updateProjectionMatrix();
      state.catchUp = true;
    });

    el('aboutBtn').addEventListener('click', () => el('about').classList.add('show'));
    el('aboutClose').addEventListener('click', () => el('about').classList.remove('show'));

    document.querySelectorAll('.chapters button').forEach(b => {
      b.addEventListener('click', () => {
        state.s = parseFloat(b.dataset.s);
        state.mode = 'tour';
        state.playing = true;
        state.catchUp = true;
        el('playBtn').classList.add('on');
        el('playBtn').textContent = '暫停';
        updateCaption(true);
        el('hint').classList.add('gone');
      });
    });

    // 画布交互
    const dom = renderer.domElement;
    let down = false, lastX = 0, lastY = 0, moved = 0;
    dom.addEventListener('pointerdown', e => {
      down = true; lastX = e.clientX; lastY = e.clientY; moved = 0;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 4) return;
      if (state.mode !== 'free') enterFree();
      state.yaw -= dx * 0.005;
      state.pitch = QM.clamp(state.pitch + dy * 0.004, -0.15, 1.25);
    });
    window.addEventListener('pointerup', () => { down = false; });
    dom.addEventListener('wheel', e => {
      e.preventDefault();
      if (state.mode !== 'free') enterFree();
      state.dist = QM.clamp(state.dist * Math.exp(e.deltaY * 0.0011), 8, 190);
    }, { passive: false });
    dom.addEventListener('dblclick', () => resumeTour());
    window.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.mode === 'tour') {
          state.playing = !state.playing;
          el('playBtn').classList.toggle('on', state.playing);
          el('playBtn').textContent = state.playing ? '暫停' : '巡游';
        }
      }
      if (e.code === 'ArrowRight') { state.s = QM.clamp(state.s + 0.02, 0, 1); state.catchUp = true; }
      if (e.code === 'ArrowLeft') { state.s = QM.clamp(state.s - 0.02, 0, 1); state.catchUp = true; }
      if (e.key === 'm' || e.key === 'M') el('soundBtn').click();
    });

    el('enter').addEventListener('click', () => {
      el('intro').classList.add('hide');
      state.s = 0;
      state.mode = 'tour';
      state.playing = true;
      state.catchUp = false;
      QM.audio.start();
      updateCaption(true);
      setTimeout(() => el('hint').classList.add('gone'), 9000);
      el('hint').classList.remove('gone');
    });
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    rt.setSize(w, h);
    if (reflectRT) reflectRT.setSize(Math.max(2, Math.floor(w * 0.45)), Math.max(2, Math.floor(h * 0.45)));
    postMat.uniforms.uRes.value.set(w, h);
  }

  /* ---------- 主循环 ---------- */
  let fpsAcc = 0, fpsN = 0, fpsT = 0, frameNo = 0;

  function loop() {
    requestAnimationFrame(loop);
    if (!ready) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (state.mode === 'tour') {
      if (state.playing) {
        state.s += dt * state.speed;
        if (state.s > 1) { state.s = 1; state.playing = false; el('playBtn').classList.remove('on'); el('playBtn').textContent = '巡游'; }
      }
      tourCamera(dt);
    } else {
      freeCamera();
    }

    // 太阳随视点
    const focus = state.freeTarget;
    sun.position.set(focus.x + 46, 82, focus.z + 58);
    sun.target.position.set(focus.x, 2, focus.z);
    sun.target.updateMatrixWorld();

    // 时间
    const wt = QM.water.material.uniforms.uTime;
    wt.value = t;
    if (QM.clouds) QM.clouds.forEach((c, i) => { c.position.x += dt * (0.6 + i * 0.1); if (c.position.x > 520) c.position.x = -520; });

    if (QM.grassMat && QM.grassMat.userData.windShader) QM.grassMat.userData.windShader.uniforms.uTime.value = t;
    if (QM.cardMat) {
      const sh = QM.cardMat.userData.shader;
      if (sh) sh.uniforms.uTime.value = t;
    }
    if (QM.reedMat && QM.reedMat.userData.windShader) QM.reedMat.userData.windShader.uniforms.uTime.value = t;
    const camLocal = { x: -camera.position.x, y: camera.position.y, z: camera.position.z };
    if (QM.updateHeadLOD) QM.updateHeadLOD(camLocal);
    if (QM.updateGrassLOD && (frameNo % 8 === 0)) QM.updateGrassLOD(camLocal);
    if (QM.updateTreeLOD && (frameNo++ % 8 === 0)) QM.updateTreeLOD(camLocal);
    if (QM.updateLife) QM.updateLife(dt, t);
    if (QM.animateNature) QM.animateNature(t);

    // 进度与字幕
    const pct = state.s * 100;
    el('fill').style.width = pct + '%';
    el('knob').style.left = pct + '%';
    updateCaption();
    const secs = Math.floor(state.s * 152);
    el('clock').textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');

    // —— 帧内计时（调试用）——
    const _t0 = performance.now();
    // 反射
    updateReflection();
    const _t1 = performance.now();

    // 渲染
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    const calls = renderer.info.render.calls;
    renderer.setRenderTarget(null);
    const _t2 = performance.now();
    postMat.uniforms.uTime.value = t;
    postMat.uniforms.uFade.value = Math.min(1, (postMat.uniforms.uFade.value || 0) + dt * 0.7);
    renderer.render(postScene, postCam);
    const _t3 = performance.now();
    QM.perf = QM.perf || { refl: 0, main: 0, post: 0, n: 0 };
    QM.perf.refl += _t1 - _t0;
    QM.perf.main += _t2 - _t1;
    QM.perf.post += _t3 - _t2;
    QM.perf.n++;

    // FPS
    fpsAcc += dt; fpsN++; fpsT += dt;
    if (fpsT > 0.6) {
      el('fps').textContent = Math.round(fpsN / fpsAcc) + ' FPS · ' + calls + ' draws';
      fpsAcc = 0; fpsN = 0; fpsT = 0;
    }
  }

  /* ---------- 启动 ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    buildWorld().catch(err => {
      console.error(err);
      el('loadTxt').textContent = '构建失败：' + err.message;
    });
  });

  QM.app = { state, get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; } };

})(window.QM);
