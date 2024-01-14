import * as Cfg from "@/graph/graphConfig.js";
/** @typedef {import("@/graph/dataMapper").GraphNode} GraphNode */
/** @typedef {import("@/graph/dataMapper").GraphEdge} GraphEdge */
/**
 * @typedef {Object} BuildingItem
 * @property {number} index - 索引
 * @property {[{x,y,z},{x,y,z}]} localOffset - 建筑偏移
 * @property {number} outputObjIdx - 输出对象索引
 * @property {number} outputToSlot - 输出对象插槽索引
 * @property {number} inputObjIdx - 输入对象索引
 * @property {number} inputFromSlot - 输入对象插槽索引
 * @property {number} filterId - 过滤物品id
 */

// 四向宽长高
const fdirSize = { w: 2, h: 2, d: 2 };
// 流速器宽长高
const monitorSize = { w: 1, h: 2, d: 1 };
// 分拣器宽长高
const inserterSize = { w: 1, h: 2, d: 1 };

// 四向布局
const fdirLayout = {
  start: { x: 0, y: 3 }, // 布局起点
  //   dirType: 1, // 展开方向 0:左上 1:右上 2:右下 3:左下
  maxW: 11,
  maxH: 22,
  maxD: 10,
};
// 分拣器布局
const inserterLayout = {
  start: { x: -11, y: 3 }, // 布局起点
  maxW: 11,
  maxH: 22,
  maxD: 10,
};
// 流速器布局
const monitorLayout = {
  start: { x: 11, y: 3 }, // 布局起点
  maxW: 11,
  maxH: 22,
  maxD: 10,
};
// 起点(输出口)布局
const startLayout = {
  start: { x: 11, y: 0 }, // 布局起点
  maxW: 11,
  maxH: 2,
  maxD: 1,
};
// 终点(输入口)布局
const endLayout = {
  start: { x: 0, y: 0 }, // 布局起点
  maxW: 11,
  maxH: 2,
  maxD: 1,
};

/**
 * 生成蓝图数据
 * @param {GraphNode[]} nodes 节点集
 * @param {GraphEdge[]} edges 边集
 * @param {string} graphName 蓝图名
 * @return blueprint
 */
export function generateBlueprint(nodes, edges, graphName) {
  const blueprint = {
    header: {
      layout: 10,
      icons: [0, 0, 0, 0, 0],
      time: new Date(),
      shortDesc: graphName,
      desc: "通过DSP超距电路蓝图设计器生成的蓝图，作者b站id：晨隐_",
    },
    version: 1,
    cursorOffset: { x: 0, y: 0 },
    cursorTargetArea: 0,
    dragBoxSize: { x: 1, y: 1 },
    primaryAreaIdx: 0,
    areas: [
      {
        index: 0,
        parentIndex: -1,
        tropicAnchor: 0,
        areaSegments: 200,
        anchorLocalOffset: { x: 0, y: 0 },
        size: { x: 1, y: 1 },
      },
    ],
  };
  blueprint.buildings = createbuildings(nodes, edges);
  return blueprint;
}

/**
 * 生成蓝图建筑列表
 * @param {GraphNode[]} nodes 节点集
 * @param {GraphEdge[]} edges 边集
 * @return {BuildingItem[]}
 */
