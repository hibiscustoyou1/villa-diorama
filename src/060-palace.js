/* ============================================================
 * 060-palace.js — 外朝中轴（压缩构图）：太和殿、太和门、五座内金水桥、院落层次
 *
 * 布局（y 向上，+z 朝观察者/前方，-z 为后方）：
 *   太和殿 cz=-1.8（三层台基+重檐庑殿） · 太和门 cz=+2.6（歇山） · 金水河 cz≈4.15
 * ============================================================ */

/* ---------- 太和殿参数 ---------- */
const HALL = {
  cz: -1.8,
  baseW: [8.4, 7.9, 7.2], baseD: [4.9, 4.7, 4.2], baseH: 0.42,
  bodyW: 7.0, bodyD: 3.7, colH: 1.18, colR: 0.052, bays: 11, depths: 5,
};
const HALL_TOP = GROUND + 3 * HALL.baseH; // 台基顶 4.48

/* ---------- 庑殿屋面参数（上檐/下檐） ---------- */
const ROOF_UP = { a: 3.75, b: 2.15, c: 2.1, ridge: 8.2, drop: 1.55, cz: -1.8 };
const ROOF_LO = { a: 4.25, b: 2.55, c: 3.2, ridge: 6.35, drop: 1.05, cz: -1.8 };
const ROOF_EXP = 1.48;   // 坡度指数（脊平檐陡）
const ROOF_LIFT = 0.19;  // 翘度系数

/** 庑殿屋面高度（归一化 s∈[0,1] 脊→檐） */
function roofH(s, R) {
  return R.ridge - R.drop * Math.pow(s, ROOF_EXP) + ROOF_LIFT * R.drop * smoothstep(0.72, 1.0, s);
}
/** 庑殿归一化距离 s(x,z)（近似：前后坡与角部统一） */
function roofS(x, z, R) {
  const ax = Math.abs(x) / R.a, az = Math.abs(z - R.cz) / R.b;
  const c = R.c / R.a;
  if (ax <= c) return az;
  // 角部：沿斜脊方向的近似距离
  const t = (ax - c) / (1 - c);
  return Math.min(1, Math.hypot(az, t * 0.92));
}

/* ---------- 参数化庑殿屋面网格（梯形坡面） ---------- */
function buildHipRoofMesh(R, matName, batch) {
  // 前后坡：梯形 patch（脊长 2c → 檐长 2a）
  for (const side of [1, -1]) {
    const rows = 14, cols = 24;
    const pos = [], nor = [], idx = [];
    for (let i = 0; i <= rows; i++) {
      const u = i / rows; // 0 脊 → 1 檐
      const halfW = lerp(R.c, R.a, u);
      const y = roofH(u, R);
      const zc = R.cz + side * lerp(0, R.b, u);
      for (let j = 0; j <= cols; j++) {
        const x = lerp(-halfW, halfW, j / cols);
        pos.push(x, y, zc);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = i * (cols + 1) + j, b = a + 1, c2 = a + cols + 1, d = c2 + 1;
        if (side === 1) idx.push(a, c2, b, b, c2, d);
        else idx.push(a, b, c2, b, d, c2);
      }
    }
    // 山面坡（左右）：三角形 patch（脊端点 → 檐深）
    for (const sx of [1, -1]) {
      const rrows = 10, ccols = 12;
      const pos2 = [], idx2 = [];
      for (let i = 0; i <= rrows; i++) {
        const u = i / rrows;
        const y = roofH(u, R);
        const halfD = lerp(0, R.b, u);
        const xEdge = sx * lerp(R.c, R.a, u);
        for (let j = 0; j <= ccols; j++) {
          const t = j / ccols; // 沿深度从 -halfD 到 +halfD
          const z = R.cz + lerp(-halfD, halfD, t);
          pos2.push(xEdge, y, z);
        }
      }
      for (let i = 0; i < rrows; i++) {
        for (let j = 0; j < ccols; j++) {
          const a = i * (ccols + 1) + j, b = a + 1, c2 = a + ccols + 1, d = c2 + 1;
          idx2.push(a, c2, b, b, c2, d);
        }
      }
      const g2 = new BufferGeometry();
      g2.setAttribute('position', new Float32BufferAttribute(pos2, 3));
      g2.setIndex(idx2);
      g2.computeVertexNormals();
      batch.add(matName, g2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    batch.add(matName, g);
  }
}

/* ---------- 金色瓦垄（沿屋面参数线布管） ---------- */
function buildRoofTiles(R, batch) {
  const tileMat = 'gold';
  for (const side of [1, -1]) {
    const nTiles = Math.round(R.a / 0.13);
    for (let k = -nTiles; k <= nTiles; k++) {
      const x0 = (k / nTiles) * R.c; // 脊处 x
      const x1 = (k / nTiles) * R.a; // 檐处 x
      if (Math.abs(x1) > R.a) continue;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const x = lerp(x0, x1, u);
        const y = roofH(u, R) + 0.012;
        const z = R.cz + side * lerp(0.02, R.b, u);
        pts.push(new Vector3(x, y, z));
      }
      const curve = new CatmullRomCurve3(pts);
      batch.add(tileMat, new TubeGeometry(curve, 7, 0.026, 5, false));
    }
  }
  // 山面瓦垄（沿深度方向）
  for (const sx of [1, -1]) {
    const nT = Math.round(R.b / 0.13);
    for (let k = -nT; k <= nT; k++) {
      const z0 = R.cz + (k / nT) * 0.02;
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        const y = roofH(u, R) + 0.012;
        const halfD = lerp(0, R.b, u);
        const z = R.cz + clamp((k / nT) * R.b, -halfD, halfD);
        const x = sx * lerp(R.c, R.a, u);
        pts.push(new Vector3(x, y, z));
      }
      const curve = new CatmullRomCurve3(pts);
      batch.add(tileMat, new TubeGeometry(curve, 6, 0.024, 5, false));
    }
  }
}

