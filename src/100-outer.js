/* ============================================================
 * 100-outer.js — 球外月夜水庭（sceneOuter）
 * 椭圆石砌水庭（逐块石岸+雪覆+园路）、六角灯亭、四株红梅、成串宫灯、
 * 芦苇岩石、前景木码头（茶桌茶具坐垫）+带桨系泊绳小舟、
 * 42 纸河灯约束漂流、13 孔明灯轻摇、月面星光流萤近岸薄雾、95 水面花瓣、
 * 球外平面倒影（reflectOuterRT，含实体灯火）
 * ============================================================ */

const OUTER = {
  cx: 0, cz: 3.5,          // 水庭中心（偏前景）
  rx: 14.5, rz: 11.0,      // 椭圆半径
  waterY: 0.02,
};

/* ---------- 椭圆岸判定 ---------- */
function inOuterWater(x, z) {
  const dx = (x - OUTER.cx) / OUTER.rx, dz = (z - OUTER.cz) / OUTER.rz;
  return dx * dx + dz * dz < 1.0;
}

/* ============================================================
 * 石岸（逐块）+ 园路 + 芦苇 + 岩石 + 红梅 + 六角灯亭 + 成串宫灯
 * ============================================================ */
function buildOuterShore() {
  const batch = new MergeBatch();
  // —— 逐块石岸（沿椭圆边，双层石+雪覆） ——
  const nStones = 96;
  for (let i = 0; i < nStones; i++) {
    const a = (i / nStones) * TAU;
    const x = OUTER.cx + Math.cos(a) * OUTER.rx, z = OUTER.cz + Math.sin(a) * OUTER.rz;
    const s = 0.5 + rng.next() * 0.35;
    const rock = new IcosahedronGeometry(s, 0);
    const p = rock.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * (0.75 + rng.next() * 0.5), p.getY(v) * (0.5 + rng.next() * 0.3), p.getZ(v) * (0.75 + rng.next() * 0.5));
    }
    rock.computeVertexNormals();
    batch.add('jadeD', rock, M.compose(x, 0.1, z, rng.next() * TAU, 1, 1, 1));
    // 雪覆（顶面白壳）
    batch.add('snow', new SphereGeometry(s * 0.55, 8, 6), M.compose(x, s * 0.45, z, 0, 1, 1, 0.5));
    // 岸上园路石板（内侧一圈，交错）
    if (i % 2 === 0) {
      const px = OUTER.cx + Math.cos(a) * (OUTER.rx + 0.9), pz = OUTER.cz + Math.sin(a) * (OUTER.rz + 0.9);
      batch.add('jadeD', new BoxGeometry(0.55, 0.06, 0.42), M.compose(px, 0.03, pz, -a, 1, 1, 1));
      batch.add('snow', new BoxGeometry(0.5, 0.03, 0.36), M.compose(px, 0.065, pz, -a, 1, 1, 1));
    }
  }
  // —— 岸边岩石（几组大石） ——
  for (const [rx, rz, rs] of [[-11.5, 8.5, 1.1], [12.2, 6.8, 0.9], [-9.8, -6.2, 1.0], [10.5, -7.5, 0.8]]) {
    const rock = new IcosahedronGeometry(rs, 1);
    const p = rock.attributes.position;
    for (let v = 0; v < p.count; v++) {
      p.setXYZ(v, p.getX(v) * (0.8 + rng.next() * 0.4), p.getY(v) * (0.55 + rng.next() * 0.3), p.getZ(v) * (0.8 + rng.next() * 0.4));
    }
    rock.computeVertexNormals();
    batch.add('jade', rock, M.compose(rx, rs * 0.3, rz, rng.next() * TAU, 1, 1, 1));
    batch.add('snow', new SphereGeometry(rs * 0.5, 8, 6), M.compose(rx, rs * 0.62, rz, 0, 1, 1, 0.55));
  }
  // —— 芦苇丛（细杆+顶穗，岸边 6 丛） ——
  for (let c = 0; c < 6; c++) {
    const a = rng.next() * TAU;
    const bx = OUTER.cx + Math.cos(a) * (OUTER.rx - 0.4), bz = OUTER.cz + Math.sin(a) * (OUTER.rz - 0.4);
    for (let r = 0; r < 7; r++) {
      const h = rng.range(0.8, 1.5);
      const rx2 = bx + rng.range(-0.4, 0.4), rz2 = bz + rng.range(-0.4, 0.4);
      batch.add('woodD', new CylinderGeometry(0.012, 0.02, h, 4), M.compose(rx2, h / 2, rz2, 0, rng.range(-0.1, 0.1), rng.range(-0.1, 0.1), 1));
      batch.add('tealD', new ConeGeometry(0.035, 0.16, 5), M.compose(rx2 + 0.02, h + 0.06, rz2));
    }
  }
  // —— 四株红梅（岸上，枝干+红梅点+雪点） ——
  for (const [mx, mz, ms] of [[-12.8, 2.0, 1.3], [12.5, 1.2, 1.1], [-8.5, -9.0, 1.0], [9.0, 9.8, 1.2]]) {
    batch.add('woodD', new CylinderGeometry(0.07 * ms, 0.1 * ms, 1.1 * ms, 6), M.compose(mx, 0.55 * ms, mz, 0, 0, 0.06, 1));
    // 主枝横斜
    batch.add('woodD', new BoxGeometry(1.3 * ms, 0.06 * ms, 0.06 * ms), M.compose(mx + 0.4 * ms, 1.0 * ms, mz, 0, 0, 0.3, 1));
    batch.add('woodD', new BoxGeometry(0.9 * ms, 0.05 * ms, 0.05 * ms), M.compose(mx - 0.3 * ms, 1.25 * ms, mz + 0.2 * ms, 0, 0.4, -0.5, 1));
    // 红梅点
    for (let b = 0; b < 16; b++) {
      batch.add('red', new SphereGeometry(0.045 * ms, 6, 5), M.compose(mx + rng.range(-0.7, 0.8) * ms, 0.9 * ms + rng.range(0, 0.6) * ms, mz + rng.range(-0.3, 0.3) * ms));
    }
    // 雪点
    for (let b = 0; b < 8; b++) {
      batch.add('snow', new SphereGeometry(0.03 * ms, 5, 4), M.compose(mx + rng.range(-0.6, 0.7) * ms, 1.1 * ms + rng.range(0, 0.4) * ms, mz + rng.range(-0.25, 0.25) * ms));
    }
  }
  // —— 六角灯亭（右前岸上） ——
  {
    const px = 10.8, pz = 10.5, R = 1.1, colH = 1.5;
    batch.add('jadeD', new CylinderGeometry(R * 1.3, R * 1.4, 0.25, 6), M.compose(px, 0.12, pz));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      batch.add('red', new CylinderGeometry(0.05, 0.055, colH, 8), M.compose(px + Math.cos(a) * R, 0.25 + colH / 2, pz + Math.sin(a) * R));
    }
    // 双檐
    for (const [ry, rw, rh] of [[0.25 + colH + 0.18, R * 1.6, 0.3], [0.25 + colH + 0.42, R * 1.25, 0.24]]) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU, a2 = ((i + 1) / 6) * TAU;
        const pos = [], idx = [];
        for (let rj = 0; rj <= 3; rj++) {
          const u = rj / 3;
          const rOut = lerp(R * 0.5, rw, u);
          const yy = ry + rh * (1 - Math.pow(u, 1.3)) + 0.1 * smoothstep(0.6, 1, u);
          for (let j = 0; j <= 2; j++) {
            const am = lerp(a, a2, j / 2);
            pos.push(px + Math.cos(am) * rOut, yy, pz + Math.sin(am) * rOut);
          }
        }
        for (let rj = 0; rj < 3; rj++) for (let j = 0; j < 2; j++) {
          const p = rj * 3 + j, q = p + 1, r2 = p + 3, s2 = r2 + 1;
          idx.push(p, r2, q, q, r2, s2);
        }
        const g = new BufferGeometry();
        g.setAttribute('position', new Float32BufferAttribute(pos, 3));
        g.setIndex(idx); g.computeVertexNormals();
        batch.add('teal', g);
        // 檐缘雪
        for (let j = 0; j <= 1; j++) {
          const am = lerp(a, a2, j);
          batch.add('snow', new BoxGeometry(0.1, 0.03, 0.1), M.compose(px + Math.cos(am) * rw, ry + 0.1, pz + Math.sin(am) * rw));
        }
      }
    }
    batch.add('gold', new ConeGeometry(0.1, 0.28, 6), M.compose(px, 0.25 + colH + 0.72, pz));
    // 檐下灯（六盏）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.PI / 6;
      batch.add('lampGold', new SphereGeometry(0.07, 8, 6), M.compose(px + Math.cos(a) * R * 1.55, 0.25 + colH + 0.05, pz + Math.sin(a) * R * 1.55));
    }
    // 亭内主灯+石桌
    batch.add('lampWarm', new SphereGeometry(0.1, 10, 8), M.compose(px, 0.25 + colH * 0.6, pz));
    batch.add('jade', new CylinderGeometry(0.3, 0.24, 0.08, 10), M.compose(px, 0.32, pz));
    // 亭顶金脊
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      batch.add('gold', new BoxGeometry(0.05, 0.05, R * 1.5), M.compose(px + Math.cos(a) * R * 0.75, 0.25 + colH + 0.5, pz + Math.sin(a) * R * 0.75, -a, 1, 1, 1));
    }
  }
  // —— 成串宫灯（亭到码头路径两侧，每串 4 盏） ——
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const lx = s * (3.2 + i * 1.6), lz = 13.5 - i * 0.8;
      batch.add('woodD', new CylinderGeometry(0.05, 0.07, 1.9, 6), M.compose(lx, 0.95, lz));
      batch.add('snow', new CylinderGeometry(0.075, 0.075, 0.04, 6), M.compose(lx, 1.92, lz));
      // 挑臂+灯
      batch.add('wood', new BoxGeometry(0.5, 0.04, 0.04), M.compose(lx, 1.88, lz, 0, 0, s * 0.5, 1));
      batch.add('red', new BoxGeometry(0.008, 0.08, 0.008), M.compose(lx - s * 0.2, 1.8, lz));
      batch.add('lampRed', new CylinderGeometry(0.09, 0.09, 0.13, 10), M.compose(lx - s * 0.2, 1.7, lz));
      batch.add('gold', new CylinderGeometry(0.1, 0.08, 0.025, 10), M.compose(lx - s * 0.2, 1.78, lz));
    }
  }
  batch.build(sceneOuter);
}
buildOuterShore();

