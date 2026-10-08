/* ============================================================
 * 150-loop.js — 主循环与渲染管线
 *
 * 管线（每帧）：
 *   1. offRT ← sceneInner（含雪晶 layer2、水面 layer1，颜色+深度）
 *   2. 节流反射：reflectInnerRT（每 4 帧）/ reflectOuterRT（每 6 帧），
 *      相机变化立即更新；反射相机跳过 layer1/layer2（水面/雪晶），
 *      外反射跳过玻璃球壳（球外平面倒影含实体灯火，不重算球壳二次折射）。
 *   3. 主 pass：sceneOuter → 画布（玻璃球壳屏幕空间折射采样 offRT）。
 *
 * 阴影只在首帧与需要时更新（shadowMap.autoUpdate=false）。
 * ============================================================ */

/* ---------- uniform 绑定（RT → 材质） ---------- */
(function bindUniforms() {
  // 玻璃球壳：tScene=offRT 颜色，tDepth=offRT 深度
  if (glassMesh && glassMesh.material && glassMesh.material.uniforms) {
    glassMesh.material.uniforms.tScene.value = offRT.texture;
    glassMesh.material.uniforms.tDepth.value = offRT.depthTexture;
  }
  // 内金水河：tReflect=reflectInnerRT，tScene=offRT（折射源）
  if (riverSurface && riverSurface.material && riverSurface.material.uniforms) {
    riverSurface.material.uniforms.tReflect.value = reflectInnerRT.texture;
    riverSurface.material.uniforms.tScene.value = offRT.texture;
  }
  // 球外水面：tReflect=reflectOuterRT
  if (outerWater && outerWater.material && outerWater.material.uniforms) {
    outerWater.material.uniforms.tReflect.value = reflectOuterRT.texture;
  }
})();

/* ---------- 反射相机（关于水平面镜像） ---------- */
const reflectCam = new PerspectiveCamera();
reflectCam.layers.disable(1); // 水面不自反
reflectCam.layers.disable(2); // 雪晶不进反射

const _reflDir = new Vector3();
const _reflUp = new Vector3();
const _reflTarget = new Vector3();

/** 把主相机关于 y=planeY 平面镜像到 reflectCam */
function mirrorCamera(planeY) {
  reflectCam.fov = camera.fov;
  reflectCam.aspect = camera.aspect;
  reflectCam.near = camera.near;
  reflectCam.far = camera.far;
  reflectCam.updateProjectionMatrix();
  // 位置镜像
  reflectCam.position.set(camera.position.x, 2 * planeY - camera.position.y, camera.position.z);
  // 视线方向镜像（y 分量取反）
  camera.getWorldDirection(_reflDir);
  _reflDir.y = -_reflDir.y;
  // up 镜像（保持手性一致，避免画面翻转）
  _reflUp.copy(camera.up).applyQuaternion(camera.quaternion);
  _reflUp.y = -_reflUp.y;
  reflectCam.up.copy(_reflUp);
  _reflTarget.copy(reflectCam.position).add(_reflDir);
  reflectCam.lookAt(_reflTarget);
  reflectCam.updateMatrixWorld();
}

/* ---------- 渲染节流状态 ---------- */
let frameIndex = 0;
const INNER_REFL_EVERY = 4; // 静止相机下内反射每 4 帧
const OUTER_REFL_EVERY = 6; // 外反射每 6 帧

/* ---------- 主循环 ---------- */
const clock = new Clock();
let simAccum = 0;   // 模拟时间累计（验收：模拟/实际 ≈ 1.000）
let realAccum = 0;

function tick() {
  requestAnimationFrame(tick);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.1); // 页面切回时防大跳
  State.time += dt;
  simAccum += dt;
  realAccum += rawDt;

  controls.update();

  /* —— 动画与系统 —— */
  for (const anim of Animators) anim(dt, State.time);
  WindField.update(State.time);
  updateSnow(dt);
  updateRiverSurface(dt);
  updateOuterDynamics(dt);
  updateGlass(dt);
  updateWindButtonVisual(dt);

  /* —— 阴影：首帧与需要时 —— */
  if (shadowNeedsUpdate) {
    renderer.shadowMap.needsUpdate = true;
    shadowNeedsUpdate = false;
  }

  /* —— 1. offRT：球内场景（含雪晶） —— */
  renderer.setRenderTarget(offRT);
  renderer.clear();
  renderer.render(sceneInner, camera);

  /* —— 2. 节流反射（相机静止 4/6 帧；变化立即） —— */
  const doInner = cameraMoved || frameIndex % INNER_REFL_EVERY === 0;
  const doOuter = cameraMoved || frameIndex % OUTER_REFL_EVERY === 0;
  if (doInner) {
    mirrorCamera(GROUND - 0.035); // 金水河面
    renderer.setRenderTarget(reflectInnerRT);
    renderer.clear();
    renderer.render(sceneInner, reflectCam);
  }
  if (doOuter) {
    mirrorCamera(OUTER.waterY); // 球外水庭
    const glassVisible = glassMesh ? glassMesh.visible : false;
    if (glassMesh) glassMesh.visible = false; // 不重算球壳二次折射
    renderer.setRenderTarget(reflectOuterRT);
    renderer.clear();
    renderer.render(sceneOuter, reflectCam);
    if (glassMesh) glassMesh.visible = glassVisible;
  }

  /* —— 3. 主 pass：球外+玻璃球壳 → 画布 —— */
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(sceneOuter, camera);

  cameraMoved = false;
  frameIndex++;
}

/* ---------- 启动 ---------- */
tick();

/* ---------- 验证辅助（verify 脚本用） ---------- */
window.__globeStats = {
  get frameIndex() { return frameIndex; },
  get simTime() { return simAccum; },
  get realTime() { return realAccum; },
  get simRatio() { return realAccum > 0.5 ? simAccum / realAccum : 1; },
  reset() { simAccum = 0; realAccum = 0; },
};
