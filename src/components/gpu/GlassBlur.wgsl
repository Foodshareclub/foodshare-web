// GlassBlur.wgsl — GPU-accelerated glass morphism blur
// Replaces CSS backdrop-filter: blur() with a compute-style Gaussian blur

struct Params {
  resolution: vec2f,
  blurRadius: f32,
  saturation: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var<uniform> params: Params;

// 9-tap Gaussian kernel (optimized for GPU)
fn gaussianBlur(uv: vec2f, direction: vec2f) -> vec3f {
  let texelSize = 1.0 / params.resolution;

  // Gaussian weights (sigma ≈ 2.0)
  let w0 = 0.227027;
  let w1 = 0.1945946;
  let w2 = 0.1216216;
  let w3 = 0.054054;
  let w4 = 0.016216;

  var color = textureSampleLevel(src, texSampler, uv, 0.0).rgb * w0;

  let dir = direction * texelSize * params.blurRadius;
  color += textureSampleLevel(src, texSampler, uv + dir * 1.0, 0.0).rgb * w1;
  color += textureSampleLevel(src, texSampler, uv - dir * 1.0, 0.0).rgb * w1;
  color += textureSampleLevel(src, texSampler, uv + dir * 2.0, 0.0).rgb * w2;
  color += textureSampleLevel(src, texSampler, uv - dir * 2.0, 0.0).rgb * w2;
  color += textureSampleLevel(src, texSampler, uv + dir * 3.0, 0.0).rgb * w3;
  color += textureSampleLevel(src, texSampler, uv - dir * 3.0, 0.0).rgb * w3;
  color += textureSampleLevel(src, texSampler, uv + dir * 4.0, 0.0).rgb * w4;
  color += textureSampleLevel(src, texSampler, uv - dir * 4.0, 0.0).rgb * w4;

  return color;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Two-pass separable Gaussian (this is horizontal pass)
  let blurred = gaussianBlur(uv, vec2f(1.0, 0.0));

  // Apply saturation boost
  let luminance = dot(blurred, vec3f(0.299, 0.587, 0.114));
  let saturated = mix(vec3f(luminance), blurred, params.saturation);

  return vec4f(saturated, 1.0);
}