/* ============================================================
 * 前景木码头（茶桌茶壶茶杯坐垫）+ 带桨系泊绳小舟
 * ============================================================ */
function buildDock() {
  const batch = new MergeBatch();
  const dz = 12.8; // 码头 z（伸向水面）
  // 木板栈道（伸入水面）
  for (let i = 0; i < 7; i++) {
    const z = dz - i * 0.9;
    batch.add('wood', new BoxGeometry(2.2, 0.07, 0.82), M.compose(0, 0.32, z));
    batch.add('woodD', new BoxGeometry(2.24, 0.03, 0.06), M.compose(0, 0.36, z + 0.4));
    batch.add('woodD', new BoxGeometry(2.24, 0.03, 0.06), M.compose(0, 0.36, z - 0.4));
    // 桩
    for (const px of [-1.0, 1.0]) {
      batch.add('woodD', new CylinderGeometry(0.07, 0.09, 0.9, 6), M.compose(px, -0.1, z));
    }
  }
  // —— 茶桌（码头端头） ——
  batch.add('wood', new BoxGeometry(0.9, 0.05, 0.6), M.compose(0, 0.62, dz - 5.6));
  for (const dx of [-0.38, 0.38]) for (const dxz of [-0.22, 0.22]) {
    batch.add('woodD', new BoxGeometry(0.05, 0.28, 0.05), M.compose(dx, 0.46, dz - 5.6 + dxz));
  }
  // 茶壶（球+嘴+把+盖）
  batch.add('teal', new SphereGeometry(0.11, 10, 8), M.compose(-0.2, 0.75, dz - 5.6));
  batch.add('teal', new CylinderGeometry(0.04, 0.055, 0.05, 8), M.compose(-0.2, 0.87, dz - 5.6));
  batch.add('teal', new CylinderGeometry(0.015, 0.022, 0.14, 6), M.compose(-0.34, 0.77, dz - 5.6, 0, 0, 0.5, 1));
  batch.add('teal', new TorusGeometry(0.055, 0.014, 5, 12, Math.PI), M.compose(-0.08, 0.75, dz - 5.6, 0, Math.PI / 2, 1, 1, 1));
  // 茶杯 ×2
  for (const s of [0, 1]) batch.add('jade', new CylinderGeometry(0.04, 0.032, 0.055, 8), M.compose(0.08 + s * 0.16, 0.68, dz - 5.5));
  // 坐垫（两只，圆垫+雪点）
  for (const [cx2, cz2] of [[-0.8, dz - 4.9], [0.8, dz - 4.9]]) {
    batch.add('red', new CylinderGeometry(0.22, 0.24, 0.07, 12), M.compose(cx2, 0.37, cz2));
    batch.add('snow', new CylinderGeometry(0.16, 0.18, 0.02, 12), M.compose(cx2, 0.41, cz2));
  }
  // —— 小舟（泊码头右侧，带桨+系泊绳） ——
  const bx = 2.6, bz = dz - 3.2;
  // 船体（弯月：中段盒+两端翘板）
  batch.add('wood', new BoxGeometry(0.62, 0.22, 2.4), M.compose(bx, 0.12, bz));
  batch.add('woodD', new BoxGeometry(0.56, 0.16, 0.5), M.compose(bx, 0.02, bz)); // 船底
  batch.add('wood', new BoxGeometry(0.5, 0.16, 0.7), M.compose(bx, 0.24, bz - 1.35, 0, 0.5, 1, 1)); // 艏翘
  batch.add('wood', new BoxGeometry(0.5, 0.16, 0.7), M.compose(bx, 0.24, bz + 1.35, 0, -0.5, 1, 1)); // 艉翘
  // 船内座板
  batch.add('woodD', new BoxGeometry(0.5, 0.04, 0.4), M.compose(bx, 0.2, bz - 0.5));
  // 桨（斜放船侧）
  batch.add('wood', new BoxGeometry(0.05, 0.05, 1.6), M.compose(bx + 0.38, 0.2, bz + 0.3, 0, 0.25, 0.3, 1));
  batch.add('woodD', new BoxGeometry(0.14, 0.03, 0.24), M.compose(bx + 0.68, 0.1, bz + 1.05, 0, 0.25, 0.3, 1));
  // 系泊绳（码头到船艏，垂弧）
  const rope = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    rope.push(new Vector3(lerp(1.1, bx - 0.25, t), 0.36 - Math.sin(t * Math.PI) * 0.22, lerp(dz - 0.6, bz - 1.3, t)));
  }
  batch.add('dark', new TubeGeometry(new CatmullRomCurve3(rope), 10, 0.015, 5, false));
  batch.build(sceneOuter);
}
buildDock();

