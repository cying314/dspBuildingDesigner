export const version = "1.0.0"; // 工具版本
export const defaultGraphName = "新蓝图1"; // 默认蓝图名
export const watermark = {
  width: "300px",
  height: "300px",
  content: decodeURIComponent("%E4%BD%9C%E8%80%85B%E7%AB%99id%EF%BC%9A%E6%99%A8%E9%9A%90_"),
}; // 水印
export const defaultScale = 1; // 默认画布初始化缩放
export const minScale = 0.1; // 默认画布最小缩放
export const maxScale = 5; // 默认画布最大缩放
export const defaultW = 1000; // 画布默认宽度（优先使用画布外层宽度）
export const defaultH = 600; // 画布默认高度（优先使用画布外层高度）
export const strokeW = {
  link: 2, // 连接线宽度
  light: 1.5, // 细边宽
  bold: 2.5, // 粗边宽
};
export const nodeSize = 60; // 节点默认宽高
export const pointSize = 7; // 节点插槽圆点大小
export const defaultText = "双击修改文本"; // 默认文本
export const fontSize = 15; // 字体大小
export const lineHeight = 15; // 行高
export const lineWordNum = 6; // 一行文本的字数（非中文算0.5个字符）
export const selectionMargin = 5; // 节点选中框与元素间距
export const nodeCornerWidth = 5; // 节点选中角框长度
export const gridStep = nodeSize / 4; // 网格对齐间距
export const undoNum = 10; // 记录可撤回的次数
export const undoInterval = 500; // 记录撤回的时间间隔（单位:ms）
export const undoRebuildInterval = 200; // 撤回、重做重绘画布的事件间隔（单位:ms）
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

  linkStroke: "rgba(33, 150, 243, 0.8)", // 连接线
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
export const ModelId = {
  /** 普通文本 */ text: -1,
  /** 四向 */ fdir: 0,
  /** 流速器 */ monitor: 1,
  /** 信号输出口 */ output: 2,
  /** 信号输入口 */ input: 3,
};
/**
 * @typedef {Object} NodeModelConfig
 * @property {string} name - 节点名称
 * @property {number} modelId - 模型Id
 * @property {string} icon - 图标class
 */
/**
 * 拖拽节点列表
 * @type {NodeModelConfig[]}
 */
export const nodeModels = [
  {
    name: "普通文本",
    modelId: ModelId.text,
    icon: "if-icon-text",
  },
  {
    name: "四向分流器",
    modelId: ModelId.fdir,
    icon: "if-icon-fdir",
  },
  {
    name: "流速器(生成/消耗)",
    modelId: ModelId.monitor,
    icon: "el-icon-receiving",
  },
  {
    name: "信号输出(生成)",
    modelId: ModelId.output,
    icon: "if-icon-start",
  },
  {
    name: "信号输入(消耗)",
    modelId: ModelId.input,
    icon: "if-icon-end",
  },
];
export function getDefaultLayout() {
  return {
    fdirLayout: {
      name: "四向分流器",
      start: { x: 0, y: 3 }, // 布局起点
      maxW: 20, // 最大宽度（纬线方向）
      maxH: 20, // 最大长度（经线方向）
      maxD: 10, // 最大高度
      dir: 1, // 展开方向 (0:左上, 1:右上, 2:右下, 3:左下)
      previewBoxColor: "rgba(205, 192, 229, 0.3)", // 布局配置预览区域颜色
    },
    inserterLayout: {
      name: "分拣器",
      start: { x: -1, y: 2 },
      maxW: 10,
      maxH: 10,
      maxD: 10,
      dir: 3, // 左下
      previewBoxColor: "rgba(255, 225, 137, 0.3)",
    },
    monitorLayout: {
      name: "流速器-回收",
      start: { x: -1, y: 3 },
      maxW: 10,
      maxH: 10,
      maxD: 10,
      dir: 0, // 左上
      previewBoxColor: "rgba(120, 195, 255, 0.3)",
    },
    outputLayout: {
      name: "流速器-信号输出",
      start: { x: 0, y: 0 },
      maxW: 20,
      maxH: 2,
      maxD: 1,
      dir: 1, // 右上
      previewBoxColor: "rgba(247, 155, 164, 0.3)",
    },
    inputLayout: {
      name: "流速器-信号输入",
      start: { x: 0, y: -3 },
      maxW: 20,
      maxH: 2,
      maxD: 1,
      dir: 1, // 右上
      previewBoxColor: "rgba(118, 221, 68, 0.3)",
    },
  };
}
/** 生成蓝图布局 */
export const layoutSetting = getDefaultLayout();
/** 生成蓝图布局List */
export const layoutSettingList = Object.values(layoutSetting);
/** 重置默认布局 */
export function resetLayout() {
  const layout = getDefaultLayout();
  Object.keys(layout).forEach((key) => {
    Object.assign(layoutSetting[key], layout[key]);
  });
}