export function createbuildings(nodes, edges) {
  let resList = [];
  let fdirList = []; // 四向节点
  let monitorList = []; // 流速器节点
  let startList = []; // 起点
  let endList = []; // 终点
  nodes.forEach((n) => {
    switch (n.modelId) {
      case Cfg.ModelId.fdir: // 四向
        fdirList.push(n);
        break;
      case Cfg.ModelId.monitor: // 流速器
        monitorList.push(n);
        break;
      case Cfg.ModelId.start: // 起点
        startList.push(n);
        break;
      case Cfg.ModelId.end: // 终点
        endList.push(n);
        break;
    }
  });

  // 1、四向：中心扩散布局
  let fdirOffset = [fdirLayout.start.x, fdirLayout.start.y, 0];
  let fdirLayoutCoords = centralCubeLayout(
    fdirList.length,
    fdirSize.w,
    fdirSize.h,
    fdirSize.d,
    fdirLayout.maxW,
    fdirLayout.maxH,
    fdirLayout.maxD,
    fdirOffset,
    "四向"
  );
  /** 节点id映射插槽传送带对象 @type {Map<number,BuildingItem[]>} */
  const nodeId2SlotBeltsMap = new Map();
  let prevFdir;
  fdirList.forEach((n, ni) => {
    //  创建 四向带4个短垂直带
    let inputObjIdx = -1;
    let [x, y, z] = fdirLayoutCoords[ni];
    if (z !== 0) {
      // z不为0，传入上一个四向做底
      inputObjIdx = prevFdir?.index ?? -1;
    }
    const item = createItem(resList.length, [x, y, z], n, resList, inputObjIdx);
    prevFdir = item._fdir;
    nodeId2SlotBeltsMap.set(n.id, item._slotsBelts);
  });

  // 2、流速器：中心扩散布局
  let monitorOffset = [monitorLayout.start.x, monitorLayout.start.y, 0];
  let monitorLayoutCoords = centralCubeLayout(
    monitorList.length,
    monitorSize.w,
    monitorSize.h,
    monitorSize.d,
    monitorLayout.maxW,
    monitorLayout.maxH,
    monitorLayout.maxD,
    monitorOffset,
    "流速器"
  );
  monitorList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, monitorLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 3、起点：中心扩散布局
  let startOffset = [startLayout.start.x, startLayout.start.y, 0];
  let startLayoutCoords = centralCubeLayout(
    startList.length,
    monitorSize.w,
    monitorSize.h,
    monitorSize.d,
    startLayout.maxW,
    startLayout.maxH,
    startLayout.maxD,
    startOffset,
    "起点"
  );
  startList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, startLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 4、终点：中心扩散布局
  let endOffset = [endLayout.start.x, endLayout.start.y, 0];
  let endLayoutCoords = centralCubeLayout(
    endList.length,
    monitorSize.w,
    monitorSize.h,
    monitorSize.d,
    endLayout.maxW,
    endLayout.maxH,
    endLayout.maxD,
    endOffset,
    "终点"
  );
  endList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, endLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 5、分拣器：中心扩散布局
  let inserterOffset = [inserterLayout.start.x, inserterLayout.start.y, 0];
  let inserterLayoutCoords = centralCubeLayout(
    edges.length,
    inserterSize.w,
    inserterSize.h,
    inserterSize.d,
    inserterLayout.maxW,
    inserterLayout.maxH,
    inserterLayout.maxD,
    inserterOffset,
    "终点"
  );
  edges.forEach((e, ei) => {
    let outputObjIdx = -1;
    let inputObjIdx = -1;
    let targetSlotsBelts = nodeId2SlotBeltsMap.get(e.target.id);
    let sourceSlotsBelts = nodeId2SlotBeltsMap.get(e.source.id);
    if (targetSlotsBelts && targetSlotsBelts[e.targetSlot.index]) {
      outputObjIdx = targetSlotsBelts[e.targetSlot.index].index;
    }
    if (sourceSlotsBelts && sourceSlotsBelts[e.sourceSlot.index]) {
      inputObjIdx = sourceSlotsBelts[e.sourceSlot.index].index;
    }
    const inserter = createInserter({
      index: resList.length,
      offset: inserterLayoutCoords[ei],
      outputObjIdx,
      inputObjIdx,
    });
    resList.push(inserter);
  });
  return resList;
}

/**
 * 创建 四向带4个短垂直带 结构
 * @param {number} opt.startIndex 起始索引
 * @param {number[]} opt.offset 偏移 [ox,oy,oz]
 * @param {GraphNode} node 节点
 * @param {object[]} list 建筑列表
 * @param {number} opt.inputObjIdx 四向底座的索引
 * @return {{_fdir:BuildingItem, _slotsBelts: BuildingItem[]}} 四向建筑对象（_slotsBelts属性为插槽外接传送带建筑对象）
 */
