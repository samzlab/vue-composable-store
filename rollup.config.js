import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import filesize from 'rollup-plugin-filesize';

// @ts-ignore
import { peerDependencies } from './package.json'

const external = [ 'vue', ...Object.keys(peerDependencies) ];

/** @type {import('rollup').RollupOptions['output']} */
const output = {
    format: 'esm',
    dir: 'dist',
    entryFileNames: '[name]-[format].js'
};


/** @type {import('rollup').RollupOptions} */
const options = {
    input: 'src/index.ts',
    external,
    output,
    plugins: [
        nodeResolve(),
        typescript({
            include: 'src/**/*.ts'
        }),
        filesize()
    ]
};

export default [
	{
        ...options,
        output: {
            ...output,
            format: 'cjs'
        }
    },
    /** @type {import('rollup').RollupOptions} */
	{
		...options,
		output
	}
];