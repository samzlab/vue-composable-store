[![npm](https://img.shields.io/npm/v/vue-composable-store)](https://www.npmjs.com/package/vue-composable-store) ![downloads](https://img.shields.io/npm/dm/vue-composable-store) [![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)![coverage](./coverage/badge.svg) [![Coverage badge](https://img.shields.io/npm/l/make-coverage-badge.svg)](https://github.com/samzlab/tailwind-hsluv/blob/master/LICENSE)

# Vue composable store

The idea is not mine, it's actually just rapid and super-simple implementation of the [spoilered](https://www.youtube.com/watch?v=ajGglyQQD0k) Vuex 5 draft by the maker of Vuex (Kia King Ishii). I fell in love with this API (I didn't even liked Vuex before). Then I felt I want to use it **NOW**, so started to work on this a few hours ago... and here we go, it's working! :)

It's far from perfect, but I had a lot of fun implementing it even if it's just 47 LoC (compiled JS, the source is 70 with the type defs in TS).



> Do NOT use it in production environment. As soon as Vuex 5 released it's will be useless anyway.

## Peer dependencies

* Vue 3.0 or higher



## Installation

```
npm i vue-composable-store
```



## Usage

>  It's designed to use with the new composition api, **you can't use it with the options API**! Sry...

# defineStore() + use()

```js
import { readonly, reactive, ref, computed } from 'vue';
import { defineStore } from 'vue-store';

// imported just in the component which using the store,
// so it's can be properly code-splitted/tree-shanek, etc
import cartStore from './stores/cart';

export default defineStore('shop', ({ use, myApi }) => {
    const list = reactive([]);
    const page = ref(1);
    const limit = ref(20);
    
    const hasNext = computed(() => {
        return list.length === limit;
    });
    
    const cart = use(cartStore); // <--- store composition
    
    async function load(page) {
        list.length = 0;
        list.push(...await myApi('/products/'));
    }
    
    return {
        cart,
        hasNext,
        list: readonly(list), // <---- in case you do not want it to be modifiable from outside
        page, 
        load
    };
});
```



## useStore()

```js
import { defineComponent } from 'vue';
import { useStore } from 'vue-composable-store';
import productsStore from './stores/products';

export default defineComponent({
    name: 'ProductList',
    setup() {
        // it's not registered until the first time, then it's reused next time (per app)
        const { load, list, hasNext } = useStore(productsStore); 
        
        load(1);
        
        return {
            list, 
            hexNext
        };
    }
});
```



## createStore()

```js
import { createApp } from 'vue';
import { createVueStore } from 'vue-composable-store';
import App from './App.vue';

const app = createApp(App);
const store = createVueStore();
app.use(store);
app.mount('#el');
```



# Plugins

```js
// my-plugin.js
export default function(provide) {
    provide('mylib', mylib); // <--- i dont like this method, but i wanted to stay close to the draft
}

// app.js
import myPlugin from './my-plugin';
const vueStore = createVueStore({
    plugins: [ myPlugin ]
});

// myStore.js
defineStore('my-store', ({ mylib }) => {  // <--- get the plugins in the passed context
    mylib(); 
});
```

