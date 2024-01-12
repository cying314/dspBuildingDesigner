import * as Util from "./graphUtil.js";
export const version = "1.0.0"; // 工具版本
export const watermark = {
  width: "300px",
  height: "300px",
  content: decodeURIComponent("%E4%BD%9C%E8%80%85B%E7%AB%99id%EF%BC%9A%E6%99%A8%E9%9A%90_"),
}; // 水印
export const defaultW = 1000; // 画布默认宽度（优先使用画布外层宽度）
export const defaultH = 600; // 画布默认高度（优先使用画布外层高度）
export const strokeW = {
  line: 2, // 连接线宽度
  light: 1.5, // 细边宽
  bold: 2.5, // 粗边宽
};
export const nodeSize = 60; // 节点默认宽高
export const pointSize = 7; // 节点插槽圆点大小
export const fontSize = 15; // 字体大小
export const lineHeight = 15; // 行高
export const lineWordNum = 6; // 一行文本的字数(非中文算0.5个字符)
export const selectionMargin = 5; // 节点选中框与元素间距
export const nodeCornerWidth = 5; // 节点选中角框长度
export const gridStep = nodeSize / 4; // 网格对齐间距
export const color = {
  success: "#67c23a",
  warning: "#e6a23c",
  danger: "#f56c6c",

  nodeFill: "rgb(224, 224, 224)", // 节点
  nodeStroke: "rgb(51, 51, 51)",
  text: "#333",
  emptyText: "#ccc",

  slotFill: "#fff", // 插槽
  slotStroke: "#333",
  priorityOutStroke: "rgb(255, 204, 52)", // 四向输出优先
  priorityOutFill: "rgb(255, 246, 218)",
  priorityInStroke: "rgb(33, 150, 243)", // 四向输入优先
  priorityInFill: "rgb(232, 236, 247)",

  lineStroke: "rgba(33, 150, 243, 0.8)", // 连接线
  tmpLineStroke: "rgba(170, 170, 170, 0.8)", // 临时连接线
  selectionStroke: "rgba(51, 51, 51, 0.5)", // 选择框
  selectionCornerStroke: "rgba(81, 81, 249, 0.8)", // 选择角框

  item_6001: "rgb(33, 150, 243)", // 蓝糖
  item_6002: "rgb(226, 90, 104)", // 红糖
  item_6003: "rgb(255, 242, 52)", // 黄糖
  item_6004: "rgb(167, 107, 231)", // 紫糖
  item_6005: "rgb(75, 204, 85)", // 绿塘
  item_6006: "rgb(255, 255, 255)", // 白糖
  item_default: "rgb(0, 0, 0)", // 未知物品
}; // 颜色
export const filterItem = [
  { id: 6001, name: "蓝糖", color: color.item_6001 },
  { id: 6002, name: "红糖", color: color.item_6002 },
  { id: 6003, name: "黄糖", color: color.item_6003 },
  { id: 6004, name: "紫糖", color: color.item_6004 },
  { id: 6005, name: "绿塘", color: color.item_6005 },
  { id: 6006, name: "白糖", color: color.item_6006 },
];
export const filterItemMap = new Map();
filterItem.forEach((f) => filterItemMap.set(f.id, f));
/**
 * 节点默认模型构造器
 */
export const nodeModels = [
  {
    name: "普通文本", // 节点名称
    modelId: -1, // 模型Id
    build: function (nodeId, offset = [0, 0], text = "双击修改文本") {
      let w = lineWordNum * fontSize;
      let h = Util.getLineNum(text) * lineHeight; // 根据实际文本行数修改高度
      const data = {
        id: nodeId,
        x: offset[0],
        y: offset[1],
        w,
        h,
        modelId: this.modelId,
        text: text,
      };
      return data;
    },
  },
  {
    name: "四向分流器", // 节点名称
    modelId: 0, // 模型Id
    fixedSlot: true, // 固定插槽位置
    build: function (nodeId, offset = [0, 0]) {
      let w = nodeSize;
      let h = nodeSize;
      const data = {
        id: nodeId,
        x: offset[0],
        y: offset[1],
        w,
        h,
        modelId: this.modelId,
        slots: [
          { ox: 0, oy: -h / 2, dir: -1 }, // 上输入
          { ox: w / 2, oy: 0, dir: -1 }, // 右输入
          { ox: 0, oy: h / 2, dir: 1 }, // 下输出
          { ox: -w / 2, oy: 0, dir: 1 }, // 左输出
        ],
      };
      data.slots.forEach((s, si) => {
        s.index = si;
        s.nodeId = nodeId;
      });
      return data;
    },
  },
  {
    name: "流速器(生成/消耗)", // 节点名称
    modelId: 1, // 模型Id
    fixedSlot: true, // 固定插槽位置
    build: function (nodeId, offset = [0, 0]) {
      let w = nodeSize / 2;
      let h = nodeSize / 2;
      const data = {
        id: nodeId,
        x: offset[0],
        y: offset[1],
        w,
        h,
        modelId: this.modelId,
        itemId: 6002, // 生成/消耗物品id（默认红糖）
        slots: [
          { index: 0, nodeId: nodeId, ox: 0, oy: 0, dir: 1 }, // 默认输出
        ],
      };
      return data;
    },
  },
  {
    name: "起点(信号输出口)", // 节点名称
    modelId: 2, // 模型Id
    fixedSlot: true, // 固定插槽位置
    build: function (nodeId, offset = [0, 0]) {
      let w = nodeSize / 2;
      let h = nodeSize / 2;
      const data = {
        id: nodeId,
        x: offset[0],
        y: offset[1],
        w,
        h,
        modelId: this.modelId,
        itemId: 6002, // 生成/消耗物品id（默认红糖）
        slots: [
          { index: 0, nodeId: nodeId, ox: 0, oy: 0, dir: 1 }, // 输出
        ],
      };
      return data;
    },
  },
  {
    name: "终点(信号输入口)", // 节点名称
    modelId: 3, // 模型Id
    fixedSlot: true, // 固定插槽位置
    build: function (nodeId, offset = [0, 0]) {
      let w = nodeSize / 2;
      let h = nodeSize / 2;
      const data = {
        id: nodeId,
        x: offset[0],
        y: offset[1],
        w,
        h,
        modelId: this.modelId,
        itemId: 6002, // 生成/消耗物品id（默认红糖）
        slots: [
          { index: 0, nodeId: nodeId, ox: 0, oy: 0, dir: -1 }, // 输入
        ],
      };
      return data;
    },
  },
];
/**
 * 节点默认模型Map (modelId -> modelBuilder)
 * @description modelBuilder: { name, modelId, fixedSlot, build(nodeId, [x,y], text) }
 */
export const nodeModelMap = new Map();
nodeModels.forEach((m) => {
  nodeModelMap.set(m.modelId, m);
});
