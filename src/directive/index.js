import dialogDrag from "./drag/dialogDrag";

const install = function (Vue) {
  // v-dialogDrag: 弹窗拖拽
  Vue.directive("dialogDrag", dialogDrag);
};

export default install;
