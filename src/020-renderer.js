/* ============================================================
 * 020-renderer.js — 渲染器、双场景、相机、控制器、灯光、PMREM 环境、渲染目标
 *
 * 架构：
 *   sceneInner —— 玻璃球内全部内容（含雪晶、金水河），每帧渲染进 offRT（颜色+深度）
 *   sceneOuter —— 夜空背景 + 球外月夜水庭 + 玻璃球壳，直接渲染到画布
 *   球壳 ShaderMaterial 从 offRT 做屏幕空间折射采样。
 *
 * 图层约定（供节流预渲染排除用）：
 *   layer 0 —— 常规物体
 *   layer 1 —— 水面（反射/折射预渲染排除）
 *   layer 2 —— 雪晶（反射/折射预渲染排除）
 * ============================================================ */

const {
  WebGLRenderer, PerspectiveCamera, Scene, HemisphereLight, DirectionalLight,
  Color, PMREMGenerator, Mesh, SphereGeometry, ShaderMaterial, PlaneGeometry,
  MeshBasicMaterial, BackSide, FrontSide, Vector4,
  WebGLRenderTarget, DepthTexture, LinearFilter, UnsignedIntType,
  SRGBColorSpace, ACESFilmicToneMapping, PCFSoftShadowMap, NoToneMapping, Group,
  // 材质/几何工具（030/040 及后续模块共用，全局唯一解构）
  MeshStandardMaterial, MeshPhysicalMaterial, BoxGeometry, CylinderGeometry,
  BufferGeometry, BufferAttribute, Float32BufferAttribute, Matrix4, DoubleSide,
  ConeGeometry, TorusGeometry, CircleGeometry, InstancedMesh, InstancedBufferGeometry,
  InstancedBufferAttribute, DynamicDrawUsage, Object3D, TubeGeometry, CatmullRomCurve3,
  RingGeometry, LatheGeometry, ExtrudeGeometry, Shape, Path, EdgesGeometry, LineSegments,
  LineBasicMaterial, Points, PointsMaterial, AdditiveBlending,
  // 专用（Vector2/Vector3/Quaternion 已由 OrbitControls 解构声明）
  PointLight, Raycaster, Sphere, Clock, Euler,
  IcosahedronGeometry, OctahedronGeometry, TetrahedronGeometry,
} = __THREE;

const canvas = document.getElementById('globe-canvas');

/* ---------- 渲染器 ---------- */
const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // 只在首帧与需要时更新

/* ---------- 双场景 ---------- */
const sceneInner = new Scene();          // 球内
sceneInner.background = new Color(PAL.night);
const sceneOuter = new Scene();          // 球外 + 背景
sceneOuter.background = new Color(PAL.night);

/* ---------- 相机 ---------- */
const camera = new PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.12, 180);
camera.position.set(20, 20, 36);
camera.layers.enable(1); // 水面
camera.layers.enable(2); // 雪晶

/* ---------- OrbitControls ---------- */
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5.55, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 11;
controls.maxDistance = 44;
controls.maxPolarAngle = 0.48 * Math.PI;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.76;

/* ---------- 灯光（球内） ---------- */
const hemiInner = new HemisphereLight(0xa8c9ed, 0x243a50, 1.1);
sceneInner.add(hemiInner);

const keyLight = new DirectionalLight(0xa9cdff, 1.65);
keyLight.position.set(-10, 18, 9);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.00015;
keyLight.shadow.normalBias = 0.018;
keyLight.shadow.camera.left = -9.5;
keyLight.shadow.camera.right = 9.5;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 60;
keyLight.target.position.set(0, 3.5, 0);
sceneInner.add(keyLight, keyLight.target);

const fillLight = new DirectionalLight(0xb8d4f8, 0.75);
fillLight.position.set(10, 10, -12);
sceneInner.add(fillLight);

/* ---------- 灯光（球外，较暗月夜） ---------- */
const hemiOuter = new HemisphereLight(0x8fb4d8, 0x1a2a3c, 0.7);
sceneOuter.add(hemiOuter);
const moonLight = new DirectionalLight(0xbfd8f0, 0.9);
moonLight.position.set(-24, 30, -18);
sceneOuter.add(moonLight);

