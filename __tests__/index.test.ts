import { createVueStore, defineStore, OnActionCallback, StorePlugin, useStore } from '../src/';
import { computed, createApp, nextTick, ref } from 'vue';

const body = document.body;
const hosts = { one: null, two: null };
body.appendChild(hosts.one = document.createElement('div'))
body.appendChild(hosts.two = document.createElement('div'))

const myStoreSetup = jest.fn(() => {
	const count = ref(0);

	function increment() {
		count.value++;
	}

	return {
		count,
		increment
	};
});

const myStore = defineStore('myStore', myStoreSetup);

describe('Plugin validations', () => {

    function buildApp(plugins1, plugins2 = {}) {
        return createApp(document.createElement('div')).use(createVueStore(plugins1), plugins2);
    }

    test('Should throw on invalid plugins option (string)', () => {
        expect(() => buildApp({ plugins: 'meh' })).toThrow('VueStore plugins must be an array');
    });

    test('Should throw on invalid plugin (string)', () => {
        expect(() => buildApp({ plugins: [ 'meh' ] })).toThrow('VueStorePlugin must be a function (instead of `string`)');
    });

    test('Should throw on invalid provided name/value', () => {
        const plugin = (provide) => provide();
        const plugin2 = (provide) => provide(' ');
        const plugin3 = (provide) => provide('kek');

        expect(() => buildApp({ plugins: [ plugin ] })).toThrow('VueStorePlugin names must be a valid string. Invalid name: undefined');
        expect(() => buildApp({}, { plugins: [ plugin ] })).toThrow('VueStorePlugin names must be a valid string. Invalid name: undefined');

        expect(() => buildApp({ plugins: [ plugin2 ] })).toThrow('VueStorePlugin names must be a valid string. Invalid name: " "');

        expect(() => buildApp({ plugins: [ plugin3 ] })).toThrow('VueStorePlugin (kek) does not provided anything');
    });

});

describe('Basic store functionality', () => {

	let exposedStore;
	const app = createApp({
		render(ctx) {
			return `count: ${ctx.count}`;
		},
		setup() {
			exposedStore = useStore(myStore);

			return {
				count: exposedStore.count
			}
		}
	});

	// @ts-expect-error
	const installer = jest.fn(createVueStore());

	app.use(installer);

	test('created store should have installed', () => {
		expect(installer).toBeCalled();
	});

	test('defined store should be initialized after useStore', () => {
		app.mount(hosts.one);
		expect(myStoreSetup).toBeCalled();
	});

	test('store value should be visible in component', async() => {
		await nextTick();
		expect(hosts.one.textContent).toEqual('count: 0');
	});

	test('mutated store value should be updated in the component', async() => {
		exposedStore.increment();
		await nextTick();
		expect(hosts.one.textContent).toEqual('count: 1');
	});

});


describe('Validations', () => {

	test('should throw on invalid store definition in useStore()', () => {
        // @ts-ignore
		expect(() => useStore({})).toThrow('useStore: invalid store definition');
    });

    test('should throw on invalid store definition in defineStore()', () => {
        // @ts-ignore
        expect(() => defineStore() ).toThrow('defineStore: invalid store definition');
        // @ts-ignore
        expect(() => defineStore(false) ).toThrow('defineStore: invalid store definition');
        // @ts-ignore
        expect(() => defineStore(false, null) ).toThrow('defineStore: invalid store definition');
    });

});

describe('Store composition and multi-app, plugins', () => {

	const composedStore = defineStore('composed', ({ use, prefix }) => {
		// TODO: improve type return on useStore
		// @ts-ignore
		const { count } = use(myStore);

		const plusOne = computed(() => `${prefix()} ${count.value + 1}`);

		return {
			plusOne
		}
	});

	const plugin = jest.fn((provide) => {
		provide('prefix', () => '+ 1 =');
	});

	let exposedStore;
	createApp({
		render(ctx) {
			return `count: ${ctx.count} ${ctx.plusOne}`;
		},
		setup() {
			// @ts-ignore
			const { count } = exposedStore = useStore(myStore);

			// @ts-ignore
			const { plusOne } = useStore(composedStore);

			return {
				count,
				plusOne
			};
		}
	}).use(createVueStore({
		plugins: [ plugin ]
	})).mount(hosts.two);

	test('plugin should be added', () => {
		expect(plugin).toBeCalled();
	});

	test('should initialize the store in the new app context', () => {
		expect(exposedStore).toHaveProperty(['count', 'value'], 0);
	});

	// ALL-IN :D
	test('composed store values should be visible in the component', async() => {
		await nextTick();
		expect(hosts.two.textContent).toEqual('count: 0 + 1 = 1');
	});

	test('mutated store should trigger updates in the composed store', async() => {
		exposedStore.increment();
		await nextTick();
		expect(hosts.two.textContent).toEqual('count: 1 + 1 = 2');
	});

	test('common store should be initialized two times (for each app)', () => {
		expect(myStoreSetup).toBeCalledTimes(2);
	});


});


function createHost() {
    return document.createElement('div');
}

describe('plugin system', () => {

    const onInitCallback = jest.fn((name, instance, context) => {});
    const onUseCallback = jest.fn((name, instance, context) => {});
    const onActionCallback = jest.fn((name, instance, action, args, result, context) => {});
    const onMutateCallback = jest.fn((name, instance, key, value, old, context) => {});

    const mockedAction = jest.fn(( a: string, b: string, c: number ) => { return 'd' });

    const plugin: StorePlugin = (provide, { onInitialized, onUse, onAction, onMutate }) => {
        onInitialized(onInitCallback);
        onUse(onUseCallback);
        onAction(onActionCallback);
        onMutate(onMutateCallback);
    };

    const testStore = defineStore('test', () => {
        return {
            status: ref(null),
            moo: mockedAction
        };
    });

    const compoundStore = defineStore('compound', ({ use }) => {
        const test = use(testStore);
        test.status.value = 'success';
        test.moo('a', 'b', 'c');
        return {};
    });

    let exposedTestStore;
    const app = createApp({
        setup() {
            exposedTestStore = useStore(testStore); // <-- "test" onInit.
            useStore(compoundStore);                // <-- "compound" onInit. (+"test" onUse)

            return () => '';
        }
    }).use(createVueStore({
        plugins: [ plugin ]
    })).mount(createHost());

    test('should call onInitialize on useStore()', () => {
        expect(onInitCallback).toBeCalledWith('test', expect.anything(), expect.anything());
    });

    test('should not call onInitialize twice for the same store', () => {
        expect(onInitCallback).toBeCalledWith('compound', expect.anything(), expect.anything());
        expect(onInitCallback).toBeCalledTimes(2);
    });

    test('should call onUse when reused', () => {
        expect(onUseCallback).toBeCalledTimes(1);
    });

    test('should call onAction when a store function invoked', () => {
        expect(onActionCallback).toBeCalledWith('test', expect.anything(), 'moo', ['a', 'b', 'c'], 'd', expect.anything());
    });

    test('should call onMutate only once when a store property mutated', () => {
        expect(onMutateCallback).toBeCalledWith('test', expect.anything(), 'status', 'success', null, expect.anything());
        expect(onMutateCallback).toBeCalledTimes(1);
    });

});