import { inject, Plugin, isReactive, isRef, watch } from 'vue';

function assert(valid: boolean, error: string): void {
	if (!valid) { throw new Error(error); }
}

const
	VueStoreSymbol = Symbol(),
	// utils, shortcuts
	isFunction = (val: unknown): boolean => typeof val === 'function',
	isUndef = (val: unknown): boolean => typeof val === 'undefined';

export type StoreInstance = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export interface StoreDefinition<T> {
    name: string,
    // eslint-disable-next-line no-use-before-define
    setup: StoreSetupFunction<T>
}

export interface StoreContext {
    [pluginName: string]: unknown
}

export interface StoreSetupFunction<T extends StoreInstance> {
    (context: StoreContext): T
}

export type OnUseCallback = (storeName: string, storeInstance: StoreInstance, context: StoreContext) => void;
export type OnActionCallback = (storeName: string, storeInstance: StoreInstance, actionName: string, args: unknown[], result: unknown, context: StoreContext) => void;
export type OnMutateCallback = (storeName: string, storeInstance: StoreInstance, stateKey: string, value: unknown, oldValue: unknown, context: StoreContext) => void;

export type StorePluginHooks = {
    onInitialized: (callback: OnUseCallback) => void,
    onUse: (callback: OnUseCallback) => void,
    onAction: (callback: OnActionCallback) => void,
    onMutate: (callback: OnMutateCallback) => void
};

export type StorePluginProvider = (pluginName: string, dataOrFunction: unknown) => void;
export type StorePlugin = (provide: StorePluginProvider, hooks: StorePluginHooks) => void;

export interface StoreOptions {
	plugins?: StorePlugin[]
}

export type VueStoreInstance = {
    stores: { [name: string]: StoreInstance },
    context: StoreContext,
    listeners: {
        use: OnUseCallback[]
        init: OnUseCallback[]
        action: OnActionCallback[],
        mutate: OnMutateCallback[]
    }
};

function validateStoreDefinition<T>({ name = '', setup = null }: StoreDefinition<T>, fnName: string): void {
	assert(typeof name === 'string' && name.length > 0 && isFunction(setup), `${fnName}: invalid store definition`);
}

export function defineStore<T extends StoreInstance>(name: string, setup: StoreSetupFunction<T>): StoreDefinition<T> {
	const def = { name, setup };
	validateStoreDefinition(def, 'defineStore');
	return def;
}


// eslint-disable-next-line @typescript-eslint/ban-types
function callListeners(listeners: Function[], ...params): void {
	for (let i = 0, len = listeners.length; i < len; i++) {
		listeners[i](...params);
	}
}

type arrowFn = (...args) => never;

// eslint-disable-next-line @typescript-eslint/ban-types
const wrapAction = <T extends arrowFn>(fn: T, listeners: Function[], name: string, store: StoreInstance, key: string, context: StoreContext) => {
	return (...args: Parameters<T>): ReturnType<T> => {
		const result = fn(...args);
		callListeners(listeners, name, store, key, args, result, context);
		return result;
	};
};

function registerStore<T>(instance: VueStoreInstance, { name, setup }: StoreDefinition<T>): T {

	const { stores, context, listeners } = instance;

	let hook = 'use';

	if (isUndef(stores[name])) {
		const store = setup(context);

		const hasActionListeners = listeners.action.length > 0;
		const hasMutateListeners = listeners.mutate.length > 0;

		hook = 'init';

		for (const key in store) {
			if (hasActionListeners && isFunction(store[key])) {
				store[key as string] = wrapAction(store[key as string], listeners.action, name, store, key, context);
			}

			if (hasMutateListeners && (isReactive(store[key]) || isRef(store[key]))) {
				watch(store[key as string], (value, oldValue) => {
					callListeners(listeners.mutate, name, stores[name], key, value, oldValue, context);
				});
			}
		}

		stores[name] = store;
	}

	callListeners(listeners[hook], name, stores[name], context);

	return stores[name] as T;
}


export function useStore<T>(storeDefinition: StoreDefinition<T>): T {
	validateStoreDefinition(storeDefinition, 'useStore');

	return registerStore(inject(VueStoreSymbol) as VueStoreInstance, storeDefinition);
}

export function createVueStore(options1: StoreOptions = {}): Plugin {
	const install = (app, options2: StoreOptions = {}): void => {
		const { plugins } = { plugins: [], ...options1, ...options2 } as StoreOptions;

		const
			use: OnUseCallback[] = [],
			init: OnUseCallback[] = [],
			action: OnActionCallback[] = [],
			mutate: OnMutateCallback[] = [];

		const instance: VueStoreInstance = {
			stores: {},
			context: {},
			listeners: { use, init, action, mutate }
		};

		assert(plugins instanceof Array, 'VueStore plugins must be an array');

		if (plugins.length) {

			const addToContext: StorePluginProvider = (pluginName: string, data: unknown): void => {
				assert(typeof pluginName === 'string' && pluginName.trim().length > 0, `VueStorePlugin names must be a valid string. Invalid name: ${JSON.stringify(pluginName)}`);
				assert(isUndef(instance.context[pluginName]), `VueStorePlugin names must be unique. Duplicate name: "${pluginName}"`);
				assert(!isUndef(data), `VueStorePlugin (${pluginName}) does not provided anything`);

				instance.context[pluginName] = data;
			};

			const hooks: StorePluginHooks = {
				onInitialized: init.push.bind(init),
				onUse: use.push.bind(use),
				onAction: action.push.bind(action),
				onMutate: mutate.push.bind(mutate)
			};

			for (let i = 0, len = plugins.length; i < len; i++) {
				assert(isFunction(plugins[i]), `VueStorePlugin must be a function (instead of \`${typeof plugins[i]}\`)`);

				plugins[i](addToContext, hooks);
			}
		}

		app.provide(VueStoreSymbol, instance);
	};

	return {
		install
	};
}