export function createItem(
  startIndex = 0,
  [ox = 0, oy = 0, oz = 0] = [],
  node,
  buildList = [],
  inputObjIdx = -1
) {
  // 创建四向分流器
  let filterId = 0;
  let priority = [false, false, false, false];
  node.slots.forEach((s, si) => {
    if (si > 3) return;
    if (s.priority === 1) {
      // 是否优先接口
      priority[si] = true;
    }
    if (s.priority === 1 && s.dir === 1 && s.filterId != null) {
      // 优先输出过滤物品id
      filterId = s.filterId;
    }
  });
  const _fdir = createFdir({
    index: startIndex,
    offset: [ox, oy, oz],
    priority,
    filterId,
    inputObjIdx,
  });
  buildList.push(_fdir);

  /** 插槽外接传送带建筑对象 @type {BuildingItem[]} */
  const _slotsBelts = [];
  const HorizDistance = 0.3;
  const VerticalDistance = 0.2;
  // 创建4个短垂直带
  let os = [
    { x: ox, y: oy + HorizDistance, z: oz }, // 上
    { x: ox + HorizDistance, y: oy, z: oz }, // 右
    { x: ox, y: oy - HorizDistance, z: oz }, // 下
    { x: ox - HorizDistance, y: oy, z: oz }, // 左
  ];
  let offsetIndex = 0;
  for (let i = 0; i < 4; i++) {
    const s = node.slots[i];
    if (!s || s.edge == null) continue; // 未连接
    // 接四向
    let belt1 = {
      index: startIndex + ++offsetIndex,
      offset: [os[i].x, os[i].y, os[i].z],
    };
    // 外接
    let belt2 = {
      index: startIndex + ++offsetIndex,
      offset: [os[i].x, os[i].y, os[i].z - VerticalDistance],
    };
    if (s.dir === 1) {
      // 输出口 从四向输入
      belt1.ipt = [_fdir.index, i];
      // 输出到下一节
      belt1.opt = [belt2.index, 1]; // 传送带插槽默认为1
    } else if (s.dir === -1) {
      // 输入口 输出到四向
      belt1.opt = [_fdir.index, i];
      // 输出到上一节
      belt2.opt = [belt1.index, 1]; // 传送带插槽默认为1
    }
    const belt1_building = createBelt(belt1);
    const belt2_building = createBelt(belt2);
    buildList.push(belt1_building);
    buildList.push(belt2_building);
    _slotsBelts[i] = belt2_building; // 记录外接传送带建筑对象
  }
  return { _fdir, _slotsBelts };
}

/**
 * 创建四向
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {boolean[]} opt.priority 是否优先接口
 * @param {number} opt.filterId 优先输出过滤物品id
 * @param {number} opt.inputObjIdx 底座的索引
 * @return {BuildingItem}
 */
export function createFdir({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  priority = [false, false, false, false],
  filterId = 0,
  inputObjIdx = -1,
} = {}) {
  return {
    index: index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    itemId: 2020,
    modelIndex: 38,
    outputObjIdx: -1,
    inputObjIdx: inputObjIdx,
    outputToSlot: 14,
    inputFromSlot: 15,
    outputFromSlot: 15,
    inputToSlot: 14,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: filterId,
    parameters: {
      priority: priority,
    },
  };
}

/**
 * 创建传送带
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number[]} opt.opt 输出 [outputObjIdx, outputToSlot]
 * @param {number[]} opt.ipt 输入 [inputObjIdx, inputFromSlot]
 * @param {number} opt.level 传送带等级(1,2,3) 默认极速传送带
 * @return {BuildingItem}
 */
export function createBelt({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  opt: [outputObjIdx = -1, outputToSlot = 0] = [],
  ipt: [inputObjIdx = -1, inputFromSlot = 0] = [],
  level = 3,
} = {}) {
  let itemId;
  let modelIndex;
  switch (level) {
    case 1:
      itemId = 2001;
      modelIndex = 35;
      break;
    case 2:
      itemId = 2002;
      modelIndex = 36;
      break;
    case 3:
    default:
      itemId = 2003;
      modelIndex = 37;
      break;
  }
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    itemId: itemId,
    modelIndex,
    outputObjIdx,
    outputToSlot,
    inputObjIdx,
    inputFromSlot,
    outputFromSlot: 0,
    inputToSlot: 1,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: null,
  };
}

/**
 * 创建流速器组（带两节传送带）
 * @param {number} startIndex 起始索引
 * @param {number[]} offset 偏移 [ox,oy,oz]
 * @param {GraphNode} node 节点
 * @param {object[]} list 建筑列表
 * @return {{_monitor:BuildingItem, _slotsBelts: BuildingItem[]}} 流速器组对象（_slotsBelts属性为插槽外接传送带建筑对象）
 */