/* ---------- 正脊、鸱吻、垂脊、脊兽 ---------- */
function buildRoofRidges(R, batch) {
  // 正脊（厚管）
  const ridgePts = [
    new Vector3(-R.c, R.ridge + 0.02, R.cz),
    new Vector3(0, R.ridge + 0.03, R.cz),
    new Vector3(R.c, R.ridge + 0.02, R.cz),
  ];
  batch.add('tile', new TubeGeometry(new CatmullRomCurve3(ridgePts), 10, 0.055, 6, false));
  // 鸱吻（两端，竖立卷尾）
  for (const sx of [1, -1]) {
    const x = sx * R.c;
    batch.add('tile', new BoxGeometry(0.16, 0.34, 0.14), M.compose(x, R.ridge + 0.16, R.cz));
    batch.add('tile', new CylinderGeometry(0.05, 0.07, 0.2, 6), M.compose(sx * (R.c + 0.06), R.ridge + 0.3, R.cz, 0, 1, 1, 1));
    // 卷尾（torus 弧段）
    const tail = new TorusGeometry(0.09, 0.035, 6, 8, Math.PI * 1.2);
    batch.add('tile', tail, M.compose(sx * (R.c + 0.1), R.ridge + 0.38, R.cz, sx * 0.5, 1, 1, 1));
  }
  // 垂脊（脊端 → 檐角）+ 脊兽序列（仙人骑凤 + 九兽）
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const x0 = sx * R.c, z0 = R.cz;
      const x1 = sx * R.a, z1 = R.cz + sz * R.b;
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        const x = lerp(x0, x1, u), z = lerp(z0, z1, u);
        const s = roofS(x, z, R);
        pts.push(new Vector3(x, roofH(s, R) + 0.045, z));
      }
      batch.add('tile', new TubeGeometry(new CatmullRomCurve3(pts), 8, 0.038, 5, false));
      // 脊兽：沿垂脊排布（外端为仙人骑凤，向内九兽）
      const n = 10;
      for (let b = 0; b < n; b++) {
        const u = 0.24 + (b / (n - 1)) * 0.68; // 从檐角向脊
        const x = lerp(x1, x0, (u - 0.24) / 0.76 * 0 + u); // 简化：沿垂脊线
        const bx = lerp(x1, x0, u), bz = lerp(z1, z0, u);
        const s = roofS(bx, bz, R);
        const by = roofH(s, R) + 0.09;
        const scale = b === 0 ? 1.35 : 1.0 - b * 0.03;
        if (b === 0) {
          // 骑凤仙人：小尖锥（凤嘴朝外）
          batch.add('gold', new ConeGeometry(0.028, 0.09, 5), M.compose(bx, by + 0.05, bz, 0, 1, 1, 1));
          batch.add('gold', new BoxGeometry(0.03, 0.05, 0.03), M.compose(bx, by, bz, 0, scale, scale, scale));
        } else {
          batch.add('gold', new BoxGeometry(0.035, 0.055, 0.05), M.compose(bx, by, bz, 0, scale, scale, scale));
          batch.add('teal', new ConeGeometry(0.016, 0.03, 4), M.compose(bx, by + 0.04, bz, 0, scale, scale, scale));
        }
      }
    }
  }
}

/* ---------- 柱头斗拱（三层出挑的青绿+金构件） ---------- */
function buildDougong(batch, positions, colTopY) {
  for (const [x, z] of positions) {
    let y = colTopY;
    for (let layer = 0; layer < 3; layer++) {
      const w = 0.16 + layer * 0.05, d = 0.13 + layer * 0.045;
      const mat = layer === 1 ? 'gold' : (layer === 0 ? 'teal' : 'tealD');
      batch.add(mat, new BoxGeometry(w, 0.055, d), M.compose(x, y + 0.028, z));
      // 出挑横材
      batch.add(mat, new BoxGeometry(w + 0.1, 0.03, 0.05), M.compose(x, y + 0.06, z));
      y += 0.075;
    }
  }
}

