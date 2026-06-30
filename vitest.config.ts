import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import tsconfigPaths from 'vitest-tsconfig-paths';

export default defineConfig({
    test: {
        globals: true,
        root: './',
        environment: 'node',
    },
    plugins: [
        tsconfigPaths(),
        swc.vite({
            module: { type: 'es6' },
        }),
    ],
});