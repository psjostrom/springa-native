import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { reactNative } from 'vitest-native';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [reactNative({ platform: 'android' })],
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      '@react-native-community/datetimepicker': path.join(
        root,
        'src/test/DateTimePickerTestDouble.tsx',
      ),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/msw/setup.ts'],
  },
});
