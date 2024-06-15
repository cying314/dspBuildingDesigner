import Vue from "vue";
import App from "./App.vue";

import "./styles/iconfont.css";

import "element-ui/lib/theme-chalk/index.css";
import ElementUI from "element-ui";
Vue.use(ElementUI);

import directive from "./directive"; //自定义指令
Vue.use(directive);

// 离线存储
import localforage from "localforage";
localforage.config({
  driver: localforage.INDEXEDDB,
  name: "dsp-building-designer", // 数据库名称
  version: 1, // 数据库版本号
  storeName: "dsp-graph", // 存储对象的名称
});
Vue.prototype.$localforage = localforage;
window.localforage = localforage;

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
