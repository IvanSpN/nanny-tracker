module.exports = {
  'frontend/**/*.{js,jsx,ts,tsx}': [
    'npm --prefix frontend exec prettier -- --write',
    'npm --prefix frontend exec eslint -- --fix --config frontend/eslint.config.mjs',
  ],
  'frontend/**/*.{json,css,md,mjs}': ['npm --prefix frontend exec prettier -- --write'],
};