/* ============================================================
 * 110-glass.js — 玻璃球壳（ShaderMaterial，屏幕空间折射近似）
 *
 * 管线：球内场景先渲到 offRT（颜色+深度），球壳片元沿折射射线在屏幕空间
 * 采样 offRT；空视线（未命中场景）出射到远侧界面 → 内联夜空渐变。
 * 特性：IOR 1.48 双界面折射、厚度 0.145、菲涅耳、边缘轻微色散、
 * 微弱流动法线、局部触碰涟漪（≤4 并发）、中心小扰动、夜色环境反射。
 * ============================================================ */

/* ---------- 触碰涟漪注册表（130-wind 指针事件调用） ---------- */
const GlassRipples = {
  MAX: 4,
  items: [], // {dir: Vector3(球面局部), t0}
  spawn(worldPoint) {
    if (this.items.length >= this.MAX) this.items.shift();
    const local = worldPoint.clone().sub(new Vector3(0, SPHERE_CY, 0)).normalize();
    this.items.push({ dir: local, t0: State.time });
  },
};

let glassMesh = null;
function buildGlassSphere() {
  const glassMat = new ShaderMaterial({
    uniforms: {
      tScene: { value: null },      // offRT 颜色（150-loop 绑定）
      tDepth: { value: null },      // offRT 深度
      time: { value: 0 },
      camPos: { value: new Vector3() },
      camNear: { value: 0.12 },
      camFar: { value: 180 },
      thickness: { value: GLASS_THICK },
      touchRipples: { value: Array.from({ length: 4 }, () => new Vector4(0, 0, 1, -10)) },
      // 夜空渐变参数（与 buildSkyDomeScene 一致）
      skyTop: { value: new Color(0x071424) },
      skyHorizon: { value: new Color(0x0e2238) },
      moonDir: { value: new Vector3(-0.45, 0.55, -0.7).normalize() },
      moonColor: { value: new Color(0xfdf0d5) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec2 vScreenUV;
      varying float vFragViewZ;
      void main() {
        vLocalPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * wp;
        vFragViewZ = -mv.z;
        vec4 sp = projectionMatrix * mv;
        vScreenUV = sp.xy / sp.w * 0.5 + 0.5;
        gl_Position = sp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tScene;
      uniform sampler2D tDepth;
      uniform float time;
      uniform vec3 camPos;
      uniform float camNear;
      uniform float camFar;
      uniform float thickness;
      uniform vec4 touchRipples[4];
      uniform vec3 skyTop;
      uniform vec3 skyHorizon;
      uniform vec3 moonDir;
      uniform vec3 moonColor;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying vec3 vLocalPos;
      varying vec2 vScreenUV;
      varying float vFragViewZ;

      #include <packing>

      // 折射方向 → 屏幕偏移（相机空间投影 × 厚度系数）
      vec2 refrScreenOffset(vec3 refrDir) {
        vec3 rc = (viewMatrix * vec4(refrDir, 0.0)).xyz; // 相机空间
        vec2 off = rc.xy / max(abs(rc.z), 0.2);
        return off * thickness * 2.4;
      }

      // 内联夜空（空视线出射）
      vec3 skyColor(vec3 dir) {
        float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(skyHorizon, skyTop, pow(h, 0.7));
        float moonGlow = pow(max(dot(dir, moonDir), 0.0), 180.0);
        float moonHalo = pow(max(dot(dir, moonDir), 0.0), 12.0) * 0.18;
        col += moonColor * (moonGlow * 1.2 + moonHalo);
        return col;
      }

      // 场景深度（viewZ，负值）→ 线性
      float sceneViewZ(vec2 uv) {
        float d = texture2D(tDepth, uv).x;
        return perspectiveDepthToViewZ(d, camNear, camFar);
      }

      void main() {
        vec3 V = normalize(vWorldPos - camPos);
        vec3 N = normalize(vNormal);

        // —— 微弱流动法线（缓慢呼吸变形） ——
        vec3 flowN = N + 0.018 * vec3(
          sin(vLocalPos.y * 7.0 + time * 0.55),
          sin(vLocalPos.x * 6.0 + time * 0.42),
          sin(vLocalPos.z * 8.0 + time * 0.6));
        N = normalize(flowN);

        // —— 局部触碰涟漪（≤4 并发，球面弧长波） ——
        vec3 nLocal = normalize(vLocalPos);
        float rippleAmp = 0.0;
        vec3 rippleDir = vec3(0.0);
        for (int i = 0; i < 4; i++) {
          vec4 tr = touchRipples[i];
          if (tr.w > 0.0) {
            float age = time - tr.w;
            if (age > 0.0 && age < 2.5) {
              float d = acos(clamp(dot(nLocal, normalize(tr.xyz)), -1.0, 1.0)) * ${SPHERE_R.toFixed(1)};
              float r = age * 1.1;
              float w = sin((d - r) * 16.0) * exp(-abs(d - r) * 3.5) * exp(-age * 1.6);
              rippleAmp += w;
              // 波传播切向方向
              vec3 tang = normalize(nLocal - tr.xyz * dot(nLocal, tr.xyz) + vec3(1e-5));
              rippleDir += tang * w;
            }
          }
        }
        if (abs(rippleAmp) > 1e-4) {
          N = normalize(N + rippleDir * 0.12);
        }

        // —— 中心小扰动（视线近轴轻微漩涡） ——
        float axial = 1.0 - clamp(length(vLocalPos.xy) / ${SPHERE_R.toFixed(1)}, 0.0, 1.0);
        float swirlA = sin(atan(vLocalPos.y, vLocalPos.x) * 2.0 + time * 0.4) * 0.008 * axial;

        // —— 折射（边缘轻微色散：RGB 三 IOR） ——
        vec3 refrR = refract(V, N, 1.0 / 1.474);
        vec3 refrG = refract(V, N, 1.0 / 1.480);
        vec3 refrB = refract(V, N, 1.0 / 1.486);

        // 屏幕空间偏移（折射方向投影到相机平面 × 厚度）
        vec2 offR = refrScreenOffset(refrR);
        vec2 offG = refrScreenOffset(refrG);
        vec2 offB = refrScreenOffset(refrB);

        // 中心漩涡附加偏移
        vec2 swirlOff = vec2(-swirlA * vLocalPos.y, swirlA * vLocalPos.x) * 0.02;

        vec2 uvR = clamp(vScreenUV + offR + swirlOff, 0.001, 0.999);
        vec2 uvG = clamp(vScreenUV + offG + swirlOff, 0.001, 0.999);
        vec2 uvB = clamp(vScreenUV + offB + swirlOff, 0.001, 0.999);

        // —— 深度感知：空视线过远侧界面 ——
        float dG = sceneViewZ(uvG); // 场景 viewZ（负）
        // 球面片元 viewZ（vFragViewZ，正）。场景在球面之后（更远）→ 有效折射采样；
        // 场景为空（深度接近 far）→ 出射到夜空
        float sceneDist = -dG;
        bool emptyRay = sceneDist > camFar * 0.5;
        // 场景比球面近（折射采样打到球前物体，异常）→ 收缩偏移
        if (sceneDist < vFragViewZ - 0.5 && !emptyRay) {
          uvR = vScreenUV; uvG = vScreenUV; uvB = vScreenUV;
        }

        vec3 refrCol;
        if (emptyRay) {
          // 空视线：出射方向的天空
          vec3 exitDir = normalize(refrG);
          refrCol = skyColor(exitDir);
        } else {
          refrCol = vec3(
            texture2D(tScene, uvR).r,
            texture2D(tScene, uvG).g,
            texture2D(tScene, uvB).b);
        }

        // —— 反射（夜色环境） ——
        vec3 R = reflect(V, N);
        vec3 reflCol = skyColor(R);
        // 球内灯火对反射的微弱贡献（采样 offRT 中心区域近似）
        reflCol += texture2D(tScene, clamp(vScreenUV - R.xy * 0.03, 0.1, 0.9)).rgb * 0.06;

        // —— 菲涅耳（Schlick） ——
        float cosT = clamp(dot(-V, N), 0.0, 1.0);
        float F = 0.04 + 0.96 * pow(1.0 - cosT, 5.0);

        vec3 col = mix(refrCol, reflCol, clamp(F * 1.15, 0.0, 0.85));

        // —— 球缘增亮（薄壳边缘光） ——
        float rim = pow(1.0 - cosT, 3.5);
        col += vec3(0.35, 0.5, 0.7) * rim * 0.22;

        // 涟漪高光
        col += vec3(0.4, 0.55, 0.7) * abs(rippleAmp) * 0.3;

        // 顶端月侧微高光
        col += moonColor * pow(max(dot(N, moonDir), 0.0), 24.0) * 0.18;

        gl_FragColor = vec4(col, 0.965);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
  });
  glassMat.toneMapped = false; // offRT 已 tone-mapped

  glassMesh = new Mesh(new SphereGeometry(SPHERE_R, 96, 64), glassMat);
  glassMesh.position.set(0, SPHERE_CY, 0);
  glassMesh.renderOrder = 10;
  sceneOuter.add(glassMesh);

  // 内壳（背面微弱厚度感：BackSide 淡蓝描边）
  const innerShell = new Mesh(
    new SphereGeometry(SPHERE_R - GLASS_THICK, 48, 32),
    new MeshBasicMaterial({ color: 0x9fc8e8, transparent: true, opacity: 0.05, side: BackSide, toneMapped: false, depthWrite: false }),
  );
  innerShell.position.set(0, SPHERE_CY, 0);
  innerShell.renderOrder = 9;
  sceneOuter.add(innerShell);
}
buildGlassSphere();

/* ---------- 玻璃 uniform 更新（150-loop 每帧调用） ---------- */
function updateGlass(dt) {
  if (!glassMesh) return;
  const u = glassMesh.material.uniforms;
  u.time.value = State.time;
  u.camPos.value.copy(camera.position);
  const arr = u.touchRipples.value;
  for (let i = 0; i < 4; i++) {
    const it = GlassRipples.items[i];
    if (it && State.time - it.t0 < 2.5) {
      arr[i].set(it.dir.x, it.dir.y, it.dir.z, it.t0);
    } else {
      arr[i].set(0, 0, 1, -10);
    }
  }
}
