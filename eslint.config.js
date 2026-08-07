// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message:
            'Do not assign or mock global fetch in tests. Use MSW (server.use) to intercept requests at the network level.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name='stubGlobal']",
          message:
            'vi.stubGlobal is banned in tests. Use MSW to intercept network requests.',
        },
        {
          selector:
            "CallExpression[callee.object.name='vi'][callee.property.name='mock']",
          message:
            'vi.mock() is banned — do not mock internal modules. Use MSW for network boundaries and in-memory stores at infrastructure edges.',
        },
        {
          selector: "CallExpression[callee.property.name='mockResolvedValue']",
          message:
            'mockResolvedValue is banned in tests. Use MSW handlers to control responses instead of mocking functions.',
        },
        {
          selector: "CallExpression[callee.property.name='mockResolvedValueOnce']",
          message:
            'mockResolvedValueOnce is banned in tests. Use MSW server.use() for per-test response overrides.',
        },
        {
          selector: "CallExpression[callee.property.name='mockRejectedValue']",
          message:
            'mockRejectedValue is banned in tests. Use MSW to return error responses (e.g. HttpResponse.error()).',
        },
        {
          selector: "CallExpression[callee.property.name='mockRejectedValueOnce']",
          message:
            'mockRejectedValueOnce is banned in tests. Use MSW to return error responses.',
        },
        {
          selector: "CallExpression[callee.property.name='mockImplementation']",
          message:
            'mockImplementation is banned in tests. Use MSW handlers instead of reimplementing fetch behavior.',
        },
        {
          selector:
            "CallExpression[callee.property.name='mockImplementationOnce']",
          message:
            'mockImplementationOnce is banned in tests. Use MSW handlers instead of reimplementing fetch behavior.',
        },
        {
          selector: "CallExpression[callee.property.name='mockReturnValue']",
          message:
            'mockReturnValue is banned in tests. Use real implementations or MSW for network boundaries.',
        },
        {
          selector: "CallExpression[callee.property.name='mockReturnValueOnce']",
          message:
            'mockReturnValueOnce is banned in tests. Use real implementations or MSW for network boundaries.',
        },
        {
          selector:
            "MemberExpression[object.name='global'][property.name='fetch']",
          message:
            'Do not assign global.fetch in tests. Use MSW (server.use) to intercept requests.',
        },
      ],
    },
  },
]);
