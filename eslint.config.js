import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,     // <--- menambahkan semua global Node.js
        ...globals.browser,  // optional, kalau ada kode frontend
      },
    },
    plugins: { js },
    extends: ['js/recommended'],
    rules: {
      'object-curly-spacing': ['error', 'always'], // spasi di dalam kurawal
      'semi': ['error', 'always'],                // wajib titik koma
      'quotes': ['error', 'single'],             // pakai single quote
      'no-unused-vars': 'warn',                  // variabel tidak terpakai jadi warning
    },
  },
]);
