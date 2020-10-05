import { createVueStore, defineStore, useStore } from '../src/index';
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

    test('Should throw on invalid plugins option (string)', () => {
        expect(() => createVueStore({
            // @ts-ignore
            plugins: 'meh'
        })).toThrow('`createVueStore`: `options.plugins` must be an `Array`');
    });

    test('Should throw on invalid plugin (string)', () => {
        expect(() => createVueStore({
            // @ts-ignore
            plugins: [ 'meh' ]
        })).toThrow('VueStorePlugin must be a function (instead of `string`)');
    });

    test('Should throw on invalid provided name/value', () => {
        const plugin = (provide) => provide();
        const plugin2 = (provide) => provide(' ');
        const plugin3 = (provide) => provide('kek');

        expect(() => createVueStore({
            // @ts-ignore
            plugins: [plugin]
        })).toThrow('VueStorePlugin names must be a valid string. Invalid name: undefined');

        expect(() => createVueStore({
            // @ts-ignore
            plugins: [plugin2]
        })).toThrow('VueStorePlugin names must be a valid string. Invalid name: " "');

        expect(() => createVueStore({
            // @ts-ignore
            plugins: [plugin3]
        })).toThrow('VueStorePlugin (kek) does not provided anything');
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