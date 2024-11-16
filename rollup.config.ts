import { defineConfig } from 'rollup';
import commonJS from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import bundleESM from 'rollup-plugin-bundle-esm';

export default defineConfig({
    input: {
        'dynamodb-admin': 'bin/dynamodb-admin.ts',
        backend: 'lib/backend.ts',
    },
    output: [
        {
            banner: '#!/usr/bin/env node',
            dir: 'dist',
            entryFileNames: '[name].js',
            format: 'cjs',
            generatedCode: 'es2015',
        },
    ],
    plugins: [
        commonJS(),
        nodeResolve({ preferBuiltins: true }),
        bundleESM(),
        typescript(),
    ],
});
