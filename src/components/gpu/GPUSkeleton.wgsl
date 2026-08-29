// GPUSkeleton.wgsl — Animated loading skeleton shimmer
// GPU-accelerated shimmer effect for loading states

struct Params {
  time: f32,
  resolution: vec2f,
  borderRadius: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let t = params.time * 1.5;

  // Diagonal shimmer wave
  let wave = sin((uv.x + uv.y) * 3.14159 * 2.0 + t) * 0.5 + 0.5;

  // Soft edge glow
  let edge = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);

  // Base skeleton color (gray-200 light / gray-800 dark)
  let baseColor = vec3f(0.91, 0.91, 0.91);
  let shimmerColor = vec3f(0.96, 0.96, 0.96);

  let color = mix(baseColor, shimmerColor, wave * edge * 0.6);

  return vec4f(color, 1.0);
}
