/* ============================================================
 * 070-interior.js — 球内深化：前景（宫灯组/兔鹤灯）、中景（回廊+月洞门/灯桌/书案）、
 * 后景（山石梅枝+镂空屏风）、空中楼阁（三座六角双檐+步廊+浮灯悬灯）、
 * 动态：23 悬灯轻摆、8 莲灯桥间漂移、18 梅瓣飘落、前院/侧院补光
 * ============================================================ */

/* ---------- 灯笼几何（小宫灯：圆柱灯身+顶底盖+穗） ---------- */
function lanternMesh(scale, matName, glowName) {
  const g = grp(
    cyl(0.05 * scale, 0.05 * scale, 0.09 * scale, 10, mat(glowName), 0, 0, 0),
    cyl(0.055 * scale, 0.045 * scale, 0.02 * scale, 10, mat('gold'), 0, 0.055 * scale, 0),
    cyl(0.045 * scale, 0.055 * scale, 0.02 * scale, 10, mat('gold'), 0, -0.055 * scale, 0),
    cyl(0.006 * scale, 0.006 * scale, 0.06 * scale, 4, mat('red'), 0, -0.09 * scale, 0),
  );
  return g;
}

/* ============================================================
 * 前景：左右宫灯组 + 分枝小灯 + 兔灯鹤灯 + 石铺路
 * ============================================================ */
function buildForeground() {
  const batch = new MergeBatch();
  // 左右宫灯组（石座+立柱+挑灯）
  for (const sx of [-1, 1]) {
    const lx = sx * 1.9, lz = 3.35;
    batch.add('jadeD', new BoxGeometry(0.3, 0.12, 0.3), M.compose(lx, GROUND + 0.06, lz));
    batch.add('jade', new CylinderGeometry(0.05, 0.06, 0.5, 8), M.compose(lx, GROUND + 0.37, lz));
    batch.add('snow', new CylinderGeometry(0.065, 0.065, 0.03, 8), M.compose(lx, GROUND + 0.63, lz));
    // 挑臂+分枝小灯（两盏小灯挂挑臂两端）
    batch.add('wood', new BoxGeometry(0.34, 0.03, 0.03), M.compose(lx, GROUND + 0.64, lz));
    for (const dx of [-0.15, 0.15]) {
      batch.add('red', new BoxGeometry(0.006, 0.05, 0.006), M.compose(lx + dx, GROUND + 0.6, lz));
      batch.add('lampRed', new CylinderGeometry(0.035, 0.035, 0.055, 8), M.compose(lx + dx, GROUND + 0.55, lz));
      batch.add('gold', new CylinderGeometry(0.04, 0.032, 0.012, 8), M.compose(lx + dx, GROUND + 0.58, lz));
    }
  }
  // 兔灯（左前，白身+长耳+红眼，内透光）
  {
    const rx = -1.15, rz = 3.9;
    batch.add('paper', new SphereGeometry(0.09, 10, 8), M.compose(rx, GROUND + 0.1, rz, 0, 1, 1.25, 1));
    batch.add('paper', new BoxGeometry(0.03, 0.12, 0.02), M.compose(rx - 0.03, GROUND + 0.2, rz, 0, 0.15, 1, 1));
    batch.add('paper', new BoxGeometry(0.03, 0.12, 0.02), M.compose(rx + 0.03, GROUND + 0.2, rz, 0, -0.15, 1, 1));
    batch.add('red', new SphereGeometry(0.012, 6, 5), M.compose(rx - 0.05, GROUND + 0.12, rz + 0.07));
    batch.add('red', new SphereGeometry(0.012, 6, 5), M.compose(rx + 0.05, GROUND + 0.12, rz + 0.07));
    batch.add('paper', new SphereGeometry(0.035, 8, 6), M.compose(rx, GROUND + 0.05, rz - 0.08));
    batch.add('lampWarm', new SphereGeometry(0.05, 8, 6), M.compose(rx, GROUND + 0.09, rz));
    // 小拉车杆
    batch.add('wood', new BoxGeometry(0.02, 0.02, 0.2), M.compose(rx, GROUND + 0.06, rz + 0.16));
  }
  // 鹤灯（右前：白身+长颈+红顶+展翅）
  {
    const hx = 1.15, hz = 3.9;
    batch.add('paper', new SphereGeometry(0.075, 10, 8), M.compose(hx, GROUND + 0.14, hz, 0, 1, 1, 1.15));
    batch.add('paper', new CylinderGeometry(0.02, 0.03, 0.16, 8), M.compose(hx, GROUND + 0.26, hz - 0.02, -0.25, 1, 1, 1));
    batch.add('paper', new SphereGeometry(0.028, 8, 6), M.compose(hx, GROUND + 0.34, hz - 0.05));
    batch.add('red', new ConeGeometry(0.018, 0.04, 6), M.compose(hx, GROUND + 0.37, hz - 0.05, Math.PI, 1, 1, 1));
    batch.add('paper', new BoxGeometry(0.16, 0.01, 0.07), M.compose(hx, GROUND + 0.16, hz, 0, 0, 0.5, 1));
    batch.add('paper', new BoxGeometry(0.16, 0.01, 0.07), M.compose(hx, GROUND + 0.16, hz, 0, 0, -0.5, 1));
    batch.add('gold', new BoxGeometry(0.03, 0.05, 0.03), M.compose(hx - 0.01, GROUND + 0.05, hz + 0.03, 0, 0.3, 1, 1));
    batch.add('lampWarm', new SphereGeometry(0.04, 8, 6), M.compose(hx, GROUND + 0.13, hz));
  }
  // 石铺路（御道两侧，浅色石板交错）
  for (let z = 2.9; z < 5.2; z += 0.34) {
    for (const sx of [-1, 1]) {
      for (let c = 0; c < 3; c++) {
        const px = sx * (0.75 + c * 0.32 + (Math.floor(z / 0.34) % 2) * 0.16);
        batch.add('jadeD', new BoxGeometry(0.28, 0.02, 0.3), M.compose(px, groundHeight(px, z) + 0.008, z));
      }
    }
  }
  batch.build(sceneInner);
}
buildForeground();