/* ---------- 门窗立面（门框中梃 + 直棂窗格 + 实心门板） ---------- */
function buildFacade(batch, w, h, baseY, cz, opts = {}) {
  const cols = Math.max(2, Math.round(w / 0.62));
  const bayW = w / cols;
  const centerBay = Math.floor(cols / 2);
  for (let c = 0; c < cols; c++) {
    const x = -w / 2 + bayW * (c + 0.5);
    const isDoor = opts.doorBay === c;
    // 下部实心门板（朱红深）
    batch.add('redD', new BoxGeometry(bayW - 0.07, h * 0.34, 0.05), M.compose(x, baseY + h * 0.17, cz));
    if (isDoor) {
      // 中央开间门洞：门框中梃（两侧竖框 + 中竖梃）
      batch.add('red', new BoxGeometry(0.05, h * 0.66, 0.06), M.compose(x - bayW / 2 + 0.04, baseY + h * 0.34 + h * 0.33, cz));
      batch.add('red', new BoxGeometry(0.05, h * 0.66, 0.06), M.compose(x + bayW / 2 - 0.04, baseY + h * 0.34 + h * 0.33, cz));
      batch.add('red', new BoxGeometry(0.04, h * 0.66, 0.05), M.compose(x, baseY + h * 0.34 + h * 0.33, cz));
      // 上横框
      batch.add('red', new BoxGeometry(bayW - 0.05, 0.05, 0.06), M.compose(x, baseY + h * 0.97, cz));
      // 直棂（门洞上半）
      const nL = Math.max(3, Math.floor((bayW - 0.14) / 0.075));
      for (let l = 0; l < nL; l++) {
        const lx = x - bayW / 2 + 0.08 + (l / (nL - 1)) * (bayW - 0.16);
        batch.add('red', new BoxGeometry(0.018, h * 0.4, 0.03), M.compose(lx, baseY + h * 0.74, cz));
      }
    } else {
      // 直棂窗格（细竖条阵列）+ 窗底框
      const nL = Math.max(3, Math.floor((bayW - 0.1) / 0.08));
      for (let l = 0; l < nL; l++) {
        const lx = x - bayW / 2 + 0.06 + (l / (nL - 1)) * (bayW - 0.12);
        batch.add('red', new BoxGeometry(0.02, h * 0.56, 0.03), M.compose(lx, baseY + h * 0.62, cz));
      }
      batch.add('red', new BoxGeometry(bayW - 0.06, 0.04, 0.05), M.compose(x, baseY + h * 0.34, cz));
      batch.add('red', new BoxGeometry(bayW - 0.06, 0.04, 0.05), M.compose(x, baseY + h * 0.9, cz));
      // 窗后微亮暖光（主殿窗光置于格棂后）
      batch.add('lampSoft', new BoxGeometry(bayW - 0.1, h * 0.5, 0.01), M.compose(x, baseY + h * 0.62, cz + (opts.lightZ ?? 0.035)));
    }
    // 柱间框（青枋）
    batch.add('teal', new BoxGeometry(bayW + 0.02, 0.05, 0.06), M.compose(x, baseY + h * 0.995, cz));
  }
}

/* ============================================================
 * 太和殿
 * ============================================================ */
