// HeroParticles.wgsl — Ambient floating particles for hero sections
// Replaces Framer Motion particle arrays with instanced GPU rendering

struct Params {
  time: f32,
  scroll: f32,
  resolution: vec2f,
  particleCount: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) alpha: f32,
  @location(1) color: vec3f,
}

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
  let seed3 = hash(vec2f(f32(i) * 91.1234, f32(i) * 23.5678));

  let t = params.time;

  // Base position from seed (distributed across viewport)
  let baseX = seed;
  let baseY = seed2;

  // Gentle floating motion
  let floatX = sin(t * (0.3 + seed * 0.4) + seed * 6.28) * 0.05;
  let floatY = cos(t * (0.2 + seed2 * 0.3) + seed2 * 6.28) * 0.08;

  // Scroll parallax (particles drift with scroll)
  let parallax = (1.0 - seed3) * params.scroll * 0.3;

  let x = (baseX + floatX) * 2.0 - 1.0;
  let y = (baseY + floatY - parallax) * 2.0 - 1.0;

  // Size varies by seed, shrinks with distance from center
  let distFromCenter = length(vec2f(x, y));
  let size = (1.5 + seed * 3.0) * (1.0 - distFromCenter * 0.3);
  let pixelSize = size * min(params.resolution.x, params.resolution.y) * 0.0008;

  // Triangle particle shape
  let corners = array<vec2f, 3>(
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5),
    vec2f(0.0, 0.5),
  );

  let c = corners[vi];
  let rot = t * (1.0 + seed * 2.0);
  let cosR = cos(rot);
  let sinR = sin(rot);
  let rotated = vec2f(c.x * cosR - c.y * sinR, c.x * sinR + c.y * cosR);

  var output: VertexOutput;
  output.position = vec4f(
    vec2f(x, y) + rotated * pixelSize / params.resolution * 2.0,
    0.0,
    1.0
  );

  // Pulsing alpha
  let pulse = sin(t * (1.5 + seed) + seed * 6.28) * 0.3 + 0.7;
  output.alpha = pulse * (1.0 - distFromCenter * 0.5);

  // FoodShare warm palette
  let colors = array<vec3f, 4>(
    vec3f(1.0, 0.27, 0.0),   // Orange
    vec3f(1.0, 0.65, 0.0),   // Gold
    vec3f(1.0, 0.39, 0.28),  // Coral
    vec3f(1.0, 0.84, 0.0),   // Amber
  );
  output.color = colors[i % 4u];

  return output;
}

@fragment fn fs_main(
  @location(0) alpha: f32,
  @location(1) color: vec3f,
) -> @location(0) vec4f {
  return vec4f(color, alpha * 0.6);
}
