/* ============================================================
 * 050-base.js — 景泰蓝底座（球外，sceneOuter）
 *
 * 结构（自上而下）：
 *   承托圈（接球底，接缝金属扣） → 上段蓝釉锥台（掐丝网格+花叶纹+四个凹入文化小景）
 *   → 顶圈玉石朱红嵌饰 → 交替玉/象牙莲瓣圈 → 中段锥台（四组狮首衔环）
 *   → 上圈铜格镶雕刻玉凸圆 → 木色下座矮足 → 底圈莲瓣玉饰
 * 正面（+z）y≈1.6 留给「起风」按钮（080-plaque.js）
 * ============================================================ */

const BASE = {
  topR: 6.18, topY: 3.12,       // 承托圈顶（接球）
  upperTopR: 6.05, upperBotR: 4.35, upperY0: 1.35, upperY1: 2.86, // 上段锥台
  midTopR: 4.35, midBotR: 3.55, midY0: 0.55, midY1: 1.15,         // 中段锥台
  lowR: 3.3, lowY0: 0.12, lowY1: 0.55,                            // 木色下座
};

/* ---------- 掐丝花叶纹（涡卷曲线管） ---------- */
function cloisonneScroll(batch, cx, cy, cz, ry, scale, mat) {
  // 一组掐丝花叶：主涡卷 + 两个侧叶 + 花蕊点
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const a = t * Math.PI * 1.6;
    pts.push(new Vector3(Math.cos(a) * 0.16 * (1 - t * 0.4), Math.sin(a) * 0.1 * (1 - t * 0.5) + 0.05, 0));
  }
  const scroll = new TubeGeometry(new CatmullRomCurve3(pts), 12, 0.012, 5, false);
  batch.add(mat, scroll, M.compose(cx, cy, cz, ry, scale, scale, scale));
  // 侧叶（小弧）
  for (const s of [-1, 1]) {
    const leaf = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      leaf.push(new Vector3(s * (0.05 + t * 0.1), 0.02 + Math.sin(t * Math.PI) * 0.09, 0));
    }
    batch.add(mat, new TubeGeometry(new CatmullRomCurve3(leaf), 8, 0.01, 5, false), M.compose(cx - s * 0.1, cy - 0.03, cz, ry, scale, scale, scale));
  }
  // 花蕊（小金球）
  batch.add('goldHi', new SphereGeometry(0.022, 6, 5), M.compose(cx, cy + 0.06, cz, ry, scale, scale, scale));
}

/* ============================================================
 * 四个凹入文化小景（龛内微缩场景）
 * ============================================================ */