/* ============================================================
 * 中景：两条覆雪回廊（真实开洞月洞门）、左灯桌、右书案
 * ============================================================ */
function buildCorridors() {
  const batch = new MergeBatch();
  for (const sx of [-1, 1]) {
    const cx = sx * 3.25, z0 = 0.4, z1 = 3.1;
    const colH = 0.62;
    // 柱列（沿 z）
    for (let z = z0; z <= z1 + 1e-6; z += 0.45) {
      batch.add('red', new CylinderGeometry(0.035, 0.04, colH, 8), M.compose(cx, GROUND + colH / 2, z));
    }
    // 青枋
    batch.add('teal', new BoxGeometry(0.12, 0.07, z1 - z0 + 0.2), M.compose(cx, GROUND + colH + 0.03, (z0 + z1) / 2));
    // 廊顶（双坡小顶+覆雪）
    const roofW = 0.62, roofY = GROUND + colH + 0.3;
    for (const dz of [-1, 1]) {
      const pos = [], idx = [];
      const rows = 5, cols = 10;
      for (let i = 0; i <= rows; i++) {
        const u = i / rows;
        const y = roofY - u * 0.22 + 0.05 * smoothstep(0.7, 1, u);
        const halfW = lerp(0.06, roofW / 2, u);
        for (let j = 0; j <= cols; j++) pos.push(cx + dz * lerp(0, 0.5, u), y, z0 - 0.1 + (j / cols) * (z1 - z0 + 0.2));
        for (let j = 0; j <= cols; j++) pos.push(cx + dz * lerp(0, 0.5, u), y, z0 - 0.1 + (j / cols) * (z1 - z0 + 0.2));
      }
      // 简化：直接用倾斜板
      batch.add('tile', new BoxGeometry(roofW, 0.03, z1 - z0 + 0.24), M.compose(cx + dz * roofW * 0.35, roofY - 0.1, (z0 + z1) / 2, 0, 0, dz * 0.42, 1));
      batch.add('snow', new BoxGeometry(roofW * 0.94, 0.035, z1 - z0 + 0.2), M.compose(cx + dz * roofW * 0.36, roofY - 0.075, (z0 + z1) / 2, 0, 0, dz * 0.42, 1));
    }
    // 覆雪脊线
    batch.add('snow', new BoxGeometry(0.1, 0.05, z1 - z0 + 0.24), M.compose(cx, roofY + 0.02, (z0 + z1) / 2));
    // —— 月洞门（廊中段墙板，真实开洞：Shape+hole 挤出） ——
    const wallZ = (z0 + z1) / 2;
    const shape = new Shape();
    const hw = 0.55, hh = 0.78;
    shape.moveTo(cx - hw, GROUND);
    shape.lineTo(cx + hw, GROUND);
    shape.lineTo(cx + hw, GROUND + hh);
    shape.lineTo(cx - hw, GROUND + hh);
    shape.lineTo(cx - hw, GROUND);
    const hole = new Path();
    hole.absarc(cx, GROUND + 0.42, 0.3, 0, TAU);
    shape.holes.push(hole);
    const wallGeo = new ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: false });
    batch.add('redD', wallGeo, M.compose(0, 0, wallZ - 0.035, 0, 1, 1, 1));
    // 月洞门边框（金环）
    batch.add('gold', new TorusGeometry(0.31, 0.025, 8, 24), M.compose(cx, GROUND + 0.42, wallZ, 0, 0, 1, 1, 1));
    // 墙顶小瓦檐+雪
    batch.add('tile', new BoxGeometry(hw * 2 + 0.2, 0.05, 0.16), M.compose(cx, GROUND + hh + 0.02, wallZ));
    batch.add('snow', new BoxGeometry(hw * 2 + 0.18, 0.04, 0.14), M.compose(cx, GROUND + hh + 0.06, wallZ));
    // 廊下栏杆
    for (let z = z0 + 0.1; z <= z1; z += 0.22) {
      batch.add('jade', new BoxGeometry(0.03, 0.14, 0.03), M.compose(cx - sx * 0.28, GROUND + 0.07, z));
    }
    batch.add('jade', new BoxGeometry(0.035, 0.03, z1 - z0), M.compose(cx - sx * 0.28, GROUND + 0.14, (z0 + z1) / 2));
    // 碰撞（廊顶近似）
    Colliders.add({
      type: 'roof', minX: cx - roofW / 2 - 0.05, maxX: cx + roofW / 2 + 0.05, minZ: z0 - 0.12, maxZ: z1 + 0.12,
      minY: roofY - 0.3, maxY: roofY + 0.1,
      heightAt: (x) => roofY - Math.abs(x - cx) * 0.42 + 0.1, slope: () => 0.42,
    });
  }
  batch.build(sceneInner);
}
buildCorridors();

