<template>
  <div class="tips">
    <div class="hint">
      <i class="if-icon-un-priority danger" style="margin-right:5px"></i>
      <span>该工具由</span>
      <b>晨隐_</b>
      <span>独立开发，如遇问题请加交流群反馈：</span>
      <u>546418541</u>
    </div>
    <div class="title">基础操作</div>
    <ul>
      <li>
        <b>创建节点：</b>
        <br />
        <span>方式1、拖拽左侧栏组件到画布中；</span>
        <br />
        <span>方式2、在左侧栏开启</span>
        <u>双击创建</u>
        <span>，并勾选要创建的组件，在画布中双击创建</span>
      </li>
      <li>
        <b>连接：</b>
        <br />
        <span>从一个节点的</span>
        <u>
          <i class="el-icon-circle-plus-outline"></i>
          插槽
        </u>
        <span>长按左键拖拽到其他节点的</span>
        <u>
          <i class="el-icon-remove-outline"></i>
          插槽
        </u>
        <span>即可创建连接</span>
        <br />
        <span>*同一个插槽只可连接一次，在右键插槽菜单中可断开连接</span>
      </li>
      <li>
        <b>选择节点：</b>
        <br />
        <span>左键点击可单选节点，按住Ctrl点击可实现增选、减选；</span>
        <br />
        <span>长按右键可拖拽框选，按住Ctrl框选可实现增选</span>
      </li>
      <li>
        <b>组件菜单：</b>
        <br />
        <span>右键节点打开</span>
        <u>节点菜单</u>
        <span>，可操作切换图标、切换标记数、切换生成物品、封装、展开封装等</span>
        <br />
        <span>右键插槽打开</span>
        <u>插槽菜单</u>
        <span>，可操作断开连接、切换插槽方向、设置四向优先接口等</span>
        <br />
      </li>
    </ul>
    <div class="title">快捷操作</div>
    <ul>
      <li>
        <b>Ctrl+A：</b>
        <span>全选节点</span>
      </li>
      <li>
        <b>Ctrl+C：</b>
        <span>复制选中节点</span>
      </li>
      <li>
        <b>Ctrl+V：</b>
        <span>鼠标处粘贴</span>
      </li>
      <li>
        <b>Ctrl+X：</b>
        <span>剪切选中节点</span>
      </li>
      <li>
        <b>Delete：</b>
        <span>删除选中节点</span>
      </li>
      <li>
        <b>Ctrl+Z：</b>
        <span>撤回（限10次）</span>
      </li>
      <li>
        <b>Ctrl+Shift+Z：</b>
        <span>重做（取消撤回）</span>
      </li>
      <li>
        <b>Ctrl+S：</b>
        <span>保存</span>
      </li>
      <li>
        <b>Ctrl+D：</b>
        <span>导出过程文件为JSON</span>
      </li>
      <li>
        <b>Ctrl+B：</b>
        <span>导出蓝图</span>
      </li>
      <li>
        <b>双击插槽：</b>
        <span>切换插槽方向（封装模块无法切换，为断开连接）</span>
      </li>
      <li>
        <b>双击文本：</b>
        <span>可修改节点名称、传送带标记数等</span>
      </li>
    </ul>
    <div class="title">封装模块</div>
    <ul>
      <li>
        <b>封装与展开：</b>
        <br />
        <span>框选节点后，可通过右键菜单</span>
        <u>创建封装</u>
        <span>，已封装的组件也可以通过右键</span>
        <u>展开封装</u>
        <span>；</span>
        <br />
        <span>模块封装后将展示在左侧栏的</span>
        <u>当前封装模块</u>
        <span>中，封装模块将随着项目保存，引入其他组件时将同时引入组件依赖的封装模块</span>
      </li>
      <li>
        <b>连接封装模块：</b>
        <br />
        <span>实际使用中，模块插槽</span>
        <u>无需全部连接</u>
        <span>，输入口将</span>
        <u>默认置1</u>
        <span>，输出口将作为普通流速器回收</span>
      </li>
      <li>
        <b>封装组件插槽：</b>
        <br />
        <span>封装中必须至少包含各一个输入输出口，封装后输入输出口将作为模块的节点插槽，插槽顺序将按照输入输出口的</span>
        <u>传送带标记数升序</u>
        <span>排列。</span>
      </li>
      <li>
        <b>修改封装组件：</b>
        <br />
        <span>若只想修改封装组件的非结构性数据（类似插槽名、插槽图标），可展开封装模块后修改并重新封装，工具将会提示覆盖原有封装；</span>
        <br />
        <span>如发生结构变化，只能重新封装并手动替换组件</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "Tips",
};
</script>

<style lang="scss" scoped>
.tips {
  padding-left: 5px;
  color: #666;
  font-size: 13px;
  max-height: 80vh;
  overflow: auto;
  .hint {
    font-size: 12px;
    color: $--color-warning;
    margin-bottom: 10px;
    b {
      margin: 0 2px;
    }
  }
  .title {
    font-size: 15px;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 5px;
  }
  li {
    margin-left: 30px;
    margin-bottom: 5px;
    u {
      margin: 0 2px;
      color: $--color-warning;
    }
  }
}
</style>