function buildTaiheDian() {
  const batch = new MergeBatch();
  const cz = HALL.cz;

  // —— 三层汉白玉台基（逐层收分）+ 栏杆望柱 ——
  let baseY = GROUND;
  for (let L = 0; L < 3; L++) {
    const w = HALL.baseW[L], d = HALL.baseD[L];
    batch.add('jade', new BoxGeometry(w, HALL.baseH, d), M.compose(0, baseY + HALL.baseH / 2, cz));
    // 台基收分斜面视觉（薄檐口线）
    batch.add('jadeD', new BoxGeometry(w + 0.1, 0.05, d + 0.1), M.compose(0, baseY + 0.03, cz));
    baseY += HALL.baseH;
    // 栏杆望柱环绕（顶层加密）
    const step = L === 2 ? 0.3 : 0.42;
    const railH = 0.16;
    const hw = w / 2, hd = d / 2;
    for (let x = -hw; x <= hw + 1e-6; x += step) {
      for (const z of [cz - hd, cz + hd]) {
        batch.add('jade', new BoxGeometry(0.045, railH, 0.045), M.compose(x, baseY + railH / 2, z));
        // 望柱头落雪
        batch.add('snow', new BoxGeometry(0.055, 0.03, 0.055), M.compose(x, baseY + railH + 0.015, z));
      }
    }
    for (let z = cz - hd; z <= cz + hd + 1e-6; z += step) {
      for (const x of [-hw, hw]) {
        batch.add('jade', new BoxGeometry(0.045, railH, 0.045), M.compose(x, baseY + railH / 2, z));
        batch.add('snow', new BoxGeometry(0.055, 0.03, 0.055), M.compose(x, baseY + railH + 0.015, z));
      }
    }
    // 栏板（横杆）
    batch.add('jade', new BoxGeometry(w, 0.04, 0.03), M.compose(0, baseY + railH * 0.7, cz - hd));
    batch.add('jade', new BoxGeometry(w, 0.04, 0.03), M.compose(0, baseY + railH * 0.7, cz + hd));
    batch.add('jade', new BoxGeometry(0.03, 0.04, d), M.compose(-hw, baseY + railH * 0.7, cz));
    batch.add('jade', new BoxGeometry(0.03, 0.04, d), M.compose(hw, baseY + railH * 0.7, cz));
  }
  // 中央御路石阶（前后）
  for (const sz of [1, -1]) {
    for (let s = 0; s < 7; s++) {
      const w = lerp(1.5, 0.9, s / 7);
      batch.add('jadeD', new BoxGeometry(w, 0.06, 0.24), M.compose(0, GROUND + 0.03 + s * 0.185, cz + sz * (HALL.baseD[0] / 2 + 0.1 - s * 0.22)));
    }
  }

  // —— 殿身柱列（十一间 × 五进深，外圈朱柱） ——
  const colPositions = [];
  const bx = HALL.bodyW / 2, bz = HALL.bodyD / 2;
  for (let i = 0; i <= HALL.bays; i++) {
    const x = -bx + (i / HALL.bays) * HALL.bodyW;
    for (const z of [cz - bz, cz + bz]) colPositions.push([x, z]);
  }
  for (let j = 1; j < HALL.depths - 1; j++) {
    const z = cz - bz + (j / (HALL.depths - 1)) * HALL.bodyD;
    for (const x of [-bx, bx]) colPositions.push([x, z]);
  }
  for (const [x, z] of colPositions) {
    batch.add('red', new CylinderGeometry(HALL.colR, HALL.colR * 1.06, HALL.colH, 8), M.compose(x, HALL_TOP + HALL.colH / 2, z));
  }

  // —— 斗拱（柱头三层出挑） ——
  buildDougong(batch, colPositions, HALL_TOP + HALL.colH);

  // —— 门窗立面（前后；中央开间门洞） ——
  buildFacade(batch, HALL.bodyW - 0.1, HALL.colH, HALL_TOP, cz + bz + 0.01, { doorBay: 5, lightZ: 0.04 });
  buildFacade(batch, HALL.bodyW - 0.1, HALL.colH, HALL_TOP, cz - bz - 0.01, { doorBay: 5, lightZ: -0.04 });
  // 山面墙（侧立面）：直接用简化立面（sideFacade）
  const sideFacade = (sx) => {
    const cols = 5;
    const bayW = (HALL.bodyD - 0.1) / cols;
    for (let c = 0; c < cols; c++) {
      const z = cz - (HALL.bodyD - 0.1) / 2 + bayW * (c + 0.5);
      batch.add('redD', new BoxGeometry(0.05, HALL.colH * 0.34, bayW - 0.07), M.compose(sx * (bx + 0.005), HALL_TOP + HALL.colH * 0.17, z));
      const nL = Math.floor((bayW - 0.1) / 0.08);
      for (let l = 0; l < nL; l++) {
        const lz = z - bayW / 2 + 0.06 + (l / Math.max(1, nL - 1)) * (bayW - 0.12);
        batch.add('red', new BoxGeometry(0.03, HALL.colH * 0.56, 0.02), M.compose(sx * (bx + 0.02), HALL_TOP + HALL.colH * 0.62, lz));
      }
    }
  };
  sideFacade(1); sideFacade(-1);

  // —— 中央门洞内：阴影中的宝座与金柱 ——
  const throne = grp(
    box(0.5, 0.06, 0.42, mat('gold'), 0, HALL_TOP + 0.36, cz + 0.1),
    box(0.46, 0.5, 0.08, mat('redD'), 0, HALL_TOP + 0.62, cz - 0.05),
    cyl(0.03, 0.04, 0.3, 6, mat('goldHi'), 0, HALL_TOP + 0.55, cz + 0.28),
    box(0.7, 0.04, 0.5, mat('redD'), 0, HALL_TOP + 0.02, cz + 0.1),
  );
  sceneInner.add(throne);
  // 门洞内金柱（一对）
  batch.add('gold', new CylinderGeometry(0.035, 0.035, HALL.colH, 8), M.compose(-0.55, HALL_TOP + HALL.colH / 2, cz + bz * 0.4));
  batch.add('gold', new CylinderGeometry(0.035, 0.035, HALL.colH, 8), M.compose(0.55, HALL_TOP + HALL.colH / 2, cz + bz * 0.4));

  // —— 重檐庑殿顶 ——
  buildHipRoofMesh(ROOF_LO, 'tile', batch);
  buildRoofTiles(ROOF_LO, batch);
  buildHipRoofMesh(ROOF_UP, 'tile', batch);
  buildRoofTiles(ROOF_UP, batch);
  buildRoofRidges(ROOF_UP, batch);
  // 下檐博脊（环绕上层墙根）
  batch.add('tile', new BoxGeometry(ROOF_LO.c * 2 + 0.3, 0.06, 0.08), M.compose(0, ROOF_LO.ridge, cz));

  // —— 上层墙（两檐之间，红墙+直棂窗） ——
  batch.add('redD', new BoxGeometry(ROOF_UP.a * 2 - 0.5, 0.62, ROOF_UP.b * 2 - 0.5), M.compose(0, ROOF_LO.ridge + 0.28, cz));
  for (let i = -4; i <= 4; i++) {
    batch.add('red', new BoxGeometry(0.03, 0.4, 0.03), M.compose(i * 0.55, ROOF_LO.ridge + 0.3, cz + ROOF_UP.b - 0.28));
    batch.add('red', new BoxGeometry(0.03, 0.4, 0.03), M.compose(i * 0.55, ROOF_LO.ridge + 0.3, cz - ROOF_UP.b + 0.28));
  }
  // 主殿窗光（格棂后暖光）
  batch.add('lampWarm', new BoxGeometry(ROOF_UP.a * 2 - 0.8, 0.34, 0.02), M.compose(0, ROOF_LO.ridge + 0.3, cz + ROOF_UP.b - 0.3));
  batch.add('lampWarm', new BoxGeometry(ROOF_UP.a * 2 - 0.8, 0.34, 0.02), M.compose(0, ROOF_LO.ridge + 0.3, cz - ROOF_UP.b + 0.3));

  // —— 檐口滴水（檐缘细金线） ——
  for (const R of [ROOF_LO, ROOF_UP]) {
    batch.add('gold', new BoxGeometry(R.a * 2, 0.035, 0.05), M.compose(0, roofH(1, R) - 0.02, cz + R.b));
    batch.add('gold', new BoxGeometry(R.a * 2, 0.035, 0.05), M.compose(0, roofH(1, R) - 0.02, cz - R.b));
    batch.add('gold', new BoxGeometry(0.05, 0.035, R.b * 2), M.compose(R.a, roofH(1, R) - 0.02, cz));
    batch.add('gold', new BoxGeometry(0.05, 0.035, R.b * 2), M.compose(-R.a, roofH(1, R) - 0.02, cz));
  }

  batch.build(sceneInner);

  /* —— 碰撞注册（雪晶）：台基三层 + 殿身 + 两层屋面 —— */
  for (let L = 0; L < 3; L++) {
    Colliders.add({
      type: 'box',
      minX: -HALL.baseW[L] / 2, maxX: HALL.baseW[L] / 2,
      minZ: cz - HALL.baseD[L] / 2, maxZ: cz + HALL.baseD[L] / 2,
      minY: GROUND, maxY: GROUND + (L + 1) * HALL.baseH,
    });
  }
  Colliders.add({
    type: 'box',
    minX: -HALL.bodyW / 2, maxX: HALL.bodyW / 2,
    minZ: cz - HALL.bodyD / 2, maxZ: cz + HALL.bodyD / 2,
    minY: HALL_TOP, maxY: HALL_TOP + HALL.colH,
  });
  for (const R of [ROOF_LO, ROOF_UP]) {
    Colliders.add({
      type: 'roof',
      minX: -R.a, maxX: R.a, minZ: R.cz - R.b, maxZ: R.cz + R.b,
      minY: R.ridge - R.drop - 0.1, maxY: R.ridge + 0.3,
      heightAt: (x, z) => {
        const s = roofS(x, z, R);
        return roofH(clamp(s, 0, 1), R) + 0.02;
      },
      slope: (x, z) => { // 屋面坡度（沿坡滑动用）
        const s = clamp(roofS(x, z, R), 0.001, 0.999);
        const e = 0.01;
        const h1 = roofH(clamp(s - e, 0, 1), R), h2 = roofH(clamp(s + e, 0, 1), R);
        return (h1 - h2) / (2 * e * R.drop); // 近似 dh/ds
      },
    });
  }
}
buildTaiheDian();

