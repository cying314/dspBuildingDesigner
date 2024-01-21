# DSP超距电路蓝图设计器

### -  戴森球计划超距电路蓝图设计器

vue2开发的单页静态网页，用以戴森球计划游戏内超距电路蓝图的构建。 
项目基于d3js，实现拖拉拽编辑建筑组件、组件封装等功能，最终生成戴森球计划游戏无带流蓝图数据。

- 项目框架：Vue2、d3js
- 在线访问地址：

> https://cying.xyz/DSP/dspBuildingDesigner

- b站演示视频：

> https://www.bilibili.com/video/BV1Gc411x7Xx/

- 页面截图：

![image-20240121140420957](https://gitee.com/cying314/dsp-building-designer/raw/master/README.assets/image-20240121140420957.png)

- 工具说明：

>**基础操作**
>
>- **创建节点：**
>  方式1、拖拽左侧栏组件到画布中；
>  方式2、在左侧栏开启双击创建，并勾选要创建的组件，在画布中双击创建
>- **连接：**
>  从一个节点的 插槽 长按左键拖拽到其他节点的 插槽 即可创建连接
>  *同一个插槽只可连接一次，在右键插槽菜单中可断开连接
>- **选择节点：**
>  左键点击可单选节点，按住Ctrl点击可实现增选、减选；
>  长按右键可拖拽框选，按住Ctrl框选可实现增选
>- **组件菜单：**
>  右键节点打开节点菜单，可操作切换图标、切换标记数、切换生成物品、封装、展开封装等
>  右键插槽打开插槽菜单，可操作断开连接、切换插槽方向、设置四向优先接口等
>
>**快捷操作**
>
>- **Ctrl+A：** 全选节点
>- **Ctrl+C：** 复制选中节点
>- **Ctrl+V：** 鼠标处粘贴
>- **Ctrl+X：** 剪切选中节点
>- **Delete：** 删除选中节点
>- **Ctrl+Z：** 撤回（限10次）
>- **Ctrl+Shift+Z：** 重做（取消撤回）
>- **Ctrl+S：** 保存
>- **Ctrl+D：** 导出过程文件为JSON
>- **Ctrl+B：** 导出蓝图
>- **双击插槽：** 切换插槽方向（封装模块无法切换，为断开连接）
>- **双击文本：** 可修改节点名称、传送带标记数等
>
>**封装模块**
>
>- **封装与展开：**
>  框选节点后，可通过右键菜单创建封装，已封装的组件也可以通过右键展开封装；
>  模块封装后将展示在左侧栏的当前封装模块中，封装模块将随着项目保存，引入其他组件时将同时引入组件依赖的封装模块
>- **连接封装模块：**
>  实际使用中，模块插槽无需全部连接，输入口将默认置1，输出口将作为普通流速器回收
>- **封装组件插槽：**
>  封装中必须至少包含各一个输入输出口，封装后输入输出口将作为模块的节点插槽，插槽顺序将按照输入输出口的传送带标记数升序排列。
>- **修改封装组件：**
>  若只想修改封装组件的非结构性数据（类似插槽名、插槽图标），可展开封装模块后修改并重新封装，工具将会提示覆盖原有封装；
>  如发生结构变化，只能重新封装并手动替换组件



### 安装依赖

```shell
cnpm install
```

### 运行测试服务

```shell
npm run serve
```

### 构建打包

```shell
npm run build
# 打包后可删除dist文件夹中的css及js文件夹(打包流冗余文件，所有代码已打包进html)，仅保留index.html
```
