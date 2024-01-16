# DSP超距电路蓝图设计器

### -  戴森球计划超距电路蓝图设计器

vue2开发的单页静态网页，用以戴森球计划游戏内超距电路蓝图的构建。 
项目基于d3js，实现拖拉拽编辑建筑组件、组件封装等功能，最终生成戴森球计划游戏无带流蓝图数据。

- 项目框架：Vue2、d3js
- 在线访问地址：

> [https://cying.xyz/DSP/dspBuildingDesigner](https://cying.xyz/DSP/dspBuildingDesigner)

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
