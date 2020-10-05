import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import filesize from 'rollup-plugin-filesize';

// @ts-ignore
import { peerDependencies } from './package.json'

const external = [ 'vue', ...Object.keys(peerDependencies) ];

function getOptions(format, plugins = []) {
    /** @type {import('rollup').RollupOptions} */
    const options = {
        input: 'src/index.ts',
        external,
        output: {
            format,
            dir: 'dist',
            entryFileNames: '[name]-[format].js'
        },
        plugins: [
            nodeResolve(),
            typescript({
                include: 'src/**/*.ts'
            }),
            ...plugins
        ]
    };

    return options;
}

export default [
    getOptions('cjs', [ filesize() ]),
    getOptions('esm')
];