/* ============================================================
 * 太和门（歇山顶、十间柱廊、朱柱青枋）
 * ============================================================ */
const GATE = { cz: 2.6, w: 5.6, d: 2.4, colH: 0.95, baseH: 0.3 };
function buildTaiheMen() {
  const batch = new MergeBatch();
  const cz = GATE.cz;
  const topY = GROUND + GATE.baseH;
  // 台基
  batch.add('jade', new BoxGeometry(GATE.w + 0.9, GATE.baseH, GATE.d + 0.7), M.compose(0, GROUND + GATE.baseH / 2, cz));
  // 十间柱廊（朱柱）
  const colPos = [];
  for (let i = 0; i <= 10; i++) {
    const x = -GATE.w / 2 + (i / 10) * GATE.w;
    for (const z of [cz - GATE.d / 2, cz + GATE.d / 2]) {
      colPos.push([x, z]);
      batch.add('red', new CylinderGeometry(0.045, 0.05, GATE.colH, 8), M.compose(x, topY + GATE.colH / 2, z));
    }
  }
  // 青枋（柱顶横梁）
  batch.add('teal', new BoxGeometry(GATE.w + 0.2, 0.12, 0.1), M.compose(0, topY + GATE.colH + 0.02, cz - GATE.d / 2));
  batch.add('teal', new BoxGeometry(GATE.w + 0.2, 0.12, 0.1), M.compose(0, topY + GATE.colH + 0.02, cz + GATE.d / 2));
  // 斗拱（简化两层）
  for (const [x, z] of colPos) {
    batch.add('teal', new BoxGeometry(0.13, 0.05, 0.11), M.compose(x, topY + GATE.colH + 0.09, z));
    batch.add('gold', new BoxGeometry(0.17, 0.04, 0.06), M.compose(x, topY + GATE.colH + 0.13, z));
  }
  // 门板立面（朱红门 + 中梃）
  buildFacade(batch, GATE.w - 0.15, GATE.colH * 0.9, topY, cz - GATE.d / 2 - 0.01, { doorBay: 5 });
  // —— 歇山顶（有山花与下部坡面） ——
  const a = 3.1, b = 1.5, c = 2.0, ridge = topY + GATE.colH + 0.95, drop = 0.78;
  const R = { a, b, c, ridge, drop, cz };
  // 前后坡（梯形）
  for (const side of [1, -1]) {
    const rows = 10, cols = 16;
    const pos = [], idx = [];
    for (let i = 0; i <= rows; i++) {
      const u = i / rows;
      const halfW = lerp(c, a, u);
      const y = ridge - drop * Math.pow(u, ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, u);
      const zc = cz + side * lerp(0, b, u);
      for (let j = 0; j <= cols; j++) pos.push(lerp(-halfW, halfW, j / cols), y, zc);
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const p = i * (cols + 1) + j, q = p + 1, r2 = p + cols + 1, s2 = r2 + 1;
      if (side === 1) idx.push(p, r2, q, q, r2, s2); else idx.push(p, q, r2, q, s2, r2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    batch.add('tile', g);
    // 瓦垄
    for (let k = -Math.round(a / 0.15); k <= Math.round(a / 0.15); k++) {
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        const x = lerp((k / (a / 0.15)) * c, (k / (a / 0.15)) * a, u);
        const y = ridge - drop * Math.pow(u, ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, u) + 0.012;
        pts.push(new Vector3(x, y, cz + side * lerp(0.02, b, u)));
      }
      batch.add('gold', new TubeGeometry(new CatmullRomCurve3(pts), 6, 0.022, 4, false));
    }
  }
  // 山花（两端三角形红墙+金框）与下部坡面
  for (const sx of [1, -1]) {
    // 下部坡面（山面下半斜坡）
    const pos = [], idx = [];
    const rows = 6, cols = 8;
    for (let i = 0; i <= rows; i++) {
      const u = i / rows; // 0 上（山花底）→ 1 檐
      const y = ridge - drop * 0.55 - (drop * 0.5) * u;
      const xEdge = sx * lerp(c * 0.98, a, u);
      const halfD = lerp(b * 0.55, b, u);
      for (let j = 0; j <= cols; j++) pos.push(xEdge, y, cz + lerp(-halfD, halfD, j / cols));
    }
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const p = i * (cols + 1) + j, q = p + 1, r2 = p + cols + 1, s2 = r2 + 1;
      idx.push(p, r2, q, q, r2, s2);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    batch.add('tile', g);
    // 山花（三角端面，红墙 + 金色梅花钉纹）
    const tri = new Shape();
    tri.moveTo(0, 0); tri.lineTo(0, drop * 0.55); tri.lineTo(-sx * 0.0, 0); // 退化保护
    batch.add('redD', new BoxGeometry(0.05, drop * 0.5, b * 1.05), M.compose(sx * (c * 0.95), ridge - drop * 0.28, cz));
    batch.add('gold', new BoxGeometry(0.06, 0.05, b * 1.08), M.compose(sx * (c * 0.95), ridge - drop * 0.06, cz));
    for (let dnum = 0; dnum < 5; dnum++) {
      batch.add('gold', new BoxGeometry(0.02, 0.02, 0.02), M.compose(sx * (c * 0.93), ridge - drop * 0.2 - dnum * 0.07, cz + (dnum % 2 ? 0.3 : -0.3)));
    }
  }
  // 正脊 + 鸱吻
  batch.add('tile', new BoxGeometry(c * 2, 0.07, 0.1), M.compose(0, ridge + 0.02, cz));
  for (const sx of [1, -1]) {
    batch.add('tile', new BoxGeometry(0.12, 0.26, 0.12), M.compose(sx * c, ridge + 0.12, cz));
    batch.add('tile', new TorusGeometry(0.07, 0.028, 6, 8, Math.PI * 1.2), M.compose(sx * (c + 0.05), ridge + 0.28, cz, sx * 0.5, 1, 1, 1));
  }
  batch.build(sceneInner);
  // 碰撞
  Colliders.add({ type: 'box', minX: -GATE.w / 2 - 0.45, maxX: GATE.w / 2 + 0.45, minZ: cz - GATE.d / 2 - 0.35, maxZ: cz + GATE.d / 2 + 0.35, minY: GROUND, maxY: topY + GATE.colH });
  Colliders.add({
    type: 'roof', minX: -a, maxX: a, minZ: cz - b, maxZ: cz + b, minY: ridge - drop - 0.1, maxY: ridge + 0.2,
    heightAt: (x, z) => {
      const ax = Math.abs(x) / a, az = Math.abs(z - cz) / b, cc = c / a;
      const s = ax <= cc ? az : Math.min(1, Math.hypot(az, ((ax - cc) / (1 - cc)) * 0.92));
      return ridge - drop * Math.pow(clamp(s, 0, 1), ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, s) + 0.02;
    },
    slope: () => 0.5,
  });
}
buildTaiheMen();

/* ============================================================
 * 五座内金水桥（中桥稍宽，拱形桥面、石栏杆、望柱头落雪）
 * ============================================================ */
function buildBridges() {
  const batch = new MergeBatch();
  const xs = [-2.4, -1.2, 0, 1.2, 2.4];
  xs.forEach((bx, i) => {
    const w = i === 2 ? 0.62 : 0.42; // 中桥稍宽
    const span = 1.5; // 桥面 z 跨度
    // 拱形桥面（分段条带）
    const segs = 10;
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs;
      const y0 = GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t0);
      const y1 = GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t1);
      const z0 = riverCenter(bx) - span / 2 + t0 * span;
      const z1 = riverCenter(bx) - span / 2 + t1 * span;
      const mid = (y0 + y1) / 2;
      batch.add('jadeD', new BoxGeometry(w, 0.09, span / segs + 0.02), M.compose(bx, mid, (z0 + z1) / 2, 0, 1, (y1 - y0) / (span / segs) * 2.2, 1));
    }
    // 石栏杆（两侧）
    for (const sx of [-1, 1]) {
      const railX = bx + sx * (w / 2 - 0.03);
      for (let p = 0; p <= 5; p++) {
        const t = p / 5;
        const y = GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t);
        const z = riverCenter(bx) - span / 2 + t * span;
        batch.add('jade', new BoxGeometry(0.035, 0.17, 0.035), M.compose(railX, y + 0.1, z));
        // 望柱头落雪
        batch.add('snow', new BoxGeometry(0.045, 0.028, 0.045), M.compose(railX, y + 0.2, z));
      }
      // 横杆（分段弧）
      for (let s = 0; s < 5; s++) {
        const t0 = s / 5, t1 = (s + 1) / 5;
        const y0 = GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t0) + 0.16;
        const y1 = GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t1) + 0.16;
        const z0 = riverCenter(bx) - span / 2 + t0 * span, z1 = riverCenter(bx) - span / 2 + t1 * span;
        batch.add('jade', new BoxGeometry(0.03, 0.035, span / 5 + 0.02), M.compose(railX, (y0 + y1) / 2, (z0 + z1) / 2));
      }
    }
  });
  batch.build(sceneInner);
  // 碰撞：桥面（近似平面高度）
  xs.forEach((bx, i) => {
    const w = i === 2 ? 0.62 : 0.42;
    Colliders.add({
      type: 'bridge', minX: bx - w / 2, maxX: bx + w / 2,
      minZ: riverCenter(bx) - 0.75, maxZ: riverCenter(bx) + 0.75,
      heightAt: (x, z) => {
        const t = clamp((z - (riverCenter(bx) - 0.75)) / 1.5, 0, 1);
        return GROUND - 0.05 + 0.34 * Math.sin(Math.PI * t);
      },
    });
  });
}
buildBridges();

