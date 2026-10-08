/* ============================================================
 * 120-snow.js — 实体雪晶系统（8200 粒、8 类形态、逐粒物理）
 *
 * 形态：树枝晶/薄板/蕨枝/针晶/短柱/团絮/碎冰/细粉，每类独立
 * InstancedBufferGeometry + 逐粒位置/四元数/尺寸/相位/速度属性。
 * 物理：重力+形态阻力+侧风摆动+薄片滑翔+角速度阻尼；
 * 碰撞=解析表面（ground LUT + 屋面函数 + 包围盒/桥/柱 空间网格）；
 * 落地留存（总数守恒，respawned=0），强风摇动再松脱；
 * 低恢复回弹+材质摩擦+沿坡滑动+贴附姿态；球壁内折返。
 * 时间步长：每帧 ≤0.08s，拆两 ≤0.04s 子步。
 * ============================================================ */

/* ---------- 八类形态配置（固定比例；size/mass/drag/restitution/attach/sway，±20% 个体差异） ---------- */
const SNOW_TYPES = [
  { name: 'dendrite', frac: 0.14, size: [0.075, 0.135], mass: 0.70, drag: 1.7,  rest: 0.77, attach: 0.37, sway: 0.9,  alpha: 1.0,  glide: 0.0 },
  { name: 'plate',    frac: 0.12, size: [0.046, 0.095], mass: 0.85, drag: 1.35, rest: 0.58, attach: 0.31, sway: 0.6,  alpha: 0.62, glide: 1.0 },
  { name: 'fern',     frac: 0.09, size: [0.078, 0.140], mass: 0.61, drag: 1.95, rest: 0.72, attach: 0.42, sway: 1.1,  alpha: 1.0,  glide: 0.0 },
  { name: 'needle',   frac: 0.10, size: [0.056, 0.105], mass: 0.98, drag: 1.08, rest: 0.67, attach: 0.27, sway: 0.5,  alpha: 1.0,  glide: 0.0 },
  { name: 'column',   frac: 0.07, size: [0.035, 0.068], mass: 1.18, drag: 0.94, rest: 0.60, attach: 0.23, sway: 0.3,  alpha: 1.0,  glide: 0.0 },
  { name: 'puff',     frac: 0.27, size: [0.041, 0.094], mass: 0.53, drag: 2.2,  rest: 0.43, attach: 0.48, sway: 0.75, alpha: 0.8,  glide: 0.15 },
  { name: 'shard',    frac: 0.09, size: [0.027, 0.062], mass: 1.08, drag: 1.14, rest: 0.68, attach: 0.25, sway: 0.4,  alpha: 1.0,  glide: 0.0 },
  { name: 'powder',   frac: 0.12, size: [0.013, 0.030], mass: 0.30, drag: 2.6,  rest: 0.29, attach: 0.52, sway: 1.0,  alpha: 1.0,  glide: 0.0 },
];
const SNOW_TOTAL = 8200;
const SNOW_G = 3.5; // 有效重力（视觉尺度）

/* ============================================================
 * 形态基几何（局部坐标，单位尺寸，实例按 aSize 缩放）
 * ============================================================ */