/* ---------- 左灯桌（灯/线框/流苏/纸卷/凳） ---------- */
function buildLampTable() {
  const batch = new MergeBatch();
  const tx = -2.55, tz = 1.75, ty = GROUND + 0.34;
  // 桌（面+腿）
  batch.add('wood', new BoxGeometry(0.5, 0.03, 0.34), M.compose(tx, ty, tz));
  for (const dx of [-0.21, 0.21]) for (const dz of [-0.13, 0.13]) {
    batch.add('woodD', new BoxGeometry(0.025, 0.32, 0.025), M.compose(tx + dx, GROUND + 0.16, tz + dz));
  }
  // 桌上主灯（小灯笼）
  batch.add('lampSoft', new CylinderGeometry(0.05, 0.05, 0.09, 10), M.compose(tx - 0.12, ty + 0.075, tz));
  batch.add('gold', new CylinderGeometry(0.055, 0.045, 0.018, 10), M.compose(tx - 0.12, ty + 0.13, tz));
  batch.add('gold', new CylinderGeometry(0.045, 0.055, 0.018, 10), M.compose(tx - 0.12, ty + 0.02, tz));
  batch.add('red', new BoxGeometry(0.005, 0.05, 0.005), M.compose(tx - 0.12, ty - 0.035, tz));
  // 线框（细金属丝立方框，罩灯）
  for (const dy of [0.0, 0.09]) {
    batch.add('goldHi', new BoxGeometry(0.13, 0.005, 0.13), M.compose(tx - 0.12, ty + 0.025 + dy, tz));
  }
  for (const dx of [-0.065, 0.065]) for (const dz of [-0.065, 0.065]) {
    batch.add('goldHi', new BoxGeometry(0.004, 0.1, 0.004), M.compose(tx - 0.12 + dx, ty + 0.07, tz + dz));
  }
  // 流苏（红穗）
  for (let i = 0; i < 5; i++) {
    batch.add('red', new BoxGeometry(0.008, 0.06, 0.008), M.compose(tx - 0.12 + Math.cos(i * 1.26) * 0.04, ty - 0.05, tz + Math.sin(i * 1.26) * 0.04));
  }
  // 纸卷（两支）
  batch.add('paper', new CylinderGeometry(0.014, 0.014, 0.2, 8), M.compose(tx + 0.1, ty + 0.02, tz - 0.05, 0, 0, Math.PI / 2, 1));
  batch.add('paper', new CylinderGeometry(0.012, 0.012, 0.16, 8), M.compose(tx + 0.12, ty + 0.05, tz + 0.04, 0.4, 0, Math.PI / 2, 1));
  // 凳（两只）
  for (const [fx, fz] of [[tx - 0.35, tz + 0.1], [tx + 0.3, tz - 0.25]]) {
    batch.add('wood', new CylinderGeometry(0.09, 0.08, 0.025, 10), M.compose(fx, GROUND + 0.13, fz));
    batch.add('woodD', new CylinderGeometry(0.012, 0.015, 0.12, 6), M.compose(fx, GROUND + 0.06, fz));
  }
  batch.build(sceneInner);
}
buildLampTable();

