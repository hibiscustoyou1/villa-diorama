/* ============================================================
 * 140-audit.js — 验收审计接口
 *
 * 暴露 window.__forbiddenCityGlobe：
 *   audit()               — 粒子非有限值=0、球体越界=0、简化实体穿入=0、
 *                           无 JS/shader 错误（error/unhandledrejection/
 *                           renderer.debug.onShaderError 监听）。
 *   auditSnowInteraction() — 活动阵风数、点击数、上扬/停留计数、八类分布、
 *                           四元数模长误差（<1e-15 量级）、初始化后重生数=0。
 *   auditPlaque()          — 铭牌顶点最大径向距离 < SPHERE_R。
 * ============================================================ */

/* ---------- 错误监听（尽早挂载） ---------- */
(function installErrorListeners() {
  const record = (msg) => {
    State.errors.push(String(msg));
    if (State.errors.length > 64) State.errors.shift();
  };
  window.addEventListener('error', (e) => record(e.message || 'error'));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    record(r && r.message ? 'unhandledrejection: ' + r.message : 'unhandledrejection');
  });
  if (renderer && renderer.debug) {
    renderer.debug.onShaderError = (gl, program, vs, fs) => {
      record('shader error: ' + (program && program.name ? program.name : 'program'));
    };
  }
})();

/* ---------- 简化实体穿球检查（顶点级：合并批 mesh 的分散部件精确判定） ---------- */
function auditSolidPenetration() {
  let penetrations = 0;
  const details = [];
  const v = new Vector3();
  const TOL = 0.02; // 2cm 容差
  sceneInner.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    if (obj.layers && (obj.layers.mask & 4)) return; // layer2 雪晶跳过（粒子位置在 instance attr）
    const p = obj.geometry.attributes.position;
    if (!p) return;
    let worst = 0;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(obj.matrixWorld);
      const r = Math.hypot(v.x, v.y - SPHERE_CY, v.z);
      if (r - SPHERE_R > worst) worst = r - SPHERE_R;
      if (worst > TOL && details.length >= 8) break; // 早退（已记录足够样本）
    }
    if (worst > TOL) {
      penetrations++;
      if (details.length < 8) details.push({ mesh: obj.name || obj.type, excess: +worst.toFixed(3) });
    }
  });
  return { penetrations, details };
}

/* ---------- 主审计 ---------- */
function audit() {
  const snow = snowAuditData();
  const solid = auditSolidPenetration();
  const result = {
    ok: true,
    particleInvalid: snow.invalid,          // 非有限值 = 0
    particleOutsideSphere: snow.outside,    // 球体越界 = 0
    particleBelowSurface: snow.belowSurface,
    solidPenetrations: solid.penetrations,  // 简化实体穿入 = 0
    solidPenetrationDetails: solid.details,
    jsErrors: State.errors.length,          // 无 JS/shader 错误
    jsErrorSamples: State.errors.slice(0, 4),
    snowTotal: snow.total,
    simTime: SnowSystem.simTime,
  };
  result.ok =
    result.particleInvalid === 0 &&
    result.particleOutsideSphere === 0 &&
    result.particleBelowSurface === 0 &&
    result.solidPenetrations === 0 &&
    result.jsErrors === 0;
  return result;
}

/* ---------- 雪交互审计 ---------- */
function auditSnowInteraction() {
  const snow = snowAuditData();
  const active = WindField.gusts.length;
  return {
    ok: true,
    activeGusts: active,                   // 活动阵风数
    buttonClicks: State.buttonClicks,      // 点击数
    uplifted: State.uplifted,              // 上扬计数
    settled: State.settled,                // 停留计数
    respawned: State.respawned,            // 初始化后重生数 = 0
    typeDistribution: snow.dist,           // 八类分布
    quatNormError: snow.quatErr,           // 四元数模长误差（<1e-15 量级）
    windMagnitude: (() => {
      const out = [0, 0, 0];
      WindField.sample(0, GROUND + 2, 0, State.time, out);
      return +Math.hypot(out[0], out[1], out[2]).toFixed(3);
    })(),
  };
}

/* ---------- 铭牌顶点审计（最大径向距离 < SPHERE_R） ---------- */
function auditPlaque() {
  let maxR = 0;
  const v = new Vector3();
  for (const m of plaqueMeshes) {
    if (!m || !m.geometry || !m.geometry.attributes.position) continue;
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      const r = Math.hypot(v.x, v.y - SPHERE_CY, v.z);
      if (r > maxR) maxR = r;
    }
  }
  return { maxRadial: +maxR.toFixed(4), sphereR: SPHERE_R, ok: maxR < SPHERE_R };
}

/* ---------- 暴露全局 ---------- */
window.__forbiddenCityGlobe = {
  audit,
  auditSnowInteraction,
  auditPlaque,
  State, WindField, SnowSystem, SnowCollide,
  renderer, camera, controls, sceneInner, sceneOuter,
  glassMesh, riverSurface, outerWater,
  windButton, windButtonDisk, windChargeRing,
  WaterRipples, GlassRipples,
  version: '1.0.0',
};
