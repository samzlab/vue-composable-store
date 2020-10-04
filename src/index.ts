import { inject, Plugin } from 'vue';

function assert(valid: boolean, error: string): void {
	if (!valid) throw new Error(error);
}

// exported only for tests
export const VueStoreSymbol = Symbol.for('VueStore');

type storeContext = { [plugin: string]: any };
type StoreSetupFunction = (context: storeContext) => object
type StoreDefinition = { name: string, setup: StoreSetupFunction };
type VueStoreInstance = { stores: { [name: string]: object }, context: storeContext };

export function defineStore(name: string, setup: StoreSetupFunction): StoreDefinition {
	return {
		name,
		setup
	};
}

function registerStore(instance: VueStoreInstance, { name, setup }: StoreDefinition) {
	const { stores, context } = instance;

	if (typeof stores[name] === 'undefined') {
		stores[name] = setup(context);
	}

	return stores[name];
}

export function useStore(storeDefinition: StoreDefinition) {
	const vueStore: VueStoreInstance = inject(VueStoreSymbol);
	return registerStore(vueStore, storeDefinition);
}

type StorePluginInstaller = (pluginName: string, plugin: Function) => void;
type StorePluginProvider = (provide: StorePluginInstaller) => void;

interface StoreOptions {
	plugins?: StorePluginProvider[]
};

export function createVueStore({ plugins = null }: StoreOptions = {}): Plugin {
	const instance: VueStoreInstance = {
		stores: {},
		context: {
			use: (storeDefinition: StoreDefinition) => registerStore(instance, storeDefinition)
		}
	};

	if (plugins) {
		assert(plugins instanceof Array, '`createVueStore`: `options.plugins` must be an `Array`');

		function installer(pluginName: string, plugin: Function): void {
			assert(typeof instance.context[pluginName] === 'undefined', `VueStorePlugin names must be unique. Duplicate name: ${pluginName}`);
			instance.context[pluginName] = plugin;
		}

		for (let i = 0, len = plugins.length; i < len; i++) {
			assert(typeof plugins[i] === 'function', `VueStorePlugin must be a function (instead of \`${typeof plugins[i]}\`)`);

			plugins[i](installer);
		}
	}

	return (app) => {
		app.provide(VueStoreSymbol, instance);
	};
}