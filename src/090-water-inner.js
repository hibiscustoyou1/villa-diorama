/* ============================================================
 * 090-water-inner.js — 内金水河：河床卵石、动态平面反射、深度色调折射、
 * 沿岸薄冰（冰水分开）、落雪涟漪（≤8 并发）
 * 水面 = layer 1（反射/折射 pass 排除自身）
 * ============================================================ */

/* ---------- 涟漪注册表（120-snow 落雪命中水面时调用 spawn） ---------- */
const WaterRipples = {
  MAX: 8,
  items: [], // {x, z, t0, amp}
  spawn(x, z, amp = 1.0) {
    if (this.items.length >= this.MAX) this.items.shift();
    this.items.push({ x, z, t0: State.time, amp });
  },
};

/* ---------- 河床卵石（合并几何） ---------- */
function buildRiverBed() {
  const batch = new MergeBatch();
  for (let x = -6.0; x <= 6.0; x += 0.22) {
    const zc = riverCenter(x);
    for (let k = -2; k <= 2; k++) {
      const z = zc + k * 0.16 + rng.range(-0.03, 0.03);
      if (Math.abs(z - zc) > RIVER_HALF - 0.04) continue;
      const py = GROUND - RIVER_BED + 0.02;
      if (!insideGlobe(x, py, z, 0.1)) continue; // 球壁裁剪
      const s = rng.range(0.03, 0.07);
      const pebble = new IcosahedronGeometry(s, 0);
      const p = pebble.attributes.position;
      for (let v = 0; v < p.count; v++) {
        p.setXYZ(v, p.getX(v) * (0.8 + rng.next() * 0.4), p.getY(v) * 0.5, p.getZ(v) * (0.8 + rng.next() * 0.4));
      }
      pebble.computeVertexNormals();
      batch.add(rng.next() < 0.3 ? 'jade' : 'jadeD', pebble, M.compose(x + rng.range(-0.05, 0.05), py, z));
    }
  }
  batch.build(sceneInner);
}
buildRiverBed();