/* ① 灰砖胡同院门 + 自行车（含辐条）+ 扫帚 + 门联 + 蓝陶冬花盆 */
function nicheHutong(batch, cx, cy, cz, ry) {
  const T = M.compose(cx, cy, cz, ry, 1, 1, 1);
  // 灰砖背景墙（砖块阵列）
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) {
    const bw = 0.15, bh = 0.085;
    const ox = -0.42 + c * bw + (r % 2 ? bw / 2 : 0), oy = -0.32 + r * bh;
    batch.add('dark', new BoxGeometry(bw - 0.008, bh - 0.008, 0.02), M.compose(cx + ox, cy + oy, cz - 0.16, ry, 1, 1, 1));
  }
  // 院门（木门框+双扇+门楣）
  batch.add('wood', new BoxGeometry(0.5, 0.62, 0.04), M.compose(cx, cy + 0.02, cz - 0.12, ry, 1, 1, 1));
  batch.add('woodD', new BoxGeometry(0.22, 0.56, 0.03), M.compose(cx - 0.12, cy, cz - 0.095, ry, 1, 1, 1));
  batch.add('woodD', new BoxGeometry(0.22, 0.56, 0.03), M.compose(cx + 0.12, cy, cz - 0.095, ry, 1, 1, 1));
  // 门联（红纸竖条）
  batch.add('red', new BoxGeometry(0.05, 0.4, 0.012), M.compose(cx - 0.29, cy + 0.05, cz - 0.1, ry, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.05, 0.4, 0.012), M.compose(cx + 0.29, cy + 0.05, cz - 0.1, ry, 1, 1, 1));
  // 门环（双环）
  batch.add('bronze', new TorusGeometry(0.022, 0.007, 5, 10), M.compose(cx - 0.06, cy + 0.02, cz - 0.075, ry, 1, 1, 1));
  batch.add('bronze', new TorusGeometry(0.022, 0.007, 5, 10), M.compose(cx + 0.06, cy + 0.02, cz - 0.075, ry, 1, 1, 1));
  // 自行车（侧放，车轮含辐条）
  const bx = cx + 0.18, by = cy - 0.28, bz = cz + 0.02;
  for (const wx of [-0.16, 0.16]) {
    batch.add('bronze', new TorusGeometry(0.075, 0.008, 5, 16), M.compose(bx + wx, by + 0.075, bz, ry + Math.PI / 2, 1, 1, 1));
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI;
      batch.add('bronze', new BoxGeometry(0.005, 0.14, 0.005), M.compose(bx + wx, by + 0.075, bz, ry, a, 1, 1, 1));
    }
  }
  // 车架（斜管）
  batch.add('red', new BoxGeometry(0.3, 0.012, 0.012), M.compose(bx, by + 0.1, bz, ry, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.2, 0.01, 0.01), M.compose(bx - 0.02, by + 0.14, bz, ry, 0.5, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.18, 0.01, 0.01), M.compose(bx + 0.03, by + 0.13, bz, ry, -0.4, 1, 1, 1));
  // 车把 + 座
  batch.add('bronze', new BoxGeometry(0.12, 0.008, 0.008), M.compose(bx - 0.15, by + 0.17, bz, ry, 1, 1, 1));
  batch.add('dark', new BoxGeometry(0.06, 0.02, 0.04), M.compose(bx + 0.12, by + 0.17, bz, ry, 1, 1, 1));
  // 扫帚（斜靠墙角）
  batch.add('wood', new BoxGeometry(0.012, 0.34, 0.012), M.compose(cx - 0.32, cy - 0.12, cz + 0.05, ry, 0.25, 1, 1, 1));
  batch.add('goldHi', new ConeGeometry(0.035, 0.1, 6), M.compose(cx - 0.36, cy - 0.28, cz + 0.06, ry, 0.25, 1, 1, 1));
  // 蓝陶冬花盆（盆+枯枝）
  batch.add('blue', new CylinderGeometry(0.05, 0.038, 0.07, 10), M.compose(cx + 0.38, cy - 0.28, cz + 0.02, ry, 1, 1, 1));
  for (let b = 0; b < 4; b++) {
    batch.add('woodD', new BoxGeometry(0.006, 0.12, 0.006), M.compose(cx + 0.38 + Math.cos(b * 1.7) * 0.02, cy - 0.2, cz + 0.02 + Math.sin(b * 1.7) * 0.02, ry, b * 0.4, 1, 1, 1));
  }
}

