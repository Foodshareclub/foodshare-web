// GPUConfetti.wgsl — GPU particle confetti system
// Replaces canvas-confetti with a 5000-particle instanced shader

struct Params {
  time: f32,
  burstTime: f32,
  resolution: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) fade: f32,
}

// Pseudo-random hash
fn hash(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@vertex fn vs_main(
  @builtin(vertex_index) vi: u32,
  @builtin(instance_index) i: u32,
) -> VertexOutput {
  let seed = hash(vec2f(f32(i) * 12.9898, f32(i) * 78.233));
  let seed2 = hash(vec2f(f32(i) * 43.5453, f32(i) * 17.1234));

  let elapsed = params.time - params.burstTime;
  let life = clamp(elapsed * (0.8 + seed * 0.4), 0.0, 1.0);

  // Launch angle from seed
  let angle = seed * 6.28318;
  let speed = 0.3 + seed2 * 0.7;

  // Physics: projectile with gravity
  let vx = cos(angle) * speed;
  let vy = sin(angle) * speed * 0.8 + 0.4;
  let gravity = -1.2;

  let x = vx * elapsed;
  let y = vy * elapsed + 0.5 * gravity * elapsed * elapsed;

  // NDC position
  let aspect = params.resolution.x / params.resolution.y;
  let ndc = vec2f(
    (x / aspect) * 0.8,
    y * 0.6 - 0.1
  );

  // Particle size and rotation
  let size = (2.0 + seed * 6.0) * (1.0 - life * 0.5);
  let rot = elapsed * (5.0 + seed * 10.0);

  // Triangle vertices (particle shape)
  let corners = array<vec2f, 3>(
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5),
    vec2f(0.0, 0.5),
  );

  let c = corners[vi];
  let cosR = cos(rot);
  let sinR = sin(rot);
  let rotated = vec2f(
    c.x * cosR - c.y * sinR,
    c.x * sinR + c.y * cosR
  );

  let pixelSize = size * min(params.resolution.x, params.resolution.y) * 0.001;

  var output: VertexOutput;
  output.position = vec4f(
    ndc + rotated * pixelSize / params.resolution * 2.0,
    0.0,
    1.0
  );

  // FoodShare confetti colors (orange, coral, gold, red, white)
  let colors = array<vec3f, 5>(
    vec3f(1.0, 0.27, 0.0),
    vec3f(1.0, 0.39, 0.28),
    vec3f(1.0, 0.84, 0.0),
    vec3f(1.0, 0.27, 0.33),
    vec3f(1.0, 1.0, 1.0),
  );

  output.color = colors[i % 5u];
  output.fade = 1.0 - life;
  return output;
}

@fragment fn fs_main(
  @location(0) color: vec3f,
  @location(1) fade: f32,
) -> @location(0) vec4f {
  return vec4f(color * fade, fade * 0.9);
}
