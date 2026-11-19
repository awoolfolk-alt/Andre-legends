// PostCSS runs over our CSS during the build.
// tailwindcss turns classes like flex and text-6xl into real CSS.
// autoprefixer adds browser-specific versions of CSS rules so styles work everywhere.
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
