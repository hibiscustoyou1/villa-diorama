/* ============================================================
 * 080-plaque.js — 「北京－故宫」宫廷珐琅铭牌 + 底座正面「起风」实体按钮
 *
 * 字形：矢量笔画拼字（横竖撇捺点折钩），无字体依赖；
 * 铭牌全部顶点约束在半径 6.7 球内（z≈+5.15 前侧）。
 * ============================================================ */

/* ---------- 笔画字系统（每笔：[中心x, 中心y, 宽, 高, 旋转?]，字面局部坐标） ---------- */
const GLYPH_BEI = [ // 北
  [-0.30, 0.00, 0.07, 0.52],            // 左竖
  [-0.30, -0.20, 0.05, 0.10, 0.6],      // 左竖钩
  [-0.20, 0.14, 0.13, 0.07],            // 左上横
  [-0.20, -0.12, 0.13, 0.07],           // 左下横
  [0.28, 0.00, 0.07, 0.52],             // 右竖
  [0.20, 0.06, 0.10, 0.06],             // 右横
];
const GLYPH_JING = [ // 京
  [0.00, 0.25, 0.06, 0.06],             // 点
  [0.00, 0.16, 0.48, 0.07],             // 长横
  [0.00, 0.05, 0.16, 0.05],             // 口上
  [0.00, -0.05, 0.16, 0.05],            // 口下
  [-0.08, 0.00, 0.05, 0.14],            // 口左
  [0.08, 0.00, 0.05, 0.14],             // 口右
  [0.00, -0.20, 0.06, 0.26],            // 竖钩
  [0.00, -0.32, 0.05, 0.06, 0.6],       // 钩
  [-0.13, -0.16, 0.09, 0.05, 0.5],      // 左点
  [0.13, -0.16, 0.09, 0.05, -0.5],      // 右点
];
const GLYPH_DASH = [ // －
  [0.00, 0.00, 0.34, 0.07],
];
const GLYPH_GU = [ // 故
  [-0.22, 0.18, 0.24, 0.07],            // 古·横
  [-0.22, 0.02, 0.07, 0.30],            // 古·竖
  [-0.22, -0.10, 0.15, 0.05],           // 口上
  [-0.22, -0.20, 0.15, 0.05],           // 口下
  [-0.29, -0.15, 0.05, 0.12],           // 口左
  [-0.15, -0.15, 0.05, 0.12],           // 口右
  [0.12, 0.16, 0.07, 0.24, 0.35],       // 攵·撇
  [0.22, 0.10, 0.20, 0.06],             // 攵·横
  [0.24, -0.04, 0.07, 0.30],            // 攵·竖
  [0.30, -0.14, 0.08, 0.20, -0.55],     // 攵·捺
];
const GLYPH_GONG = [ // 宫
  [0.00, 0.25, 0.06, 0.06],             // 点
  [0.00, 0.16, 0.46, 0.07],             // 宝盖横
  [-0.21, 0.09, 0.06, 0.09],            // 左钩
  [0.21, 0.09, 0.06, 0.09],             // 右钩
  [0.00, 0.00, 0.18, 0.05],             // 上口
  [0.00, -0.10, 0.18, 0.05],
  [-0.09, -0.05, 0.05, 0.13],
  [0.09, -0.05, 0.05, 0.13],
  [0.00, -0.22, 0.24, 0.05],            // 下口
  [0.00, -0.32, 0.24, 0.05],
  [-0.12, -0.27, 0.05, 0.13],
  [0.12, -0.27, 0.05, 0.13],
];

