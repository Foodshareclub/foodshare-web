// GradientBackground.wgsl — Animated gradient that flows with time
// Replaces CSS background-size: 400% 400% animation with a GPU shader

struct Params {
  time: f32,
  scroll: f32,
  resolution: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * 0.15;

  // Animated diagonal gradient
  let angle = t * 0.5;
  let dir = vec2f(cos(angle), sin(angle));

  // Scroll-responsive parallax offset
  let scrollOffset = params.scroll * 0.5;

  // Gradient computation — 3-stop FoodShare brand gradient
  let p = uv + dir * 0.2 + vec2f(0.0, scrollOffset);

  // Soft noise-like variation using sin combinations
  let noise = sin(p.x * 6.28 + t) * cos(p.y * 6.28 - t * 0.7) * 0.5 + 0.5;

  // FoodShare orange-coral palette
  let color1 = vec3f(1.0, 0.27, 0.0);   // Deep orange
  let color2 = vec3f(1.0, 0.65, 0.0);   // Amber
  let color3 = vec3f(1.0, 0.27, 0.33);   // Coral

  let blend1 = smoothstep(0.0, 1.0, uv.x + sin(t) * 0.3);
  let blend2 = smoothstep(0.0, 1.0, uv.y + cos(t * 0.8) * 0.3);

  var color = mix(color1, color2, blend1);
  color = mix(color, color3, blend2 * 0.5);

  // Very subtle — low alpha for background use
  let alpha = 0.03 + noise * 0.015;

  // Scroll fade
  let scrollFade = 1.0 - params.scroll * 0.3;

  return vec4f(color * alpha * scrollFade, 1.0);
}
