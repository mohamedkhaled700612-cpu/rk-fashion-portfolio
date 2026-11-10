// Hypnotic flowing colour field (burgundy → claret → rose → gold) rendered with WebGL.
// Inspired by the saved "Monopo Saigon – hypnotic colors" reference. Falls back to a CSS gradient.
const FRAG = `
precision highp float;
uniform vec2 u_res; uniform float u_time; uniform vec2 u_mouse;

float field(vec2 p, float t) {
  for (int i = 1; i < 5; i++) {
    float fi = float(i);
    p += vec2(0.62 / fi * sin(fi * p.y + t * 0.32 + 0.3 * fi),
              0.62 / fi * sin(fi * p.x + t * 0.26 + 0.3 * fi + 1.7));
  }
  return 0.5 + 0.5 * sin(p.x + p.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  uv *= 1.7;
  uv += (u_mouse - 0.5) * 0.28;
  float f = field(uv, u_time);

  vec3 c1 = vec3(0.090, 0.012, 0.035);   // oxblood
  vec3 c2 = vec3(0.290, 0.040, 0.105);   // garnet
  vec3 c3 = vec3(0.560, 0.105, 0.205);   // claret
  vec3 c4 = vec3(0.860, 0.650, 0.290);   // gold

  vec3 col = mix(c1, c2, smoothstep(0.05, 0.55, f));
  col = mix(col, c3, smoothstep(0.50, 0.85, f));
  col = mix(col, c4, smoothstep(0.86, 1.0, f) * 0.6);

  float vig = smoothstep(1.5, 0.15, length(uv * 0.55));
  col *= mix(0.5, 1.0, vig);
  float g = fract(sin(dot(gl_FragCoord.xy + u_time, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

export function startFlow(canvas, { reducedMotion = false } = {}) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { document.documentElement.classList.add("no-webgl"); return { stop() {}, mouse() {} }; }

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { document.documentElement.classList.add("no-webgl"); return { stop() {}, mouse() {} }; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { document.documentElement.classList.add("no-webgl"); return { stop() {}, mouse() {} }; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");

  const target = { x: 0.5, y: 0.5 }, cur = { x: 0.5, y: 0.5 };
  let raf = 0, running = false, visible = true, t0 = performance.now();

  function resize() {
    // Render at reduced resolution: the field is soft, so this is invisible but much cheaper.
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.55;
    const w = Math.max(2, Math.floor(canvas.clientWidth * scale));
    const hgt = Math.max(2, Math.floor(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; }
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function frame(now) {
    cur.x += (target.x - cur.x) * 0.04; cur.y += (target.y - cur.y) * 0.04;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, reducedMotion ? 7.0 : (now - t0) / 1000);
    gl.uniform2f(uMouse, cur.x, cur.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (running && !reducedMotion) raf = requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : visible && start()));
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible && !document.hidden ? start() : stop(); }).observe(canvas);
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); });

  if (reducedMotion) frame(performance.now()); else start();

  return {
    stop,
    mouse(x, y) { target.x = x; target.y = 1 - y; }
  };
}
