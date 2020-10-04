# Vue store (composition)

Vuex 5 video: https://www.youtube.com/watch?v=ajGglyQQD0k



# defineStore

```js
import { reactive, ref, computed } from 'vue';
import { defineStore } from 'vue-store';
import mediaStore from './stores/cart';

export default defineStore('shop', ({ use }) => {
    const list = reactive([]);
    const page = ref(1);
    const limit = ref(20);
    
    const hasNext = computed(() => {
        return list.length === limit;
    });
    
    const cart = use(cartStore); // <--- store composition
    
    const getImage(product) {
        return images.find(product.imageId);
    }
    
    async function load(page) {
        list.length = 0;
        list.push(...await context.api('/products/'));
    }
    
    return {
        cart,
        list, 
        page, 
        load
    };
});
```



## useStore

```js
import { defineComponent } from 'vue';
import { useStore } from 'vue-store';
import productsStore from './stores/products';

export default defineComponent({
    name: 'ProductList',
    setup() {
        // it's not registered until the first time, then it's reused next time
        const { load, list, page, limit, hasNext } = useStore(productsStore);
        
        load(1);
        
        return {
            list, 
            hexNext,
            page, 
            limit
        };
    }
});
```



## createStore

```js
import { createApp } from 'vue';
import { createStore } from 'vue-store';
import App from './App.vue';

const app = createApp(App);
const store = createStore();
app.use(store);
app.mount('#el');

```



# Plugin

```js
// my-plugin.js
export default function(provide) {
    provide('mylib', mylib);
}

// app.js
import myPlugin from './my-plugin';
createStore({
    plugins: [myPlugin]
});

// myStore.js
defineStore('my-store', ({ mylib }) => {
    mylib(); // <--- provided by the plugin
});
```