/* ② 铜火锅（动态薄蒸汽）+ 茶具 + 糖葫芦 */
function nicheHotpot(batch, cx, cy, cz, ry) {
  // 炭炉底座
  batch.add('bronzeD', new CylinderGeometry(0.09, 0.11, 0.07, 12), M.compose(cx, cy - 0.26, cz, ry, 1, 1, 1));
  // 锅体（束腰）
  batch.add('bronze', new CylinderGeometry(0.13, 0.09, 0.1, 14), M.compose(cx, cy - 0.17, cz, ry, 1, 1, 1));
  batch.add('bronze', new CylinderGeometry(0.1, 0.13, 0.06, 14), M.compose(cx, cy - 0.09, cz, ry, 1, 1, 1));
  // 烟囱管
  batch.add('bronze', new CylinderGeometry(0.045, 0.055, 0.16, 10), M.compose(cx, cy + 0.0, cz, ry, 1, 1, 1));
  batch.add('bronze', new CylinderGeometry(0.06, 0.045, 0.03, 10), M.compose(cx, cy + 0.09, cz, ry, 1, 1, 1));
  // 锅沿双耳
  for (const s of [-1, 1]) batch.add('bronze', new TorusGeometry(0.02, 0.008, 5, 10), M.compose(cx + s * 0.13, cy - 0.12, cz, ry, 1, 1, 1));
  // 茶壶（球+嘴+把+盖）
  const tx = cx - 0.28, ty = cy - 0.24, tz = cz;
  batch.add('teal', new SphereGeometry(0.055, 10, 8), M.compose(tx, ty, tz, ry, 1, 1, 1));
  batch.add('teal', new CylinderGeometry(0.02, 0.028, 0.03, 8), M.compose(tx, ty + 0.055, tz, ry, 1, 1, 1));
  batch.add('teal', new CylinderGeometry(0.008, 0.012, 0.07, 6), M.compose(tx - 0.07, ty + 0.01, tz, ry, 0, 1, 1, 1));
  batch.add('teal', new TorusGeometry(0.028, 0.007, 5, 10, Math.PI), M.compose(tx + 0.055, ty, tz, ry, Math.PI / 2, 1, 1, 1));
  // 茶杯 ×2
  for (const s of [0, 1]) batch.add('jade', new CylinderGeometry(0.022, 0.018, 0.03, 8), M.compose(cx - 0.14 + s * 0.09, cy - 0.28, cz + 0.05, ry, 1, 1, 1));
  // 糖葫芦（串+红球）
  const hx = cx + 0.3, hz = cz + 0.02;
  batch.add('wood', new BoxGeometry(0.01, 0.3, 0.01), M.compose(hx, cy - 0.12, hz, ry, 0.15, 1, 1, 1));
  for (let b = 0; b < 5; b++) batch.add('red', new SphereGeometry(0.03, 8, 6), M.compose(hx + b * 0.008, cy - 0.24 + b * 0.055, hz, ry, 1, 1, 1));
  // 薄蒸汽（动态，返回 mesh 供动画）
  const steamMat = new MeshBasicMaterial({ color: 0xdfe9f2, transparent: true, opacity: 0.16, depthWrite: false, side: DoubleSide });
  const steams = [];
  for (let i = 0; i < 3; i++) {
    const m = new Mesh(new PlaneGeometry(0.07, 0.16), steamMat.clone());
    m.position.set(cx + Math.cos(i * 2.1) * 0.02, cy + 0.18, cz + Math.sin(i * 2.1) * 0.02);
    m.renderOrder = 5;
    sceneOuter.add(m);
    steams.push(m);
  }
  return steams;
}