function buildSnowGeometry(name) {
  const parts = []; // {geo, matrix}
  const addBox = (w, h, d, x, y, z, ry = 0, rz = 0) => {
    const g = new BoxGeometry(w, h, d);
    g.applyMatrix4(M.compose(x, y, z, ry, 1, 1, 1));
    if (rz) { const g2 = new BoxGeometry(w, h, d); g2.applyMatrix4(M.compose(x, y, z, 0, 1, 1, 1)); g2.rotateZ(rz); parts.push({ geo: g2 }); return; }
    parts.push({ geo: g });
  };
  switch (name) {
    case 'dendrite': {
      // 六向主枝（有厚度棱柱枝条）+ 每枝两侧枝 + 中心核
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        const dx = Math.cos(a), dy = Math.sin(a);
        addBox(0.5, 0.055, 0.055, dx * 0.28, dy * 0.28, 0, a);
        for (const s of [-1, 1]) {
          const ba = a + s * 0.55;
          addBox(0.22, 0.04, 0.04, Math.cos(ba) * 0.42, Math.sin(ba) * 0.42, 0, ba);
          addBox(0.13, 0.03, 0.03, Math.cos(ba + s * 0.3) * 0.52, Math.sin(ba + s * 0.3) * 0.52, 0, ba + s * 0.3);
        }
      }
      parts.push({ geo: new CylinderGeometry(0.07, 0.07, 0.05, 6) });
      break;
    }
    case 'plate': {
      // 实体六棱薄柱 + 半透明晶面感（薄）+ 棱线
      parts.push({ geo: new CylinderGeometry(0.55, 0.55, 0.045, 6) });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        addBox(0.5, 0.012, 0.03, Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0, a);
      }
      // 内环棱线
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        addBox(0.22, 0.01, 0.02, Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, a);
      }
      break;
    }
    case 'fern': {
      // 蕨枝：主枝+密集短侧枝（每侧 3）
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        addBox(0.52, 0.045, 0.045, Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0, a);
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
          const ba = a + s * (0.35 + k * 0.28);
          const r = 0.22 + k * 0.11;
          addBox(0.1 + k * 0.02, 0.028, 0.028, Math.cos(ba) * r, Math.sin(ba) * r, 0, ba);
        }
      }
      parts.push({ geo: new CylinderGeometry(0.06, 0.06, 0.04, 6) });
      break;
    }
    case 'needle': {
      // 细棱柱束（3 根不同角度）
      for (const [a, r] of [[0.3, 0.1], [2.4, 0.12], [4.5, 0.08]]) {
        const g = new BoxGeometry(0.9, 0.028, 0.028);
        g.applyMatrix4(M.compose(Math.cos(a) * r, Math.sin(a) * r, 0, a, 1, 1, 1));
        parts.push({ geo: g });
      }
      break;
    }
    case 'column': {
      // 真实六棱柱（h≈2.2r）+ 端面小锥
      parts.push({ geo: new CylinderGeometry(0.22, 0.22, 0.5, 6) });
      const cap = new CylinderGeometry(0.1, 0.22, 0.12, 6);
      cap.applyMatrix4(M.compose(0, 0.3, 0, 0, 1, 1, 1));
      parts.push({ geo: cap });
      break;
    }
    case 'puff': {
      // 团絮：体积交叉多面体微片（5 片小四面体随机朝向）
      for (let i = 0; i < 5; i++) {
        const g = new TetrahedronGeometry(0.16 + (i % 3) * 0.05);
        g.applyMatrix4(M.compose(Math.cos(i * 2.3) * 0.12, Math.sin(i * 1.7) * 0.12, Math.sin(i * 2.9) * 0.1, i * 1.3, 1, 1, 1));
        parts.push({ geo: g });
      }
      break;
    }
    case 'shard': {
      // 不规则切面多边形（固定种子变形 icosa）
      const g = new IcosahedronGeometry(0.3, 0);
      const p = g.attributes.position;
      const r2 = new LCG(0x5eed1234);
      for (let v = 0; v < p.count; v++) {
        p.setXYZ(v, p.getX(v) * (0.6 + r2.next() * 0.8), p.getY(v) * (0.25 + r2.next() * 0.5), p.getZ(v) * (0.6 + r2.next() * 0.8));
      }
      g.computeVertexNormals();
      parts.push({ geo: g });
      break;
    }
    case 'powder': {
      // 微小立体晶体（八面体）
      parts.push({ geo: new OctahedronGeometry(0.3, 0) });
      break;
    }
  }
  return mergeGeoms(parts.map(p => ({ geometry: p.geo, matrix: null })));
}