export function createMonitorGroup(
  startIndex = 0,
  [ox = 0, oy = 0, oz = 0] = [],
  node,
  buildList = []
) {
  let spawnItemOperator = 1; // 0:不勾选 1:生成货物 2:消耗货物
  let passColorId = 1;
  let failColorId = 1;
  if (node.modelId === Cfg.ModelId.start || node.modelId === Cfg.ModelId.end) {
    // 只有开始和结束节点才点亮流速器
    passColorId = 113;
    failColorId = 13;
  }
  const beltDistance = 0.7;
  // 接流速器
  let belt1 = {
    index: startIndex + 1,
    offset: [ox, oy, oz],
  };
  // 外接
  let belt2 = {
    index: startIndex + 2,
    offset: [ox, oy - beltDistance, oz],
  };
  if (
    node.modelId === Cfg.ModelId.start ||
    (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === 1)
  ) {
    // 起点 或流速器 生成货物
    // 输出到下一节
    belt1.opt = [belt2.index, 1]; // 传送带插槽默认为1
    spawnItemOperator = 1;
  } else if (
    node.modelId === Cfg.ModelId.end ||
    (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === -1)
  ) {
    // 终点 或流速器 消耗货物
    // 输出到上一节
    belt2.opt = [belt1.index, 1]; // 传送带插槽默认为1
    spawnItemOperator = 2;
  }
  // 创建流速器
  const _monitor = createMonitor({
    index: startIndex,
    offset: [ox, oy, oz],
    spawnItemOperator, // 生成/消耗货物
    cargoFilter: node.itemId,
    passColorId,
    failColorId,
  });
  buildList.push(_monitor);
  // 创建底下传送带
  const belt1_building = createBelt(belt1);
  const belt2_building = createBelt(belt2);
  buildList.push(belt1_building);
  buildList.push(belt2_building);
  const _slotsBelts = [belt2_building]; // 记录外接传送带建筑对象
  return { _monitor, _slotsBelts };
}

/**
 * 创建流速器
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number} opt.spawnItemOperator 生成/消耗货物模式(默认生成) -> 0:不勾选 1:生成货物 2:消耗货物
 * @param {number} opt.cargoFilter 生成/消耗物品id
 * @param {number} opt.passColorId 	满足条件颜色索引(默认绿色113)（0 - 255）
 * @param {number} opt.failColorId 	不满足条件颜色索引(默认红色13)（0 - 255）
 * @return {BuildingItem}
 */
export function createMonitor({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  spawnItemOperator = 1,
  cargoFilter = 6002,
  passColorId = 113,
  failColorId = 13,
} = {}) {
  return {
    index: index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    itemId: 2030,
    modelIndex: 208,
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
    outputFromSlot: 0,
    inputToSlot: 0,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: {
      targetBeltId: 23343,
      offset: 0,
      targetCargoAmount: 30,
      periodTicksCount: 60,
      passOperator: 0,
      passColorId,
      failColorId,
      cargoFilter,
      spawnItemOperator,
      systemWarningMode: 0,
      systemWarningIconId: 402,
      alarmMode: 0,
      tone: 20,
      falloffRadius: [24, 72],
      repeat: true,
      pitch: 35,
      volume: 80,
      length: 4,
    },
  };
}

/**
 * 创建分拣器
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @param {number} opt.outputObjIdx 输出目标索引
 * @param {number} opt.inputObjIdx 输入目标索引
 * @param {number} opt.level 分拣器等级(1,2,3) 默认极速分拣器
 * @return {BuildingItem}
 */
export function createInserter({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  outputObjIdx = -1,
  inputObjIdx = -1,
  level = 3,
} = {}) {
  let itemId;
  let modelIndex;
  switch (level) {
    case 1:
      itemId = 2011;
      modelIndex = 41;
      break;
    case 2:
      itemId = 2012;
      modelIndex = 42;
      break;
    case 3:
    default:
      itemId = 2013;
      modelIndex = 43;
      break;
  }
  return {
    index: index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y: y - 1, z }, // 朝向下
    ],
    yaw: [180, 180],
    itemId,
    modelIndex,
    outputObjIdx,
    inputObjIdx,
    outputToSlot: -1,
    inputFromSlot: -1,
    outputFromSlot: 0,
    inputToSlot: 1,
    outputOffset: 0,
    inputOffset: 0,
    recipeId: 0,
    filterId: 0,
    parameters: { length: 1 },
  };
}

