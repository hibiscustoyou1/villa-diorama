/* ============================================================
 * 010-constants.js — 全局常量、调色板、确定性随机、数学工具
 * ============================================================ */

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** 关键尺寸（与规格一致） */
const GROUND = 3.22;      // 球内地面高度
const SPHERE_R = 6.7;     // 玻璃球半径
const SPHERE_CY = 5.9;    // 球心高度
const BASE_CUT = 3.1;     // 底座切割线（球与底座交界）
const GLASS_IOR = 1.48;   // 玻璃折射率
const GLASS_THICK = 0.145;// 玻璃厚度

/** 调色板 */
const PAL = {
  snow: 0xf6f8f8, // 雪
  jade: 0xd6dedb, // 汉白玉
  red:   0xa82e29, // 朱红
  redD:  0x742923, // 深朱
  gold:  0xc99435, // 金
  goldHi:0xd5ad63, // 高光金
  tile:  0xc98d27, // 琉璃瓦
  teal:  0x255a5a, // 青
  blue:  0x123f67, // 深蓝
  bronze:0x6f6851, // 铜
  night: 0x071424, // 夜空背景
};

/* ---------- 确定性 LCG 随机（固定种子，每次打开一致） ---------- */
class LCG {
  constructor(seed) { this.s = (seed >>> 0) || 0x9e3779b9; }
  next() { // [0,1)
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.min(arr.length - 1, Math.floor(this.next() * arr.length))]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
}
const rng = new LCG(0x20261008); // 固定种子

/* ---------- 数学工具 ---------- */
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function smoothstep(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeIn = (t) => t * t;

/** 多层正弦噪声（雪面/地形用），返回 [-1,1] */
function sinNoise(x, z, seed = 0) {
  let v = 0;
  v += Math.sin(x * 1.9 + seed * 13.7 + z * 0.8) * 0.5;
  v += Math.sin(z * 2.3 - seed * 7.3 + x * 1.1 + 2.1) * 0.3;
  v += Math.sin((x + z) * 3.7 + seed * 31.1) * 0.15;
  v += Math.sin(x * 7.9 - z * 6.3 + seed * 3.7) * 0.05;
  return v / 1.0;
}

/** 球内可用性：点是否在玻璃球内（留出壳厚余量） */
function insideGlobe(x, y, z, margin = 0.0) {
  const dx = x, dy = y - SPHERE_CY, dz = z;
  return dx * dx + dy * dy + dz * dz < (SPHERE_R - margin) * (SPHERE_R - margin);
}

/** 全局注册表：碰撞体（雪系统用） */
const Colliders = {
  surfaces: [],   // { type:'heightfield'|'roof'|'box'|'sphere', ... }
  add(s) { this.surfaces.push(s); },
};

/** 全局注册表：动画更新器（每帧调用，返回是否需要强制刷新预渲染） */
const Animators = [];
function addAnimator(fn) { Animators.push(fn); }

/** 全局状态（交互/审计共用） */
const State = {
  time: 0,
  gustCount: 0,        // 活动阵风数
  buttonClicks: 0,     // 起风按钮点击计数
  uplifted: 0,         // 上扬计数（松脱粒子累计）
  settled: 0,          // 停留（附着）计数
  respawned: 0,        // 初始化后重生数（必须为 0）
  errors: [],          // JS/着色器错误记录
};
