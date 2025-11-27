import { createApp } from "vue";

// Vuetify

import { createVuetify } from "vuetify";
import "vuetify/styles";
import App from "./App.vue";

// router

import router from "./router";

const vuetify = createVuetify();
const app = createApp(App);

app.use(vuetify).use(router).mount("#app");
