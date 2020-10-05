import { inject, Plugin } from 'vue';

function assert(valid: boolean, error: string): void {
	if (!valid) throw new Error(error);
}

const VueStoreSymbol = Symbol();

type storeContext = { [plugin: string]: any };
type StoreSetupFunction = (context: storeContext) => object
type StoreDefinition = { name: string, setup: StoreSetupFunction };
type VueStoreInstance = { stores: { [name: string]: object }, context: storeContext };

function validateStoreDefinition({ name = '', setup = null }: StoreDefinition, fnName: string): void {
    assert(typeof name === 'string' && name.length > 0 && typeof setup === 'function', `${fnName}: invalid store definition`);
}

export function defineStore(name: string, setup: StoreSetupFunction): StoreDefinition {
    const def = { name, setup };
    validateStoreDefinition(def, 'defineStore');
	return def;
}

function registerStore(instance: VueStoreInstance, { name, setup }: StoreDefinition) {
	const { stores, context } = instance;

	if (typeof stores[name] === 'undefined') {
		stores[name] = setup(context);
	}

	return stores[name];
}

export function useStore(storeDefinition: StoreDefinition) {
    validateStoreDefinition(storeDefinition, 'useStore');
	return registerStore(inject(VueStoreSymbol), storeDefinition);
}

type StorePluginInstaller = (pluginName: string, plugin: Function) => void;
type StorePluginProvider = (provide: StorePluginInstaller) => void;

interface StoreOptions {
	plugins?: StorePluginProvider[]
};

export function createVueStore(options1: StoreOptions = {}): Plugin {
	return (app, options2: StoreOptions = {}): void => {
        const { plugins } = { plugins: [], ...options1, ...options2 } as StoreOptions;

        const instance: VueStoreInstance = {
            stores: {},
            context: {
                use: (storeDefinition: StoreDefinition) => registerStore(instance, storeDefinition)
            }
        };

        assert(plugins instanceof Array, 'VueStore plugins must be an array');

        if (plugins.length) {

            function installer(pluginName: string, plugin: any): void {
                assert(typeof pluginName === 'string' && pluginName.trim().length > 0, `VueStorePlugin names must be a valid string. Invalid name: ${JSON.stringify(pluginName)}`);
                assert(typeof instance.context[pluginName] === 'undefined', `VueStorePlugin names must be unique. Duplicate name: "${pluginName}"`);
                assert(typeof plugin !== 'undefined', `VueStorePlugin (${pluginName}) does not provided anything`);

                instance.context[pluginName] = plugin;
            }

            for (let i = 0, len = plugins.length; i < len; i++) {
                assert(typeof plugins[i] === 'function', `VueStorePlugin must be a function (instead of \`${typeof plugins[i]}\`)`);

                plugins[i](installer);
            }
        }

		app.provide(VueStoreSymbol, instance);
	};
}