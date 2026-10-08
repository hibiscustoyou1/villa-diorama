/* ============================================================
 * 030-materials.js — 材质缓存复用 + 静态几何按材质合并批渲染工具
 * （THREE 名字已在 020-renderer.js 全局解构）
 * ============================================================ */

/* ---------- 材质缓存 ---------- */
const _matCache = new Map();
function mat(name) {
  if (_matCache.has(name)) return _matCache.get(name);
  const defs = {
    snow:   () => new MeshStandardMaterial({ color: PAL.snow, roughness: 0.93, metalness: 0.0 }),
    snowD:  () => new MeshStandardMaterial({ color: 0xe9eef0, roughness: 0.95, metalness: 0.0 }),
    jade:   () => new MeshStandardMaterial({ color: PAL.jade, roughness: 0.55, metalness: 0.02 }),
    jadeD:  () => new MeshStandardMaterial({ color: 0xb9c4c0, roughness: 0.6, metalness: 0.02 }),
    red:    () => new MeshStandardMaterial({ color: PAL.red, roughness: 0.62, metalness: 0.0 }),
    redD:   () => new MeshStandardMaterial({ color: PAL.redD, roughness: 0.66, metalness: 0.0 }),
    gold:   () => new MeshStandardMaterial({ color: PAL.gold, roughness: 0.34, metalness: 0.76 }),
    goldHi: () => new MeshStandardMaterial({ color: PAL.goldHi, roughness: 0.26, metalness: 0.76 }),
    tile:   () => new MeshStandardMaterial({ color: PAL.tile, roughness: 0.5, metalness: 0.15 }),
    tileD:  () => new MeshStandardMaterial({ color: 0xa06d1c, roughness: 0.55, metalness: 0.12 }),
    teal:   () => new MeshStandardMaterial({ color: PAL.teal, roughness: 0.6, metalness: 0.05 }),
    tealD:  () => new MeshStandardMaterial({ color: 0x1a4242, roughness: 0.62, metalness: 0.05 }),
    blue:   () => new MeshStandardMaterial({ color: PAL.blue, roughness: 0.5, metalness: 0.06 }),
    bronze: () => new MeshStandardMaterial({ color: PAL.bronze, roughness: 0.42, metalness: 0.85 }),
    bronzeD:() => new MeshStandardMaterial({ color: 0x565040, roughness: 0.5, metalness: 0.8 }),
    dark:   () => new MeshStandardMaterial({ color: 0x1c2a38, roughness: 0.7, metalness: 0.1 }),
    wood:   () => new MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.72, metalness: 0.0 }),
    woodD:  () => new MeshStandardMaterial({ color: 0x4a3320, roughness: 0.78, metalness: 0.0 }),
    paper:  () => new MeshStandardMaterial({ color: 0xf3e6c8, roughness: 0.9, emissive: 0xffdf9e, emissiveIntensity: 0.28 }),
    ice:    () => new MeshPhysicalMaterial({ color: 0xcfe8f2, roughness: 0.18, metalness: 0.0, transparent: true, opacity: 0.72 }),
    glassLamp: () => new MeshPhysicalMaterial({ color: 0xffe9b0, roughness: 0.25, transparent: true, opacity: 0.85, emissive: 0xffc266, emissiveIntensity: 0.55 }),
  };
  // 发光灯材质（暖光系列，按色温命名）
  const lampDefs = {
    lampWarm:  [0xffc873, 1.6], lampSoft: [0xffdca0, 1.1], lampRed: [0xff9a5a, 1.3],
    lampJade:  [0x9fe8c8, 1.0], lampMoon: [0xbfd8f0, 0.9], lampGold: [0xffd28a, 1.8],
    lampCyan:  [0x8ad8ff, 1.0], lampPink: [0xffb8c8, 0.9],
  };
  let m;
  if (defs[name]) m = defs[name]();
  else if (lampDefs[name]) {
    const [c, i] = lampDefs[name];
    m = new MeshStandardMaterial({ color: 0x201408, emissive: c, emissiveIntensity: i, roughness: 0.6 });
  } else m = new MeshStandardMaterial({ color: 0x888888 });
  _matCache.set(name, m);
  return m;
}

/* ---------- 几何构造快捷方式（自动阴影标记） ---------- */
function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new Mesh(new BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const m = new Mesh(new CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, material, x = 0, y = 0, z = 0, w = 16, h = 12) {
  const m = new Mesh(new SphereGeometry(r, w, h), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function grp(...children) {
  const g = new Group();
  for (const c of children) g.add(c);
  return g;
}

/* ---------- 静态几何合并（按材质批渲染） ----------
 * 收集同材质的 {geometry, matrix}，合并为一个 BufferGeometry。
 * 位置/法线/uv（可选）参与合并，索引重映射。 */
function mergeGeoms(items) {
  let vCount = 0, iCount = 0, hasUV = true;
  const prepped = items.map(({ geometry, matrix }) => {
    const g = geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.attributes.uv) hasUV = false;
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = hasUV ? new Float32Array(vCount * 2) : null;
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0, io = 0;
  for (const g of prepped) {
    const pa = g.attributes.position, na = g.attributes.normal;
    pos.set(pa.array, vo * 3);
    nor.set(na.array, vo * 3);
    if (uv && g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) {
      const ia = g.index.array;
      for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo;
      io += ia.length;
    } else {
      for (let i = 0; i < pa.count; i++) idx[io + i] = i + vo;
      io += pa.count;
    }
    vo += pa.count;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  if (uv) out.setAttribute('uv', new BufferAttribute(uv, 2));
  out.setIndex(new BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/** 合并收集器：按材质名分组，最终产出合并后的 Mesh 列表 */
class MergeBatch {
  constructor() { this.groups = new Map(); }
  add(materialName, geometry, matrix) {
    if (!this.groups.has(materialName)) this.groups.set(materialName, []);
    this.groups.get(materialName).push({ geometry, matrix });
  }
  build(parent) {
    const meshes = [];
    for (const [name, items] of this.groups) {
      if (!items.length) continue;
      const geo = mergeGeoms(items);
      const m = new Mesh(geo, mat(name));
      m.castShadow = true; m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      parent.add(m);
      meshes.push(m);
      for (const it of items) it.geometry.dispose();
    }
    this.groups.clear();
    return meshes;
  }
}

/** 常用矩阵工具 */
const M = {
  compose(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) {
    const m = new Matrix4();
    m.makeRotationY(ry);
    m.scale(new Vector3(sx, sy, sz));
    m.setPosition(x, y, z);
    return m;
  },
};