/* ============================================================
 * 碰撞查询：ground LUT + 表面空间网格
 * ============================================================ */
const SnowCollide = {
  lutN: 72, lutMin: -6.3, lutMax: 6.3, lut: null,
  grid: null, cell: 1.25, gridN: 0,
  build() {
    // ground 高度 LUT（双线性）
    const n = this.lutN;
    this.lut = new Float32Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x = lerp(this.lutMin, this.lutMax, i / (n - 1));
        const z = lerp(this.lutMin, this.lutMax, j / (n - 1));
        this.lut[i * n + j] = groundHeight(x, z);
      }
    }
    // 表面网格（box/roof/bridge/cylinder）
    this.gridN = Math.ceil((this.lutMax - this.lutMin) / this.cell);
    this.grid = new Map();
    for (let si = 0; si < Colliders.surfaces.length; si++) {
      const s = Colliders.surfaces[si];
      if (s.type === 'ground') continue;
      const x0 = Math.floor((s.minX - this.lutMin) / this.cell), x1 = Math.floor((s.maxX - this.lutMin) / this.cell);
      const z0 = Math.floor((s.minZ - this.lutMin) / this.cell), z1 = Math.floor((s.maxZ - this.lutMin) / this.cell);
      for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) {
        const key = gx * 1000 + gz;
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(si);
      }
    }
  },
  groundAt(x, z) {
    const n = this.lutN;
    const fx = clamp((x - this.lutMin) / (this.lutMax - this.lutMin), 0, 1) * (n - 1);
    const fz = clamp((z - this.lutMin) / (this.lutMax - this.lutMin), 0, 1) * (n - 1);
    const i = Math.floor(fx), j = Math.floor(fz);
    const i2 = Math.min(n - 1, i + 1), j2 = Math.min(n - 1, j + 1);
    const tx = fx - i, tz = fz - j;
    const a = this.lut[i * n + j], b = this.lut[i * n + j2], c = this.lut[i2 * n + j], d = this.lut[i2 * n + j2];
    return lerp(lerp(a, c, tx), lerp(b, d, tx), tz);
  },
  groundNormal(x, z) {
    const e = 0.06;
    const hx = this.groundAt(x + e, z) - this.groundAt(x - e, z);
    const hz = this.groundAt(x, z + e) - this.groundAt(x, z - e);
    const n = new Vector3(-hx / (2 * e), 1, -hz / (2 * e));
    return n.normalize();
  },
  /** 查询 (x,z) 附近的表面：返回 {h, nx, ny, nz, friction} 最高命中面
   *  below=false（碰撞）：y+1.2 内最高面（粒子从上方接近）
   *  below=true （审计）：y 之下（≤y+0.03）最高面（粒子脚下支撑面） */
  surfaceAt(x, z, y, below = false) {
    // ground（总在）
    let h = this.groundAt(x, z);
    let nx = 0, ny = 1, nz = 0, friction = 0.3, isIce = false;
    // 河面（冰/水区分：isWaterAt → 摩擦极低；河面本身是碰撞面——雪落水面不穿入）
    if (y < GROUND + 0.1 && Math.abs(z - riverCenter(x)) < RIVER_HALF) {
      const hWater = GROUND - 0.035;
      if (hWater > h && (!below || hWater <= y + 0.03)) h = hWater;
      if (isWaterAt(x, z)) { friction = 0.02; isIce = false; }
      else { friction = 0.04; isIce = true; }
    }
    // 网格表面
    const gx = Math.floor((x - this.lutMin) / this.cell), gz = Math.floor((z - this.lutMin) / this.cell);
    const list = this.grid.get(gx * 1000 + gz);
    if (list) {
      for (const si of list) {
        const s = Colliders.surfaces[si];
        if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
        let sh = -Infinity;
        if (s.type === 'roof' || s.type === 'bridge') {
          sh = s.heightAt(x, z);
        } else if (s.type === 'box') {
          sh = s.maxY;
        } else if (s.type === 'cylinder') {
          if (Math.hypot(x - s.x, z - s.z) <= s.r && (below ? s.y1 <= y + 0.03 : y > s.y0 - 0.1)) sh = s.y1;
        }
        if (sh > h && (below ? sh <= y + 0.03 : y > sh - 1.2)) {
          h = sh;
          friction = 0.22;
          // 屋面法线（近似：沿最大下降方向）
          if (s.type === 'roof' && s.slope) {
            const e = 0.08;
            const hx = s.heightAt(x + e, z) - s.heightAt(x - e, z);
            const hz = s.heightAt(x, z + e) - s.heightAt(x, z - e);
            const n = new Vector3(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
            nx = n.x; ny = n.y; nz = n.z;
          } else { nx = 0; ny = 1; nz = 0; }
        }
      }
    }
    return { h, nx, ny, nz, friction, isIce };
  },
};
SnowCollide.build();