/* ---------- PMREM 环境：程序化夜空穹顶（垂直渐变 + 三块柔光板） ---------- */
function buildSkyDomeScene() {
  const sky = new Scene();
  const domeMat = new ShaderMaterial({
    side: BackSide,
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 top = vec3(0.016, 0.038, 0.078);    // 深蓝夜空顶
        vec3 mid = vec3(0.055, 0.105, 0.185);    // 地平线附近
        vec3 bot = vec3(0.010, 0.022, 0.042);
        vec3 c = mix(bot, mid, smoothstep(0.0, 0.52, h));
        c = mix(c, top, smoothstep(0.5, 1.0, h));
        // 月向柔光
        vec3 moonDir = normalize(vec3(-0.55, 0.42, -0.5));
        float m = pow(max(dot(vDir, moonDir), 0.0), 24.0);
        c += vec3(0.35, 0.38, 0.42) * m * 0.8;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  sky.add(new Mesh(new SphereGeometry(50, 32, 24), domeMat));
  // 三块柔光板（暖/冷/青），模拟远处灯火与月光散射
  const soft = (color, intensity, pos, rotY, scale) => {
    const m = new Mesh(
      new PlaneGeometry(scale, scale * 0.6),
      new MeshBasicMaterial({ color, transparent: true, opacity: intensity })
    );
    m.position.copy(pos);
    m.rotation.y = rotY;
    sky.add(m);
    return m;
  };
  soft(0xffd9a0, 0.5, new Vector3(0, 6, -46), 0, 26);          // 背后暖光
  soft(0xa8c9ed, 0.35, new Vector3(-44, 10, 10), Math.PI / 2.2, 22); // 左侧冷光
  soft(0x7fd8c8, 0.22, new Vector3(42, 8, 14), -Math.PI / 2.1, 18);  // 右侧青光
  return sky;
}

const pmrem = new PMREMGenerator(renderer);
const skyScene = buildSkyDomeScene();
const envRT = pmrem.fromScene(skyScene, 0.04);
sceneInner.environment = envRT.texture;
sceneInner.environmentIntensity = 0.64;
sceneOuter.environment = envRT.texture;
sceneOuter.environmentIntensity = 0.64;

/* ---------- 渲染目标 ---------- */
function rtSize(scale) {
  const s = renderer.getDrawingBufferSize(new Vector2());
  return new Vector2(Math.max(2, Math.floor(s.x * scale)), Math.max(2, Math.floor(s.y * scale)));
}

// 球壳折射离屏（颜色 + 深度）
const OFF_SCALE = 0.72;
const offRT = new WebGLRenderTarget(rtSize(OFF_SCALE).x, rtSize(OFF_SCALE).y, {
  minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: true,
});
offRT.depthTexture = new DepthTexture(offRT.width, offRT.height);
offRT.depthTexture.type = UnsignedIntType;

// 水面平面反射（球内金水河 / 球外水庭各一）
function makeReflectRT() {
  const s = rtSize(0.5);
  return new WebGLRenderTarget(s.x, s.y, { minFilter: LinearFilter, magFilter: LinearFilter });
}
const reflectInnerRT = makeReflectRT();
const reflectOuterRT = makeReflectRT();

// 河底折射（金水河水下）
const refractRT = makeReflectRT();

/* ---------- resize ---------- */
let cameraMoved = true; // 相机变化 → 立即刷新预渲染
controls.addEventListener('change', () => { cameraMoved = true; });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const s = rtSize(OFF_SCALE);
  offRT.setSize(s.x, s.y);
  offRT.depthTexture.image.width = s.x;
  offRT.depthTexture.image.height = s.y;
  const r = rtSize(0.5);
  reflectInnerRT.setSize(r.x, r.y);
  reflectOuterRT.setSize(r.x, r.y);
  refractRT.setSize(r.x, r.y);
  cameraMoved = true;
  if (window.__globeOnResize) window.__globeOnResize();
});

/* ---------- 阴影首帧更新标记 ---------- */
let shadowNeedsUpdate = true;
