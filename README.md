[![npm](https://img.shields.io/npm/v/vue-composable-store)](https://www.npmjs.com/package/vue-composable-store) ![downloads](https://img.shields.io/npm/dm/vue-composable-store) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)![coverage](./coverage/badge.svg) [![Coverage badge](https://img.shields.io/npm/l/make-coverage-badge.svg)](https://github.com/samzlab/tailwind-hsluv/blob/master/LICENSE)

# Vue composable store

The original idea was [spoilered in a video](https://www.youtube.com/watch?v=ajGglyQQD0k) about Vuex 5 draft by the maker (Kia King Ishii). I never liked the current syntax, but this new API made me to want to use it ASAP. So I started to implement it, for fun and for internal use in some hobby project.

> It's not supposed to be a replacement of Vuex. It's just a fun project for me.

Currently its pretty lightweight: **1.26 KB minified** (625 byte Gzipped) - *with stripped asserts*

It's supports plugins, app-scoped stores and TypeScript.



> **Do NOT use it in production** environment. It's under continuous refactor, and as soon as Vuex 5 released it's will be useless anyway.



## Peer dependencies

* Vue 3.0 or higher



## Installation

```
npm i vue-composable-store
```



> **NOTE:** There is a "hidden" production build in the dist folder which is ~30% smaller due to stripped asserts.
>
> ```js
> import { createVueStore } from 'vue-composable-store/dist/index-prod-es.js';
> ```



## Usage

>  **The Options API not supported!**

# defineStore() - the way you define your store

```js
import { readonly, reactive, ref, computed } from 'vue';
import { defineStore } from 'vue-store';

export default defineStore('shop', () => {
    // state
    const list = reactive([]);
    const page = ref(1);
    const limit = ref(20);
    
    // actions
    const hasNext = computed(() => {
        return list.length === limit;
    });  
    
    async function load(page) {
        // ...fetch data into `list`...
        page.value = page;
    }
    
    // final store object
    return {
        hasNext,
        list: readonly(list), // <---- in case you do not want it to be modifiable from outside
        page, 
        load
    };
});
```

## use() - the way you compose stores (replacement for store modules)

```js
import { readonly, reactive, ref, computed } from 'vue';
import { defineStore } from 'vue-store';

// imported just in the component which using the store,
// so it's can be properly code-splitted/tree-shaken, etc
import cartStore from './stores/cart';

export default defineStore('shop', ({ use }) => {
    // state
    const products = reactive([]);
    
    async function load(page) {
        // ...fetch data into `list`...
        page.value = page;
    }
    
    // final store object
    return {
        cart: use(cartStore), // <--- store composition instead of store modules
        products,
        load
    };
});
```



## useStore() - the way you access your store in components

```js
import { defineComponent } from 'vue';
import { useStore } from 'vue-composable-store';
import productsStore from './stores/products';

export default defineComponent({
    name: 'ProductList',
    setup() {
        // the store lazy initialized on the first use
        const { load, list, hasNext } = useStore(productsStore); 
        
        load(1);
        
        return {
            list, 
            hexNext
        };
    }
});
```



## createStore() - how you connect it to your app

```js
import { createApp } from 'vue';
import { createVueStore } from 'vue-composable-store';
import App from './App.vue';

const store = createVueStore();

const app = createApp(App);
app.use(store);
app.mount('#el');
```



# Plugins

> Plugins was not really explained in the video (outside of the provide function) so the hooks bellow are my own implementation and will be different in Vuex 5

### Providing your plugin

Plugins can provide utility function or data object to be exposed in the `storeContext`. 

```js
// api-plugin.js
export default (provide) => {
    provide('api', (uri) => fetch(`https://localhost:5000/${uri}`));
}


// app.js
import { createApp } from 'vue';
import { createVueStore } from 'vue-composable-store';
import apiPlugin from './api-plugin.js';
import App from './App.vue';

const options = { plugins: [ apiPlugin ] };
const vueStore = createVueStore(options);
const app = createApp(App);
app.use(vueStore); 
// optionally you can pass the `options` at the app.use() too
// in this case the plugin list will be overridden
// app.use(vueStore, options)


// my-store.js
export default defineStore(('my-store', ({ api }) => { // <-- `api` in the context
    // you can use your api() plugin here... 
    return {};
}));
```



### Hooks

The usable hooks are passed in the second argument of the plugin.

```js
// my-plugin.js
export default function myPlugin(provide, hooks) => { /* plugin code */};
```

The first two arguments passed to the callback functions are always:

* The `name` of the store which triggered the callback
* The `storeInstance` contains the exact object which is returned from the initializer function passed to `defineStore()`. 



`onUse(callback: (storeName, storeInstance, context) => void)`

Called every time a store is being accessed by the `useStore()` or composed via `use()`.

The `context` is the same as in the `defineStore` , you can use it to access or detect other plugins

**Example:**

```js
// my-store-logger.js
export default function logger(provide, { onUse }) {
    onUse((name, instance, context) => {
        console.log(`Used: "${name}"`);
    });
}
```



`onInitialized(callback: (storeName, storeInstance, context) => void)`

Called once per store per app after the first time usage of `useStore()` or composed via `use()`

```js
// my-store-logger.js
export default function logger(provide, { onInitialized }) {
    onInitialized((name, instance, context) => {
        console.log(`[Initialized] Store name: "${name}"`);
    });
}
```



`onAction(callback: (storeName, storeInstance, actionName, actionArgs, actionResult, context) => void)`

Called after a store function invoked.

```js
// my-store-logger.js
export default function logger(provide, { onAction }) {
    onAction((name, instance, action, actionArgs, actionResult, context) => {
        console.log(`[Action invoked] Store action: "${name}.${action}"`);
        console.log(`  args: ${actionArgs.map(JSON.stringify).join(', ')}`)
        console.log(`  return value: ${JSON.stingify(actionResult)}`);
    });
}
```

`onMutated(callback: (storeName, storeInstance, stateKey, value, oldValue, context) => void)`

Called when any watchable store property mutated (the value changed).

```js
// my-store-logger.js
export default function logger(provide, { onMutated }) {
    onMutated((name, instance, key, newValue, oldValue, context) => {
        const oldJSON = JSON.encode(oldValue);
        const newJSON = JSON.encode(newValue);
        console.log(`[State mutated] "${name}.${key}" is being mutated from ${oldJSON} to ${newJSON}`);
    });
}
```



## Changelog

See the [CHANGELOG.md](./CHANGELOG.md) 



## License

Copyright © 2020 Kövesdi György

Licensed under the [MIT License](https://github.com/samzlab/tailwind-hsluv/blob/master/LICENSE).