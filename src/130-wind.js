/* ============================================================
 * 130-wind.js — 起风交互
 *
 * 阵风场：连点叠加独立衰减阵风（不重置旧风，单股上限 24s，最多 16 股）；
 * burst 包络 = 主脉冲 + 1.15s/2.45s 两波回冲 + 三个位置/旋转轴持续变化的局部涡流；
 * 球内环流带回程：球壁附近径向内折返（避免贴壁白带）；
 * 极端输入平滑：能量与风速上限。
 * 交互：按钮（Raycaster 命中，按下临时禁用相机控制，释放且位移 <9px 触发；
 * 长按 180ms 后蓄力，1400ms 达上限 1.65×，按钮位移+光环反馈）；
 * 球面拖动（相机旋转同时施加有上限的相机相对方向扰动，与按钮逻辑分开）；
 * 双击球面较轻扬雪；画布聚焦后空格键同效。
 * ============================================================ */

const WindField = {
  MAX_GUSTS: 16,
  GUST_DUR: 24,
  gusts: [],        // {t0, amp, dirX, dirZ, seed}
  dragWind: { x: 0, y: 0, z: 0 }, // 球面拖动扰动（独立上限）
  MAX_WIND: 6.5,    // 风速上限（极端输入平滑）

  // LUT（每帧重算，粒子三线性查询）
  LUTN: 12,
  lutMin: [-6.6, 2.6, -6.6], lutMax: [6.6, 12.6, 6.6],
  lut: null,

  init() {
    this.lut = new Float32Array(this.LUTN * this.LUTN * this.LUTN * 3);
  },

  /** 触发一股阵风（amp 基础 × charge 蓄力倍率） */
  burst(amp, charge = 1) {
    if (this.gusts.length >= this.MAX_GUSTS) this.gusts.shift(); // 上限 16 股
    this.gusts.push({
      t0: State.time,
      amp: amp * clamp(charge, 1, 1.65) * 1.25,
      dirX: rng.range(-1, 1) * 0.7 + (rng.next() < 0.5 ? -0.7 : 0.7),
      dirZ: rng.range(-0.4, 0.4),
      seed: rng.next() * 1000,
    });
    State.gustCount = this.gusts.filter(g => State.time - g.t0 < this.GUST_DUR).length;
  },

  /** burst 包络（主脉冲 + 两波回冲 + 尾流） */
  envelope(g, age) {
    if (age < 0 || age > this.GUST_DUR) return 0;
    const main = Math.exp(-Math.pow((age - 0.25) / 0.35, 2));           // 主脉冲（约半秒横向冲量）
    const back1 = 0.45 * Math.exp(-Math.pow((age - 1.15) / 0.4, 2));    // 回冲 1
    const back2 = 0.3 * Math.exp(-Math.pow((age - 2.45) / 0.5, 2));     // 回冲 2
    const tail = age > 3 ? 0.15 * Math.exp(-(age - 3) / 6) : 0;         // 尾流
    return (main + back1 + back2 + tail) * g.amp;
  },

  /** 单点风场（含涡流+环流折返） */
  _samplePoint(x, y, z, t, out) {
    let vx = 0, vy = 0, vz = 0;
    for (const g of this.gusts) {
      const age = t - g.t0;
      const env = this.envelope(g, age);
      if (env < 0.005) continue;
      // 主方向（横向冲量 → 随后倾斜涡流+三维扰动）
      const tilt = smoothstep(0.4, 1.6, age); // 前半秒横向，之后倾斜
      vx += env * g.dirX * (1 - tilt * 0.35);
      vz += env * g.dirZ * (1 - tilt * 0.3);
      vy += env * tilt * 0.55 * Math.sin(age * 0.9 + g.seed);
      // 三维扰动（噪声）
      vx += env * 0.3 * Math.sin(y * 1.3 + t * 1.7 + g.seed);
      vy += env * 0.22 * Math.sin(x * 1.1 - t * 1.3 + g.seed * 2);
      vz += env * 0.28 * Math.sin(z * 1.2 + t * 1.5 + g.seed * 3);
      // —— 三个局部涡流（位置/旋转轴持续变化） ——
      for (let k = 0; k < 3; k++) {
        const va = age * (0.35 + k * 0.18) + g.seed + k * 2.1;
        const cx = Math.cos(va) * (2.2 + k * 0.9);
        const cy = SPHERE_CY + Math.sin(va * 0.7 + k) * (1.8 + k * 0.5);
        const cz = Math.sin(va * 1.1) * (2.0 + k * 0.8);
        const dx = x - cx, dy = y - cy, dz = z - cz;
        const d = Math.hypot(dx, dy, dz);
        const radius = 2.4 + k * 0.7;
        if (d < radius && d > 1e-4) {
          const fall = Math.sin((d / radius) * Math.PI) * env * 1.1;
          // 旋转轴（持续变化）
          const ax = Math.sin(va * 1.3 + k * 2), ay = Math.cos(va * 0.9 + k), az = Math.sin(va * 0.8 + k * 3);
          // v = (p-c) × axis
          vx += (dy * az - dz * ay) * fall * 0.4;
          vy += (dz * ax - dx * az) * fall * 0.4;
          vz += (dx * ay - dy * ax) * fall * 0.4;
        }
      }
    }
    // —— 球面拖动扰动（独立通道，有上限） ——
    vx += this.dragWind.x;
    vy += this.dragWind.y;
    vz += this.dragWind.z;
    // —— 球内环流带回程：球壁附近径向内折返 ——
    const rx = x, ry = y - SPHERE_CY, rz = z;
    const r = Math.hypot(rx, ry, rz);
    if (r > SPHERE_R - 1.3) {
      const inward = (r - (SPHERE_R - 1.3)) / 1.3; // 0..1
      const nx = rx / (r || 1), ny = ry / (r || 1), nz = rz / (r || 1);
      const vr = vx * nx + vy * ny + vz * nz;
      if (vr > 0) { // 向外的径向分量折返
        const k = vr * inward * 1.8;
        vx -= k * nx; vy -= k * ny; vz -= k * nz;
      }
    }
    // —— 极端输入平滑：风速上限 ——
    const mag = Math.hypot(vx, vy, vz);
    if (mag > this.MAX_WIND) {
      const s = this.MAX_WIND / mag;
      vx *= s; vy *= s; vz *= s;
    }
    out.x = vx; out.y = vy; out.z = vz;
  },

  /** 每帧更新 LUT（150-loop 调用） */
  update(t) {
    if (!this.lut) this.init();
    const n = this.LUTN;
    const out = { x: 0, y: 0, z: 0 };
    // 过期股清理
    this.gusts = this.gusts.filter(g => t - g.t0 < this.GUST_DUR);
    State.gustCount = this.gusts.length;
    // 拖动风衰减
    this.dragWind.x *= Math.exp(-2.2 * 0.016);
    this.dragWind.y *= Math.exp(-2.2 * 0.016);
    this.dragWind.z *= Math.exp(-2.2 * 0.016);
    // LUT 填充
    for (let i = 0; i < n; i++) {
      const x = lerp(this.lutMin[0], this.lutMax[0], i / (n - 1));
      for (let j = 0; j < n; j++) {
        const y = lerp(this.lutMin[1], this.lutMax[1], j / (n - 1));
        for (let k = 0; k < n; k++) {
          const z = lerp(this.lutMin[2], this.lutMax[2], k / (n - 1));
          this._samplePoint(x, y, z, t, out);
          const idx = (i * n * n + j * n + k) * 3;
          this.lut[idx] = out.x;
          this.lut[idx + 1] = out.y;
          this.lut[idx + 2] = out.z;
        }
      }
    }
  },

  /** 粒子查询（三线性插值） */
  sample(x, y, z, t, out) {
    const n = this.LUTN;
    const fx = clamp((x - this.lutMin[0]) / (this.lutMax[0] - this.lutMin[0]), 0, 1) * (n - 1);
    const fy = clamp((y - this.lutMin[1]) / (this.lutMax[1] - this.lutMin[1]), 0, 1) * (n - 1);
    const fz = clamp((z - this.lutMin[2]) / (this.lutMax[2] - this.lutMin[2]), 0, 1) * (n - 1);
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    const i2 = Math.min(n - 1, i + 1), j2 = Math.min(n - 1, j + 1), k2 = Math.min(n - 1, k + 1);
    const tx = fx - i, ty = fy - j, tz = fz - k;
    const L = this.lut;
    const at = (a, b, c) => (a * n * n + b * n + c) * 3;
    for (let d = 0; d < 3; d++) {
      const c000 = L[at(i, j, k) + d], c100 = L[at(i2, j, k) + d];
      const c010 = L[at(i, j2, k) + d], c110 = L[at(i2, j2, k) + d];
      const c001 = L[at(i, j, k2) + d], c101 = L[at(i2, j, k2) + d];
      const c011 = L[at(i, j2, k2) + d], c111 = L[at(i2, j2, k2) + d];
      const c00 = lerp(c000, c100, tx), c10 = lerp(c010, c110, tx);
      const c01 = lerp(c001, c101, tx), c11 = lerp(c011, c111, tx);
      const c0 = lerp(c00, c10, ty), c1 = lerp(c01, c11, ty);
      out[d] = lerp(c0, c1, tz);
    }
    return out;
  },
};

