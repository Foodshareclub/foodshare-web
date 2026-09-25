/** Real GPU regression check: decorative shaders must preserve premultiplied transparency. */
import { readFile } from "node:fs/promises";
import { effect, init, target } from "vgpu/node";

const gpu = await init();
try {
  const size = [160, 90] as const;
  const output = target(gpu, { size, format: "rgba8unorm" });
  for (const name of ["FloatingOrbs", "GradientBackground"]) {
    const source = await readFile(
      new URL(`../src/components/gpu/${name}.wgsl`, import.meta.url),
      "utf8"
    );
    const background = effect(gpu, source, {
      set: { params: { time: 0, scroll: 0, resolution: size } },
    });
    await background.compile(output);
    const frames: Uint8Array[] = [];
    for (const time of [0, 6]) {
      background.set({ params: { time } });
      background.draw(output);
      const pixels = await output.read();
      let maxAlpha = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        maxAlpha = Math.max(maxAlpha, alpha);
        if (
          alpha === 255 ||
          Math.max(pixels[index], pixels[index + 1], pixels[index + 2]) > alpha + 1
        ) {
          throw new Error(`${name}: expected transparent premultiplied pixels at ${index / 4}`);
        }
      }
      if (!maxAlpha) throw new Error(`${name}: the entire effect is invisible`);
      frames.push(pixels);
    }
    if (!frames[0].some((value, index) => value !== frames[1][index]))
      throw new Error(`${name}: animation is frozen`);
    background.set({ params: { scroll: 10 } });
    background.draw(output);
    if ((await output.read()).some((value) => value !== 0))
      throw new Error(`${name}: scroll fade must become transparent`);
    console.log(`${name}: rendered two frames; transparency, animation, and scroll fade passed`);
  }
} finally {
  gpu.dispose();
}