/* ============================================================
 * SnowSystem：8 类 × InstancedBufferGeometry
 * ============================================================ */
const SnowSystem = {
  types: [],       // {name, n, mesh, pos:F32, quat:F64, vel:F32, angVel:F32, size:F32, phase:F32, settled:U8, drag:F32, rest:F32, iPos,iQuat,iSize,iPhase}
  initialized: false,
  simTime: 0,

  init() {
    let seedIdx = 0;
    for (const T of SNOW_TYPES) {
      const n = Math.round(T.frac * SNOW_TOTAL);
      const baseGeo = buildSnowGeometry(T.name);
      const geo = new InstancedBufferGeometry();
      geo.index = baseGeo.index;
      geo.attributes.position = baseGeo.attributes.position;
      geo.attributes.normal = baseGeo.attributes.normal;
      const iPos = new InstancedBufferAttribute(new Float32Array(n * 3), 3);
      const iQuat = new InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const iSize = new InstancedBufferAttribute(new Float32Array(n), 1);
      const iPhase = new InstancedBufferAttribute(new Float32Array(n), 1);
      iPos.setUsage(DynamicDrawUsage); iQuat.setUsage(DynamicDrawUsage);
      geo.setAttribute('aPos', iPos);
      geo.setAttribute('aQuat', iQuat);
      geo.setAttribute('aSize', iSize);
      geo.setAttribute('aPhase', iPhase);
      geo.instanceCount = n;

      const mat = new MeshStandardMaterial({
        color: 0xf6f8f8, roughness: 0.92, metalness: 0.0,
        transparent: T.alpha < 1, opacity: T.alpha, depthWrite: T.alpha >= 1,
      });
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>
            attribute vec3 aPos; attribute vec4 aQuat; attribute float aSize; attribute float aPhase;
            vec3 quatRot(vec4 q, vec3 v) { return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v); }`)
          .replace('#include <begin_vertex>', `
            vec3 transformed = quatRot(aQuat, position * aSize);
            vec3 transformedLocal = transformed;
            transformed = aPos + transformed;`)
          .replace('#include <beginnormal_vertex>', `
            vec3 objectNormal = quatRot(aQuat, normal);
            #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent );
            #endif`);
      };

      const mesh = new Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.layers.set(2); // 雪晶层：反射/折射 pass 排除
      mesh.renderOrder = 3;
      sceneInner.add(mesh);

      // 粒子数据（体积采样：建筑两侧上空、前后纵深）
      const pos = new Float32Array(n * 3);
      const quat = new Float64Array(n * 4);
      const vel = new Float32Array(n * 3);
      const angVel = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const phase = new Float32Array(n);
      const settled = new Uint8Array(n);
      const drag = new Float32Array(n);
      const rest = new Float32Array(n);
      const q = new Quaternion();
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0, z = 0, ok = false;
        for (let tries = 0; tries < 40 && !ok; tries++) {
          x = rng.range(-5.9, 5.9);
          y = rng.range(GROUND + 1.2, SPHERE_CY + 5.6);
          z = rng.range(-5.9, 5.9);
          const r = Math.hypot(x, y - SPHERE_CY, z);
          if (r > SPHERE_R - 0.35) continue;
          // 建筑两侧上空（避开中轴正上空低空区）+ 前后纵深
          if (Math.abs(x) < 1.2 && y < GROUND + 4.2) continue;
          // 避开所有碰撞体内部：生成点必须在该处最高表面之上（雪从天上落，不凭空出现在建筑里）
          const top = SnowCollide.surfaceAt(x, z, 1e9).h;
          if (y < top + 0.08) continue;
          ok = true;
        }
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        q.setFromEuler(new Euler(rng.next() * TAU, rng.next() * TAU, rng.next() * TAU));
        quat[i * 4] = q.x; quat[i * 4 + 1] = q.y; quat[i * 4 + 2] = q.z; quat[i * 4 + 3] = q.w;
        vel[i * 3] = rng.range(-0.05, 0.05);
        vel[i * 3 + 1] = rng.range(-0.12, -0.02);
        vel[i * 3 + 2] = rng.range(-0.05, 0.05);
        angVel[i * 3] = rng.range(-1.2, 1.2);
        angVel[i * 3 + 1] = rng.range(-1.2, 1.2);
        angVel[i * 3 + 2] = rng.range(-1.2, 1.2);
        const vary = rng.range(0.8, 1.2);
        size[i] = rng.range(T.size[0], T.size[1]) * vary;
        phase[i] = rng.next() * TAU;
        drag[i] = T.drag * vary;
        rest[i] = T.rest * vary;
      }
      this.types.push({ name: T.name, cfg: T, n, mesh, pos, quat, vel, angVel, size, phase, settled, drag, rest, iPos, iQuat, iSize, iPhase });
    }
    this.initialized = true;
    this.syncInstances();
  },

  /** 写 instance attributes（CPU float64 四元数 → float32） */
  syncInstances() {
    for (const T of this.types) {
      const { n, pos, quat, size, phase, iPos, iQuat, iSize, iPhase } = T;
      for (let i = 0; i < n; i++) {
        iPos.array[i * 3] = pos[i * 3]; iPos.array[i * 3 + 1] = pos[i * 3 + 1]; iPos.array[i * 3 + 2] = pos[i * 3 + 2];
        iQuat.array[i * 4] = quat[i * 4]; iQuat.array[i * 4 + 1] = quat[i * 4 + 1]; iQuat.array[i * 4 + 2] = quat[i * 4 + 2]; iQuat.array[i * 4 + 3] = quat[i * 4 + 3];
        iSize.array[i] = size[i];
        iPhase.array[i] = phase[i];
      }
      iPos.needsUpdate = true; iQuat.needsUpdate = true; iSize.needsUpdate = true; iPhase.needsUpdate = true;
    }
  },

  /** 物理子步（dt ≤ 0.04） */
  step(dt) {
    this.simTime += dt;
    const t = this.simTime;
    const wind = (typeof WindField !== 'undefined') ? WindField : null;
    const _q = new Quaternion(), _dq = new Quaternion(), _axis = new Vector3();
    const _wv = [0, 0, 0];
    for (const T of this.types) {
      const { n, pos, quat, vel, angVel, size, phase, settled, drag, rest, cfg } = T;
      const attach = cfg.attach, sway = cfg.sway, glide = cfg.glide;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3, i4 = i * 4;
        // —— 落地留存（总数守恒）：仅强风可摇动再松脱 ——
        if (settled[i]) {
          if (wind) {
            wind.sample(pos[i3], pos[i3 + 1], pos[i3 + 2], t, _wv);
            const wx = _wv[0], wy = _wv[1], wz = _wv[2];
            const wMag = Math.hypot(wx, wy, wz);
            if (wMag > 1.8 && rng.next() < (wMag - 1.8) * 0.16 * dt * 60 * 0.016) {
              settled[i] = 0;
              State.settled = Math.max(0, State.settled - 1);
              State.uplifted++;
              vel[i3] = wx * 0.4 + rng.range(-0.2, 0.2);
              vel[i3 + 1] = Math.abs(wy) * 0.3 + rng.range(0.1, 0.5);
              vel[i3 + 2] = wz * 0.4 + rng.range(-0.2, 0.2);
            }
          }
          if (settled[i]) continue;
        }
        let px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];
        let vx = vel[i3], vy = vel[i3 + 1], vz = vel[i3 + 2];

        // —— 力：重力 + 形态阻力（线性衰减→终端速度） ——
        vy -= SNOW_G * dt;
        const damp = Math.exp(-drag[i] * dt);
        vx *= damp; vy *= damp; vz *= damp;

        // —— 侧风 + 相位摆动 + 向下空气分量 ——
        const sw = Math.sin(t * (0.7 + sway * 0.4) + phase[i]) * sway;
        vx += sw * 0.4 * dt;
        vz += Math.cos(t * (0.5 + sway * 0.3) + phase[i] * 1.7) * sway * 0.3 * dt;
        vy -= sway * 0.06 * dt * (0.5 + 0.5 * Math.sin(t * 1.3 + phase[i]));

        // —— 薄片横向滑翔（plate：横向力 ∝ 垂速） ——
        if (glide > 0) {
          vx += -vy * glide * 0.35 * dt * Math.sin(phase[i]);
          vz += -vy * glide * 0.25 * dt * Math.cos(phase[i]);
        }

        // —— 风场（130-wind，一次采样） ——
        if (wind) {
          wind.sample(px, py, pz, t, _wv);
          vx += _wv[0] * dt * 1.35;
          vy += _wv[1] * dt * 0.8;
          vz += _wv[2] * dt * 1.35;
        }

        // —— 积分 ——
        px += vx * dt; py += vy * dt; pz += vz * dt;

        // —— 球壁内折返（避免贴壁白带） ——
        const rx = px, ry = py - SPHERE_CY, rz = pz;
        const rr = Math.hypot(rx, ry, rz);
        const rMax = SPHERE_R - 0.06 - size[i] * 0.5;
        if (rr > rMax) {
          const inv = 1 / (rr || 1e-6);
          const nx = rx * inv, ny = ry * inv, nz = rz * inv;
          // 内折返：法向速度反弹（弱）+ 切向保留
          const vn = vx * nx + vy * ny + vz * nz;
          if (vn > 0) {
            vx -= vn * nx * 1.6; vy -= vn * ny * 1.6; vz -= vn * nz * 1.6;
            px = nx * rMax; py = SPHERE_CY + ny * rMax; pz = nz * rMax;
          }
        }

        // —— 碰撞（接近表面才查询：性能短路） ——
        if (py < GROUND + 2.2) {
          const surf = SnowCollide.surfaceAt(px, pz, py);
          if (py < surf.h + 0.015) {
            const impact = Math.hypot(vx, vy, vz);
            if (impact < 0.42 || surf.h - py > 0.25) {
              // —— 贴附（落地留存） ——
              settled[i] = 1;
              State.settled++;
              py = surf.h + size[i] * 0.25 + 0.004;
              // 贴附姿态：表面对齐 + 随机偏
              _q.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(surf.nx, surf.ny, surf.nz).normalize());
              _dq.setFromEuler(new Euler(rng.next() * 0.8 - 0.4, rng.next() * TAU, rng.next() * 0.8 - 0.4));
              _q.multiply(_dq).normalize();
              quat[i4] = _q.x; quat[i4 + 1] = _q.y; quat[i4 + 2] = _q.z; quat[i4 + 3] = _q.w;
              vel[i3] = 0; vel[i3 + 1] = 0; vel[i3 + 2] = 0;
              angVel[i3] = 0; angVel[i3 + 1] = 0; angVel[i3 + 2] = 0;
              // 水面：落雪涟漪（冰上不触发）
              if (!surf.isIce && Math.abs(pz - riverCenter(px)) < RIVER_HALF && isWaterAt(px, pz)) {
                WaterRipples.spawn(px, pz, 0.8);
              }
            } else {
              // —— 低恢复回弹 + 材质摩擦 + 沿坡运动 ——
              py = surf.h + 0.015;
              vy = Math.abs(vy) * rest[i];
              const fr = 1 - surf.friction * 2.2;
              vx *= fr; vz *= fr;
              // 沿坡滑动（坡面分量）
              if (surf.ny < 0.985) {
                const slide = (1 - surf.ny) * 2.4;
                vx += surf.nx * slide * dt * 8;
                vz += surf.nz * slide * dt * 8;
              }
            }
          }
        }

        // —— 角速度积分（四元数，阻尼） ——
        let wx = angVel[i3], wy = angVel[i3 + 1], wz = angVel[i3 + 2];
        const wMag = Math.hypot(wx, wy, wz);
        if (wMag > 1e-5) {
          _axis.set(wx / wMag, wy / wMag, wz / wMag);
          _dq.setFromAxisAngle(_axis, wMag * dt);
          _q.set(quat[i4], quat[i4 + 1], quat[i4 + 2], quat[i4 + 3]);
          _q.premultiply(_dq).normalize();
          quat[i4] = _q.x; quat[i4 + 1] = _q.y; quat[i4 + 2] = _q.z; quat[i4 + 3] = _q.w;
        }
        const wDamp = Math.exp(-1.1 * dt);
        angVel[i3] = wx * wDamp; angVel[i3 + 1] = wy * wDamp; angVel[i3 + 2] = wz * wDamp;
        // 摆动补充角速度
        angVel[i3 + 1] += Math.sin(t * 0.9 + phase[i]) * 0.15 * dt;

        pos[i3] = px; pos[i3 + 1] = py; pos[i3 + 2] = pz;
        vel[i3] = vx; vel[i3 + 1] = vy; vel[i3 + 2] = vz;
      }
    }
  },
};
SnowSystem.init();