/** 笔画字 → 合并几何（青玉笔画 + 金包边） */
function glyphStrokes(strokes, batch, ox, oy, oz, scale, faceMat, edgeMat) {
  for (const [sx, sy, w, h, rot] of strokes) {
    const r = rot || 0;
    // 金包边（略大薄框：四边细条）
    const ex = w * 0.5 + 0.012, ey = h * 0.5 + 0.012;
    batch.add(edgeMat, new BoxGeometry(w + 0.024, 0.014, 0.028), M.compose(ox + sx * scale, oy + sy * scale + ey, oz, r, scale, scale, 1));
    batch.add(edgeMat, new BoxGeometry(w + 0.024, 0.014, 0.028), M.compose(ox + sx * scale, oy + sy * scale - ey, oz, r, scale, scale, 1));
    batch.add(edgeMat, new BoxGeometry(0.014, h + 0.024, 0.028), M.compose(ox + sx * scale - ex, oy + sy * scale, oz, r, scale, scale, 1));
    batch.add(edgeMat, new BoxGeometry(0.014, h + 0.024, 0.028), M.compose(ox + sx * scale + ex, oy + sy * scale, oz, r, scale, scale, 1));
    // 字面本体（青玉）
    batch.add(faceMat, new BoxGeometry(w, h, 0.05), M.compose(ox + sx * scale, oy + sy * scale, oz, r, scale, scale, 1));
    // 金箔碎纹（字面小金点）
    for (let i = 0; i < 2; i++) {
      const fx = (rng.next() - 0.5) * w * 0.7, fy = (rng.next() - 0.5) * h * 0.7;
      batch.add('goldHi', new BoxGeometry(0.012, 0.012, 0.055), M.compose(ox + (sx + fx) * scale, oy + (sy + fy) * scale, oz, r, scale, scale, 1));
    }
  }
}

/* ============================================================
 * 铭牌（宫廷珐琅匾）
 * ============================================================ */
