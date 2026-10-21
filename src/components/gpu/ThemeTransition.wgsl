// ThemeTransition.wgsl — GPU radial wipe for theme transitions
// Replaces DOM overlay clip-path animation with a shader

struct Params {
  progress: f32,
  originX: f32,
  originY: f32,
  maxRadius: f32,
  isDark: f32,
  resolution: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Convert UV to pixel space for distance calculation
  let pixelX = uv.x * params.resolution.x;
  let pixelY = uv.y * params.resolution.y;

  let origin = vec2f(params.originX, params.originY);
  let point = vec2f(pixelX, pixelY);

  let dist = length(point - origin);
  let radius = params.maxRadius * params.progress;

  // Soft edge with anti-aliasing
  let edge = 2.0; // 2px soft edge
  let alpha = smoothstep(radius - edge, radius + edge, dist);

  // New theme color (dark or light)
  let newColor = mix(
    vec3f(1.0, 1.0, 1.0),  // light theme
    vec3f(0.012, 0.027, 0.071), // dark theme (#030712)
    params.isDark
  );

  // Fade out at the end
  let fadeOut = 1.0 - smoothstep(0.85, 1.0, params.progress);

  return vec4f(newColor, alpha * fadeOut);
}
