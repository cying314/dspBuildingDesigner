// el-dialog 弹窗拖拽
function dialogDrag(el) {
  const dialogHeaderEl = el.querySelector(".el-dialog__header");
  const dragDom = el.querySelector(".el-dialog");
  if (!dialogHeaderEl || !dragDom) return;
  dialogHeaderEl.style.cursor = "move";

  // 获取原有属性 ie dom元素.currentStyle 火狐谷歌 window.getComputedStyle(dom元素, null);
  const sty = dragDom.currentStyle || window.getComputedStyle(dragDom, null);

  dialogHeaderEl.onmousedown = (e) => {
    // 鼠标按下，计算当前元素距离可视区的距离
    const disX = e.clientX - dialogHeaderEl.offsetLeft;
    const disY = e.clientY - dialogHeaderEl.offsetTop;
    let styL, styT;
    // 注意在ie中 第一次获取到的值为组件自带50% 移动之后赋值为px
    if (sty.left.includes("%")) {
      styL = +document.body.clientWidth * (+sty.left.replaceAll("%", "") / 100);
      styT = +document.body.clientHeight * (+sty.top.replaceAll("%", "") / 100);
    } else {
      styL = parseFloat(sty.left);
      styT = parseFloat(sty.top);
    }

    document.onmousemove = function (e) {
      // 通过事件委托，计算移动的距离
      const l = e.clientX - disX;
      const t = e.clientY - disY;
      // 移动当前元素
      dragDom.style.left = `${l + styL}px`;
      dragDom.style.top = `${t + styT}px`;
      // 将此时的位置传出去
      // binding.value({x:e.pageX,y:e.pageY})
    };

    document.onmouseup = function () {
      document.onmousemove = null;
      document.onmouseup = null;
    };
  };
}

export default {
  bind(el, binding, vnode, oldVnode) {
    dialogDrag(el, binding, vnode, oldVnode);
  },
};
