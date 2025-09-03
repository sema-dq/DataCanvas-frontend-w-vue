// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import draggable from 'vuedraggable';

const app = createApp(App);

// Register draggable as a global component
app.component('draggable', draggable);

app.mount('#app');