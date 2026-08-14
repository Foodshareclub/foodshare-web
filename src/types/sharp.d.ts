// Type declaration fallback for sharp 0.35.0 package.json export map issue under moduleResolution: bundler
declare module "sharp" {
  import sharp from "sharp/lib/index";
  export = sharp;
}