/* ---------- 水面（参数化条带 + 反射/折射/涟漪 shader） ---------- */
let riverSurface = null;
function buildRiverSurface() {
  // 沿河心线条带（x 参数化）
  const pos = [], idx = [], uvs = [];
  const cols = 64, rows = 4;
  const ySurf = GROUND - 0.035;
  for (let i = 0; i <= cols; i++) {
    let x = lerp(-6.15, 6.15, i / cols);
    const zc = riverCenter(x);
    // 球壁裁剪：列最远 z（河道 z>0，远离球心一侧）约束允许的 |x|
    const zWorst = zc + RIVER_HALF;
    const dy = ySurf - SPHERE_CY;
    const r2 = (SPHERE_R - 0.1) * (SPHERE_R - 0.1) - dy * dy - zWorst * zWorst;
    if (r2 > 0) {
      const xAllow = Math.sqrt(r2);
      if (Math.abs(x) > xAllow) x = Math.sign(x) * xAllow;
    } else {
      x = 0; // 不会发生（河道 z<5.1 时 r2 恒正）
    }
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      const z = zc - RIVER_HALF + t * RIVER_HALF * 2;
      pos.push(x, ySurf, z);
      uvs.push(i / cols, t);
    }
  }
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = i * (rows + 1) + j, b = a + 1, c = a + rows + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const matWater = new ShaderMaterial({
    uniforms: {
      tReflect: { value: null },   // reflectInnerRT.texture（150-loop 绑定）
      tScene: { value: null },     // offRT.texture（折射源）
      time: { value: 0 },
      ripples: { value: Array.from({ length: 8 }, () => new Vector4(0, 0, -10, 0)) },
      camPos: { value: new Vector3() },
      tintDeep: { value: new Color(0x0c2f4a) },
      tintShallow: { value: new Color(0x2e6a86) },
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
      uniform sampler2D tScene;
      uniform float time;
      uniform vec4 ripples[8];
      uniform vec3 camPos;
      uniform vec3 tintDeep;
      uniform vec3 tintShallow;
      varying vec2 vScreenUV;
      varying vec3 vWorldPos;

      void main() {
        // 微弱流动法线（沿河缓流 + 高频细波）
        float flow = sin(vWorldPos.x * 2.2 + time * 0.8) * 0.5 + sin(vWorldPos.x * 5.0 - time * 1.4) * 0.3;
        float fine = sin((vWorldPos.x * 14.0 + vWorldPos.z * 9.0) + time * 2.2) * 0.2;
        vec2 nOff = vec2(flow * 0.004 + fine * 0.0015, fine * 0.002);

        // 涟漪（环状波纹）
        float rippleAmp = 0.0;
        for (int i = 0; i < 8; i++) {
          vec4 rp = ripples[i];
          if (rp.w > 0.0) {
            float age = time - rp.z;
            if (age > 0.0 && age < 3.0) {
              float d = distance(vWorldPos.xz, rp.xy);
              float r = age * 0.32;
              float ring = sin((d - r) * 42.0) * exp(-abs(d - r) * 9.0) * exp(-age * 2.2) * rp.w;
              rippleAmp += ring;
            }
          }
        }
        nOff += vec2(rippleAmp * 0.006, rippleAmp * 0.004);

        // 反射（镜像相机渲的 RT，屏幕空间近似）
        vec3 refl = texture2D(tReflect, clamp(vScreenUV + nOff * 2.0, 0.001, 0.999)).rgb;

        // 折射（球内场景色 + 深水色调混合）
        vec3 refr = texture2D(tScene, clamp(vScreenUV - nOff, 0.001, 0.999)).rgb;
        float depthMix = 0.55; // 河深色调权重
        vec3 waterBody = mix(tintShallow, tintDeep, depthMix);
        refr = mix(refr * 0.6, waterBody, 0.45);

        // 菲涅耳（掠射角反射强）
        vec3 V = normalize(camPos - vWorldPos);
        float fres = pow(1.0 - max(dot(V, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
        vec3 col = mix(refr, refl, clamp(fres * 0.9 + 0.18, 0.0, 1.0));

        // 涟漪高光
        col += vec3(0.5, 0.65, 0.75) * abs(rippleAmp) * 0.35;

        // 月光碎金（沿河细碎高光）
        float glint = pow(max(sin(vWorldPos.x * 9.0 + time * 1.1) * sin(vWorldPos.z * 7.0 - time * 0.7), 0.0), 8.0) * 0.25;
        col += vec3(0.9, 0.85, 0.7) * glint;

        gl_FragColor = vec4(col, 0.94);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
  });
  matWater.toneMapped = false; // offRT 已是 tone-mapped 色

  riverSurface = new Mesh(geo, matWater);
  riverSurface.layers.set(1); // 反射/折射 pass 排除
  riverSurface.renderOrder = 2;
  sceneInner.add(riverSurface);
}
buildRiverSurface();

/* ---------- 沿岸薄冰（冰水分开：冰上落雪不触发涟漪） ---------- */
function buildIceEdges() {
  const batch = new MergeBatch();
  const iceMat = mat('ice');
  for (let x = -6.1; x <= 6.1; x += 0.3) {
    const zc = riverCenter(x);
    for (const s of [-1, 1]) {
      // 球壁裁剪（用更远的雪帽位置判定，margin 覆盖 box 对角 ~0.17）
      if (!insideGlobe(x, GROUND, zc + s * (RIVER_HALF + 0.02), 0.25)) continue;
      // 薄冰条（岸侧 0.12 宽，半透明）
      const ice = new Mesh(new BoxGeometry(0.3, 0.018, 0.13), iceMat);
      ice.position.set(x, GROUND - 0.012, zc + s * (RIVER_HALF - 0.055));
      ice.rotation.y = Math.atan2(zc - riverCenter(x + 0.3), 0.3) * 0.5;
      sceneInner.add(ice);
      // 冰上积雪（白条）
      const snowCap = new Mesh(new BoxGeometry(0.28, 0.02, 0.08), mat('snow'));
      snowCap.position.set(x, GROUND + 0.002, zc + s * (RIVER_HALF + 0.01));
      sceneInner.add(snowCap);
    }
  }
}
buildIceEdges();

/* 判断 (x,z) 是否在水面（触发涟漪）——冰面与岸返回 false */
function isWaterAt(x, z) {
  const zc = riverCenter(x);
  const dz = Math.abs(z - zc);
  return dz < RIVER_HALF - 0.12; // 薄冰带 0.12 内不触发
}

/* ---------- 水面 uniform 更新（150-loop 每帧调用） ---------- */
function updateRiverSurface(dt) {
  if (!riverSurface) return;
  const u = riverSurface.material.uniforms;
  u.time.value = State.time;
  u.camPos.value.copy(camera.position);
  // 涟漪数组（过期清零）
  const arr = u.ripples.value;
  for (let i = 0; i < 8; i++) {
    const it = WaterRipples.items[i];
    if (it && State.time - it.t0 < 3.0) {
      arr[i].set(it.x, it.z, it.t0, it.amp);
    } else {
      arr[i].set(0, 0, -10, 0);
    }
  }
}