/* ③ 铜丝珐琅工艺台（花瓶+笔+杯+盘+绕金丝） */
function nicheCraft(batch, cx, cy, cz, ry) {
  // 台面
  batch.add('wood', new BoxGeometry(0.6, 0.04, 0.3), M.compose(cx, cy - 0.26, cz, ry, 1, 1, 1));
  batch.add('woodD', new BoxGeometry(0.5, 0.14, 0.2), M.compose(cx, cy - 0.35, cz, ry, 1, 1, 1));
  // 花瓶（Lathe 轮廓）
  const profile = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    profile.push(new Vector2(0.02 + Math.sin(t * Math.PI * 0.9) * 0.07 * (1 - t * 0.3), t * 0.16));
  }
  batch.add('teal', new LatheGeometry(profile, 12), M.compose(cx - 0.18, cy - 0.24, cz, ry, 1, 1, 1));
  // 盘绕金丝（瓶身涡线）
  for (let i = 0; i < 3; i++) {
    batch.add('goldHi', new TorusGeometry(0.05 + i * 0.008, 0.004, 4, 14), M.compose(cx - 0.18, cy - 0.2 + i * 0.04, cz, ry, Math.PI / 2, 1, 1, 1));
  }
  // 笔（细杆+笔锋）
  batch.add('red', new BoxGeometry(0.012, 0.14, 0.012), M.compose(cx + 0.05, cy - 0.17, cz + 0.04, ry, 0.3, 1, 1, 1));
  batch.add('dark', new ConeGeometry(0.008, 0.03, 5), M.compose(cx + 0.05 - 0.02, cy - 0.24, cz + 0.04, ry, 0.3, 1, 1, 1));
  // 杯
  batch.add('jade', new CylinderGeometry(0.03, 0.024, 0.05, 8), M.compose(cx + 0.2, cy - 0.22, cz - 0.03, ry, 1, 1, 1));
  // 盘（扁盘+盘心金丝涡）
  batch.add('blue', new CylinderGeometry(0.09, 0.07, 0.015, 14), M.compose(cx + 0.05, cy - 0.24, cz - 0.06, ry, 1, 1, 1));
  batch.add('goldHi', new TorusGeometry(0.04, 0.004, 4, 12), M.compose(cx + 0.05, cy - 0.232, cz - 0.06, ry, Math.PI / 2, 1, 1, 1));
  // 散绕金丝（弯曲线）
  for (let i = 0; i < 3; i++) {
    const wire = [];
    for (let j = 0; j <= 5; j++) {
      wire.push(new Vector3(Math.sin(j * 1.3 + i * 2) * 0.05, Math.cos(j * 1.1 + i) * 0.012, j * 0.015));
    }
    batch.add('goldHi', new TubeGeometry(new CatmullRomCurve3(wire), 8, 0.004, 4, false), M.compose(cx - 0.02 + i * 0.05, cy - 0.24, cz + 0.09, ry, 1, 1, 1));
  }
}

/* ④ 御书房（案桌+手卷+笔墨+玉笔架+印章+悬画） */
function nicheStudy(batch, cx, cy, cz, ry) {
  // 悬画（背景板+画轴）
  batch.add('paper', new BoxGeometry(0.34, 0.24, 0.01), M.compose(cx, cy + 0.18, cz - 0.14, ry, 1, 1, 1));
  batch.add('wood', new BoxGeometry(0.38, 0.02, 0.02), M.compose(cx, cy + 0.3, cz - 0.13, ry, 1, 1, 1));
  batch.add('wood', new BoxGeometry(0.38, 0.02, 0.02), M.compose(cx, cy + 0.06, cz - 0.13, ry, 1, 1, 1));
  // 画中山水（青蓝小笔触）
  batch.add('blue', new BoxGeometry(0.1, 0.07, 0.005), M.compose(cx - 0.08, cy + 0.2, cz - 0.132, ry, 1, 1, 1));
  batch.add('teal', new BoxGeometry(0.08, 0.05, 0.005), M.compose(cx + 0.07, cy + 0.17, cz - 0.132, ry, 1, 1, 1));
  // 案桌（桌面+四腿）
  batch.add('wood', new BoxGeometry(0.62, 0.035, 0.3), M.compose(cx, cy - 0.12, cz, ry, 1, 1, 1));
  for (const dx of [-0.27, 0.27]) for (const dz of [-0.11, 0.11]) {
    batch.add('woodD', new BoxGeometry(0.03, 0.16, 0.03), M.compose(cx + dx, cy - 0.22, cz + dz, ry, 1, 1, 1));
  }
  // 手卷（展开纸+两端卷轴）
  batch.add('paper', new BoxGeometry(0.24, 0.008, 0.09), M.compose(cx - 0.1, cy - 0.1, cz + 0.02, ry, 1, 1, 1));
  batch.add('wood', new CylinderGeometry(0.012, 0.012, 0.1, 6), M.compose(cx - 0.23, cy - 0.095, cz + 0.02, ry, 0, 1, 1, 1));
  batch.add('wood', new CylinderGeometry(0.012, 0.012, 0.1, 6), M.compose(cx + 0.03, cy - 0.095, cz + 0.02, ry, 0, 1, 1, 1));
  // 墨锭
  batch.add('dark', new BoxGeometry(0.03, 0.015, 0.02), M.compose(cx + 0.14, cy - 0.095, cz - 0.05, ry, 1, 1, 1));
  // 玉笔架（小桥形+两笔）
  batch.add('jade', new TorusGeometry(0.03, 0.008, 5, 10, Math.PI), M.compose(cx + 0.2, cy - 0.1, cz + 0.05, ry, 0, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.008, 0.11, 0.008), M.compose(cx + 0.17, cy - 0.055, cz + 0.05, ry, 0.25, 1, 1, 1));
  batch.add('red', new BoxGeometry(0.008, 0.1, 0.008), M.compose(cx + 0.23, cy - 0.06, cz + 0.05, ry, -0.2, 1, 1, 1));
  // 印章（小方柱+印钮）
  batch.add('red', new BoxGeometry(0.025, 0.035, 0.025), M.compose(cx + 0.27, cy - 0.088, cz - 0.08, ry, 1, 1, 1));
  batch.add('gold', new BoxGeometry(0.012, 0.012, 0.012), M.compose(cx + 0.27, cy - 0.065, cz - 0.08, ry, 1, 1, 1));
}

