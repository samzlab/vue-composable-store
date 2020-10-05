import { inject } from 'vue';
function assert(valid, error) {
    if (!valid)
        throw new Error(error);
}
const VueStoreSymbol = Symbol();
export function defineStore(name, setup) {
    return {
        name,
        setup
    };
}
function registerStore(instance, { name, setup }) {
    const { stores, context } = instance;
    if (typeof stores[name] === 'undefined') {
        stores[name] = setup(context);
    }
    return stores[name];
}
export function useStore(storeDefinition) {
    const vueStore = inject(VueStoreSymbol);
    return registerStore(vueStore, storeDefinition);
}
;
export function createVueStore({ plugins = null } = {}) {
    const instance = {
        stores: {},
        context: {
            use: (storeDefinition) => registerStore(instance, storeDefinition)
        }
    };
    if (plugins) {
        assert(plugins instanceof Array, '`createVueStore`: `options.plugins` must be an `Array`');
        function installer(pluginName, plugin) {
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