/* ============================================================
 * 积雪主体：屋面稳定雪层（噪声起伏轮廓，裁切保留裸露金瓦）
 * ============================================================ */
function buildRoofSnowCover() {
  for (const R of [ROOF_LO, ROOF_UP]) {
    for (const side of [1, -1]) {
      const rows = 12, cols = 30;
      const pos = [], idx = [];
      for (let ri = 0; ri <= rows; ri++) {
        const u = ri / rows; // 0 脊 → 1 檐
        const halfW = lerp(R.c, R.a, u);
        const yBase = roofH(u, R);
        for (let j = 0; j <= cols; j++) {
          const x = lerp(-halfW, halfW, j / cols);
          // 雪厚：脊厚檐薄 + 噪声；噪声低处裸露（金瓦可见）
          const n = 0.5 + 0.5 * sinNoise(x * 2.1, u * 3.3 + R.cz, 7);
          const bare = smoothstep(0.3, 0.45, n) * (1 - smoothstep(0.82, 0.95, u)); // 檐口裸露多
          const thick = 0.075 * (1 - u * 0.55) * (0.35 + n * 0.65) * (1 - bare * 0.92);
          const z = R.cz + side * lerp(0.02, R.b, u);
          pos.push(x, yBase + thick + 0.012, z);
        }
      }
      for (let ri = 0; ri < rows; ri++) for (let j = 0; j < cols; j++) {
        const p = ri * (cols + 1) + j, q = p + 1, r2 = p + cols + 1, s2 = r2 + 1;
        if (side === 1) idx.push(p, r2, q, q, r2, s2); else idx.push(p, q, r2, q, s2, r2);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      const m = new Mesh(g, mat('snow'));
      m.receiveShadow = true;
      sceneInner.add(m);
    }
  }
}
buildRoofSnowCover();

/* ============================================================
 * 个别檐口重力融雪滴落（3 个循环雪团）
 * ============================================================ */
const eaveDrips = [];
function buildEaveDrips() {
  for (let i = 0; i < 3; i++) {
    const m = new Mesh(new SphereGeometry(0.045, 8, 6), mat('snow'));
    m.visible = false;
    sceneInner.add(m);
    eaveDrips.push({ mesh: m, phase: rng.next(), next: rng.range(2, 8), x: 0, active: false, y: 0, vy: 0 });
  }
}
buildEaveDrips();
addAnimator((dt, t) => {
  for (const d of eaveDrips) {
    if (!d.active) {
      d.next -= dt;
      if (d.next <= 0) {
        d.active = true;
        d.x = rng.range(-ROOF_LO.c * 0.8, ROOF_LO.c * 0.8);
        d.y = roofH(1, ROOF_LO) - 0.02;
        d.vy = 0;
        d.mesh.visible = true;
      }
    } else {
      d.vy -= SNOW_G * dt * 1.6;
      d.y += d.vy * dt;
      const surf = SnowCollide.surfaceAt(d.x, ROOF_LO.cz + ROOF_LO.b, d.y);
      if (d.y < surf.h + 0.02) {
        d.active = false;
        d.mesh.visible = false;
        d.next = rng.range(4, 11);
      }
      d.mesh.position.set(d.x, d.y, ROOF_LO.cz + ROOF_LO.b * rng.range(0.9, 1));
      d.mesh.scale.setScalar(0.8 + Math.sin(t * 9 + d.phase) * 0.08);
    }
  }
});

/* ---------- 雪系统每帧驱动（150-loop 调用） ---------- */
function updateSnow(dt) {
  // 每帧 ≤0.08s，拆两 ≤0.04s 子步
  let remaining = Math.min(dt, 0.08);
  const nSub = remaining > 0.04 ? 2 : 1;
  const sub = remaining / nSub;
  for (let s = 0; s < nSub; s++) SnowSystem.step(sub);
  SnowSystem.syncInstances();
}

/* ---------- 雪系统审计数据（140-audit 调用） ---------- */
function snowAuditData() {
  let invalid = 0, outside = 0, belowSurface = 0, quatErr = 0;
  const dist = {};
  for (const T of SnowSystem.types) {
    dist[T.name] = T.n;
    for (let i = 0; i < T.n; i++) {
      const px = T.pos[i * 3], py = T.pos[i * 3 + 1], pz = T.pos[i * 3 + 2];
      if (!isFinite(px) || !isFinite(py) || !isFinite(pz)) { invalid++; continue; }
      const r = Math.hypot(px, py - SPHERE_CY, pz);
      if (r > SPHERE_R + 1e-4) outside++;
      const qm = Math.hypot(T.quat[i * 4], T.quat[i * 4 + 1], T.quat[i * 4 + 2], T.quat[i * 4 + 3]);
      quatErr = Math.max(quatErr, Math.abs(qm - 1));
      // 陷入地面/河床之下（groundAt 含河道凹陷与球壁钳制，是最低碰撞面）
      if (py < SnowCollide.groundAt(px, pz) - 0.08) belowSurface++;
      else if (T.settled[i]) {
        // 仅沉降粒子要求贴表面（脚下最高支撑面；空中粒子瞬态位置合法：屋檐下/下落中）
        const surf = SnowCollide.surfaceAt(px, pz, py, true);
        if (py < surf.h - 0.06) belowSurface++;
      }
    }
  }
  return { invalid, outside, belowSurface, quatErr, dist, total: SNOW_TOTAL };
}