/* ============================================================
 * 球外水面（椭圆平面 + 反射 shader + 月光带）
 * ============================================================ */
let outerWater = null;
function buildOuterWater() {
  const geo = new CircleGeometry(1, 48);
  const matWater = new ShaderMaterial({
    uniforms: {
      tReflect: { value: null },
      time: { value: 0 },
      camPos: { value: new Vector3() },
      moonDir: { value: new Vector3(-0.45, 0.55, -0.7).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vScreenUV;
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vec4 sp = projectionMatrix * viewMatrix * wp;
        vScreenUV = sp.xy / sp.w * 0.5 + 0.5;
        gl_Position = sp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tReflect;
      uniform float time;
      uniform vec3 camPos;
      uniform vec3 moonDir;
      varying vec2 vScreenUV;
      varying vec3 vWorldPos;
      void main() {
        // 缓波法线扰动
        float w1 = sin(vWorldPos.x * 0.5 + time * 0.6) * sin(vWorldPos.z * 0.4 - time * 0.45);
        float w2 = sin((vWorldPos.x + vWorldPos.z) * 1.3 + time * 1.1) * 0.4;
        vec2 nOff = vec2((w1 + w2) * 0.003, (w1 - w2) * 0.002);
        // 反射（含实体灯火）
        vec3 refl = texture2D(tReflect, clamp(vScreenUV + nOff * 2.0, 0.001, 0.999)).rgb;
        // 深水基色
        vec3 base = vec3(0.015, 0.04, 0.08);
        // 菲涅耳
        vec3 V = normalize(camPos - vWorldPos);
        float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        vec3 col = mix(base, refl, clamp(fres * 0.95 + 0.25, 0.0, 1.0));
        // 月光带（朝月方向的水面高光带）
        vec3 toFrag = normalize(vec3(vWorldPos.x - camPos.x, 0.0, vWorldPos.z - camPos.z));
        float moonAlign = max(dot(toFrag, normalize(vec3(moonDir.x, 0.0, moonDir.z))), 0.0);
        float band = pow(moonAlign, 60.0) * (0.5 + 0.5 * sin(vWorldPos.x * 3.0 + time * 1.2));
        col += vec3(0.35, 0.38, 0.42) * band * 0.8;
        // 细碎月光
        float glint = pow(max(sin(vWorldPos.x * 2.1 + time * 0.8) * sin(vWorldPos.z * 1.7 - time * 0.5), 0.0), 12.0);
        col += vec3(0.5, 0.52, 0.55) * glint * 0.3;
        gl_FragColor = vec4(col, 0.96);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
  matWater.toneMapped = false;
  outerWater = new Mesh(geo, matWater);
  outerWater.rotation.x = -Math.PI / 2;
  outerWater.scale.set(OUTER.rx, OUTER.rz, 1);
  outerWater.position.set(OUTER.cx, OUTER.waterY, OUTER.cz);
  outerWater.layers.set(1); // 反射 pass 排除
  outerWater.renderOrder = 2;
  sceneOuter.add(outerWater);
}
buildOuterWater();

/* ============================================================
 * 42 纸河灯/莲花灯（InstancedMesh，约束漂流+起伏）
 * ============================================================ */
const riverLamps = { n: 42, body: null, glow: null, data: [] };
function buildRiverLamps() {
  const bodyGeo = new CylinderGeometry(0.09, 0.11, 0.07, 8);
  const glowGeo = new SphereGeometry(0.05, 8, 6);
  riverLamps.body = new InstancedMesh(bodyGeo, mat('paper'), riverLamps.n);
  riverLamps.glow = new InstancedMesh(glowGeo, mat('lampWarm'), riverLamps.n);
  riverLamps.body.instanceMatrix.setUsage(DynamicDrawUsage);
  riverLamps.glow.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let i = 0; i < riverLamps.n; i++) {
    // 约束在椭圆水庭内（避开中心底座区 r>7）
    let x, z;
    do {
      const a = rng.next() * TAU;
      const r = Math.sqrt(rng.next());
      x = OUTER.cx + Math.cos(a) * OUTER.rx * r * 0.92;
      z = OUTER.cz + Math.sin(a) * OUTER.rz * r * 0.92;
    } while (Math.hypot(x, z - 1) < 7.2 || !inOuterWater(x, z));
    riverLamps.data.push({ x, z, phase: rng.next() * TAU, driftA: rng.next() * TAU, driftR: rng.range(0.2, 0.8), speed: rng.range(0.01, 0.03) });
  }
  sceneOuter.add(riverLamps.body, riverLamps.glow);
}
buildRiverLamps();

/* ============================================================
 * 13 孔明灯（InstancedMesh，空中轻摇缓升）
 * ============================================================ */
const skyLanterns = { n: 13, body: null, glow: null, data: [] };
function buildSkyLanterns() {
  const bodyGeo = new SphereGeometry(0.22, 10, 8);
  bodyGeo.scale(1, 1.25, 1);
  skyLanterns.body = new InstancedMesh(bodyGeo, mat('paper'), skyLanterns.n);
  skyLanterns.glow = new InstancedMesh(new SphereGeometry(0.1, 8, 6), mat('lampGold'), skyLanterns.n);
  skyLanterns.body.instanceMatrix.setUsage(DynamicDrawUsage);
  skyLanterns.glow.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let i = 0; i < skyLanterns.n; i++) {
    skyLanterns.data.push({
      x: rng.range(-16, 16), z: rng.range(-14, 18), y: rng.range(2, 16),
      phase: rng.next() * TAU, rise: rng.range(0.08, 0.2), sway: rng.range(0.3, 0.8),
    });
  }
  sceneOuter.add(skyLanterns.body, skyLanterns.glow);
}
buildSkyLanterns();

/* ============================================================
 * 95 水面花瓣（InstancedMesh，漂浮旋转）
 * ============================================================ */
const petalsOuter = { n: 95, mesh: null, data: [] };
function buildPetalsOuter() {
  const geo = new PlaneGeometry(0.09, 0.055);
  petalsOuter.mesh = new InstancedMesh(geo, new MeshBasicMaterial({ color: 0xe8b8c4, side: DoubleSide, transparent: true, opacity: 0.9, toneMapped: false }), petalsOuter.n);
  petalsOuter.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let i = 0; i < petalsOuter.n; i++) {
    let x, z;
    do {
      const a = rng.next() * TAU;
      const r = Math.sqrt(rng.next());
      x = OUTER.cx + Math.cos(a) * OUTER.rx * r * 0.9;
      z = OUTER.cz + Math.sin(a) * OUTER.rz * r * 0.9;
    } while (Math.hypot(x, z - 1) < 7.0 || !inOuterWater(x, z));
    petalsOuter.data.push({ x, z, phase: rng.next() * TAU, rot: rng.next() * TAU, spin: rng.range(0.1, 0.5) });
  }
  sceneOuter.add(petalsOuter.mesh);
}
buildPetalsOuter();

/* ============================================================
 * 月面 + 星光 + 流萤 + 近岸薄雾
 * ============================================================ */
function buildSkyElements() {
  // 月面（远处亮盘+光晕）
  const moon = new Mesh(new CircleGeometry(3.2, 32), new MeshBasicMaterial({ color: 0xfdf6e3, toneMapped: false, fog: false }));
  moon.position.set(-52, 42, -78);
  moon.lookAt(0, 6, 0);
  sceneOuter.add(moon);
  const halo = new Mesh(new CircleGeometry(5.2, 32), new MeshBasicMaterial({ color: 0xdfe9f2, transparent: true, opacity: 0.22, toneMapped: false, fog: false, depthWrite: false }));
  halo.position.set(-52, 42, -78.2);
  halo.lookAt(0, 6, 0);
  sceneOuter.add(halo);
  // 月面斑驳（几个暗斑）
  for (const [mx, my, mr] of [[-0.8, 0.6, 0.5], [0.6, -0.4, 0.35], [0.1, 0.9, 0.25]]) {
    const spot = new Mesh(new CircleGeometry(mr, 16), new MeshBasicMaterial({ color: 0xe8dfc8, toneMapped: false, fog: false }));
    spot.position.set(-52 + mx, 42 + my, -77.9);
    spot.lookAt(0, 6, 0);
    sceneOuter.add(spot);
  }
  // 星光（Points，远球面分布）
  const starN = 420;
  const starPos = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) {
    const a = rng.next() * TAU, b = Math.acos(rng.range(-0.15, 1));
    const r = 150 + rng.next() * 40;
    starPos[i * 3] = Math.cos(a) * Math.sin(b) * r;
    starPos[i * 3 + 1] = Math.cos(b) * r + 20;
    starPos[i * 3 + 2] = Math.sin(a) * Math.sin(b) * r;
  }
  const starGeo = new BufferGeometry();
  starGeo.setAttribute('position', new BufferAttribute(starPos, 3));
  const stars = new Points(starGeo, new PointsMaterial({
    color: 0xcfe0f2, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.85, toneMapped: false, fog: false,
  }));
  sceneOuter.add(stars);
  // 流萤（15 个动态光点，Points）
  const fireN = 15;
  const firePos = new Float32Array(fireN * 3);
  window.__fireflies = [];
  for (let i = 0; i < fireN; i++) {
    const a = rng.next() * TAU;
    const r = rng.range(OUTER.rx * 0.55, OUTER.rx * 0.95);
    const fx = OUTER.cx + Math.cos(a) * r, fz = OUTER.cz + Math.sin(a) * r * 0.8;
    window.__fireflies.push({ x: fx, z: fz, y: rng.range(0.3, 1.2), phase: rng.next() * TAU, speed: rng.range(0.3, 0.8) });
    firePos[i * 3] = fx; firePos[i * 3 + 1] = 0.6; firePos[i * 3 + 2] = fz;
  }
  const fireGeo = new BufferGeometry();
  fireGeo.setAttribute('position', new BufferAttribute(firePos, 3));
  window.__fireflyPoints = new Points(fireGeo, new PointsMaterial({
    color: 0xc8f0a8, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.9, toneMapped: false,
    blending: AdditiveBlending, depthWrite: false,
  }));
  sceneOuter.add(window.__fireflyPoints);
  // 近岸薄雾（3 层大半透明平面，缓慢漂移）
  window.__mistLayers = [];
  for (let i = 0; i < 3; i++) {
    const mist = new Mesh(
      new CircleGeometry(OUTER.rx * (0.75 + i * 0.12), 24),
      new MeshBasicMaterial({ color: 0xaebfd0, transparent: true, opacity: 0.05 + i * 0.02, toneMapped: false, depthWrite: false, fog: false }),
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(OUTER.cx, 0.12 + i * 0.16, OUTER.cz);
    mist.renderOrder = 6;
    sceneOuter.add(mist);
    window.__mistLayers.push(mist);
  }
}
buildSkyElements();

/* ---------- 球外动态（150-loop 每帧调用） ---------- */
const _m4 = new Matrix4(), _q = new Quaternion(), _v3 = new Vector3(), _s3 = new Vector3(1, 1, 1);
function updateOuterDynamics(dt) {
  const t = State.time;
  // 河灯：约束漂流+起伏
  for (let i = 0; i < riverLamps.n; i++) {
    const d = riverLamps.data[i];
    const a = d.driftA + t * d.speed;
    const x = d.x + Math.cos(a) * d.driftR * 0.3;
    const z = d.z + Math.sin(a * 1.3) * d.driftR * 0.2;
    const y = OUTER.waterY + 0.045 + Math.sin(t * 1.1 + d.phase * 7) * 0.02;
    _q.setFromAxisAngle(_v3.set(0, 1, 0), t * 0.15 + d.phase);
    _m4.compose(_v3.set(x, y, z), _q, _s3);
    riverLamps.body.setMatrixAt(i, _m4);
    _m4.compose(_v3.set(x, y + 0.05, z), _q, _s3);
    riverLamps.glow.setMatrixAt(i, _m4);
  }
  riverLamps.body.instanceMatrix.needsUpdate = true;
  riverLamps.glow.instanceMatrix.needsUpdate = true;
  // 孔明灯：缓升+轻摇
  for (let i = 0; i < skyLanterns.n; i++) {
    const d = skyLanterns.data[i];
    d.y += d.rise * dt;
    if (d.y > 26) d.y = 2;
    const x = d.x + Math.sin(t * 0.3 + d.phase) * d.sway;
    const z = d.z + Math.cos(t * 0.24 + d.phase * 2) * d.sway * 0.7;
    const tilt = Math.sin(t * 0.5 + d.phase) * 0.08;
    _q.setFromEuler(new Euler(tilt, t * 0.1 + d.phase, tilt * 0.6));
    _m4.compose(_v3.set(x, d.y, z), _q, _s3);
    skyLanterns.body.setMatrixAt(i, _m4);
    _m4.compose(_v3.set(x, d.y - 0.18, z), _q, _s3.setScalar(0.9 + Math.sin(t * 2 + d.phase) * 0.12));
    skyLanterns.glow.setMatrixAt(i, _m4);
    _s3.set(1, 1, 1);
  }
  skyLanterns.body.instanceMatrix.needsUpdate = true;
  skyLanterns.glow.instanceMatrix.needsUpdate = true;
  // 花瓣：漂浮旋转
  for (let i = 0; i < petalsOuter.n; i++) {
    const d = petalsOuter.data[i];
    const x = d.x + Math.sin(t * 0.12 + d.phase) * 0.25;
    const z = d.z + Math.cos(t * 0.1 + d.phase * 2) * 0.2;
    _q.setFromEuler(new Euler(-Math.PI / 2 + Math.sin(t * 0.5 + d.phase) * 0.1, d.rot + t * d.spin * 0.2, 0));
    _m4.compose(_v3.set(x, OUTER.waterY + 0.012, z), _q, _s3);
    petalsOuter.mesh.setMatrixAt(i, _m4);
  }
  petalsOuter.mesh.instanceMatrix.needsUpdate = true;
  // 流萤：近岸漂浮闪烁
  const fp = window.__fireflyPoints.geometry.attributes.position;
  for (let i = 0; i < window.__fireflies.length; i++) {
    const f = window.__fireflies[i];
    fp.setXYZ(i,
      f.x + Math.sin(t * f.speed + f.phase) * 0.8,
      f.y + Math.sin(t * f.speed * 1.7 + f.phase * 3) * 0.35,
      f.z + Math.cos(t * f.speed * 0.8 + f.phase * 2) * 0.6);
  }
  fp.needsUpdate = true;
  window.__fireflyPoints.material.opacity = 0.55 + Math.sin(t * 2.2) * 0.35;
  // 薄雾：缓慢漂移+呼吸
  for (let i = 0; i < window.__mistLayers.length; i++) {
    const m = window.__mistLayers[i];
    m.material.opacity = 0.045 + i * 0.018 + Math.sin(t * 0.3 + i * 2.1) * 0.015;
    m.position.x = OUTER.cx + Math.sin(t * 0.08 + i) * 0.8;
    m.position.z = OUTER.cz + Math.cos(t * 0.06 + i * 1.4) * 0.6;
  }
  // 外水面 uniform
  if (outerWater) {
    outerWater.material.uniforms.time.value = t;
    outerWater.material.uniforms.camPos.value.copy(camera.position);
  }
}