const PLAQUE = { x: 0, y: 4.32, z: 5.12, w: 2.3, h: 0.92 };
let plaqueMeshes = [];        // 铭牌合并 mesh（140-audit 顶点审计）
function buildPlaque() {
  const batch = new MergeBatch();
  const { x: px, y: py, z: pz, w: pw, h: ph } = PLAQUE;

  // —— 朱砂底板（双层：主板+錾纹衬板） ——
  batch.add('redD', new BoxGeometry(pw, ph, 0.07), M.compose(px, py, pz - 0.02));
  batch.add('red', new BoxGeometry(pw - 0.06, ph - 0.06, 0.075), M.compose(px, py, pz - 0.01));

  // —— 卷云錾纹（底板上金涡卷，四角+中缝） ——
  cloisonneScroll(batch, px - pw / 2 + 0.16, py + ph / 2 - 0.14, pz + 0.02, 0, 0.7, 'gold');
  cloisonneScroll(batch, px + pw / 2 - 0.16, py + ph / 2 - 0.14, pz + 0.02, 0, 0.7, 'gold');
  cloisonneScroll(batch, px - pw / 2 + 0.16, py - ph / 2 + 0.14, pz + 0.02, 0, 0.7, 'gold');
  cloisonneScroll(batch, px + pw / 2 - 0.16, py - ph / 2 + 0.14, pz + 0.02, 0, 0.7, 'gold');

  // —— 鎏金包边（整匾外框） ——
  batch.add('gold', new BoxGeometry(pw + 0.08, 0.05, 0.1), M.compose(px, py + ph / 2 + 0.02, pz));
  batch.add('gold', new BoxGeometry(pw + 0.08, 0.05, 0.1), M.compose(px, py - ph / 2 - 0.02, pz));
  batch.add('gold', new BoxGeometry(0.05, ph + 0.08, 0.1), M.compose(px - pw / 2 - 0.02, py, pz));
  batch.add('gold', new BoxGeometry(0.05, ph + 0.08, 0.1), M.compose(px + pw / 2 + 0.02, py, pz));

  // —— 珐琅珠饰（四角如意珠） ——
  for (const [cx, cy] of [[-pw / 2 - 0.02, ph / 2 + 0.02], [pw / 2 + 0.02, ph / 2 + 0.02], [-pw / 2 - 0.02, -ph / 2 - 0.02], [pw / 2 + 0.02, -ph / 2 - 0.02]]) {
    batch.add('jade', new SphereGeometry(0.045, 8, 6), M.compose(px + cx, py + cy, pz + 0.01));
    batch.add('gold', new TorusGeometry(0.05, 0.01, 6, 12), M.compose(px + cx, py + cy, pz + 0.01, 0, 0, 1, 1, 1));
  }

  // —— 双侧金云（匾左右外飘云朵） ——
  for (const s of [-1, 1]) {
    const cx = px + s * (pw / 2 + 0.22);
    batch.add('gold', new SphereGeometry(0.07, 8, 6), M.compose(cx, py + 0.1, pz - 0.02, 0, 1, 1, 0.6));
    batch.add('gold', new SphereGeometry(0.05, 8, 6), M.compose(cx + s * 0.09, py + 0.02, pz - 0.02, 0, 1, 1, 0.6));
    batch.add('gold', new SphereGeometry(0.038, 8, 6), M.compose(cx + s * 0.16, py - 0.05, pz - 0.02, 0, 1, 1, 0.6));
    // 云尾涡卷
    const tail = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      tail.push(new Vector3(s * (0.2 + t * 0.1), 0.12 - t * 0.2, 0));
    }
    batch.add('gold', new TubeGeometry(new CatmullRomCurve3(tail.map(p => new Vector3(cx + p.x, py + p.y, pz - 0.02))), 8, 0.012, 5, false));
  }

  // —— 莲瓣（底边一排） ——
  for (let i = 0; i < 9; i++) {
    const lx = px - pw / 2 + 0.16 + (i / 8) * (pw - 0.32);
    batch.add(i % 2 ? 'jade' : 'gold', new ConeGeometry(0.05, 0.09, 5), M.compose(lx, py - ph / 2 - 0.08, pz, 0, 1, 1, 1));
  }

  // —— 两端微翘金瓦小檐（覆薄雪） ——
  const eaveY = py + ph / 2 + 0.14;
  batch.add('tile', new BoxGeometry(pw + 0.3, 0.05, 0.16), M.compose(px, eaveY, pz - 0.02, 0, 0, 0, 1));
  // 两端翘角（弧形小翘板）
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      pts.push(new Vector3(px + s * (pw / 2 + 0.02 + t * 0.16), eaveY + t * t * 0.09, pz - 0.02));
    }
    batch.add('tile', new TubeGeometry(new CatmullRomCurve3(pts), 5, 0.035, 5, false));
    batch.add('gold', new SphereGeometry(0.03, 6, 5), M.compose(px + s * (pw / 2 + 0.19), eaveY + 0.09, pz - 0.02));
    // 檐端小兽
    batch.add('gold', new BoxGeometry(0.04, 0.05, 0.04), M.compose(px + s * (pw / 2 + 0.16), eaveY + 0.06, pz - 0.02));
  }
  // 金瓦垄条
  for (let i = 0; i < 8; i++) {
    const wx = px - pw / 2 + 0.1 + (i / 7) * (pw + 0.1);
    batch.add('gold', new BoxGeometry(0.025, 0.02, 0.15), M.compose(wx, eaveY + 0.03, pz - 0.02));
  }
  // 覆薄雪（檐面薄白层，断续）
  batch.add('snow', new BoxGeometry(pw + 0.26, 0.022, 0.13), M.compose(px, eaveY + 0.036, pz - 0.02));
  for (const s of [-1, 1]) {
    batch.add('snow', new BoxGeometry(0.12, 0.02, 0.12), M.compose(px + s * (pw / 2 + 0.1), eaveY + 0.1, pz - 0.02));
  }

  // —— 五字：北京－故宫（青玉字面+金包边+金箔碎纹） ——
  const scale = 0.62;
  const zs = pz + 0.045;
  glyphStrokes(GLYPH_BEI, batch, px - 0.86, py + 0.06, zs, scale, 'jade', 'gold');
  glyphStrokes(GLYPH_JING, batch, px - 0.30, py + 0.06, zs, scale, 'jade', 'gold');
  glyphStrokes(GLYPH_DASH, batch, px + 0.12, py + 0.06, zs, scale, 'jade', 'gold');
  glyphStrokes(GLYPH_GU, batch, px + 0.62, py + 0.06, zs, scale, 'jade', 'gold');
  glyphStrokes(GLYPH_GONG, batch, px + 1.12, py + 0.06, zs, scale, 'jade', 'gold');

  plaqueMeshes = batch.build(sceneInner);
}
buildPlaque();

/* ============================================================
 * 「起风」实体按钮（底座正面 +z，y≈1.6）
 * ============================================================ */