/* ---------- 右书案（书册/香具） ---------- */
function buildDesk() {
  const batch = new MergeBatch();
  const tx = 2.55, tz = 1.75, ty = GROUND + 0.34;
  batch.add('wood', new BoxGeometry(0.52, 0.03, 0.34), M.compose(tx, ty, tz));
  for (const dx of [-0.22, 0.22]) for (const dz of [-0.13, 0.13]) {
    batch.add('woodD', new BoxGeometry(0.025, 0.32, 0.025), M.compose(tx + dx, GROUND + 0.16, tz + dz));
  }
  // 书册（叠三册）
  for (let b = 0; b < 3; b++) {
    batch.add(b % 2 ? 'teal' : 'blue', new BoxGeometry(0.14 - b * 0.015, 0.028, 0.1), M.compose(tx - 0.14, ty + 0.015 + b * 0.028, tz - 0.04, 0, b * 0.12, 0, 1));
    batch.add('paper', new BoxGeometry(0.135 - b * 0.015, 0.004, 0.095), M.compose(tx - 0.14, ty + 0.03 + b * 0.028, tz - 0.04, 0, b * 0.12, 0, 1));
  }
  // 香具（小炉+盖+香柱+烟孔）
  batch.add('bronze', new CylinderGeometry(0.05, 0.035, 0.05, 10), M.compose(tx + 0.1, ty + 0.04, tz + 0.05));
  batch.add('bronze', new TorusGeometry(0.05, 0.008, 5, 12), M.compose(tx + 0.1, ty + 0.06, tz + 0.05, Math.PI / 2, 1, 1, 1));
  batch.add('red', new CylinderGeometry(0.004, 0.004, 0.05, 4), M.compose(tx + 0.1, ty + 0.08, tz + 0.05, 0, 0, 0.2, 1));
  // 笔搁+笔
  batch.add('jade', new TorusGeometry(0.025, 0.006, 5, 10, Math.PI), M.compose(tx + 0.18, ty + 0.02, tz - 0.08, 0, 0, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.007, 0.1, 0.007), M.compose(tx + 0.15, ty + 0.07, tz - 0.08, 0, 0, 0.3, 1));
  batch.build(sceneInner);
}
buildDesk();

/* ============================================================
 * 后景：抬高石台 + 雪覆山石 + 松树梅枝 + 镂空山水屏风
 * ============================================================ */
function buildBackdrop() {
  const batch = new MergeBatch();
  const bz = -4.6;
  // 抬高石台
  batch.add('jadeD', new BoxGeometry(4.6, 0.5, 1.6), M.compose(0, GROUND + 0.25, bz));
  batch.add('snow', new BoxGeometry(4.64, 0.07, 1.64), M.compose(0, GROUND + 0.53, bz));
  // 雪覆山石（不规则多面体，Icosahedron 变形）
  for (let i = 0; i < 7; i++) {
    const sx = -1.9 + i * 0.62 + rng.range(-0.1, 0.1);
    const sz = bz + rng.range(-0.4, 0.4);
    const s = rng.range(0.16, 0.34);
    const rock = new IcosahedronGeometry(s, 0);
    const p = rock.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * (0.8 + rng.next() * 0.4), p.getY(v) * (0.55 + rng.next() * 0.3), p.getZ(v) * (0.8 + rng.next() * 0.4));
    }
    rock.computeVertexNormals();
    batch.add('jade', rock, M.compose(sx, GROUND + 0.55 + s * 0.3, sz));
    batch.add('snow', new SphereGeometry(s * 0.6, 8, 6), M.compose(sx, GROUND + 0.55 + s * 0.62, sz, 0, 1, 1, 0.55));
  }
  // 松树（后景两棵大松）
  for (const [px, pz, ph] of [[-1.6, bz + 0.3, 1.4], [1.7, bz - 0.2, 1.2]]) {
    batch.add('woodD', new CylinderGeometry(0.04, 0.06, ph * 0.35, 6), M.compose(px, GROUND + 0.5 + ph * 0.17, pz));
    for (let L = 0; L < 5; L++) {
      const ly = GROUND + 0.5 + ph * (0.35 + L * 0.14);
      batch.add('tealD', new ConeGeometry(ph * (0.3 - L * 0.045), ph * 0.22, 7), M.compose(px, ly, pz));
      batch.add('snow', new ConeGeometry(ph * (0.27 - L * 0.04), ph * 0.09, 7), M.compose(px, ly + ph * 0.08, pz));
    }
    Colliders.add({ type: 'cylinder', x: px, z: pz, r: 0.3, y0: GROUND + 0.5, y1: GROUND + 0.5 + ph });
  }
  // 梅枝（横斜枯枝+红梅点+雪点）
  for (const [mx, mz] of [[-0.7, bz + 0.35], [0.8, bz + 0.2]]) {
    batch.add('woodD', new BoxGeometry(0.7, 0.03, 0.03), M.compose(mx, GROUND + 0.95, mz, 0, 0, 0.35, 1));
    batch.add('woodD', new BoxGeometry(0.35, 0.025, 0.025), M.compose(mx + 0.25, GROUND + 1.12, mz, 0, 0.3, 0.6, 1));
    for (let b = 0; b < 9; b++) {
      const fx = mx - 0.3 + rng.next() * 0.65;
      const fy = GROUND + 0.85 + rng.next() * 0.4;
      batch.add('red', new SphereGeometry(0.022, 6, 5), M.compose(fx, fy, mz + rng.range(-0.08, 0.08)));
    }
    for (let b = 0; b < 5; b++) {
      batch.add('snow', new SphereGeometry(0.016, 5, 4), M.compose(mx - 0.25 + rng.next() * 0.55, GROUND + 0.98 + rng.next() * 0.2, mz + rng.range(-0.05, 0.05)));
    }
  }
  // —— 背面镂空山水屏风（石座+镂空板） ——
  const pz = bz - 0.72;
  batch.add('jadeD', new BoxGeometry(4.8, 0.22, 0.3), M.compose(0, GROUND + 0.11, pz));
  // 屏板：Shape 挖山形孔
  const shape = new Shape();
  shape.moveTo(-2.3, GROUND + 0.2);
  shape.lineTo(2.3, GROUND + 0.2);
  shape.lineTo(2.3, GROUND + 1.5);
  shape.lineTo(-2.3, GROUND + 1.5);
  shape.closePath();
  // 镂空：三重山形孔+月孔
  for (const [mx, mw, mh, my] of [[-1.4, 0.7, 0.55, 0.25], [0.1, 0.9, 0.75, 0.2], [1.3, 0.6, 0.45, 0.3]]) {
    const hole = new Path();
    hole.moveTo(mx - mw / 2, GROUND + 0.2 + my);
    hole.lineTo(mx, GROUND + 0.2 + my + mh);
    hole.lineTo(mx + mw / 2, GROUND + 0.2 + my);
    hole.closePath();
    shape.holes.push(hole);
  }
  const moonHole = new Path();
  moonHole.absarc(1.75, GROUND + 1.15, 0.16, 0, TAU);
  shape.holes.push(moonHole);
  const screenGeo = new ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  batch.add('jade', screenGeo, M.compose(0, 0, pz, 0, 1, 1, 1));
  // 屏风框柱
  for (const fx of [-2.3, 2.3]) {
    batch.add('wood', new BoxGeometry(0.09, 1.45, 0.1), M.compose(fx, GROUND + 0.9, pz));
    batch.add('snow', new BoxGeometry(0.11, 0.05, 0.12), M.compose(fx, GROUND + 1.62, pz));
  }
  batch.add('wood', new BoxGeometry(4.75, 0.08, 0.1), M.compose(0, GROUND + 1.6, pz));
  batch.add('snow', new BoxGeometry(4.7, 0.05, 0.09), M.compose(0, GROUND + 1.66, pz));
  batch.build(sceneInner);
  // 碰撞（石台+屏风）
  Colliders.add({ type: 'box', minX: -2.3, maxX: 2.3, minZ: bz - 0.8, maxZ: bz + 0.8, minY: GROUND, maxY: GROUND + 0.55 });
}
buildBackdrop();

