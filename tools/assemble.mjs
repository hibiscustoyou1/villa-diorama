#!/usr/bin/env node
/**
 * assemble.mjs — 把 src/ 下的场景源码模块与内联的 three.js r169 / OrbitControls
 * 组装成单文件 index.html（运行时零依赖：无 npm / CDN / 外部模型 / 网络）。
 *
 * 用法: node tools/assemble.mjs [--check]
 *   --check 只做语法检查（拼接结果写入临时 .mjs 后 node --check），不写 index.html
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(root, 'tools', 'vendor');
const SRC = join(root, 'src');
const OUT = join(root, 'index.html');

/* ---------- 1. three.module.min.js: 剥离 export，导出为 __THREE ---------- */
function inlineThree() {
  let code = readFileSync(join(VENDOR, 'three.module.min.js'), 'utf8');
  // 末尾形如 export{Xt as Texture,Pi as WebGL3DRenderTarget,...};
  const m = code.match(/export\{[^}]*\};?\s*$/);
  if (!m) throw new Error('three.module.min.js 末尾未找到 export 语句');
  const body = m[0].replace(/^export\{/, '').replace(/\};?\s*$/, '');
  const pairs = {};
  for (const part of body.split(',')) {
    const seg = part.trim();
    if (!seg) continue;
    const as = seg.match(/^([\w$]+)\s+as\s+([\w$]+)$/);
    if (as) pairs[as[2]] = as[1];
    else pairs[seg] = seg; // 直接导出：本地名即导出名
  }
  code = code.slice(0, m.index) + '\n';
  // 生成导出对象（对象字面量中 key:value 无 TDZ 问题）
  const entries = Object.entries(pairs).map(([name, local]) => `${JSON.stringify(name)}:${local}`);
  code += `const __THREE={${entries.join(',')}};\n`;
  return code;
}

/* ---------- 2. OrbitControls: import {...} from 'three' → 解构 ---------- */
function inlineOrbitControls() {
  let code = readFileSync(join(VENDOR, 'OrbitControls.js'), 'utf8');
  const re = /import\s*\{([\s\S]*?)\}\s*from\s*['"]three['"];?/;
  if (!re.test(code)) throw new Error('OrbitControls.js 未找到 three import 语句');
  const names = RegExp.$1.split(',').map((s) => s.trim()).filter(Boolean);
  code = code.replace(re, `const {${names.join(',')}}=__THREE;`);
  return code;
}

/* ---------- 3. 场景源码模块（按文件名排序拼接） ---------- */
function sceneSources() {
  const files = readdirSync(SRC)
    .filter((f) => f.endsWith('.js'))
    .sort();
  return files.map((f) => {
    const code = readFileSync(join(SRC, f), 'utf8');
    return `/* ===== ${f} ===== */\n${code}`;
  });
}

/* ---------- 4. HTML 外壳 ---------- */
const LICENSE = readFileSync(join(VENDOR, 'THREE-LICENSE.txt'), 'utf8').trim();

function htmlShell(threeCode, ocCode, sceneCode) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>北京故宫雪景水晶球</title>
<!--
  单文件可交互 3D 微缩场景 · 北京故宫雪景水晶球
  内联 three.js r169 与 OrbitControls（均按 MIT 许可证发布，见文末完整许可证文本）。
  运行时零依赖：无 npm、无 CDN、无外部模型、无网络请求；WebGL 2 浏览器直接打开即可。
  three.js: https://github.com/mrdoob/three.js (r169)
-->
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #071424; }
  canvas { display: block; outline: none; }
</style>
</head>
<body>
<canvas id="globe-canvas" aria-label="北京故宫雪景水晶球：拖动旋转视角，滚轮缩放，右键平移；点击底座正面的「起风」按钮或长按蓄力扬雪，双击球面轻扬雪，画布聚焦后按空格键同效。"></canvas>
<script type="module">
/* 内联 three.js r169（MIT License, Copyright © 2010-2024 three.js authors）— 原构建: build/three.module.min.js */
${threeCode}
/* 内联 OrbitControls（three.js examples/jsm/controls/OrbitControls.js, MIT） */
${ocCode}
/* ===== 场景源码（北京故宫雪景水晶球）— 块作用域隔离，避免与 three 顶层名冲突 ===== */
{
${sceneCode}
}
</script>
<!--
  ─────────────────────────────────────────────
  three.js 与 OrbitControls 许可证（MIT）
  ${'${LICENSE_PLACEHOLDER}'}
  ─────────────────────────────────────────────
-->
</body>
</html>
`;
}

/* ---------- 5. 组装 ---------- */
const threeCode = inlineThree();
const ocCode = inlineOrbitControls();
const sceneCode = sceneSources().join('\n');
let html = htmlShell(threeCode, ocCode, sceneCode);
html = html.replace('${LICENSE_PLACEHOLDER}', LICENSE);

const onlyCheck = process.argv.includes('--check');
if (onlyCheck) {
  // 语法检查：把 module script 内容抽出来做 node --check
  const tmp = join(root, 'tools', '.syntax-check.mjs');
  writeFileSync(tmp, `${threeCode}\n${ocCode}\n{\n${sceneCode}\n}\n`);
  try {
    execFileSync(process.execPath, ['--check', tmp], { stdio: 'inherit' });
    console.log('语法检查通过');
  } finally {
    rmSync(tmp, { force: true });
  }
} else {
  writeFileSync(OUT, html);
  const kb = (statSync(OUT).size / 1024).toFixed(1);
  console.log(`已生成 ${OUT} (${kb} KB)`);
}
