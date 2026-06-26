module.exports = {
  'frontend/**/*.{js,jsx,ts,tsx}': [
    'npm --prefix frontend exec prettier -- --write',
    'npm --prefix frontend exec eslint -- --fix --config frontend/eslint.config.mjs',
  ],

  'frontend/**/*.{json,css,md,mjs}': ['npm --prefix frontend exec prettier -- --write'],

  'backend/**/*.ts': [
    'npm --prefix backend exec prettier -- --write',
    'npm --prefix backend exec eslint -- --fix --config backend/eslint.config.mjs',
  ],

  'backend/**/*.js': ['npm --prefix backend exec prettier -- --write'],

  'backend/**/*.{json,md,mjs}': ['npm --prefix backend exec prettier -- --write'],
};