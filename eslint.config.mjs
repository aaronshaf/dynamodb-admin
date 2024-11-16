import base from 'eslint-config-rchl-base';
import typescript from 'eslint-config-rchl-typescript';

/** @type {import('eslint').Linter.Config[]} */
export default [
    ...base,
    ...typescript,
    {
        ignores: ['dist/', 'public/vendor/'],
    },
];