/**
 * 求中心扩散布局坐标（优先叠满层，再原点扩散布局）
 * @description 优先叠满层，水平方向再从原点往外扩展
 * @param {number} n 建筑数量
 * @param {number} w 建筑宽（经线方向）
 * @param {number} h 建筑长（纬线方向）
 * @param {number} d 建筑高
 * @param {number} maxW 最大布局宽度
 * @param {number} maxH 最大布局长度
 * @param {number} maxD 最大布局高度
 * @param {number[]} start 起始点 [ox,oy,oz]
 * @param {string} title 建筑名（用于异常提示）
 * @return {[x,y,z][]} 坐标数组
 */
export function centralCubeLayout(
  n,
  w,
  h,
  d,
  maxW,
  maxH,
  maxD,
  [ox = 0, oy = 0, oz = 0] = [],
  title = "建筑"
) {
  // 计算每行、每列和每层可以放置的建筑数量
  let maxRow = Math.floor(maxW / w);
  let maxCol = Math.floor(maxH / h);
  let maxLayer = Math.floor(maxD / d);
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 宽长高(${maxW}, ${maxH}, ${maxD}) 限制内放置所有${title}！${title}数量: ${n}`
    );
  }
  // 初始化建筑坐标数组
  let cubes = [];

  // 优先叠满层，水平方向再从原点往外扩展
  let layoutRow = 1;
  let layoutCol = 1;
  let fixedCol = true;
  for (let i = 0; i < n; i++) {
    // 第num+1栋建筑
    let num = Math.floor(i / maxLayer);
    // 水平方向一格一格往外扩展
    if (num >= layoutRow * layoutCol) {
      if (layoutRow > layoutCol && layoutCol < maxCol) {
        layoutCol++;
        fixedCol = true;
      } else {
        layoutRow++;
        fixedCol = false;
      }
    }
    // 所在列（横向索引）
    let row = fixedCol ? num % layoutRow : layoutRow - 1;
    // 所在行（纵向索引）
    let col = fixedCol ? layoutCol - 1 : num % layoutCol;
    // 所在层
    let layer = i % maxLayer;

    // 计算建筑的坐标
    let x = ox + row * w + w / 2;
    let y = oy + col * h + h / 2;
    let z = oz + layer * d; // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}

/**
 * 求依次排列布局坐标（层、列、行）
 * @description 依次优先填充摆放 层、列、行（z、x、y）
 * @param {number} n 建筑数量
 * @param {number} w 建筑宽（经线方向）
 * @param {number} h 建筑长（纬线方向）
 * @param {number} d 建筑高
 * @param {number} maxW 最大布局宽度
 * @param {number} maxH 最大布局长度
 * @param {number} maxD 最大布局高度
 * @param {number[]} start 起始点 [ox,oy,oz]
 * @param {string} title 建筑名（用于异常提示）
 * @return {[x,y,z][]} 坐标数组
 */
export function sequentialCubeLayout(
  n,
  w,
  h,
  d,
  maxW,
  maxH,
  maxD,
  [ox = 0, oy = 0, oz = 0] = [],
  title = "建筑"
) {
  // 计算每行、每列和每层可以放置的建筑数量
  let maxRow = Math.floor(maxW / w);
  let maxCol = Math.floor(maxH / h);
  let maxLayer = Math.floor(maxD / d);
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 宽长高(${maxW}, ${maxH}, ${maxD}) 限制内放置所有${title}！\n${title}数量: ${n}`
    );
  }
  // 初始化建筑坐标数组
  let cubes = [];

  // 依次优先填充摆放 层、列、行（z、x、y）
  for (let i = 0; i < n; i++) {
    // 所在行（纵向索引）
    let col = Math.floor(i / (maxRow * maxLayer));
    // 当前行建筑数量
    let xzNum = i - col * maxRow * maxLayer;
    // 所在列（横向索引）
    let row = Math.floor(xzNum / maxLayer);
    // 所在层
    let layer = xzNum % maxLayer;

    // 计算建筑的坐标
    let x = ox + row * w + w / 2;
    let y = oy + col * h + h / 2;
    let z = oz + layer * d; // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}