/* ============================================================
 * 院落层次：低墙、小配殿、铜狮、铜缸、雪地脚印、外围松柏
 * ============================================================ */
function buildCourtyard() {
  const batch = new MergeBatch();
  // 两侧低墙（覆雪顶）
  for (const sx of [-1, 1]) {
    const x = sx * 3.7;
    for (let z = -2.8; z <= 2.2; z += 0.6) {
      batch.add('redD', new BoxGeometry(0.12, 0.5, 0.58), M.compose(x, GROUND + 0.25, z));
      batch.add('snow', new BoxGeometry(0.2, 0.07, 0.6), M.compose(x, GROUND + 0.52, z));
    }
    // 墙顶瓦檐
    batch.add('tile', new BoxGeometry(0.24, 0.05, 5.2), M.compose(x, GROUND + 0.5, -0.3));
  }
  // 小配殿（左右各一，歇山小顶）
  for (const sx of [-1, 1]) {
    const cx = sx * 4.35, cz = 0.6;
    const w = 1.7, d = 1.1, colH = 0.55;
    batch.add('jade', new BoxGeometry(w + 0.4, 0.18, d + 0.35), M.compose(cx, GROUND + 0.09, cz));
    batch.add('redD', new BoxGeometry(w, colH * 0.4, d), M.compose(cx, GROUND + 0.18 + colH * 0.2, cz));
    for (let i = 0; i <= 4; i++) {
      batch.add('red', new CylinderGeometry(0.03, 0.033, colH, 6), M.compose(cx - w / 2 + (i / 4) * w, GROUND + 0.18 + colH / 2, cz + d / 2));
    }
    batch.add('teal', new BoxGeometry(w + 0.1, 0.06, 0.07), M.compose(cx, GROUND + 0.18 + colH + 0.02, cz + d / 2));
    // 小歇山顶
    const a = w / 2 + 0.25, b = d / 2 + 0.2, c = w / 2 - 0.1, ridge = GROUND + 0.18 + colH + 0.42, drop = 0.34;
    for (const side of [1, -1]) {
      const rows = 6, cols = 8;
      const pos = [], idx = [];
      for (let ri = 0; ri <= rows; ri++) {
        const u = ri / rows;
        const halfW = lerp(c, a, u);
        const y = ridge - drop * Math.pow(u, ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, u);
        for (let j = 0; j <= cols; j++) pos.push(cx + lerp(-halfW, halfW, j / cols), y, cz + side * lerp(0, b, u));
      }
      for (let ri = 0; ri < rows; ri++) for (let j = 0; j < cols; j++) {
        const p = ri * (cols + 1) + j, q = p + 1, r2 = p + cols + 1, s2 = r2 + 1;
        if (side === 1) idx.push(p, r2, q, q, r2, s2); else idx.push(p, q, r2, q, s2, r2);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setIndex(idx); g.computeVertexNormals();
      batch.add('tile', g);
      // 覆雪（顶面白壳）
      for (let ri = 0; ri <= rows; ri++) {
        const u = ri / rows;
        if (u > 0.55) {
          const halfW = lerp(c, a, u);
          const y = ridge - drop * Math.pow(u, ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, u) + 0.025;
          batch.add('snow', new BoxGeometry(halfW * 2 * 0.9, 0.03, 0.1), M.compose(cx, y, cz + side * lerp(0, b, u)));
        }
      }
    }
    batch.add('tile', new BoxGeometry(c * 2, 0.05, 0.08), M.compose(cx, ridge + 0.01, cz));
    Colliders.add({
      type: 'roof', minX: cx - a, maxX: cx + a, minZ: cz - b, maxZ: cz + b, minY: ridge - drop - 0.05, maxY: ridge + 0.1,
      heightAt: (x, z) => {
        const ax = Math.abs(x - cx) / a, az = Math.abs(z - cz) / b, cc = c / a;
        const s = clamp(ax <= cc ? az : Math.min(1, Math.hypot(az, ((ax - cc) / (1 - cc)) * 0.92)), 0, 1);
        return ridge - drop * Math.pow(s, ROOF_EXP) + ROOF_LIFT * drop * smoothstep(0.72, 1, s) + 0.02;
      }, slope: () => 0.5,
    });
    Colliders.add({ type: 'box', minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, minY: GROUND, maxY: GROUND + 0.18 + colH });
  }
  // 铜狮（太和门前台阶两侧）
  for (const sx of [-1, 1]) {
    const lx = sx * 1.35, lz = 2.0;
    batch.add('bronze', new BoxGeometry(0.3, 0.16, 0.3), M.compose(lx, GROUND + 0.08, lz));
    batch.add('bronze', new CylinderGeometry(0.07, 0.09, 0.2, 8), M.compose(lx, GROUND + 0.26, lz));
    batch.add('bronze', new SphereGeometry(0.09, 10, 8), M.compose(lx, GROUND + 0.4, lz));
    batch.add('bronze', new TorusGeometry(0.055, 0.02, 6, 10, Math.PI * 1.5), M.compose(lx, GROUND + 0.44, lz + 0.02, Math.PI / 2, 1, 1, 1));
    // 鬃毛
    for (let k = 0; k < 5; k++) batch.add('bronze', new ConeGeometry(0.018, 0.05, 4), M.compose(lx + Math.cos(k * 1.26) * 0.06, GROUND + 0.46, lz - 0.04 + Math.sin(k * 1.26) * 0.03));
  }
  // 铜缸（殿前两侧）
  for (const [gx, gz] of [[-2.6, 0.9], [2.6, 0.9], [-2.2, -3.4], [2.2, -3.4]]) {
    batch.add('bronze', new CylinderGeometry(0.16, 0.13, 0.24, 12), M.compose(gx, GROUND + 0.13, gz));
    batch.add('bronze', new TorusGeometry(0.155, 0.014, 6, 14), M.compose(gx, GROUND + 0.22, gz, Math.PI / 2, 1, 1, 1));
    batch.add('bronze', new TorusGeometry(0.155, 0.014, 6, 14), M.compose(gx, GROUND + 0.06, gz, Math.PI / 2, 1, 1, 1));
    batch.add('snow', new CylinderGeometry(0.15, 0.15, 0.02, 12), M.compose(gx, GROUND + 0.255, gz));
  }
  // 雪地脚印（御道上成串小凹痕）
  for (let trail = 0; trail < 3; trail++) {
    let fx = -0.5 + trail * 0.5 + rng.range(-0.1, 0.1);
    let fz = 3.4;
    const step = 0.16;
    while (fz > -3.2) {
      batch.add('snowD', new BoxGeometry(0.05, 0.012, 0.08), M.compose(fx, groundHeight(fx, fz) + 0.005, fz));
      fx += rng.range(-0.02, 0.02) + (trail - 1) * 0.008;
      fz -= step;
      if (rng.next() < 0.1) fz -= step * 0.5;
    }
  }
  batch.build(sceneInner);
}
buildCourtyard();

/* ---------- 外围松柏（程序化，覆雪层） ---------- */
function buildPines() {
  const batch = new MergeBatch(), snowBatch = new MergeBatch();
  const spots = [];
  // 沿球内边缘一圈采样（避开中轴建筑区）
  let guard = 0;
  while (spots.length < 11 && guard++ < 200) {
    const a = rng.next() * TAU;
    const r = rng.range(4.6, 5.7);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.abs(x) < 3.9 && Math.abs(z - HALL.cz) < 3.2) continue;   // 避开主殿
    if (Math.abs(x) < 3.2 && z > 1.4 && z < 5.6) continue;            // 避开中轴前区
    if (Math.abs(z - riverCenter(x)) < 0.9) continue;                 // 避开河
    if (spots.some(([px, pz]) => Math.hypot(px - x, pz - z) < 0.9)) continue;
    spots.push([x, z]);
  }
  for (const [x, z] of spots) {
    const h = rng.range(0.9, 1.5);
    const y0 = groundHeight(x, z);
    batch.add('woodD', new CylinderGeometry(0.035, 0.05, h * 0.3, 6), M.compose(x, y0 + h * 0.15, z));
    // 层叠锥体树冠
    const layers = 4;
    for (let L = 0; L < layers; L++) {
      const ly = y0 + h * (0.28 + L * 0.17);
      const lr = h * (0.3 - L * 0.055);
      batch.add('tealD', new ConeGeometry(lr, h * 0.24, 7), M.compose(x, ly, z));
      snowBatch.add('snow', new ConeGeometry(lr * 0.92, h * 0.1, 7), M.compose(x, ly + h * 0.07, z));
    }
    Colliders.add({ type: 'cylinder', x, z, r: 0.28, y0: y0, y1: y0 + h });
  }
  batch.build(sceneInner);
  snowBatch.build(sceneInner);
}
buildPines();
