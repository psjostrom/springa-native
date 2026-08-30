import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { reactNative } from 'vitest-native';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [reactNative({ platform: 'android' })],
  resolve: {
    alias: [
      {
        find: /^expo-router$/,
        replacement: path.join(root, 'src/test/ExpoRouterTestDouble.tsx'),
      },
      {
        find: /^@expo\/ui\/jetpack-compose$/,
        replacement: path.join(root, 'src/test/ExpoUiTestDouble.tsx'),
      },
      {
        find: /^@expo\/ui\/swift-ui\/modifiers$/,
        replacement: path.join(root, 'src/test/ExpoUiTestDouble.tsx'),
      },
      { find: /^@expo\/ui$/, replacement: path.join(root, 'src/test/ExpoUiTestDouble.tsx') },
      {
        find: '@react-native-community/datetimepicker',
        replacement: path.join(root, 'src/test/DateTimePickerTestDouble.tsx'),
      },
      { find: '@', replacement: path.join(root, 'src') },
    ],
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx,mjs}'],
    setupFiles: ['./src/test/msw/setup.ts'],
  },
});
