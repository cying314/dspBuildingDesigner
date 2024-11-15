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
        <span>撤回（限20次）</span>
      </li>
      <li>
        <b>Ctrl+Shift+Z：</b>
        <span>重做（取消撤回）</span>
      </li>
      <li>
        <b>Ctrl+S：</b>
        <span>保存到浏览器缓存</span>
      </li>
      <li>
        <b>Ctrl+D：</b>
        <span>导出工程为JSON文件</span>
      </li>
      <li>
        <b>Ctrl+B：</b>
        <span>导出蓝图</span>
      </li>
      <li>
        <b>方向键↑↓←→：</b>
        <span>移动选中节点</span>
      </li>
      <li>
        <b>双击插槽：</b>
        <span>切换插槽方向（置0、封装模块无法切换，双击为断开连接）</span>
      </li>
      <li>
        <b>双击文本：</b>
        <span>可修改节点名称、传送带标记数等</span>
      </li>
      <li>
        <b>拖拽连接+Ctrl：</b>
        <span>从插槽拖出连接线时，长按Ctrl可进入</span>
        <u>批量连接</u>
        <span>模式——鼠标经过可连接的插槽时会立即建立连接，并自动从节点的下一个插槽处拉出连接线到鼠标位置</span>
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
        <span>，未连接的输入口将默认置1（即</span>
        <u>悬空置1</u>
        <span>），输出口将作为普通流速器回收</span>
      </li>
      <li>
        <b>封装组件插槽：</b>
        <br />
        <span>封装中必须至少包含各一个输入输出口，封装后输入输出口将作为模块的节点插槽，插槽顺序将按照输入输出口的</span>
        <u>传送带标记数升序</u>
        <span>排列</span>
      </li>
      <li>
        <b>修改封装组件：</b>
        <br />
        <span>若只想修改封装组件的非结构性数据（如插槽名、图标、标记数字、内部文本描述等），可展开封装修改后重新进行封装，工具将在封装时提示</span>
        <u>是否覆盖更新封装数据</u>
        <span>，确认后将覆盖原有封装内容；</span>
        <br />
        <span>如发生结构变化，则需另行封装并替换模块</span>
      </li>
      <li>
        <b>批量替换模块：</b>
        <br />
        <span>右键选中封装模块，可选择</span>
        <u>替换为其他模块</u>
        <span>，将选中的模块更换为当前工程引用的其他封装模块；</span>
        <br />
        <span>替换时，原模块的插槽连接将根据</span>
        <u>从左往右</u>
        <span>的顺序接入到新模块中，若新模块插槽数量小于原模块，则溢出部分将断开链接；</span>
        <br />
        <span>若画布上存在与选中模块相同的结构，将弹窗提示</span>
        <u>是否更改到所有相似节点</u>
        <span>，确认后可一键替换所有相似模块为指定的新模块（仅替换同层模块，封装内部的模块不会被替换）</span>
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