/* ============================================================
 * 指针交互（按钮/球面拖动/双击/空格）
 * ============================================================ */
const WindInteraction = {
  raycaster: null,
  buttonDown: false,
  downX: 0, downY: 0,
  downTime: 0,
  charging: false,
  charge: 0,
  lastDragX: 0, lastDragY: 0,
  dragging: false,

  init() {
    this.raycaster = new Raycaster();
    const ndc = new Vector2();

    const toNDC = (e) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      return ndc;
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.raycaster.setFromCamera(toNDC(e), camera);
      const hits = this.raycaster.intersectObject(windButtonDisk, false);
      if (hits.length > 0) {
        // 按钮按下：临时禁用相机控制
        this.buttonDown = true;
        this.downX = e.clientX; this.downY = e.clientY;
        this.downTime = performance.now();
        this.charging = false;
        this.charge = 0;
        controls.enabled = false;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      } else {
        // 球面拖动开始（相机旋转由 OrbitControls 处理；同时施加扰动）
        this.raycaster.setFromCamera(ndc, camera);
        const glassHits = this.raycaster.intersectObject(glassMesh, false);
        if (glassHits.length > 0) {
          this.dragging = true;
          this.lastDragX = e.clientX; this.lastDragY = e.clientY;
          // 触碰涟漪
          GlassRipples.spawn(glassHits[0].point);
        }
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.buttonDown) {
        // 长按蓄力：180ms 后开始，1400ms 达上限
        const held = performance.now() - this.downTime;
        if (held > 180) {
          this.charging = true;
          this.charge = clamp((held - 180) / 1400, 0, 1) * 0.65; // 0..0.65（总倍率 1..1.65）
        }
      } else if (this.dragging) {
        // 球面拖动：相机相对方向扰动（有上限，与按钮逻辑分开）
        const dx = e.clientX - this.lastDragX;
        const dy = e.clientY - this.lastDragY;
        this.lastDragX = e.clientX; this.lastDragY = e.clientY;
        // 相机右向/上向（拖动方向映射）
        const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
        const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        const k = 0.012;
        WindField.dragWind.x += (-dx * right.x + dy * up.x) * k;
        WindField.dragWind.y += (-dx * right.y + dy * up.y) * k;
        WindField.dragWind.z += (-dx * right.z + dy * up.z) * k;
        // 上限
        const mag = Math.hypot(WindField.dragWind.x, WindField.dragWind.y, WindField.dragWind.z);
        const cap = 2.2;
        if (mag > cap) {
          const s = cap / mag;
          WindField.dragWind.x *= s; WindField.dragWind.y *= s; WindField.dragWind.z *= s;
        }
      }
    });

    const release = (e) => {
      if (this.buttonDown) {
        // 释放且位移 <9px 才触发
        const dist = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
        this.buttonDown = false;
        this.charging = false;
        controls.enabled = true;
        if (dist < 9) {
          WindField.burst(1.0, 1 + this.charge);
          State.buttonClicks++;
        }
        this.charge = 0;
      }
      this.dragging = false;
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    // 双击球面：较轻扬雪
    canvas.addEventListener('dblclick', (e) => {
      this.raycaster.setFromCamera(toNDC(e), camera);
      const hits = this.raycaster.intersectObject(glassMesh, false);
      if (hits.length > 0) {
        WindField.burst(0.45, 1);
        GlassRipples.spawn(hits[0].point);
      }
    });

    // 画布聚焦后空格键同效
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && document.activeElement === canvas) {
        e.preventDefault();
        if (!e.repeat) {
          WindField.burst(1.0, 1);
          State.buttonClicks++;
        }
      }
    });
  },
};
WindInteraction.init();

/* ---------- 按钮视觉反馈（位移+光环，150-loop 调用） ---------- */
function updateWindButtonVisual(dt) {
  if (!windButton || !windButtonDisk || !windChargeRing) return;
  const W = WindInteraction;
  // 按下位移（蓄力时前移）
  const press = W.buttonDown ? 0.05 + W.charge * 0.1 : 0;
  windButtonDisk.position.z = 5.08 + press;
  // 光环蓄力反馈
  const ring = windChargeRing;
  if (W.charging) {
    ring.material.opacity = 0.25 + W.charge * 0.6;
    ring.scale.setScalar(1 + W.charge * 0.55);
    ring.rotation.z = State.time * (1.5 + W.charge * 3);
  } else if (W.buttonDown) {
    ring.material.opacity = 0.18;
    ring.scale.setScalar(1);
  } else {
    // 触发后光环扩散消散
    ring.material.opacity = Math.max(0, ring.material.opacity - dt * 1.8);
    ring.scale.z += dt * 0.8;
    if (ring.material.opacity <= 0.01) ring.scale.setScalar(1);
  }
}
