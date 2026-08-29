// FloatingOrbs.wgsl — GPU-accelerated animated gradient orbs
// Replaces 5 Framer Motion blur circles with a single fullscreen fragment shader

struct Params {
  time: f32,
  scroll: f32,
  resolution: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

// Orb definition — 5 floating gradient circles
struct Orb {
  center: vec2f,
  radius: f32,
  color: vec3f,
  speed: f32,
  phase: f32,
}

fn orbSdf(p: vec2f, center: vec2f, radius: f32) -> f32 {
  return length(p - center) - radius;
}

fn softBlur(d: f32, softness: f32) -> f32 {
  return smoothstep(softness, 0.0, d);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * 0.3;
  let aspect = params.resolution.x / params.resolution.y;
  let p = vec2f(uv.x * aspect, uv.y);

  // 5 orbs with deterministic animated positions
  var orb0_center = vec2f(
    (0.72 + sin(t * 0.7) * 0.08) * aspect,
    0.15 + cos(t * 0.5) * 0.1
  );
  var orb1_center = vec2f(
    (0.23 + cos(t * 0.6) * 0.06) * aspect,
    0.48 + sin(t * 0.8) * 0.12
  );
  var orb2_center = vec2f(
    (0.85 + sin(t * 0.4) * 0.05) * aspect,
    0.78 + cos(t * 0.3) * 0.08
  );
  var orb3_center = vec2f(
    (0.45 + cos(t * 0.9) * 0.07) * aspect,
    0.32 + sin(t * 0.6) * 0.09
  );
  var orb4_center = vec2f(
    (0.10 + sin(t * 0.5) * 0.04) * aspect,
    0.65 + cos(t * 0.7) * 0.07
  );

  // Orb radii (in UV space, scaled by aspect)
  let r0 = 0.18 * aspect;
  let r1 = 0.22 * aspect;
  let r2 = 0.15 * aspect;
  let r3 = 0.20 * aspect;
  let r4 = 0.12 * aspect;

  // Orange-coral palette matching FoodShare brand
  let c0 = vec3f(1.0, 0.39, 0.28);   // #FF6347
  let c1 = vec3f(1.0, 0.65, 0.0);    // #FFA500
  let c2 = vec3f(1.0, 0.27, 0.33);   // #FF4455
  let c3 = vec3f(1.0, 0.55, 0.35);   // #FF8C59
  let c4 = vec3f(1.0, 0.45, 0.30);   // #FF734D

  // Compute SDF for each orb and accumulate
  let d0 = orbSdf(p, orb0_center, r0);
  let d1 = orbSdf(p, orb1_center, r1);
  let d2 = orbSdf(p, orb2_center, r2);
  let d3 = orbSdf(p, orb3_center, r3);
  let d4 = orbSdf(p, orb4_center, r4);

  // Soft glow accumulation (additive blending)
  let softness = 0.25;
  var color = vec3f(0.0);
  color += c0 * softBlur(d0, softness) * 0.15;
  color += c1 * softBlur(d1, softness) * 0.12;
  color += c2 * softBlur(d2, softness) * 0.18;
  color += c3 * softBlur(d3, softness) * 0.10;
  color += c4 * softBlur(d4, softness) * 0.14;

  // Scroll-responsive opacity fade at top
  let scrollFade = 1.0 - params.scroll * 0.5;

  return vec4f(color * scrollFade, 1.0);
}
