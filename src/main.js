import Vue from "vue";
import App from "./App.vue";

import "./styles/iconfont.css";

import "element-ui/lib/theme-chalk/index.css";
import ElementUI from "element-ui";
Vue.use(ElementUI);

import directive from "./directive"; //自定义指令
Vue.use(directive);

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
