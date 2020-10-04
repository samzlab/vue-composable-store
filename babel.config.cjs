// used by Jest for tests written in ESM/TS
module.exports = {
	presets: [
		[ '@babel/preset-env', { targets: { node: 'current' } } ],
		'@babel/preset-typescript'
	]
};