/* ============================================================
 * 空中楼阁：三座六角双檐 + 两段拱形步廊 + 云托/悬石/垂链 + 浮灯/悬灯
 * ============================================================ */
const skyPavilions = []; // {group, lamps:[], mainLamp}
function buildSkyPavilions() {
  const batch = new MergeBatch();
  const spots = [
    { x: -3.1, y: 9.0, z: -1.6, s: 1.0 },
    { x: 3.1, y: 9.0, z: -1.6, s: 1.0 },
    { x: 0, y: 10.6, z: -3.3, s: 1.15 },
  ];
  for (const sp of spots) {
    const { x, y, z, s } = sp;
    const R = 0.42 * s;
    // 六角台基
    batch.add('jade', new CylinderGeometry(R * 1.25, R * 1.35, 0.09 * s, 6), M.compose(x, y - 0.05, z));
    // 六柱（红柱）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      batch.add('red', new CylinderGeometry(0.022 * s, 0.026 * s, 0.34 * s, 6), M.compose(x + Math.cos(a) * R, y + 0.17 * s, z + Math.sin(a) * R));
    }
    // 柱间栏杆
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      const a2 = ((i + 1) / 6) * TAU + Math.PI / 6;
      const mx = x + Math.cos((a + a2) / 2) * R, mz = z + Math.sin((a + a2) / 2) * R;
      batch.add('jade', new BoxGeometry(0.02 * s, 0.07 * s, R * 0.95), M.compose(mx, y + 0.06 * s, mz, -(a + a2) / 2, 1, 1, 1));
    }
    // 亭内茶几（小案+小壶）
    batch.add('wood', new CylinderGeometry(0.1 * s, 0.08 * s, 0.025 * s, 8), M.compose(x, y + 0.02 * s, z));
    batch.add('teal', new SphereGeometry(0.03 * s, 8, 6), M.compose(x, y + 0.05 * s, z));
    // —— 双檐（六角攒尖：两层翘檐锥台） ——
    for (const [L, ry, rw, rh] of [[0, y + 0.36 * s, R * 1.5, 0.16 * s], [1, y + 0.52 * s, R * 1.2, 0.14 * s]]) {
      // 六角翘檐（每面梯形板，外缘上翘）
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, a2 = ((i + 1) / 6) * TAU;
        const pos = [], idx = [];
        const rows = 4;
        for (let rj = 0; rj <= rows; rj++) {
          const u = rj / rows;
          const rOut = lerp(R * 0.55, rw, u);
          const yy = ry + rh * (1 - Math.pow(u, 1.3)) + 0.06 * s * smoothstep(0.6, 1, u); // 翘檐
          for (let j = 0; j <= 2; j++) {
            const t = j / 2;
            const am = lerp(a, a2, t);
            pos.push(x + Math.cos(am) * rOut, yy, z + Math.sin(am) * rOut);
          }
        }
        for (let rj = 0; rj < rows; rj++) for (let j = 0; j < 2; j++) {
          const p = rj * 3 + j, q = p + 1, r2 = p + 3, s2 = r2 + 1;
          idx.push(p, r2, q, q, r2, s2);
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setIndex(idx); g.computeVertexNormals();
        batch.add('teal', g);
        // 覆雪（外缘白条）
        for (let j = 0; j <= 2; j++) {
          const am = lerp(a, a2, j / 2);
          batch.add('snow', new BoxGeometry(0.05 * s, 0.02 * s, 0.05 * s), M.compose(x + Math.cos(am) * rw, ry + 0.06 * s, z + Math.sin(am) * rw));
        }
      }
      // 金脊线（六条）
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const pts = [];
        for (let rj = 0; rj <= 3; rj++) {
          const u = rj / 3;
          const rOut = lerp(R * 0.55, rw, u);
          const yy = ry + rh * (1 - Math.pow(u, 1.3)) + 0.06 * s * smoothstep(0.6, 1, u) + 0.012;
          pts.push(new Vector3(x + Math.cos(a) * rOut, yy, z + Math.sin(a) * rOut));
        }
        batch.add('gold', new TubeGeometry(new CatmullRomCurve3(pts), 4, 0.012 * s, 4, false));
      }
    }
    // 宝顶
    batch.add('gold', new ConeGeometry(0.05 * s, 0.12 * s, 6), M.compose(x, y + 0.72 * s, z));
    batch.add('snow', new SphereGeometry(0.025 * s, 6, 5), M.compose(x, y + 0.78 * s, z));
    // 檐下灯（六盏小灯挂下层檐缘）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      batch.add('lampGold', new SphereGeometry(0.028 * s, 8, 6), M.compose(x + Math.cos(a) * R * 1.5, y + 0.3 * s, z + Math.sin(a) * R * 1.5));
    }
    // 云纹托座（楼阁下方：扁云板+涡卷）
    batch.add('jade', new BoxGeometry(R * 2.4, 0.05, R * 1.1), M.compose(x, y - 0.14, z, 0, 0, 0.06, 1));
    cloisonneScroll(batch, x - R * 0.9, y - 0.2, z, 0, 0.8, 'jade');
    cloisonneScroll(batch, x + R * 0.9, y - 0.2, z, 0, 0.8, 'jade');
    // 锥形悬石（托座下倒锥）
    batch.add('jadeD', new ConeGeometry(R * 0.55, R * 0.9, 7), M.compose(x, y - 0.55, z, Math.PI, 1, 1, 1));
    // 垂链+玉饰（三链）
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      const cx = x + Math.cos(a) * R * 0.5, cz = z + Math.sin(a) * R * 0.5;
      batch.add('gold', new CylinderGeometry(0.005, 0.005, 0.3, 4), M.compose(cx, y - 0.85, cz));
      batch.add('jade', new SphereGeometry(0.03, 6, 5), M.compose(cx, y - 1.02, cz));
    }
    // 亭内主灯（记录，动态微光）
    const mainLamp = new Mesh(new SphereGeometry(0.05 * s, 10, 8), mat('lampWarm'));
    mainLamp.position.set(x, y + 0.2 * s, z);
    sceneInner.add(mainLamp);
    skyPavilions.push({ x, y, z, s, mainLamp });
  }
  // —— 两段拱形步廊（连接左右楼与中楼） ——
  for (const [x0, z0, x1, z1, y0, y1] of [[-3.1, -1.6, 0, -3.3, 9.0, 10.6], [3.1, -1.6, 0, -3.3, 9.0, 10.6]]) {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const t = i / n, t2 = (i + 1) / n;
      // 拱形廊板（弧顶）
      const ym = lerp(y0, y1, (t + t2) / 2) + Math.sin((t + t2) / 2 * Math.PI) * 0.55;
      const ym0 = lerp(y0, y1, t) + Math.sin(t * Math.PI) * 0.55;
      const ym2 = lerp(y0, y1, t2) + Math.sin(t2 * Math.PI) * 0.55;
      const px = lerp(x0, x1, (t + t2) / 2), pz = lerp(z0, z1, (t + t2) / 2);
      batch.add('wood', new BoxGeometry(Math.hypot(x1 - x0, z1 - z0) / n + 0.04, 0.035, 0.24), M.compose(px, ym - 0.05, pz, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, 1, 1, 1));
      // 廊柱（弧上小柱）
      batch.add('red', new CylinderGeometry(0.014, 0.017, 0.3, 6), M.compose(lerp(x0, x1, t), ym0 - 0.2, lerp(z0, z1, t)));
      // 栏杆
      batch.add('jade', new BoxGeometry(0.02, 0.08, 0.02), M.compose(lerp(x0, x1, t), ym0 + 0.02, lerp(z0, z1, t)));
    }
    // 廊顶覆雪条
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const ym = lerp(y0, y1, t) + Math.sin(t * Math.PI) * 0.55;
      batch.add('snow', new BoxGeometry(Math.hypot(x1 - x0, z1 - z0) / n * 0.9, 0.02, 0.2), M.compose(lerp(x0, x1, t), ym - 0.03, lerp(z0, z1, t), Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, 1, 1, 1));
    }
  }
  batch.build(sceneInner);
}
buildSkyPavilions();