let windButton = null;       // 按钮组（130-wind 交互）
let windButtonDisk = null;   // 可 raycast 圆盘
let windChargeRing = null;   // 蓄力光环
function buildWindButton() {
  const batch = new MergeBatch();
  const bx = 0, by = 1.62, bz = 5.05; // 底座上段锥台正面（t≈0.5 处 r≈5.2）

  // 按钮组（按下时整体位移）
  const grpBtn = new Group();
  grpBtn.position.set(bx, by, bz);
  sceneOuter.add(grpBtn);
  windButton = grpBtn;

  // 外框座（金属凹座环）
  batch.add('gold', new TorusGeometry(0.34, 0.05, 10, 32), M.compose(bx, by, bz + 0.01, 0, 0, 1, 1, 1));
  batch.add('bronze', new CylinderGeometry(0.36, 0.38, 0.1, 32), M.compose(bx, by, bz - 0.05, Math.PI / 2, 1, 1, 1));

  // —— 可交互圆盘（青蓝珐琅，独立 mesh 供 raycast） ——
  const disk = new Mesh(new CylinderGeometry(0.3, 0.3, 0.06, 32), mat('blue'));
  disk.rotation.x = Math.PI / 2;
  disk.position.set(bx, by, bz + 0.03);
  disk.castShadow = true;
  disk.userData.isWindButton = true;
  sceneOuter.add(disk);
  windButtonDisk = disk;

  // 雪花浮雕（六向枝条，白玉凸条）
  const sb = new MergeBatch();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const dx = Math.cos(a), dy = Math.sin(a);
    // 主枝（径向条）
    sb.add('snow', new BoxGeometry(0.05, 0.2, 0.03), M.compose(bx + dx * 0.13, by + dy * 0.13, bz + 0.065, a + Math.PI / 2, 1, 1, 1));
    // 侧枝（V 形两叉）
    for (const s of [-1, 1]) {
      const ba = a + s * 0.6;
      sb.add('snow', new BoxGeometry(0.035, 0.09, 0.025), M.compose(bx + Math.cos(ba) * 0.19, by + Math.sin(ba) * 0.19, bz + 0.06, ba + Math.PI / 2, 1, 1, 1));
    }
  }
  // 中心雪晶核
  sb.add('snow', new BoxGeometry(0.07, 0.07, 0.035), M.compose(bx, by, bz + 0.065));
  sb.build(sceneOuter);

  // 鎏金风纹（三条卷曲尾端线条）
  for (let i = 0; i < 3; i++) {
    const a0 = (i / 3) * TAU + 0.5;
    const pts = [];
    for (let j = 0; j <= 8; j++) {
      const t = j / 8;
      const r = lerp(0.24, 0.09, t);
      const a = a0 + t * 2.4;
      pts.push(new Vector3(bx + Math.cos(a) * r, by + Math.sin(a) * r, bz + 0.055));
    }
    batch.add('goldHi', new TubeGeometry(new CatmullRomCurve3(pts), 10, 0.014, 5, false));
  }

  // —— 立体字「起风」（白玉笔画，按钮下半部） ——
  const GLYPH_QI = [ // 起
    [-0.16, 0.14, 0.16, 0.05],           // 走·上横
    [-0.16, 0.02, 0.05, 0.22],           // 走·竖
    [-0.16, -0.08, 0.18, 0.05],          // 走·下横
    [-0.22, -0.15, 0.04, 0.08, 0.5],     // 走·捺
    [0.10, 0.16, 0.05, 0.05],            // 己·竖折上
    [0.14, 0.10, 0.08, 0.05],            // 己·横
    [0.10, 0.00, 0.05, 0.18],            // 己·竖
    [0.14, -0.10, 0.08, 0.05],           // 己·底横
  ];
  const GLYPH_FENG = [ // 风
    [0.00, 0.18, 0.30, 0.05],            // 横折框上
    [-0.14, 0.05, 0.05, 0.24],           // 框左
    [0.14, 0.05, 0.05, 0.24],            // 框右
    [-0.05, -0.02, 0.07, 0.2],           // 内撇
    [0.06, -0.05, 0.06, 0.16, -0.3],     // 内捺
    [-0.18, -0.12, 0.05, 0.1, -0.5],     // 风·左钩
    [0.18, -0.12, 0.05, 0.1, 0.5],       // 风·右钩
  ];
  const sScale = 0.34;
  glyphStrokes(GLYPH_QI, batch, bx - 0.17, by - 0.02, bz + 0.075, sScale, 'snow', 'gold');
  glyphStrokes(GLYPH_FENG, batch, bx + 0.17, by - 0.02, bz + 0.075, sScale, 'snow', 'gold');

  // —— 蓄力光环（初始隐藏，130-wind 驱动） ——
  const ring = new Mesh(
    new TorusGeometry(0.42, 0.03, 8, 40),
    new MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0, toneMapped: false }),
  );
  ring.position.set(bx, by, bz + 0.02);
  sceneOuter.add(ring);
  windChargeRing = ring;

  batch.build(sceneOuter);
}
buildWindButton();
