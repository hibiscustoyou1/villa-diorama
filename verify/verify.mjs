#!/usr/bin/env node
/**
 * verify.mjs — 无头浏览器验收验证
 *
 * 覆盖需求文档验收项：
 *  1. audit()：粒子非有限值=0、球体越界=0、简化实体穿入=0、无 JS/shader 错误
 *  2. 真实鼠标点击两次「起风」→ 8200 粒子 invalid/outside/belowSurface 均 0，按钮计数 2
 *  3. 连击后约 26 秒（模拟时间）风力与上扬计数归零（活动阵风=0）
 *  4. 模拟时间增量/实际时间增量（软件渲染下 rAF 受限，验证 dt 钳制：模拟不超前实际）
 *  5. 铭牌顶点最大径向距离 < 6.7
 *  6. 目视四视角截图（out/*.png）
 *
 * 环境说明：无头 swiftshader 软件渲染下 rAF 帧率极低（~0.6fps），
 * 粒子物理/风场用页面内手动快进（WindField.update + SnowSystem.step 循环，
 * 纯 JS 计算不受渲染速度影响），点击交互用真实鼠标事件。
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'out');
mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

/** 页面内手动快进模拟（雪沉降/风作用/阵风过期），不依赖慢 rAF */
async function fastForward(page, simSeconds) {
  await page.evaluate((sec) => {
    const g = window.__forbiddenCityGlobe;
    const steps = Math.round(sec / 0.04);
    for (let s = 0; s < steps; s++) {
      g.State.time += 0.04;
      g.WindField.update(g.State.time);
      g.SnowSystem.step(0.04);
    }
    g.SnowSystem.syncInstances();
  }, simSeconds);
}

/** 等待 N 个真实 rAF 帧（渲染推进） */
async function waitFrames(page, n) {
  const f0 = await page.evaluate(() => window.__globeStats.frameIndex);
  await page.waitForFunction(
    (f) => window.__globeStats.frameIndex >= f,
    f0 + n,
    { timeout: 90000, polling: 500 }
  );
}

const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// 收集页面错误
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(msg.text());
});

await page.goto('file://' + join(root, 'index.html'));

// 等待场景就绪
await page.waitForFunction(() => window.__forbiddenCityGlobe && window.__globeStats, null, { timeout: 30000 });
await waitFrames(page, 2); // 首帧+阴影

/* ---------- 0. 快进让初始雪沉降 ---------- */
await fastForward(page, 5.0);
await waitFrames(page, 1);

/* ---------- 1. 初始 audit ---------- */
const audit0 = await page.evaluate(() => window.__forbiddenCityGlobe.audit());
check('audit: 粒子非有限值=0', audit0.particleInvalid === 0, `invalid=${audit0.particleInvalid}`);
check('audit: 球体越界=0', audit0.particleOutsideSphere === 0, `outside=${audit0.particleOutsideSphere}`);
check('audit: 粒子低于表面=0', audit0.particleBelowSurface === 0, `below=${audit0.particleBelowSurface}`);
check('audit: 简化实体穿入=0', audit0.solidPenetrations === 0, `pen=${audit0.solidPenetrations} ${JSON.stringify(audit0.solidPenetrationDetails)}`);
check('audit: 无 JS/shader 错误', audit0.jsErrors === 0, `errors=${audit0.jsErrors} ${JSON.stringify(audit0.jsErrorSamples)}`);
check('audit: 雪晶总数 8200', audit0.snowTotal === 8200, `total=${audit0.snowTotal}`);

/* ---------- 2. 真实鼠标点击两次起风 ---------- */
// 按钮屏幕坐标（页面内投影）
const btnPos = await page.evaluate(() => {
  const g = window.__forbiddenCityGlobe;
  const v = g.windButtonDisk.getWorldPosition(g.camera.position.clone());
  v.project(g.camera);
  return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight };
});
console.log('按钮屏幕坐标:', btnPos);

await page.mouse.click(btnPos.x, btnPos.y);
await page.waitForTimeout(400);
await page.mouse.click(btnPos.x, btnPos.y);
// 快进 1.5s 模拟：风场作用+粒子松脱扬起
await fastForward(page, 1.5);

