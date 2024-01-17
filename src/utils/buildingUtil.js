import * as Cfg from "@/graph/graphConfig.js";
/** @typedef {import("@/graph/dataMapper").GraphNode} GraphNode */
/** @typedef {import("@/graph/dataMapper").GraphEdge} GraphEdge */
/**
 * @typedef {Object} BuildingItem
 * @property {number} index - 建筑索引
 * @property {[{x,y,z},{x,y,z}]} localOffset - 建筑偏移
 * @property {number} outputObjIdx - 输出对象索引
 * @property {number} outputToSlot - 输出对象插槽索引
 * @property {number} inputObjIdx - 输入对象索引
 * @property {number} inputFromSlot - 输入对象插槽索引
 * @property {number} filterId - 过滤物品id
 */
/**
 * @typedef {Object} BuildingSize 建筑大小信息
 * @property {number} w - 宽（经线方向）
 * @property {number} h - 长（纬线方向）
 * @property {number} d - 高
 * @property {number} cx - 锚点坐标x（从左下角计(0,0)）
 * @property {number} cy - 锚点坐标y
 */
/** 四向大小 @type {BuildingSize} */
const fdirSize = { w: 2, h: 2, d: 2, cx: 1, cy: 1 };
/** 流速器组大小 @type {BuildingSize} */
const monitorSize = { w: 1, h: 2, d: 1, cx: 0.5, cy: 1.5 };
/** 分拣器大小 @type {BuildingSize} */
const inserterSize = { w: 1, h: 2, d: 1, cx: 0.5, cy: 1.5 };

/**
 * 生成蓝图数据
 * @param {GraphNode[]} nodes 节点集
 * @param {GraphEdge[]} edges 边集
 * @param {string} graphName 蓝图名
 * @param {boolean} onlyEdge 是否只生成分拣器，接到地基上
 * @return {object} blueprint
 */
