/*
 * 3D yetkazish kvadrokopteri (three.js r128).
 * Barcha qismlar oddiy shakllardan kod bilan yasalgan; har biri tuzilish-data.js dagi
 * qism id'siga bog'langan: tanlash, qismlarga ajratish, ajratib ko'rsatish va
 * parvoz harakatlari (motor tezliklari, og'ish, havo oqimi) shu yerda.
 * O'lchov birligi: 1 = 10 sm. Y — yuqoriga, -Z — dronning oldi.
 */
(function (root) {
  'use strict';

  const D = root.DronParts;

  function create(container, opts) {
    const THREE = root.THREE;
    const o = opts || {};
    if (!THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: false });
    } catch (e) {
      return null;
    }
    if (!renderer.getContext()) return null;

    renderer.setPixelRatio(Math.min(1.75, root.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = 'stage-canvas';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    const labelLayer = document.createElement('div');
    labelLayer.className = 'stage-labels';
    container.appendChild(labelLayer);

    // ---------- Yorug'lik ----------
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9aab, 0.75);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(5, 12, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -7;
    sun.shadow.camera.right = 7;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -7;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 30;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-6, 3, -5);
    scene.add(fill);

    // ---------- Yer ----------
    const GROUND_Y = -2.7;
    const groundGroup = new THREE.Group();
    scene.add(groundGroup);
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.16 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = GROUND_Y;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);
    let grid = null;
    const GRID_CELL = 1;

    function buildGrid(lineColor, centerColor) {
      if (grid) groundGroup.remove(grid);
      grid = new THREE.GridHelper(48, 48, centerColor, lineColor);
      grid.position.y = GROUND_Y + 0.001;
      grid.material.transparent = true;
      grid.material.opacity = 0.55;
      groundGroup.add(grid);
    }

    // ---------- Materiallar ----------
    const M = {
      carbon: { color: 0x2a2f36, roughness: 0.42, metalness: 0.25 },
      carbonTube: { color: 0x1f2328, roughness: 0.35, metalness: 0.3 },
      alu: { color: 0xa9b2bc, roughness: 0.32, metalness: 0.75 },
      darkAlu: { color: 0x4b525b, roughness: 0.4, metalness: 0.6 },
      bell: { color: 0xc9561e, roughness: 0.38, metalness: 0.55 },
      motorBase: { color: 0x2c3036, roughness: 0.5, metalness: 0.5 },
      propCW: { color: 0x2f6fb2, roughness: 0.5, metalness: 0.05 },
      propCCW: { color: 0xe08a00, roughness: 0.5, metalness: 0.05 },
      escWrap: { color: 0x27476e, roughness: 0.55, metalness: 0.05 },
      pcbGreen: { color: 0x1c5a3a, roughness: 0.6, metalness: 0.1 },
      pcbBlack: { color: 0x15181c, roughness: 0.55, metalness: 0.15 },
      chip: { color: 0x101114, roughness: 0.35, metalness: 0.2 },
      imuChip: { color: 0x2b2f35, roughness: 0.3, metalness: 0.3 },
      gold: { color: 0xc9a043, roughness: 0.3, metalness: 0.9 },
      foam: { color: 0x0b0c0d, roughness: 1, metalness: 0 },
      white: { color: 0xe7eaee, roughness: 0.5, metalness: 0.05 },
      plastic: { color: 0x3a4048, roughness: 0.6, metalness: 0.05 },
      rubber: { color: 0x141516, roughness: 0.9, metalness: 0 },
      red: { color: 0xb8322a, roughness: 0.5, metalness: 0.05 },
      black: { color: 0x111214, roughness: 0.6, metalness: 0.05 },
      yellow: { color: 0xd8b21c, roughness: 0.5, metalness: 0.05 },
      battery: { color: 0x22416f, roughness: 0.55, metalness: 0.05 },
      strap: { color: 0x1a1b1d, roughness: 0.95, metalness: 0 },
      glass: { color: 0x0b1a2a, roughness: 0.05, metalness: 0.9 },
      cardboard: { color: 0xc4945a, roughness: 0.85, metalness: 0 },
      tape: { color: 0xe3d6b6, roughness: 0.6, metalness: 0 },
      line: { color: 0xdcdcdc, roughness: 0.7, metalness: 0 },
      gear: { color: 0xd9dde2, roughness: 0.45, metalness: 0.1 },
      led: { color: 0x37d67a, roughness: 0.3, metalness: 0, emissive: 0x1d9a4f },
    };

    // ---------- Qismlar ro'yxati ----------
    const parts = {}; // id -> { objects: [], materials: [] }
    const pieces = []; // { obj, part, base: Vector3, offset: Vector3 }
    const pickables = [];
    D.PARTS.forEach((p) => { parts[p.id] = { id: p.id, objects: [], materials: [], anchor: null }; });

    function mat(partId, key, extra) {
      const def = Object.assign({}, M[key], extra || {});
      const m = new THREE.MeshStandardMaterial(def);
      m.userData.baseEmissive = new THREE.Color(def.emissive || 0x000000);
      m.userData.baseOpacity = def.opacity != null ? def.opacity : 1;
      m.userData.baseTransparent = !!def.transparent;
      parts[partId].materials.push(m);
      return m;
    }

    function mesh(partId, geo, key, extra, shadow) {
      const m = new THREE.Mesh(geo, mat(partId, key, extra));
      m.castShadow = shadow !== false;
      m.receiveShadow = false;
      m.userData.part = partId;
      pickables.push(m);
      return m;
    }

    function piece(partId, obj, offset, parent) {
      (parent || drone).add(obj);
      pieces.push({ obj, part: partId, base: obj.position.clone(), offset: offset || new THREE.Vector3() });
      parts[partId].objects.push(obj);
      if (!parts[partId].anchor) parts[partId].anchor = obj;
      return obj;
    }

    function tube(partId, points, radius, key) {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
      return mesh(partId, new THREE.TubeGeometry(curve, Math.max(8, points.length * 6), radius, 6, false), key, null, false);
    }

    function textTexture(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }

    function roundedRectShape(w, h, r) {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }

    // Buralgan vint parragi: kesim burchagi atan(qadam / 2πr)
    function bladeGeometry(R, rootR, pitch, chordMax, sign) {
      const S = 18;
      const C = 6;
      const pos = [];
      const idx = [];
      for (let i = 0; i <= S; i++) {
        const u = i / S;
        const r = rootR + (R - rootR) * u;
        const chord = chordMax * (u < 0.18 ? 0.55 + (u / 0.18) * 0.45 : 1 - 0.62 * Math.pow((u - 0.18) / 0.82, 1.6));
        const beta = Math.atan(pitch / (2 * Math.PI * r)) * sign;
        for (let j = 0; j <= C; j++) {
          const v = j / C - 0.5;
          const cz = v * chord - 0.12 * chord;
          const cy = 0.07 * chord * (1 - 4 * v * v);
          pos.push(r, cy * Math.cos(beta) - cz * Math.sin(beta), cy * Math.sin(beta) + cz * Math.cos(beta));
        }
      }
      for (let i = 0; i < S; i++) {
        for (let j = 0; j < C; j++) {
          const a = i * (C + 1) + j;
          const b = a + C + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    // ---------- Dron ----------
    const droneRoot = new THREE.Group(); // parvozda siljiydi va buriladi
    scene.add(droneRoot);
    const drone = new THREE.Group(); // og'ish shu guruhga beriladi
    droneRoot.add(drone);
    drone.rotation.order = 'YXZ';

    const ARM_R = 3.25; // 650 mm wheelbase / 2
    const PROP_R = 1.9; // 15″ vint
    const MOTOR_POS = {
      FR: [ARM_R * Math.SQRT1_2, -ARM_R * Math.SQRT1_2],
      RL: [-ARM_R * Math.SQRT1_2, ARM_R * Math.SQRT1_2],
      FL: [-ARM_R * Math.SQRT1_2, -ARM_R * Math.SQRT1_2],
      RR: [ARM_R * Math.SQRT1_2, ARM_R * Math.SQRT1_2],
    };
    const PLATE_TOP = 0.44;
    const ARM_Y = 0.22;
    const MOUNT_Y = 0.36;
    const BELL_Y0 = 0.44;
    const BELL_H = 0.26;
    const PROP_Y = 0.8;

    // Rama: plastinalar, nurlar, motor tagliklari
    const plateGeo = new THREE.ExtrudeGeometry(roundedRectShape(2.0, 2.0, 0.35), { depth: 0.04, bevelEnabled: false });
    plateGeo.rotateX(-Math.PI / 2);
    const bottomPlate = mesh('rama', plateGeo, 'carbon');
    bottomPlate.position.y = 0;
    piece('rama', bottomPlate);
    const topPlate = mesh('rama', plateGeo.clone(), 'carbon');
    topPlate.position.y = PLATE_TOP;
    piece('rama', topPlate, new THREE.Vector3(0, 0.9, 0));
    [[0.78, 0.78], [-0.78, 0.78], [0.78, -0.78], [-0.78, -0.78], [0, 0.85], [0, -0.85]].forEach(([x, z]) => {
      const st = mesh('rama', new THREE.CylinderGeometry(0.035, 0.035, PLATE_TOP, 8), 'alu', null, false);
      st.position.set(x, PLATE_TOP / 2 + 0.02, z);
      piece('rama', st, new THREE.Vector3(0, 0.45, 0));
    });

    D.MOTORS.forEach((mInfo) => {
      const [mx, mz] = MOTOR_POS[mInfo.pos];
      const ang = Math.atan2(mz, mx);
      const out = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
      // Nur
      const len = ARM_R - 0.55;
      const arm = mesh('rama', new THREE.CylinderGeometry(0.11, 0.11, len, 14), 'carbonTube');
      arm.rotation.z = Math.PI / 2;
      const armG = new THREE.Group();
      armG.add(arm);
      arm.position.x = 0.55 + len / 2;
      armG.rotation.y = -ang;
      armG.position.y = ARM_Y;
      piece('rama', armG, out.clone().multiplyScalar(0.25));
      // Qisqich
      const clamp = mesh('rama', new THREE.BoxGeometry(0.42, 0.3, 0.32), 'darkAlu');
      clamp.position.set(Math.cos(ang) * 0.95, ARM_Y, Math.sin(ang) * 0.95);
      clamp.rotation.y = -ang;
      piece('rama', clamp, out.clone().multiplyScalar(0.25));
      // Motor tagligi
      const mount = mesh('rama', new THREE.BoxGeometry(0.62, 0.08, 0.5), 'darkAlu');
      mount.position.set(mx, MOUNT_Y - 0.04, mz);
      mount.rotation.y = -ang;
      piece('rama', mount, out.clone().multiplyScalar(0.3));
      const mclamp = mesh('rama', new THREE.CylinderGeometry(0.16, 0.16, 0.36, 14), 'darkAlu');
      mclamp.rotation.z = Math.PI / 2;
      const mcg = new THREE.Group();
      mcg.add(mclamp);
      mcg.position.set(mx - Math.cos(ang) * 0.05, ARM_Y, mz - Math.sin(ang) * 0.05);
      mcg.rotation.y = -ang;
      piece('rama', mcg, out.clone().multiplyScalar(0.3));
    });

    // Motorlar va vintlar
    const motorGroups = [];
    const propGroups = [];
    const bellSpinners = [];
    const discs = [];
    D.MOTORS.forEach((mInfo, i) => {
      const [mx, mz] = MOTOR_POS[mInfo.pos];
      const out = new THREE.Vector3(mx, 0, mz).normalize();
      const g = new THREE.Group();
      g.position.set(mx, 0, mz);
      const base = mesh('motor', new THREE.CylinderGeometry(0.25, 0.27, 0.08, 24), 'motorBase');
      base.position.y = MOUNT_Y + 0.04;
      g.add(base);
      const spinner = new THREE.Group();
      spinner.position.y = BELL_Y0;
      const bell = mesh('motor', new THREE.CylinderGeometry(0.24, 0.24, BELL_H, 28), 'bell');
      bell.position.y = BELL_H / 2;
      spinner.add(bell);
      const cap = mesh('motor', new THREE.CylinderGeometry(0.17, 0.24, 0.05, 28), 'motorBase');
      cap.position.y = BELL_H + 0.02;
      spinner.add(cap);
      for (let k = 0; k < 6; k++) {
        const slot = mesh('motor', new THREE.BoxGeometry(0.05, 0.06, 0.13), 'black', null, false);
        const a = (k / 6) * Math.PI * 2;
        slot.position.set(Math.cos(a) * 0.12, BELL_H + 0.045, Math.sin(a) * 0.12);
        slot.rotation.y = -a;
        spinner.add(slot);
      }
      const shaft = mesh('motor', new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), 'alu', null, false);
      shaft.position.y = BELL_H + 0.1;
      spinner.add(shaft);
      g.add(spinner);
      bellSpinners.push(spinner);
      piece('motor', g, out.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0.55, 0)));
      motorGroups.push(g);

      // Vint
      const sign = mInfo.dir === 'CCW' ? 1 : -1;
      const pg = new THREE.Group();
      pg.position.set(mx, PROP_Y, mz);
      const spin = new THREE.Group();
      const key = mInfo.dir === 'CW' ? 'propCW' : 'propCCW';
      const bladeGeo = bladeGeometry(PROP_R, 0.16, 1.4, 0.36, sign);
      for (let b = 0; b < 2; b++) {
        const blade = mesh('vint', bladeGeo, key, { side: THREE.DoubleSide });
        blade.rotation.y = b * Math.PI;
        spin.add(blade);
      }
      const hub = mesh('vint', new THREE.CylinderGeometry(0.13, 0.15, 0.1, 18), 'black');
      spin.add(hub);
      const nut = mesh('vint', new THREE.CylinderGeometry(0.07, 0.07, 0.1, 6), 'alu', null, false);
      nut.position.y = 0.09;
      spin.add(nut);
      pg.add(spin);
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(PROP_R, 48),
        new THREE.MeshBasicMaterial({ color: mInfo.dir === 'CW' ? 0x2f6fb2 : 0xe08a00, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.01;
      pg.add(disc);
      discs.push(disc);
      pg.userData.spin = spin;
      pg.userData.sign = sign;
      piece('vint', pg, out.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, 1.6, 0)));
      propGroups.push(pg);

      // ESC: nur ostida
      const escPos = 0.58;
      const ex = mx * escPos;
      const ez = mz * escPos;
      const ang = Math.atan2(mz, mx);
      const escG = new THREE.Group();
      escG.position.set(ex, ARM_Y - 0.2, ez);
      escG.rotation.y = -ang;
      const escBody = mesh('esc', new THREE.BoxGeometry(0.6, 0.12, 0.26), 'escWrap');
      escG.add(escBody);
      const escLabel = mesh('esc', new THREE.BoxGeometry(0.3, 0.005, 0.18), 'white', null, false);
      escLabel.position.set(0, -0.063, 0);
      escG.add(escLabel);
      [[-0.05, 'red'], [0.05, 'black']].forEach(([dz, k]) => {
        const w = mesh('esc', new THREE.CylinderGeometry(0.025, 0.025, 0.45, 6), k, null, false);
        w.rotation.z = Math.PI / 2;
        w.position.set(-0.5, 0.02, dz);
        escG.add(w);
      });
      [-0.06, 0, 0.06].forEach((dz) => {
        const w = mesh('esc', new THREE.CylinderGeometry(0.018, 0.018, 0.7, 6), 'black', null, false);
        w.rotation.z = Math.PI / 2;
        w.position.set(0.62, 0.05, dz);
        escG.add(w);
      });
      piece('esc', escG, new THREE.Vector3(0, -0.8, 0).add(out.clone().multiplyScalar(0.25)));
    });

    // Quvvat taqsimlash platasi (ikki plastina orasida)
    const pdb = new THREE.Group();
    pdb.position.y = 0.13;
    const pdbBoard = mesh('pdb', new THREE.BoxGeometry(1.15, 0.04, 1.15), 'pcbGreen');
    pdb.add(pdbBoard);
    [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]].forEach(([x, z]) => {
      const pad = mesh('pdb', new THREE.BoxGeometry(0.22, 0.02, 0.22), 'gold', null, false);
      pad.position.set(x, 0.03, z);
      pdb.add(pad);
    });
    const bec = mesh('pdb', new THREE.BoxGeometry(0.22, 0.08, 0.16), 'chip');
    bec.position.set(0, 0.06, 0.1);
    pdb.add(bec);
    const xt = mesh('pdb', new THREE.BoxGeometry(0.2, 0.1, 0.14), 'yellow');
    xt.position.set(0, 0.0, 0.72);
    pdb.add(xt);
    piece('pdb', pdb, new THREE.Vector3(0, 0.35, 0));

    // Parvoz kontrolleri, IMU, barometr
    const FC_Y = PLATE_TOP + 0.11;
    const fc = new THREE.Group();
    fc.position.set(0, FC_Y, 0);
    const fcTex = textTexture(256, 160, (g, w, h) => {
      g.fillStyle = '#15181c';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a043';
      g.lineWidth = 3;
      g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(w / 2, 14); g.lineTo(w / 2 + 16, 44); g.lineTo(w / 2 - 16, 44); g.closePath();
      g.fill();
      g.font = 'bold 18px sans-serif';
      g.textAlign = 'center';
      g.fillText('OLD', w / 2, 64);
      g.font = '14px monospace';
      g.fillText('FC  H743', w / 2, h - 18);
    });
    const fcBoard = mesh('fc', new THREE.BoxGeometry(0.62, 0.035, 0.9), 'pcbBlack');
    // Strelka va yozuv platanining ustki yuzasida
    const fcTop = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.88), mat('fc', 'pcbBlack', { map: fcTex, color: 0xffffff }));
    fcTop.rotation.x = -Math.PI / 2;
    fcTop.position.y = 0.019;
    fcTop.userData.part = 'fc';
    pickables.push(fcTop);
    fc.add(fcBoard);
    fc.add(fcTop);
    const mcu = mesh('fc', new THREE.BoxGeometry(0.2, 0.03, 0.2), 'chip');
    mcu.position.set(0, 0.03, 0.08);
    fc.add(mcu);
    [[-0.27, 0.3], [0.27, 0.3], [-0.27, -0.3], [0.27, -0.3]].forEach(([x, z]) => {
      const damp = mesh('fc', new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), 'rubber', null, false);
      damp.position.set(x, -0.06, z);
      fc.add(damp);
    });
    [-0.2, 0, 0.2].forEach((x) => {
      const con = mesh('fc', new THREE.BoxGeometry(0.12, 0.06, 0.06), 'white', null, false);
      con.position.set(x, 0.04, 0.4);
      fc.add(con);
    });
    piece('fc', fc, new THREE.Vector3(0, 1.7, 0));

    const imu = mesh('imu', new THREE.BoxGeometry(0.09, 0.025, 0.09), 'imuChip');
    imu.position.set(-0.14, FC_Y + 0.03, -0.12);
    const imuDot = mesh('imu', new THREE.CircleGeometry(0.012, 10), 'white', null, false);
    imuDot.rotation.x = -Math.PI / 2;
    imuDot.position.set(-0.025, 0.0135, -0.025);
    imu.add(imuDot);
    piece('imu', imu, new THREE.Vector3(0, 2.15, 0));

    const baro = new THREE.Group();
    baro.position.set(0.15, FC_Y + 0.03, -0.14);
    const baroChip = mesh('baro', new THREE.BoxGeometry(0.07, 0.02, 0.07), 'chip');
    baro.add(baroChip);
    const foam = mesh('baro', new THREE.BoxGeometry(0.13, 0.08, 0.13), 'foam', { transparent: true, opacity: 0.92 });
    foam.position.y = 0.05;
    baro.add(foam);
    piece('baro', baro, new THREE.Vector3(0, 2.35, 0));

    // GPS ustuni
    const gps = new THREE.Group();
    gps.position.set(0, PLATE_TOP + 0.04, 0.78);
    const mast = mesh('gps', new THREE.CylinderGeometry(0.035, 0.035, 1.05, 10), 'alu');
    mast.position.y = 0.53;
    gps.add(mast);
    const hinge = mesh('gps', new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), 'plastic', null, false);
    hinge.position.y = 0.08;
    gps.add(hinge);
    const puckTex = textTexture(256, 256, (g, w) => {
      g.fillStyle = '#e7eaee';
      g.fillRect(0, 0, w, w);
      g.fillStyle = '#20252b';
      g.beginPath();
      g.moveTo(w / 2, 40); g.lineTo(w / 2 + 40, 120); g.lineTo(w / 2 + 14, 120); g.lineTo(w / 2 + 14, 190);
      g.lineTo(w / 2 - 14, 190); g.lineTo(w / 2 - 14, 120); g.lineTo(w / 2 - 40, 120); g.closePath();
      g.fill();
      g.font = 'bold 26px sans-serif';
      g.textAlign = 'center';
      g.fillText('GPS', w / 2, 232);
    });
    const puck = mesh('gps', new THREE.CylinderGeometry(0.38, 0.4, 0.14, 36), 'white');
    puck.position.y = 1.1;
    gps.add(puck);
    const puckTop = new THREE.Mesh(new THREE.CircleGeometry(0.37, 36), mat('gps', 'white', { map: puckTex, color: 0xffffff }));
    puckTop.rotation.x = -Math.PI / 2;
    puckTop.position.y = 1.172;
    puckTop.userData.part = 'gps';
    pickables.push(puckTop);
    gps.add(puckTop);
    piece('gps', gps, new THREE.Vector3(0, 2.6, 0.5));

    // Radio qabul qilgich
    const rx = new THREE.Group();
    rx.position.set(0.62, PLATE_TOP + 0.08, 0.5);
    rx.add(mesh('rx', new THREE.BoxGeometry(0.32, 0.07, 0.24), 'plastic'));
    const led = mesh('rx', new THREE.SphereGeometry(0.025, 10, 8), 'led', null, false);
    led.position.set(0.1, 0.04, -0.08);
    rx.add(led);
    [[0.6, 0.5], [-0.6, 0.9]].forEach(([tilt, yawA]) => {
      const ant = new THREE.Group();
      const coax = mesh('rx', new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), 'black', null, false);
      coax.position.y = 0.27;
      ant.add(coax);
      const tip = mesh('rx', new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), 'white', null, false);
      tip.position.y = 0.62;
      ant.add(tip);
      ant.position.set(0, 0.03, 0.1);
      ant.rotation.set(tilt, yawA, 0.0);
      rx.add(ant);
    });
    piece('rx', rx, new THREE.Vector3(0.8, 1.5, 0.4));

    // Telemetriya
    const tel = new THREE.Group();
    tel.position.set(-0.62, PLATE_TOP + 0.1, 0.48);
    tel.add(mesh('telem', new THREE.BoxGeometry(0.36, 0.12, 0.28), 'darkAlu'));
    const duck = mesh('telem', new THREE.CylinderGeometry(0.035, 0.03, 0.75, 10), 'rubber');
    duck.position.set(-0.05, 0.42, 0.06);
    duck.rotation.z = 0.25;
    tel.add(duck);
    const sma = mesh('telem', new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), 'gold', null, false);
    sma.position.set(-0.02, 0.08, 0.06);
    tel.add(sma);
    piece('telem', tel, new THREE.Vector3(-0.8, 1.5, 0.4));

    // Batareya
    const bat = new THREE.Group();
    bat.position.set(0, -0.37, 0.05);
    const batTex = textTexture(512, 256, (g, w, h) => {
      g.fillStyle = '#22416f';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e7eaee';
      g.fillRect(0, h * 0.62, w, 6);
      g.font = 'bold 54px sans-serif';
      g.textAlign = 'center';
      g.fillText('LiPo 6S', w / 2, 92);
      g.font = '34px sans-serif';
      g.fillText('10 000 mAh · 22,2 V · 25C', w / 2, 148);
      g.font = '28px monospace';
      g.fillText('222 Wh', w / 2, 220);
    });
    const batBody = mesh('batareya', new THREE.BoxGeometry(0.82, 0.6, 1.72), 'battery');
    bat.add(batBody);
    const batSide = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), mat('batareya', 'battery', { map: batTex, color: 0xffffff }));
    batSide.position.set(0.411, 0, 0);
    batSide.rotation.y = Math.PI / 2;
    batSide.userData.part = 'batareya';
    pickables.push(batSide);
    bat.add(batSide);
    const batSide2 = batSide.clone();
    batSide2.position.x = -0.411;
    batSide2.rotation.y = -Math.PI / 2;
    pickables.push(batSide2);
    bat.add(batSide2);
    [-0.45, 0.45].forEach((z) => {
      const strap = mesh('batareya', new THREE.BoxGeometry(0.86, 0.64, 0.12), 'strap', null, false);
      strap.position.z = z;
      bat.add(strap);
    });
    const lead = tube('batareya', [[0.12, 0.3, 0.86], [0.15, 0.42, 0.98], [0.05, 0.5, 0.86]], 0.035, 'red');
    bat.add(lead);
    const lead2 = tube('batareya', [[-0.05, 0.3, 0.86], [-0.08, 0.42, 0.98], [-0.03, 0.5, 0.86]], 0.035, 'black');
    bat.add(lead2);
    const bal = mesh('batareya', new THREE.BoxGeometry(0.2, 0.05, 0.08), 'white', null, false);
    bal.position.set(0.25, 0.32, 0.88);
    bat.add(bal);
    piece('batareya', bat, new THREE.Vector3(0, -1.25, 0));

    // Kamera va gimbal
    const cam = new THREE.Group();
    cam.position.set(0, -0.05, -0.92);
    const bracket = mesh('kamera', new THREE.BoxGeometry(0.3, 0.06, 0.3), 'darkAlu');
    cam.add(bracket);
    const yawMotor = mesh('kamera', new THREE.CylinderGeometry(0.11, 0.11, 0.1, 18), 'motorBase');
    yawMotor.position.y = -0.09;
    cam.add(yawMotor);
    const gArm = mesh('kamera', new THREE.BoxGeometry(0.05, 0.32, 0.08), 'darkAlu');
    gArm.position.set(0.2, -0.26, -0.05);
    cam.add(gArm);
    const camBody = mesh('kamera', new THREE.BoxGeometry(0.34, 0.26, 0.3), 'plastic');
    camBody.position.set(0, -0.36, -0.08);
    cam.add(camBody);
    const lens = mesh('kamera', new THREE.CylinderGeometry(0.085, 0.095, 0.12, 20), 'black');
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.36, -0.28);
    cam.add(lens);
    const glass = mesh('kamera', new THREE.CircleGeometry(0.07, 20), 'glass', null, false);
    glass.position.set(0, -0.36, -0.341);
    glass.rotation.y = Math.PI;
    cam.add(glass);
    piece('kamera', cam, new THREE.Vector3(0, -0.9, -1.1));

    // Lebyodka va posilka
    const winch = new THREE.Group();
    winch.position.set(0, -0.84, 0.32);
    winch.add(mesh('yuk', new THREE.BoxGeometry(0.5, 0.26, 0.46), 'darkAlu'));
    const spool = mesh('yuk', new THREE.CylinderGeometry(0.11, 0.11, 0.34, 16), 'alu');
    spool.rotation.z = Math.PI / 2;
    spool.position.y = -0.17;
    winch.add(spool);
    const rope = mesh('yuk', new THREE.CylinderGeometry(0.008, 0.008, 0.78, 6), 'line', null, false);
    rope.position.y = -0.62;
    winch.add(rope);
    const hook = mesh('yuk', new THREE.TorusGeometry(0.06, 0.016, 8, 18, Math.PI * 1.6), 'alu', null, false);
    hook.position.y = -1.06;
    hook.rotation.z = Math.PI * 0.7;
    winch.add(hook);
    const parcel = mesh('yuk', new THREE.BoxGeometry(0.62, 0.42, 0.5), 'cardboard');
    parcel.position.y = -1.33;
    winch.add(parcel);
    const tape = mesh('yuk', new THREE.BoxGeometry(0.63, 0.425, 0.1), 'tape', null, false);
    tape.position.y = -1.33;
    winch.add(tape);
    piece('yuk', winch, new THREE.Vector3(0, -2.0, 0));

    // Qo'nish oyoqlari
    [-1, 1].forEach((side) => {
      const legG = new THREE.Group();
      const sx = side * 1.05;
      [[-0.55], [0.55]].forEach(([z]) => {
        const leg = tube('oyoq', [[side * 0.62, -0.02, z], [side * 0.8, -0.8, z], [sx, -1.6, z]], 0.045, 'gear');
        legG.add(leg);
      });
      const skid = mesh('oyoq', new THREE.CylinderGeometry(0.05, 0.05, 2.5, 10), 'gear');
      skid.rotation.x = Math.PI / 2;
      skid.position.set(sx, -1.6, 0);
      legG.add(skid);
      [-1.25, 1.25].forEach((z) => {
        const end = mesh('oyoq', new THREE.SphereGeometry(0.06, 10, 8), 'rubber', null, false);
        end.position.set(sx, -1.6, z);
        legG.add(end);
      });
      piece('oyoq', legG, new THREE.Vector3(side * 0.9, -0.5, 0));
    });

    // Kuch strelkalari va havo oqimi
    const arrows = propGroups.map((pg) => {
      const a = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(pg.position.x, PROP_Y + 0.12, pg.position.z), 1, 0x2f6fb2, 0.28, 0.18);
      a.visible = false;
      drone.add(a);
      return a;
    });
    const FLOW_N = 44;
    const flowPos = new Float32Array(FLOW_N * 4 * 3);
    const flowState = [];
    for (let i = 0; i < FLOW_N * 4; i++) {
      flowState.push({ m: Math.floor(i / FLOW_N), a: Math.random() * Math.PI * 2, r: Math.sqrt(Math.random()) * PROP_R * 0.85, y: -Math.random() * 3.2 });
    }
    const flowGeo = new THREE.BufferGeometry();
    flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
    const flowMat = new THREE.PointsMaterial({ color: 0x5ea9e8, size: 0.06, transparent: true, opacity: 0, depthWrite: false });
    const flow = new THREE.Points(flowGeo, flowMat);
    flow.frustumCulled = false;
    drone.add(flow);

    // ---------- Holat ----------
    const state = {
      mode: 'parts',
      explode: 0, explodeTarget: 0,
      spin: false,
      maneuver: 'hover', mNow: [1, 1, 1, 1],
      tilt: [0, 0], yaw: 0, climbY: 0,
      selected: null, focus: [],
      labels: true,
      path: null, pathT: 0,
      failT: 0,
      flowOn: false,
    };

    // ---------- Kamera boshqaruvi ----------
    const cam3 = { dist: 11, theta: 0.75, phi: 0.42, target: new THREE.Vector3(0, 0, 0) };
    let tween = null;

    function applyCamera() {
      const c = Math.cos(cam3.phi);
      // Tor ekranda (telefon) dron to'liq sig'ishi uchun uzoqroqdan qaraymiz
      const aspect = camera.aspect || 1;
      const dist = cam3.dist * (aspect < 1.25 ? Math.pow(1.25 / aspect, 0.9) : 1);
      camera.position.set(
        cam3.target.x + dist * c * Math.sin(cam3.theta),
        cam3.target.y + dist * Math.sin(cam3.phi),
        cam3.target.z - dist * c * Math.cos(cam3.theta)
      );
      camera.lookAt(cam3.target);
    }

    // Qism ajratilganda qayerda bo'lishini hisoblaymiz (animatsiya tugashini kutmasdan)
    function settledPosition(obj) {
      const pc = pieces.find((x) => x.obj === obj);
      const local = pc ? pc.base.clone().addScaledVector(pc.offset, state.explodeTarget) : obj.position.clone();
      return local.add(droneRoot.position);
    }

    function viewTarget(name) {
      if (name === 'motor') return settledPosition(motorGroups[0]).add(new THREE.Vector3(0, 0.55, 0));
      if (name === 'fc') return settledPosition(fc);
      const v = D.VIEWS[name] || D.VIEWS.iso;
      return new THREE.Vector3(0, v[3], 0).add(droneRoot.position);
    }

    function setView(name, instant) {
      const v = D.VIEWS[name] || D.VIEWS.iso;
      const to = { dist: v[0], theta: v[1], phi: v[2], target: viewTarget(name) };
      if (state.explodeTarget > 0.5) {
        if (name === 'fc') to.dist *= 1.35;
        else { to.dist *= 1.5; to.target.y += 0.6; }
      }
      if (instant) {
        Object.assign(cam3, { dist: to.dist, theta: to.theta, phi: to.phi });
        cam3.target.copy(to.target);
        applyCamera();
        return;
      }
      // Eng qisqa yo'l bilan aylanamiz
      let dTheta = to.theta - cam3.theta;
      dTheta = ((dTheta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      tween = {
        t: 0, dur: 0.9,
        from: { dist: cam3.dist, theta: cam3.theta, phi: cam3.phi, target: cam3.target.clone() },
        to: { dist: to.dist, theta: cam3.theta + dTheta, phi: to.phi, target: to.target },
      };
    }

    const pointers = new Map();
    let dragMoved = 0;
    let pinch0 = 0;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragMoved = 0;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      }
      tween = null;
    });
    el.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      if (pointers.size === 1) {
        cam3.theta += dx * 0.008;
        cam3.phi = Math.max(-1.25, Math.min(1.52, cam3.phi + dy * 0.008));
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 0) cam3.dist = Math.max(2, Math.min(28, cam3.dist * (pinch0 / d)));
        pinch0 = d;
      }
    });
    function endPointer(e) {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (wasSingle && dragMoved < 6 && e.type === 'pointerup') pick(e);
    }
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      cam3.dist = Math.max(2, Math.min(28, cam3.dist * (e.deltaY > 0 ? 1.1 : 0.9)));
      tween = null;
    }, { passive: false });

    const ray = new THREE.Raycaster();
    function pick(e) {
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hits = ray.intersectObjects(pickables, false).filter((h) => {
        const m = h.object.material;
        return !m.transparent || m.opacity > 0.4;
      });
      const id = hits.length ? hits[0].object.userData.part : null;
      if (o.onPick) o.onPick(id);
    }

    // ---------- Ajratib ko'rsatish ----------
    const accent = new THREE.Color(0x5ea9e8);

    // Kichik qismlar atrofidagi qismlar ham ko'rinib tursin (masalan, IMU va uning platasi)
    const CONTEXT = { imu: ['fc', 'baro'], baro: ['fc', 'imu'], fc: ['imu', 'baro'], esc: ['rama'], pdb: ['rama'] };

    function refreshHighlight() {
      const focus = new Set(state.focus);
      if (state.selected) focus.add(state.selected);
      const context = new Set();
      focus.forEach((id) => (CONTEXT[id] || []).forEach((c) => { if (!focus.has(c)) context.add(c); }));
      let lit = null;
      if (state.path) lit = state.path[Math.floor(state.pathT) % state.path.length];
      Object.values(parts).forEach((p) => {
        const isFocus = focus.has(p.id) || p.id === lit;
        const dim = (focus.size > 0 || state.path) && !isFocus && !context.has(p.id);
        const passed = state.path && state.path.indexOf(p.id) >= 0 && state.path.indexOf(p.id) < Math.floor(state.pathT) % state.path.length;
        p.materials.forEach((m) => {
          m.transparent = dim ? true : m.userData.baseTransparent;
          m.opacity = dim ? (passed ? 0.5 : 0.07) : m.userData.baseOpacity;
          m.depthWrite = !dim;
          m.emissive.copy(m.userData.baseEmissive);
          if (isFocus) m.emissive.lerp(accent, p.id === lit ? 0.5 : 0.28);
        });
      });
    }

    // ---------- Yorliqlar ----------
    const labels = {};
    D.PARTS.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'stage-label';
      b.type = 'button';
      b.textContent = p.name;
      b.addEventListener('click', (e) => { e.stopPropagation(); if (o.onPick) o.onPick(p.id); });
      labelLayer.appendChild(b);
      labels[p.id] = b;
    });
    const motorTags = D.MOTORS.map((m) => {
      const t = document.createElement('span');
      t.className = 'stage-tag';
      t.textContent = `M${m.n} ${m.dir === 'CW' ? '↻' : '↺'}`;
      labelLayer.appendChild(t);
      return t;
    });
    const LABEL_OFFSET = {
      rama: [1.2, 0.3, -0.9], motor: [0, 0.5, 0], vint: [0.9, 0.15, 0.6], esc: [0, -0.15, 0], pdb: [0.7, 0, 0],
      fc: [0, 0.12, -0.35], imu: [0, 0.05, 0], baro: [0, 0.12, 0], gps: [0, 1.3, 0], rx: [0.2, 0.3, 0.2],
      telem: [-0.1, 0.8, 0], batareya: [0.45, -0.1, 0.5], kamera: [0, -0.4, -0.2], yuk: [0.35, -1.3, 0], oyoq: [0.1, -1.6, 1.2],
    };
    const tmp = new THREE.Vector3();

    function updateLabels(w, h) {
      const showAll = state.labels && state.mode === 'parts';
      const focus = new Set(state.focus);
      if (state.selected) focus.add(state.selected);
      const placed = [];
      const items = [];
      D.PARTS.forEach((p) => {
        const lb = labels[p.id];
        const visible = showAll || focus.has(p.id) || (state.path && state.path.includes(p.id));
        if (!visible) { lb.hidden = true; return; }
        const anchor = parts[p.id].anchor;
        const off = LABEL_OFFSET[p.id] || [0, 0.3, 0];
        anchor.getWorldPosition(tmp);
        tmp.x += off[0]; tmp.y += off[1]; tmp.z += off[2];
        tmp.project(camera);
        if (tmp.z > 1) { lb.hidden = true; return; }
        lb.hidden = false;
        if (!lb._w) { lb._w = lb.offsetWidth; lb._h = lb.offsetHeight; }
        items.push({ lb, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, on: focus.has(p.id) });
      });
      // Yorliqlar bir-birini yopmasligi uchun pastga suramiz
      items.sort((a, b) => b.on - a.on || a.y - b.y);
      items.forEach((it) => {
        const bw = (it.lb._w || 80) + 4;
        const bh = (it.lb._h || 20) + 3;
        let y = it.y;
        for (let k = 0; k < 8; k++) {
          const hit = placed.find((r) => Math.abs(r.x - it.x) < (r.w + bw) / 2 && Math.abs(r.y - y) < (r.h + bh) / 2);
          if (!hit) break;
          y = hit.y + (hit.h + bh) / 2 + 1;
        }
        placed.push({ x: it.x, y, w: bw, h: bh });
        if (y > h - 24 || y < 8) { it.lb.hidden = true; return; }
        it.lb.style.transform = `translate(${it.x}px, ${y}px) translate(-50%, -50%)`;
        it.lb.classList.toggle('on', it.on);
      });
      const showTags = state.mode === 'flight';
      motorTags.forEach((t, i) => {
        if (!showTags) { t.hidden = true; return; }
        propGroups[i].getWorldPosition(tmp);
        tmp.y += 0.35;
        tmp.project(camera);
        t.hidden = tmp.z > 1;
        t.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -100%)`;
        t.classList.toggle('off', state.mNow[i] < 0.05);
      });
    }

    // ---------- Kadr ----------
    let running = false;
    let last = 0;
    let width = 0;
    let height = 0;
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    function resize() {
      const r = container.getBoundingClientRect();
      width = Math.max(1, Math.round(r.width));
      height = Math.max(1, Math.round(r.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      tick(dt);
      renderer.render(scene, camera);
      updateLabels(width, height);
      if (o.onFrame) o.onFrame(api);
      requestAnimationFrame(frame);
    }

    function tick(dt) {
      // Qismlarga ajratish
      state.explode += (state.explodeTarget - state.explode) * Math.min(1, dt * 4);
      const e = easeInOut(Math.max(0, Math.min(1, state.explode)));
      pieces.forEach((pc) => { pc.obj.position.copy(pc.base).addScaledVector(pc.offset, e); });

      // Parvoz harakati
      const flying = state.mode === 'flight' || state.flowOn;
      const man = D.MANEUVERS[state.maneuver] || D.MANEUVERS.hover;
      const target = flying ? man.m : [1, 1, 1, 1];
      for (let i = 0; i < 4; i++) state.mNow[i] += (target[i] - state.mNow[i]) * Math.min(1, dt * 6);
      const tiltT = state.mode === 'flight' ? man.tilt : [0, 0];
      state.tilt[0] += (tiltT[0] - state.tilt[0]) * Math.min(1, dt * 2.5);
      state.tilt[1] += (tiltT[1] - state.tilt[1]) * Math.min(1, dt * 2.5);
      if (state.mode === 'flight') {
        state.yaw -= man.yaw * 0.9 * dt;
        state.climbY = Math.max(-0.9, Math.min(1.4, state.climbY + man.climb * 0.6 * dt));
        // Yer harakati: dron siljiyotgandek
        const sp = 2.2;
        const c = Math.cos(state.yaw);
        const s = Math.sin(state.yaw);
        const vx = (man.move[0] * c + man.move[1] * s) * sp;
        const vz = (-man.move[0] * s + man.move[1] * c) * sp;
        const k = Math.max(0.15, Math.abs(Math.sin(state.tilt[0])) + Math.abs(Math.sin(state.tilt[1]))) / 0.26;
        groundGroup.position.x = (((groundGroup.position.x - vx * dt * k) % GRID_CELL) + GRID_CELL) % GRID_CELL;
        groundGroup.position.z = (((groundGroup.position.z - vz * dt * k) % GRID_CELL) + GRID_CELL) % GRID_CELL;
        if (state.maneuver === 'fail') {
          state.failT += dt;
          if (state.failT > 2.6 && o.onFailEnd) { state.failT = 0; o.onFailEnd(); }
        }
        if (state.maneuver === 'hover') state.climbY += (0 - state.climbY) * Math.min(1, dt * 0.8);
      } else {
        state.yaw += (0 - state.yaw) * Math.min(1, dt * 2);
        state.climbY += (0 - state.climbY) * Math.min(1, dt * 2);
      }
      drone.rotation.set(-state.tilt[0], state.yaw, -state.tilt[1]);
      droneRoot.position.y = state.climbY;

      // Vintlar va motorlar aylanishi
      const spinning = flying || state.spin;
      propGroups.forEach((pg, i) => {
        const m = spinning ? state.mNow[i] : 0;
        const w = m * 26 * pg.userData.sign;
        pg.userData.spin.rotation.y += w * dt;
        bellSpinners[i].rotation.y += w * dt;
        discs[i].material.opacity = Math.min(0.14, m * 0.14);
      });

      // Kuch strelkalari
      arrows.forEach((a, i) => {
        a.visible = state.mode === 'flight';
        const thrust = state.mNow[i] * state.mNow[i];
        a.setLength(Math.max(0.05, thrust * 1.4), 0.28, 0.18);
      });

      // Havo oqimi
      flowMat.opacity += ((flying ? 0.7 : 0) - flowMat.opacity) * Math.min(1, dt * 3);
      if (flowMat.opacity > 0.01) {
        for (let i = 0; i < flowState.length; i++) {
          const f = flowState[i];
          const m = state.mNow[f.m];
          f.y -= (1.2 + 2.8 * m) * dt * (m > 0.05 ? 1 : 0);
          if (f.y < -3.4) {
            f.y = 0;
            f.a = Math.random() * Math.PI * 2;
            f.r = Math.sqrt(Math.random()) * PROP_R * 0.85;
          }
          const pg = propGroups[f.m];
          const shrink = 1 - Math.min(0.3, -f.y * 0.12);
          flowPos[i * 3] = pg.position.x + Math.cos(f.a) * f.r * shrink;
          flowPos[i * 3 + 1] = PROP_Y - 0.08 + f.y;
          flowPos[i * 3 + 2] = pg.position.z + Math.sin(f.a) * f.r * shrink;
        }
        flowGeo.attributes.position.needsUpdate = true;
      }

      // Yo'l (energiya yoki signal) bo'ylab yonish
      if (state.path) {
        const before = Math.floor(state.pathT);
        state.pathT += dt * 1.25;
        if (Math.floor(state.pathT) !== before) refreshHighlight();
      }

      // Kamera
      if (tween) {
        tween.t += dt / tween.dur;
        const t = easeInOut(Math.min(1, tween.t));
        cam3.dist = tween.from.dist + (tween.to.dist - tween.from.dist) * t;
        cam3.theta = tween.from.theta + (tween.to.theta - tween.from.theta) * t;
        cam3.phi = tween.from.phi + (tween.to.phi - tween.from.phi) * t;
        cam3.target.lerpVectors(tween.from.target, tween.to.target, t);
        if (tween.t >= 1) tween = null;
      } else if (state.mode === 'flight') {
        cam3.target.y += (droneRoot.position.y - cam3.target.y) * Math.min(1, dt * 2);
      }
      applyCamera();
    }

    // ---------- Tashqi boshqaruv ----------
    const api = {
      get state() { return state; },
      get rpm() { return state.mNow.map((m) => Math.round(m * D.HOVER_RPM)); },
      setMode(mode) {
        state.mode = mode;
        state.failT = 0;
        if (mode !== 'flight') state.maneuver = 'hover';
        refreshHighlight();
      },
      select(id) {
        state.selected = id || null;
        refreshHighlight();
      },
      focus(list) {
        state.focus = list || [];
        refreshHighlight();
      },
      setPath(list) {
        state.path = list && list.length ? list : null;
        state.pathT = 0;
        refreshHighlight();
      },
      setExplode(on) { state.explodeTarget = on ? 1 : 0; },
      setLabels(on) { state.labels = !!on; },
      setSpin(on) { state.spin = !!on; },
      setFlow(on) { state.flowOn = !!on; },
      setManeuver(id) {
        state.maneuver = D.MANEUVERS[id] ? id : 'hover';
        state.failT = 0;
      },
      setView,
      resetView() { setView(state.mode === 'flight' ? 'iso' : 'iso'); },
      setTheme(t) {
        scene.background = new THREE.Color(t.stage);
        buildGrid(new THREE.Color(t.grid), new THREE.Color(t.gridCenter));
        accent.set(t.accent);
        flowMat.color.set(t.accent);
        arrows.forEach((a) => a.setColor(new THREE.Color(t.accent)));
        refreshHighlight();
      },
      resize,
      start() {
        if (running) return;
        running = true;
        resize();
        last = performance.now();
        requestAnimationFrame(frame);
      },
      stop() { running = false; },
      partCenter(id) {
        const box = new THREE.Box3();
        parts[id].objects.forEach((ob) => box.expandByObject(ob));
        return box.getCenter(new THREE.Vector3());
      },
    };

    setView('iso', true);
    resize();
    return api;
  }

  root.DronDrone3D = { create };
})(typeof self !== 'undefined' ? self : this);