const inter1 = await page.evaluate(() => window.__forbiddenCityGlobe.auditSnowInteraction());
check('交互: 按钮点击计数=2', inter1.buttonClicks === 2, `clicks=${inter1.buttonClicks}`);
check('交互: 活动阵风=2', inter1.activeGusts === 2, `gusts=${inter1.activeGusts}`);
check('交互: 上扬计数>0（雪被扬起）', inter1.uplifted > 0, `uplifted=${inter1.uplifted}`);

const audit1 = await page.evaluate(() => window.__forbiddenCityGlobe.audit());
check('点击后 audit: invalid=0', audit1.particleInvalid === 0, `invalid=${audit1.particleInvalid}`);
check('点击后 audit: outside=0', audit1.particleOutsideSphere === 0, `outside=${audit1.particleOutsideSphere}`);
check('点击后 audit: belowSurface=0', audit1.particleBelowSurface === 0, `below=${audit1.particleBelowSurface}`);
check('点击后 audit: 无错误', audit1.jsErrors === 0, `errors=${audit1.jsErrors}`);

/* ---------- 3. 连击 + 26 秒（模拟时间）后归零 ---------- */
for (let i = 0; i < 6; i++) {
  await page.mouse.click(btnPos.x, btnPos.y);
  await page.waitForTimeout(150);
}
const inter2 = await page.evaluate(() => window.__forbiddenCityGlobe.auditSnowInteraction());
check('连击: 活动阵风>0', inter2.activeGusts > 0, `gusts=${inter2.activeGusts}`);
check('连击: 点击计数=8', inter2.buttonClicks === 8, `clicks=${inter2.buttonClicks}`);

// 快进 27s 模拟（单股上限 24s + 余量）：阵风过期、粒子再沉降
await fastForward(page, 27.0);

const inter3 = await page.evaluate(() => window.__forbiddenCityGlobe.auditSnowInteraction());
check('26s 后: 活动阵风=0', inter3.activeGusts === 0, `gusts=${inter3.activeGusts}`);
check('26s 后: 风力归零', inter3.windMagnitude < 0.05, `mag=${inter3.windMagnitude}`);
check('26s 后: 重生数=0（总数守恒）', inter3.respawned === 0, `respawned=${inter3.respawned}`);

/* ---------- 4. 模拟时间比 ----------
 * 正常帧率（60fps）下 dt≈0.0167 < 0.1 钳制 → ratio≈1.000。
 * 无头软件渲染 rAF≈0.6fps → dt 钳制 0.1 生效 → ratio<1（模拟不超前实际）。
 * 断言：0 < ratio ≤ 1.001（钳制正确性），并输出实际值。 */
await page.evaluate(() => window.__globeStats.reset());
await waitFrames(page, 2);
const ratio = await page.evaluate(() => window.__globeStats.simRatio);
check('模拟时间/实际时间（dt 钳制正确）', ratio > 0 && ratio <= 1.001, `ratio=${ratio.toFixed(4)}（软件渲染 rAF 受限；正常帧率环境≈1.000）`);

/* ---------- 5. 铭牌顶点 ---------- */
const plaque = await page.evaluate(() => window.__forbiddenCityGlobe.auditPlaque());
check('铭牌顶点最大径向 < 6.7', plaque.ok, `maxR=${plaque.maxRadial} < R=${plaque.sphereR}`);

/* ---------- 6. 四视角截图 ---------- */
const views = [
  { name: 'front', pos: [20, 20, 36], target: [0, 5.55, 0] },
  { name: 'left', pos: [-34, 14, 8], target: [0, 5.55, 0] },
  { name: 'right', pos: [34, 14, 8], target: [0, 5.55, 0] },
  { name: 'top', pos: [0, 38, 14], target: [0, 3.5, 0] },
];
for (const v of views) {
  await page.evaluate((p) => {
    const g = window.__forbiddenCityGlobe;
    g.camera.position.set(p[0], p[1], p[2]);
    g.controls.target.set(0, 5.55, 0);
    g.controls.update();
  }, v.pos);
  await waitFrames(page, 2);
  await page.screenshot({ path: join(OUT, `view-${v.name}.png`) });
  console.log(`  截图 out/view-${v.name}.png`);
}

/* ---------- 汇总 ---------- */
const failed = results.filter((r) => !r.ok);
console.log('\n========== 汇总 ==========');
console.log(`通过 ${results.length - failed.length}/${results.length}`);
if (pageErrors.length) console.log('页面错误:', pageErrors.slice(0, 5));
await browser.close();
process.exit(failed.length ? 1 : 0);
