import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import strip from '@rollup/plugin-strip';
import filesize from 'rollup-plugin-filesize';

import { peerDependencies } from './package.json';

const external = [ 'vue', ...Object.keys(peerDependencies) ];

function getOptions(format, suffix = '', plugins = []) {
	/** @type {import('rollup').RollupOptions} */
	const options = {
		input: 'src/index.ts',
		external,
		output: {
			preserveModules: true,
			format,
			dir: 'dist',
			entryFileNames: `[name]${suffix}-[format].js`
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
	getOptions('cjs'),
	getOptions('esm', '', [ filesize() ]),
	getOptions('esm', '-prod', [ strip({ functions: [ 'assert' ], include: [ 'src/**/*.ts' ] }), filesize() ])
];