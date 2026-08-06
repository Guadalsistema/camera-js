export default {
  languageOptions: {
    ecmaVersion: 2022,
    globals: {
      Blob: 'readonly',
      DOMException: 'readonly',
      HTMLMediaElement: 'readonly',
      cancelAnimationFrame: 'readonly',
      clearTimeout: 'readonly',
      document: 'readonly',
      navigator: 'readonly',
      requestAnimationFrame: 'readonly',
      setTimeout: 'readonly'
    }
  },
  rules: {
    'no-unused-vars': 'error',
    'no-undef': 'error'
  },
  ignores: ['node_modules/', 'dist/']
};