/* ============================================================
 * 底座主体
 * ============================================================ */
let baseSteam = []; // 动态蒸汽 mesh 列表（150-loop 更新）
function buildBase() {
  const batch = new MergeBatch();

  // —— 承托圈（金属环 + 接缝金属扣） ——
  batch.add('gold', new CylinderGeometry(BASE.topR, BASE.topR - 0.12, 0.26, 64, 1, true), M.compose(0, BASE.topY - 0.13, 0));
  batch.add('goldHi', new TorusGeometry(BASE.topR, 0.045, 10, 64), M.compose(0, BASE.topY, 0, 0, Math.PI / 2, 1, 1, 1));
  batch.add('goldHi', new TorusGeometry(BASE.topR - 0.12, 0.04, 10, 64), M.compose(0, BASE.topY - 0.26, 0, 0, Math.PI / 2, 1, 1, 1));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const x = Math.cos(a) * (BASE.topR - 0.06), z = Math.sin(a) * (BASE.topR - 0.06);
    batch.add('bronze', new BoxGeometry(0.14, 0.2, 0.08), M.compose(x, BASE.topY - 0.13, z, -a, 1, 1, 1));
    batch.add('goldHi', new SphereGeometry(0.025, 8, 6), M.compose(x * 1.005, BASE.topY - 0.06, z * 1.005, 0, 1, 1, 1));
  }

  // —— 上段蓝釉锥台（景泰蓝主体） ——
  batch.add('blue', new CylinderGeometry(BASE.upperTopR, BASE.upperBotR, BASE.upperY1 - BASE.upperY0, 64, 1, true), M.compose(0, (BASE.upperY0 + BASE.upperY1) / 2, 0));
  batch.add('blue', new CylinderGeometry(BASE.upperTopR - 0.02, BASE.upperBotR - 0.02, 0.04, 64), M.compose(0, BASE.upperY0 + 0.02, 0));
  // 掐丝网格：竖丝（经）+ 横丝（纬）
  const nV = 28;
  for (let i = 0; i < nV; i++) {
    const a = (i / nV) * TAU;
    const pts = [];
    for (let j = 0; j <= 4; j++) {
      const t = j / 4;
      const r = lerp(BASE.upperTopR, BASE.upperBotR, t) + 0.015;
      const y = lerp(BASE.upperY1, BASE.upperY0, t);
      pts.push(new Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    batch.add('gold', new TubeGeometry(new CatmullRomCurve3(pts), 6, 0.014, 4, false));
  }
  for (let j = 1; j < 4; j++) {
    const t = j / 4;
    const r = lerp(BASE.upperTopR, BASE.upperBotR, t) + 0.015;
    const y = lerp(BASE.upperY1, BASE.upperY0, t);
    batch.add('gold', new TorusGeometry(r, 0.012, 6, 64), M.compose(0, y, 0, 0, Math.PI / 2, 1, 1, 1));
  }
  // 掐丝花叶纹（四组，位于四龛之间）
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU; // 0, 90, 180, 270 度方位
    const t = 0.5;
    const r = lerp(BASE.upperTopR, BASE.upperBotR, t) + 0.03;
    const y = lerp(BASE.upperY1, BASE.upperY0, t);
    cloisonneScroll(batch, Math.cos(a) * r, y, Math.sin(a) * r, -a + Math.PI / 2, 1.6, 'goldHi');
  }

  // —— 四个凹入文化小景（斜角方位 45/135/225/315 度） ——
  const niches = [nicheHutong, nicheHotpot, nicheCraft, nicheStudy];
  niches.forEach((fn, i) => {
    const a = (i / 4) * TAU + Math.PI / 4;
    const t = 0.5;
    const rMid = lerp(BASE.upperTopR, BASE.upperBotR, t);
    const yMid = lerp(BASE.upperY1, BASE.upperY0, t);
    const cx = Math.cos(a) * (rMid - 0.14), cy = yMid, cz = Math.sin(a) * (rMid - 0.14);
    const ry = -a + Math.PI / 2; // 面朝外
    // 龛框（拱形：矩形+半圆顶）+ 内衬深色
    batch.add('gold', new BoxGeometry(1.06, 0.86, 0.06), M.compose(Math.cos(a) * (rMid + 0.01), yMid, Math.sin(a) * (rMid + 0.01), ry, 1, 1, 1));
    batch.add('dark', new BoxGeometry(0.94, 0.74, 0.1), M.compose(Math.cos(a) * (rMid - 0.03), yMid, Math.sin(a) * (rMid - 0.03), ry, 1, 1, 1));
    batch.add('gold', new TorusGeometry(0.47, 0.03, 6, 20, Math.PI), M.compose(Math.cos(a) * (rMid + 0.01), yMid + 0.43, Math.sin(a) * (rMid + 0.01), ry, 0, 1, 1, 1));
    // 龛内微光（暖色小面）
    batch.add('lampWarm', new BoxGeometry(0.8, 0.6, 0.02), M.compose(Math.cos(a) * (rMid - 0.08), yMid, Math.sin(a) * (rMid - 0.08), ry, 1, 1, 1));
    const out = fn(batch, cx, cy, cz, ry);
    if (out) baseSteam = out;
  });

  // —— 顶圈玉石朱红嵌饰（承托圈下） ——
  batch.add('red', new TorusGeometry(BASE.upperTopR - 0.05, 0.05, 8, 64), M.compose(0, BASE.upperY1 - 0.04, 0, 0, Math.PI / 2, 1, 1, 1));
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const r = BASE.upperTopR - 0.05;
    batch.add('jade', new SphereGeometry(0.035, 8, 6), M.compose(Math.cos(a) * r, BASE.upperY1 - 0.04, Math.sin(a) * r, 0, 1, 1, 1));
  }

  // —— 交替玉/象牙莲瓣圈 ——
  const nP = 26;
  for (let i = 0; i < nP; i++) {
    const a = (i / nP) * TAU;
    const r = lerp(BASE.upperBotR, BASE.midTopR, 0.5) - 0.02;
    const y = 1.28;
    const petal = new ConeGeometry(0.13, 0.3, 6);
    const m = i % 2 === 0 ? 'jade' : 'paper';
    batch.add(m, petal, M.compose(Math.cos(a) * r, y, Math.sin(a) * r, -a, 1, 1, 1.6));
  }

  // —— 中段锥台（深蓝）+ 四组狮首衔环 ——
  batch.add('blue', new CylinderGeometry(BASE.midTopR, BASE.midBotR, BASE.midY1 - BASE.midY0, 48, 1, true), M.compose(0, (BASE.midY0 + BASE.midY1) / 2, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const r = lerp(BASE.midTopR, BASE.midBotR, 0.5);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = (BASE.midY0 + BASE.midY1) / 2;
    const ry = -a + Math.PI / 2;
    // 狮首（球脸+鬃毛锥环+鼻）
    batch.add('gold', new SphereGeometry(0.14, 12, 10), M.compose(x, y + 0.05, z, ry, 1, 1, 1));
    for (let k = 0; k < 10; k++) {
      const ma = (k / 10) * TAU;
      batch.add('gold', new ConeGeometry(0.03, 0.09, 5), M.compose(x + Math.cos(ma + a) * 0.13, y + 0.05 + Math.sin(ma) * 0.11, z + Math.sin(ma + a) * 0.13, ry, 1, 1, 1));
    }
    batch.add('gold', new BoxGeometry(0.05, 0.035, 0.04), M.compose(x * 1.02, y + 0.01, z * 1.02, ry, 1, 1, 1));
    // 衔环（下垂大环）
    batch.add('goldHi', new TorusGeometry(0.085, 0.018, 8, 18), M.compose(x * 1.03, y - 0.13, z * 1.03, ry, 0.35, 1, 1, 1));
  }

  // —— 上圈铜格镶雕刻玉凸圆（中段与莲瓣圈之间） ——
  batch.add('bronze', new TorusGeometry(BASE.midTopR + 0.02, 0.045, 8, 48), M.compose(0, BASE.midY1 + 0.02, 0, 0, Math.PI / 2, 1, 1, 1));
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU;
    const r = BASE.midTopR + 0.02;
    // 铜格（十字框）
    batch.add('bronze', new BoxGeometry(0.03, 0.1, 0.03), M.compose(Math.cos(a) * r, BASE.midY1 + 0.02, Math.sin(a) * r, -a, 1, 1, 1));
    // 玉凸圆（半球）
    batch.add('jade', new SphereGeometry(0.055, 10, 8, 0, TAU, 0, Math.PI / 2), M.compose(Math.cos(a + 0.17) * r, BASE.midY1 + 0.02, Math.sin(a + 0.17) * r, -a, 1, 1, 1));
  }

  // —— 木色下座 + 矮足 ——
  batch.add('wood', new CylinderGeometry(BASE.lowR + 0.1, BASE.lowR, BASE.lowY1 - BASE.lowY0, 48), M.compose(0, (BASE.lowY0 + BASE.lowY1) / 2, 0));
  batch.add('woodD', new TorusGeometry(BASE.lowR + 0.1, 0.03, 8, 48), M.compose(0, BASE.lowY1, 0, 0, Math.PI / 2, 1, 1, 1));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const x = Math.cos(a) * (BASE.lowR - 0.25), z = Math.sin(a) * (BASE.lowR - 0.25);
    // 矮足（外撇锥足）
    batch.add('woodD', new CylinderGeometry(0.14, 0.2, 0.16, 10), M.compose(x * 1.12, BASE.lowY0 - 0.06, z * 1.12, 0, 1, 1, 1));
    batch.add('goldHi', new SphereGeometry(0.06, 8, 6), M.compose(x * 1.2, BASE.lowY0 - 0.13, z * 1.2, 0, 1, 1, 1));
  }

  // —— 底圈莲瓣玉饰 ——
  batch.add('bronze', new TorusGeometry(BASE.lowR - 0.05, 0.05, 8, 48), M.compose(0, BASE.lowY0 - 0.02, 0, 0, Math.PI / 2, 1, 1, 1));
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    const r = BASE.lowR - 0.05;
    batch.add('jade', new ConeGeometry(0.09, 0.16, 5), M.compose(Math.cos(a) * r, BASE.lowY0 - 0.02, Math.sin(a) * r, -a, 1, 1, 1.2));
  }

  batch.build(sceneOuter);
}
buildBase();

/* 蒸汽动画（Animator 注册，150-loop 前已注册即可） */
addAnimator((dt, t) => {
  for (let i = 0; i < baseSteam.length; i++) {
    const m = baseSteam[i];
    const ph = (t * 0.35 + i * 0.37) % 1;
    m.position.y = 2.24 + ph * 0.24; // 龛内上升（锅口 yMid≈2.1 上方）
    m.material.opacity = 0.16 * Math.sin(ph * Math.PI);
    m.rotation.y = t * 0.4 + i;
    m.scale.setScalar(0.7 + ph * 0.9);
  }
});