/* ============================================================
 * 动态灯组：21 自由浮灯 + 18 轻摆悬灯 + 23 悬灯（楼阁/廊/门）+ 8 莲灯 + 18 梅瓣
 * ============================================================ */
const floatLamps = [];   // 自由浮灯
const swingLamps = [];   // 轻摆悬灯 {pivot, phase, amp}
const lotusLamps = [];   // 莲灯 {mesh, x0, phase, speed}
const petals = [];       // 梅瓣 {mesh, x, y, z, phase, spin}

function buildDynamicLights() {
  // —— 21 自由浮灯（沿前侧弧面错落漂浮） ——
  for (let i = 0; i < 21; i++) {
    const a = rng.range(-0.9, 0.9); // 前侧方位角（+z 附近）
    const yy = rng.range(7.2, 10.8);
    const r = Math.sqrt(Math.max(0.1, SPHERE_R * SPHERE_R - (yy - SPHERE_CY) * (yy - SPHERE_CY))) * rng.range(0.55, 0.92);
    const m = grp(
      sph(0.045, 8, 6, mat(i % 3 === 0 ? 'lampJade' : 'lampGold'), 0, 0, 0),
      cyl(0.05, 0.04, 0.014, 8, mat('gold'), 0, 0.05, 0),
      cyl(0.04, 0.05, 0.014, 8, mat('gold'), 0, -0.05, 0),
    );
    m.position.set(Math.sin(a) * r, yy, Math.cos(a) * r);
    sceneInner.add(m);
    floatLamps.push({ mesh: m, base: m.position.clone(), phase: rng.next() * TAU, speed: rng.range(0.05, 0.14), r, a });
  }
  // —— 18 轻摆悬灯（挂楼阁檐/步廊下） ——
  const anchors = [];
  for (const p of skyPavilions) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 8;
      anchors.push([p.x + Math.cos(a) * 0.5 * p.s, p.y - 0.28, p.z + Math.sin(a) * 0.5 * p.s]);
    }
  }
  anchors.push([-1.55, 9.6, -2.45], [1.55, 9.6, -2.45], [-0.8, 10.1, -2.6], [0.8, 10.1, -2.6], [-1.9, 9.3, -2.0], [1.9, 9.3, -2.0]);
  for (let i = 0; i < 18 && i < anchors.length; i++) {
    const [ax, ay, az] = anchors[i];
    const pivot = new Group();
    pivot.position.set(ax, ay, az);
    const lamp = lanternMesh(0.8, 'red', 'lampRed');
    lamp.position.y = -0.16;
    pivot.add(lamp);
    // 挂线
    const line = cyl(0.004, 0.004, 0.16, 4, mat('dark'), 0, -0.08, 0);
    pivot.add(line);
    sceneInner.add(pivot);
    swingLamps.push({ pivot, phase: rng.next() * TAU, freq: rng.range(0.5, 0.9), amp: rng.range(0.08, 0.16) });
  }
  // —— 23 悬灯（含 5 盏挂太和门/回廊檐下，其余楼阁） ——
  const extraAnchors = [
    [-2.6, GROUND + 1.6, 2.2], [2.6, GROUND + 1.6, 2.2],
    [-3.25, GROUND + 1.05, 1.2], [3.25, GROUND + 1.05, 1.2],
    [0, GROUND + 1.75, 2.6],
  ];
  const allAnchors = anchors.slice(0, 18).concat(extraAnchors);
  for (let i = 18; i < 23; i++) {
    const [ax, ay, az] = allAnchors[i];
    const pivot = new Group();
    pivot.position.set(ax, ay, az);
    const lamp = lanternMesh(0.7, 'red', 'lampSoft');
    lamp.position.y = -0.14;
    pivot.add(lamp);
    sceneInner.add(pivot);
    swingLamps.push({ pivot, phase: rng.next() * TAU, freq: rng.range(0.4, 0.7), amp: rng.range(0.05, 0.1) });
  }
  // —— 8 微型莲灯（限四段桥间水道漂移） ——
  const segs = [[-1.9, -0.7], [-0.65, -0.55], [0.55, 0.65], [0.7, 1.9]]; // 桥间水道 x 段
  for (let i = 0; i < 8; i++) {
    const seg = segs[i % 4];
    const lx = rng.range(seg[0], seg[1]);
    const g = grp(
      cyl(0.05, 0.035, 0.02, 8, mat('paper'), 0, 0, 0),
      sph(0.022, 8, 6, mat('lampPink'), 0, 0.02, 0),
    );
    for (let p = 0; p < 6; p++) {
      const pa = (p / 6) * TAU;
      g.add(box(0.03, 0.008, 0.016, mat('paper'), Math.cos(pa) * 0.05, 0.012, Math.sin(pa) * 0.05, pa));
    }
    g.position.set(lx, GROUND - 0.05, riverCenter(lx));
    sceneInner.add(g);
    lotusLamps.push({ mesh: g, x0: lx, seg, phase: rng.next() * TAU, speed: rng.range(0.02, 0.05) });
  }
  // —— 18 梅瓣（后景局部飘落） ——
  for (let i = 0; i < 18; i++) {
    const m = new Mesh(new PlaneGeometry(0.03, 0.022), new MeshBasicMaterial({ color: 0xd47a8a, side: DoubleSide, transparent: true, opacity: 0.95 }));
    m.position.set(rng.range(-1.6, 1.6), rng.range(GROUND + 1.0, GROUND + 1.9), -4.6 + rng.range(-0.3, 0.3));
    sceneInner.add(m);
    petals.push({ mesh: m, phase: rng.next(), spin: rng.range(1, 3), drift: rng.range(-0.02, 0.02) });
  }
}
buildDynamicLights();

