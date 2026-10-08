/* ============================================================
 * 040-ground.js — 程序化雪地面（多层正弦噪声起伏 + 石砖缝隙）+ 河道下凹
 * （THREE 名字已在 020-renderer.js 全局解构）
 * ============================================================ */

/* ---------- 河道几何（内金水河：正弦河心线，宽约 0.73） ---------- */
const RIVER_Z = 4.15;      // 河心基准 z（太和门前）
const RIVER_AMP = 0.5;     // 弯曲幅度
const RIVER_FREQ = 0.52;   // 弯曲频率
const RIVER_HALF = 0.365;  // 半宽
const RIVER_BED = 0.42;    // 河床低于地面

function riverCenter(x) { return RIVER_Z + RIVER_AMP * Math.sin(x * RIVER_FREQ + 0.6); }
/** 河道横截面凹陷系数 [0,1]（1=河床中心） */
function riverCut(x, z) {
  const d = Math.abs(z - riverCenter(x));
  if (d >= 0.68) return 0;
  return 1 - smoothstep(RIVER_HALF, 0.68, d);
}

/* ---------- 雪面高度函数（雪晶碰撞/地面网格共用） ---------- */
function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  // 边缘衰减（避免穿出球壁）
  const edge = smoothstep(6.08, 5.55, r);
  let h = GROUND;
  h += sinNoise(x, z, 1) * 0.085 * edge;
  h += sinNoise(x * 0.37 + 11, z * 0.37 - 7, 7) * 0.15 * edge;
  // 中轴御道压平
  const axial = smoothstep(1.6, 0.8, Math.abs(x)) * smoothstep(5.0, 4.1, Math.abs(z - 0.4)) * smoothstep(-4.9, -4.1, z);
  h = lerp(h, GROUND + 0.015, axial * 0.9);
  // 河道下凹
  const rc = riverCut(x, z);
  h = lerp(h, GROUND - RIVER_BED, rc);
  // 球壁下界钳制（河道/边缘凹陷不出球：h ≥ cy-√((R-δ)²-r²)）
  const rIn = x * x + z * z;
  const maxR = (SPHERE_R - 0.04) * (SPHERE_R - 0.04);
  if (rIn < maxR) {
    const hMin = SPHERE_CY - Math.sqrt(maxR - rIn);
    if (h < hMin) h = hMin;
  }
  return h;
}

/* ---------- 地面网格（参数化圆盘） ---------- */
function buildGroundMesh() {
  const R = 6.08, RINGS = 26, SECT = 96;
  const vCount = 1 + RINGS * SECT;
  const pos = new Float32Array(vCount * 3);
  pos[1] = groundHeight(0, 0); // 中心
  for (let ri = 1; ri <= RINGS; ri++) {
    const rad = (R * ri) / RINGS;
    for (let s = 0; s < SECT; s++) {
      const a = (s / SECT) * TAU;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      const i = 1 + (ri - 1) * SECT + s;
      pos[i * 3] = x;
      pos[i * 3 + 1] = groundHeight(x, z);
      pos[i * 3 + 2] = z;
    }
  }
  const idx = [];
  for (let s = 0; s < SECT; s++) { // 中心扇形
    idx.push(0, 1 + s, 1 + ((s + 1) % SECT));
  }
  for (let ri = 1; ri < RINGS; ri++) {
    const base = 1 + (ri - 1) * SECT, next = 1 + ri * SECT;
    for (let s = 0; s < SECT; s++) {
      const s2 = (s + 1) % SECT;
      idx.push(base + s, next + s, base + s2);
      idx.push(base + s2, next + s, next + s2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const groundMat = new MeshStandardMaterial({ color: PAL.snow, roughness: 0.93, metalness: 0.0 });
  // 石砖缝隙（御道）：注入程序化砖纹
  groundMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
float hash21(vec2 p){p=fract(p*vec2(234.34,435.345));p+=dot(p,p+34.23);return fract(p.x*p.y);}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // 御道砖缝（中轴区域）
  float roadMask = smoothstep(1.5, 1.28, abs(vWPos.x)) * smoothstep(-5.0, -4.4, vWPos.z) * smoothstep(4.0, 3.5, vWPos.z);
  if (roadMask > 0.002) {
    vec2 cell = vec2(vWPos.x / 0.55, vWPos.z / 0.55);
    float rowShift = floor(cell.y) * 0.5;
    vec2 g = abs(fract(cell + vec2(rowShift, 0.0)) - 0.5);
    float line = smoothstep(0.44, 0.5, max(g.x, g.y));
    float shade = 0.86 + 0.26 * hash21(floor(cell + vec2(rowShift, 0.0)));
    diffuseColor.rgb *= mix(1.0, shade * (1.0 - line * 0.45), roadMask);
  }
  // 侧院碎石小径（左右配殿前）
  float pathL = smoothstep(0.28, 0.16, abs(abs(vWPos.x) - 2.9)) * smoothstep(-1.0, -0.4, vWPos.z) * smoothstep(4.6, 4.0, vWPos.z);
  if (pathL > 0.002) {
    float peb = hash21(floor(vWPos.xz / 0.16));
    diffuseColor.rgb *= mix(1.0, 0.9 + 0.18 * peb, pathL * 0.7);
  }
}`);
  };
  const mesh = new Mesh(geo, groundMat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  sceneInner.add(mesh);
  return mesh;
}
buildGroundMesh();

/* ---------- 碰撞注册：地面高度场 ---------- */
Colliders.add({ type: 'ground', height: groundHeight });