export function generateBlueprint(nodes, edges, graphName, onlyEdge) {
  const blueprint = {
    header: {
      layout: 10,
      icons: [0, 0, 0, 0, 0],
      time: new Date(),
      gameVersion: 0,
      shortDesc: graphName,
      desc: "本蓝图通过 DSP超距电路蓝图设计器 生成！\n作者b站id：晨隐_",
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
  blueprint.buildings = createbuildings(nodes, edges, onlyEdge);
  return blueprint;
}

/**
 * 生成蓝图建筑列表
 * @param {GraphNode[]} nodes 节点集
 * @param {GraphEdge[]} edges 边集
 * @param {boolean} onlyEdge 是否只生成分拣器，接到地基上
 * @return {BuildingItem[]}
 */
export function createbuildings(nodes, edges, onlyEdge = false) {
  let resList = [];
  let fdirList = []; // 四向节点
  let monitorList = []; // 流速器节点
  let outputList = []; // 信号输出
  let inputList = []; // 信号输入
  let baseBelt; // 只生成分拣器时，用于挂分拣器的单个传送带
  if (!onlyEdge) {
    nodes.forEach((n) => {
      switch (n.modelId) {
        case Cfg.ModelId.fdir: // 四向
          fdirList.push(n);
          break;
        case Cfg.ModelId.monitor: // 流速器
          monitorList.push(n);
          break;
        case Cfg.ModelId.output: // 信号输出
          outputList.push(n);
          break;
        case Cfg.ModelId.input: // 信号输入
          inputList.push(n);
          break;
      }
    });
  } else {
    // 只生成分拣器
    if (Cfg.globalSetting.generateMode === 1) {
      // 如果配置生成直连模式，将不生成任何建筑
      return [];
    }
    // 生成传送带挂分拣器
    baseBelt = createBelt({ index: resList.length, offset: [0, 0, -10] });
    resList.push(baseBelt);
  }

  // 1、四向布局
  const fdirLayout = Cfg.layoutSetting.fdirLayout;
  let fdirOffset = [fdirLayout.start.x, fdirLayout.start.y, 0];
  let fdirLayoutCoords = centralCubeLayout(
    fdirList.length,
    fdirSize,
    fdirLayout,
    fdirOffset,
    fdirLayout.name
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

  // 2、流速器布局
  const monitorLayout = Cfg.layoutSetting.monitorLayout;
  let monitorOffset = [monitorLayout.start.x, monitorLayout.start.y, 0];
  let monitorLayoutCoords = centralCubeLayout(
    monitorList.length,
    monitorSize,
    monitorLayout,
    monitorOffset,
    monitorLayout.name
  );
  monitorList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, monitorLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 3、信号输入布局
  const outputLayout = Cfg.layoutSetting.outputLayout;
  let startOffset = [outputLayout.start.x, outputLayout.start.y, 0];
  let outputLayoutCoords = centralCubeLayout(
    outputList.length,
    monitorSize,
    outputLayout,
    startOffset,
    outputLayout.name
  );
  outputList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, outputLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 4、信号输入布局
  const inputLayout = Cfg.layoutSetting.inputLayout;
  let endOffset = [inputLayout.start.x, inputLayout.start.y, 0];
  let inputLayoutCoords = centralCubeLayout(
    inputList.length,
    monitorSize,
    inputLayout,
    endOffset,
    inputLayout.name
  );
  inputList.forEach((n, ni) => {
    //  创建流速器组（带两节传送带）
    const monitorGroup = createMonitorGroup(resList.length, inputLayoutCoords[ni], n, resList);
    nodeId2SlotBeltsMap.set(n.id, monitorGroup._slotsBelts);
  });

  // 5、分拣器：中心扩散布局
  const inserterLayout = Cfg.layoutSetting.inserterLayout;
  let inserterOffset = [inserterLayout.start.x, inserterLayout.start.y, 0];
  let inserterLayoutCoords = centralCubeLayout(
    edges.length * 2,
    inserterSize,
    inserterLayout,
    inserterOffset,
    inserterLayout.name
  );
  let i = 0;
  edges.forEach((e) => {
    let targetSlotsBelts = nodeId2SlotBeltsMap.get(e.target.id);
    let sourceSlotsBelts = nodeId2SlotBeltsMap.get(e.source.id);
    if (Cfg.globalSetting.generateMode === 0) {
      // 无带流模式 生成分拣器
      let outputObjIdx = -1;
      let inputObjIdx = -1;
      if (onlyEdge) {
        // 只生成分拣器，接到单个传送带上
        outputObjIdx = baseBelt.index;
        inputObjIdx = baseBelt.index;
      } else {
        if (targetSlotsBelts && targetSlotsBelts[e.targetSlot.index]) {
          outputObjIdx = targetSlotsBelts[e.targetSlot.index].index;
        }
        if (sourceSlotsBelts && sourceSlotsBelts[e.sourceSlot.index]) {
          inputObjIdx = sourceSlotsBelts[e.sourceSlot.index].index;
        }
      }
      // 一个传送带配1个分拣器，配速黄带满带
      const inserter1 = createInserter({
        index: resList.length,
        offset: inserterLayoutCoords[i++],
        outputObjIdx,
        inputObjIdx,
      });
      resList.push(inserter1);
    } else if (Cfg.globalSetting.generateMode === 1) {
      // 传送带直连模式 修改传送带输出口到另一个传送带
      if (
        targetSlotsBelts &&
        targetSlotsBelts[e.targetSlot.index] &&
        sourceSlotsBelts &&
        sourceSlotsBelts[e.sourceSlot.index]
      ) {
        let targetBelt = targetSlotsBelts[e.targetSlot.index];
        let sourceBelt = sourceSlotsBelts[e.sourceSlot.index];
        // 取两节传送带最慢的带速
        if (sourceBelt.itemId > targetBelt.itemId) {
          sourceBelt.itemId = targetBelt.itemId;
          sourceBelt.modelIndex = targetBelt.modelIndex;
        } else {
          targetBelt.itemId = sourceBelt.itemId;
          targetBelt.modelIndex = sourceBelt.modelIndex;
        }
        // 来源传送带 直接输出到 目标传送带
        sourceBelt.outputObjIdx = targetBelt.index;
        sourceBelt.outputToSlot = 1;
      }
    }
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
  const HorizDistance = 0.7; // 传送带距离四向中心的偏移
  const VerticalDistance = 0.7; // 四个垂直带至少要放下两个货物，否则四向优先输出逻辑将失效（0.7容量为21，0.6容量为19）
  // 四向4个口的传送带位置
  let os = [
    { x: ox, y: oy + HorizDistance, z: oz }, // 上
    { x: ox + HorizDistance, y: oy, z: oz }, // 右
    { x: ox, y: oy - HorizDistance, z: oz }, // 下
    { x: ox - HorizDistance, y: oy, z: oz }, // 左
  ];
  // 四向是否只有一个优先输入
  const onlyOnePriorityIpt =
    node.slots.reduce((sum, s) => {
      return sum + (s.priority === 1 ? 1 : 0) * s.dir;
    }, 0) == -1;
  for (let i = 0; i < 4; i++) {
    const s = node.slots[i];
    if (!s || s.edge == null) continue; // 未连接
    // 四向直连传送带
    let belt1 = {
      index: startIndex + 1,
      offset: [os[i].x, os[i].y, os[i].z + VerticalDistance / 2],
    };
    if (s.dir === 1) {
      // 输出口 从四向输入
      belt1.ipt = [_fdir.index, i];
    } else if (s.dir === -1) {
      // 输入口 输出到四向
      belt1.opt = [_fdir.index, i];
    }
    if (Cfg.globalSetting.generateMode === 0) {
      // 无带流模式 输出口生成垂直传送带
      const beltLevel = 2; // 传送带等级(1,2,3) 默认绿带
      belt1.level = beltLevel;
      // 外接传送带
      let belt2 = {
        index: belt1.index + 1,
        offset: [
          os[i].x * (i % 2 ? 1.01 : 1), // 小偏移，形成完美垂直带
          os[i].y * (i % 2 ? 1 : 1.01),
          os[i].z - VerticalDistance / 2,
        ],
        level: beltLevel,
      };
      if (s.dir === 1) {
        // 输出到下一节
        belt1.opt = [belt2.index, 1]; // 传送带插槽默认为1
      } else if (s.dir === -1) {
        // 输出到上一节
        belt2.opt = [belt1.index, 1]; // 传送带插槽默认为1
        if (onlyOnePriorityIpt && s.priority === 1) {
          // 四向只有一个优先输入时，优先输入端使用黄带
          belt1.level = 1;
          belt2.level = 1;
        }
      }
      const belt1_building = createBelt(belt1);
      const belt2_building = createBelt(belt2);
      buildList.push(belt1_building);
      buildList.push(belt2_building);
      _slotsBelts[i] = belt2_building; // 记录外接传送带建筑对象
    } else if (Cfg.globalSetting.generateMode === 1) {
      // 传送带直连模式 输出口只生成一个传送带节点
      if (onlyOnePriorityIpt && s.dir === -1 && s.priority === 1) {
        // 四向只有一个优先输入时，优先输入端使用绿带
        belt1.level = 2;
      } else {
        // 否则使用蓝带
        belt1.level = 3;
      }
      const belt1_building = createBelt(belt1);
      buildList.push(belt1_building);
      _slotsBelts[i] = belt1_building; // 记录外接传送带建筑对象
    }
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
 * @param {number} opt.level 传送带等级(1,2,3) 默认1级带
 * @return {BuildingItem}
 */
export function createBelt({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  opt: [outputObjIdx = -1, outputToSlot = 0] = [],
  ipt: [inputObjIdx = -1, inputFromSlot = 0] = [],
  level = 1,
  iconId,
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
    parameters: iconId == null ? null : { iconId },
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
  let beltLevel = 2; // 传送带等级(1,2,3) 默认蓝带
  let targetCargoAmount = 60; // 目标流量(单位：0.1个)
  if (Cfg.globalSetting.generateMode === 0) {
    // 无带流配速黄带 使用绿带
    targetCargoAmount = 60;
    beltLevel = 2;
  } else if (Cfg.globalSetting.generateMode === 1) {
    // 直连传送带配速绿带 使用蓝带
    targetCargoAmount = 120;
    beltLevel = 3;
  }
  if (node.modelId === Cfg.ModelId.output || node.modelId === Cfg.ModelId.input) {
    // 只有 信号输出、信号输入 才点亮流速器
    passColorId = 113;
    failColorId = 13;
  }
  // else if (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === 1) {
  //   // 非开始和结束节点的生成货物流速器 速度改为12/s，匹配优先口满带(用于提速初始化)
  //   targetCargoAmount = 120;
  // }
  const beltDistance = 0.7;
  // 接流速器
  let belt1 = {
    index: startIndex + 1,
    offset: [ox, oy, oz],
    level: beltLevel,
  };
  // 外接
  let belt2 = {
    index: startIndex + 2,
    offset: [ox, oy - beltDistance, oz],
    iconId: node.signalId, // 传送带标记
    level: beltLevel,
  };
  if (
    node.modelId === Cfg.ModelId.output ||
    (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === 1)
  ) {
    // 信号输出 或流速器 生成货物
    spawnItemOperator = 1;
    // 输出到下一节
    belt1.opt = [belt2.index, 1]; // 传送带插槽默认为1
  } else if (
    node.modelId === Cfg.ModelId.input ||
    (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === -1)
  ) {
    // 信号输入 或流速器 消耗货物
    spawnItemOperator = 2;
    // 输出到上一节
    belt2.opt = [belt1.index, 1]; // 传送带插槽默认为1
  }
  // 创建流速器
  const _monitor = createMonitor({
    index: startIndex,
    offset: [ox, oy, oz],
    spawnItemOperator, // 生成/消耗货物
    cargoFilter: node.itemId,
    passColorId,
    failColorId,
    targetCargoAmount,
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
 * @param {number} opt.targetCargoAmount 	目标流量(单位：0.1个)
 * @return {BuildingItem}
 */
export function createMonitor({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  spawnItemOperator = 1,
  cargoFilter = 6002,
  passColorId = 113,
  failColorId = 13,
  targetCargoAmount = 30,
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
      targetCargoAmount,
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
 * 创建地基
 * @param {Object} opt
 * @param {number} opt.index 索引
 * @param {number[]} opt.offset 偏移 [x,y,z]
 * @return {BuildingItem}
 */
export function createBase({ index, offset: [x = 0, y = 0, z = -10] = [] }) {
  return {
    index: index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y: y - 1, z },
    ],
    yaw: [0, 0],
    itemId: 1131,
    modelIndex: 37, // 使用极速传送带模型
    outputObjIdx: -1,
    inputObjIdx: -1,
    outputToSlot: 0,
    inputFromSlot: 0,
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
 * 求中心扩散布局坐标（优先叠满层，再原点扩散布局）
 * @description 优先叠满层，水平方向再从原点往外扩展
 * @param {number} n 建筑数量
 * @param {BuildingSize} size 建筑大小信息
 * @param {Cfg.BuildingLayout} layout 建筑布局信息
 * @param {number[]} start 起始点 [ox,oy,oz]
 * @param {number} dir
 * @param {string} title 建筑名（用于异常提示）
 * @return {[x,y,z][]} 坐标数组
 */
export function centralCubeLayout(
  n,
  { w = 0, h = 0, d = 0, cx = 0, cy = 0 },
  { maxW = 0, maxH = 0, maxD = 0, dir = 1, space = 0 },
  [ox = 0, oy = 0, oz = 0] = [],
  title = "建筑"
) {
  // 展开方向
  let xDir, yDir;
  if (dir == 0) {
    // 左上
    xDir = -1;
    yDir = 1;
    cx = cx - w;
  } else if (dir == 2) {
    // 右下
    xDir = 1;
    yDir = -1;
    cy = cy - h;
  } else if (dir == 3) {
    // 左下
    xDir = -1;
    yDir = -1;
    cx = cx - w;
    cy = cy - h;
  } else {
    // 默认右上 1
    dir = 1;
    xDir = 1;
    yDir = 1;
  }
  // 计算每行、每列和每层可以放置的建筑数量
  let maxRow = Math.floor((maxW + space) / (w + space));
  let maxCol = Math.floor((maxH + space) / (h + space));
  let maxLayer = Math.floor(maxD / d);
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 限宽(${maxW}),限长(${maxH}),限高(${maxD})${
        space > 0 ? ",间隔(" + space + ")" : ""
      } 的条件范围内放置所有${title}！${title}数量: ${n}`
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
    let x = ox + cx + xDir * row * (w + space);
    let y = oy + cy + yDir * col * (h + space);
    let z = oz + layer * d; // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}

/**
 * 求依次排列布局坐标（层、列、行）
 * @description 依次优先填充摆放 层、列、行（z、x、y）
 * @param {number} n 建筑数量
 * @param {BuildingSize} size 建筑大小信息
 * @param {Cfg.BuildingLayout} layout 建筑布局信息
 * @param {number[]} start 起始点 [ox,oy,oz]
 * @param {string} title 建筑名（用于异常提示）
 * @return {[x,y,z][]} 坐标数组
 */
export function sequentialCubeLayout(
  n,
  { w = 0, h = 0, d = 0, cx = 0, cy = 0 },
  { maxW = 0, maxH = 0, maxD = 0, dir = 1, space = 0 },
  [ox = 0, oy = 0, oz = 0] = [],
  title = "建筑"
) {
  // 展开方向
  let xDir, yDir;
  if (dir == 0) {
    // 左上
    xDir = -1;
    yDir = 1;
    cx = cx - w;
  } else if (dir == 2) {
    // 右下
    xDir = 1;
    yDir = -1;
    cy = cy - h;
  } else if (dir == 3) {
    // 左下
    xDir = -1;
    yDir = -1;
    cx = cx - w;
    cy = cy - h;
  } else {
    // 默认右上 1
    dir = 1;
    xDir = 1;
    yDir = 1;
  }
  // 计算每行、每列和每层可以放置的建筑数量
  let maxRow = Math.floor((maxW + space) / (w + space));
  let maxCol = Math.floor((maxH + space) / (h + space));
  let maxLayer = Math.floor(maxD / d);
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 限宽(${maxW}),限长(${maxH}),限高(${maxD})${
        space > 0 ? ",间隔(" + space + ")" : ""
      } 的条件范围内放置所有${title}！${title}数量: ${n}`
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
    let x = ox + cx + xDir * row * (w + space);
    let y = oy + cy + yDir * col * (h + space);
    let z = oz + layer * d; // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}