/* ---------- 动态灯组动画 ---------- */
addAnimator((dt, t) => {
  // 浮灯：沿弧面缓慢漂移+呼吸
  for (const f of floatLamps) {
    const a = f.a + Math.sin(t * 0.07 + f.phase) * 0.08;
    f.mesh.position.set(
      Math.sin(a) * f.r,
      f.base.y + Math.sin(t * 0.32 + f.phase) * 0.09,
      Math.cos(a) * f.r,
    );
    f.mesh.rotation.y = t * f.speed + f.phase;
  }
  // 悬灯：轻摆
  for (const s of swingLamps) {
    s.pivot.rotation.z = Math.sin(t * s.freq + s.phase) * s.amp;
    s.pivot.rotation.x = Math.cos(t * s.freq * 0.8 + s.phase) * s.amp * 0.6;
  }
  // 莲灯：桥间水道漂移+起伏
  for (const l of lotusLamps) {
    const u = (t * l.speed + l.phase) % 1;
    const lx = lerp(l.seg[0], l.seg[1], u);
    l.mesh.position.set(lx, GROUND - 0.04 + Math.sin(t * 1.2 + l.phase * 7) * 0.012, riverCenter(lx));
    l.mesh.rotation.y = t * 0.3 + l.phase;
  }
  // 梅瓣：局部飘落（循环）
  for (const p of petals) {
    const cyc = (t * 0.06 + p.phase) % 1;
    p.mesh.position.y = GROUND + 1.9 - cyc * 1.55;
    p.mesh.position.x += p.drift * dt * 10;
    if (p.mesh.position.x > 1.7) p.mesh.position.x = -1.7;
    p.mesh.rotation.x = cyc * p.spin * 3;
    p.mesh.rotation.z = cyc * p.spin * 2;
    p.mesh.material.opacity = 0.95 * Math.sin(Math.min(1, cyc * 4) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - cyc) * 4) * Math.PI * 0.5);
  }
  // 亭内主灯：微光呼吸
  for (const [i, p] of skyPavilions.entries()) {
    p.mainLamp.material = mat('lampWarm');
    p.mainLamp.scale.setScalar(1 + Math.sin(t * 0.8 + i * 2.1) * 0.08);
  }
});

/* ---------- 前院降补光 + 侧院局部暖光 ---------- */
{
  const frontFill = new PointLight(0xbfd4e8, 0.5, 7, 1.6);
  frontFill.position.set(0, GROUND + 2.6, 3.2);
  sceneInner.add(frontFill);
  const warmL = new PointLight(0xffb46a, 0.55, 4.5, 1.7);
  warmL.position.set(-2.55, GROUND + 1.1, 1.75);
  sceneInner.add(warmL);
  const warmR = new PointLight(0xffb46a, 0.45, 4.5, 1.7);
  warmR.position.set(2.55, GROUND + 1.1, 1.75);
  sceneInner.add(warmR);
}
