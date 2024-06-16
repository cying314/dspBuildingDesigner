import * as Cfg from "@/graph/graphConfig.js";
import * as ItemsUtil from "@/utils/itemsUtil.js";
import * as Util from "@/graph/graphUtil.js";
import * as Mapper from "@/graph/dataMapper";
/**
 * @typedef {Object} BuildingItem
 * @property {number} index - 建筑索引
 * @property {[{x,y,z},{x,y,z}]} localOffset - 建筑偏移
 * @property {number} outputObjIdx - 输出对象索引
 * @property {number} outputToSlot - 输出对象插槽索引
 * @property {number} inputObjIdx - 输入对象索引
 * @property {number} inputFromSlot - 输入对象插槽索引
 * @property {number} filterId - 过滤物品id
 * @property {BuildingItem[]} _belts - (临时属性) 关联传送带建筑对象
 * @property {number[]} _slotsBeltIdx - (临时属性) 插槽外接的传送带建筑对象索引
 * @property {{priority,iconId,count}} parameters - 建筑属性
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
 * @param {Mapper.GraphData} graphData 图谱数据
 * @param {Mapper.GraphNode[]} nodes 节点集
 * @param {Map<string, Mapper.PackageModel>} packageMap 封装节点映射 hash->PackageModel
 * @param {string} graphName 蓝图名
 * @return {object} blueprint
 */
export function generateBlueprint(graphData) {
  const graphParse = Mapper.graphDataParse(graphData);
  const packageMap = new Map();
  graphParse.packages?.forEach((p) => {
    packageMap.set(p.hash, p);
  });
  const blueprint = {
    header: {
      layout: 10,
      icons: [0, 0, 0, 0, 0],
      time: new Date(),
      gameVersion: 0,
      shortDesc: graphData.header.graphName,
      desc: `本蓝图通过[DSP超距电路蓝图设计器]生成！\n作者b站id：晨隐_\n*蓝图粘贴时请尽量使用"沙盒瞬间建造"或断电建造，避免物品流动错位`,
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
  blueprint.buildings = createbuildings({
    nodes: graphParse.nodes,
    packageMap,
  });
  return blueprint;
}

/**
 * 生成蓝图建筑列表
 * @param {Object} opt
 * @param {Mapper.GraphNode[]} opt.nodes 节点集
 * @param {Map<string, Mapper.PackageModel>} opt.packageMap 封装节点映射 hash->PackageModel
 * @return {BuildingItem[]}
 */
export function createbuildings({ nodes, packageMap }) {
  // 解析节点生成建筑
  let nodeGroup = collateNodes(nodes, packageMap);

  // 1、排列 四向分流器 建筑布局
  formatBuildsLayout(nodeGroup.fdirList, fdirSize, Cfg.layoutSetting.fdirLayout, true);

  // 2、排列 流速器 建筑布局
  formatBuildsLayout(nodeGroup.monitorList, monitorSize, Cfg.layoutSetting.monitorLayout);

  // 输入输出口按传送带标记升序，为空时当做0
  nodeGroup.outputList.sort((a, b) => {
    return (
      (a._belts[a._slotsBeltIdx[a._slotsBeltIdx.length - 1]]?.parameters?.count ?? 0) -
      (b._belts[b._slotsBeltIdx[b._slotsBeltIdx.length - 1]]?.parameters?.count ?? 0)
    );
  });
  nodeGroup.inputList.sort((a, b) => {
    return (
      (a._belts[a._slotsBeltIdx[a._slotsBeltIdx.length - 1]]?.parameters?.count ?? 0) -
      (b._belts[b._slotsBeltIdx[b._slotsBeltIdx.length - 1]]?.parameters?.count ?? 0)
    );
  });

  // 3、排列 信号输出流速器 建筑布局
  formatBuildsLayout(nodeGroup.outputList, monitorSize, Cfg.layoutSetting.outputLayout);

  // 4、排列 信号输入流速器 建筑布局
  formatBuildsLayout(nodeGroup.inputList, monitorSize, Cfg.layoutSetting.inputLayout);

  // 将 输入输出流速器 前移到 普通流速器 前（使 输入/输出流速器 提前建造，用于建筑过多时，避免因渲染优化导致终端流速器无法显示）
  if (Cfg.globalSetting.forwardEndBuilding && nodeGroup.monitorList.length > 0) {
    let prevBuilds = [];
    let moveIndexs = [];
    nodeGroup.outputList.concat(nodeGroup.inputList).forEach((b) => {
      prevBuilds.push(b);
      moveIndexs.push(b.index);
      b._belts.forEach((belt) => {
        prevBuilds.push(belt);
        moveIndexs.push(belt.index);
      });
    });
    if (moveIndexs.length > 0) {
      moveIndexs.sort((a, b) => b - a); // 降序删除
      moveIndexs.forEach((index) => {
        nodeGroup.builds.splice(index, 1);
      });
      nodeGroup.builds.unshift(...prevBuilds); // 前插
      // 重排建筑index顺序
      resetBuildingsIndex(nodeGroup.builds);
    }
  }

  // 5、解析边集，创建分拣器
  let inserterList = generateInserter(nodeGroup.edgeSet, nodeGroup.idToBuildMap, nodeGroup.builds);

  // 6、排列 分拣器 建筑布局
  formatBuildsLayout(inserterList, inserterSize, Cfg.layoutSetting.inserterLayout);

  return nodeGroup.builds;
}

/**
 * 重排建筑index顺序
 * @param {BuildingItem[]} buildings 全部建筑列表
 */
export function resetBuildingsIndex(buildings) {
  let indexMap = {};
  buildings.forEach((v, index) => {
    indexMap[v.index] = index;
  });
  buildings.forEach((v) => {
    v.index = indexMap[v.index];
    if (v.outputObjIdx != -1) v.outputObjIdx = indexMap[v.outputObjIdx];
    if (v.inputObjIdx != -1) v.inputObjIdx = indexMap[v.inputObjIdx];
  });
}

/**
 * @typedef {Object} CollateNodesRes
 * @property {BuildingItem[]} builds 全部建筑列表
 * @property {BuildingItem[]} fdirList 四向建筑列表
 * @property {BuildingItem[]} monitorList 流速器建筑列表
 * @property {BuildingItem[]} outputList 信号输出建筑列表
 * @property {BuildingItem[]} inputList 信号输入建筑列表
 * @property {Set<Mapper.GraphEdge>} edgeSet 边集
 * @property {number} maxId 最大节点id
 * @property {Map<number,BuildingItem>} idToBuildMap 节点id->建筑对象映射
 */
/**
 * 解析节点生成建筑
 * @param {Mapper.GraphNode[]} nodes 节点集合
 * @param {Map<string, Mapper.PackageModel>} packageMap 封装节点映射 hash->PackageModel
 * @param {CollateNodesRes} res 返回集合，若传入则在原来基础上累加
 * @param {boolean} isPackage 是否封装内建筑
 * @return {CollateNodesRes}
 */
export function collateNodes(nodes, packageMap, res, isPackage) {
  res ??= {};
  res.builds ??= [];
  res.fdirList ??= [];
  res.monitorList ??= [];
  res.outputList ??= [];
  res.inputList ??= [];
  res.edgeSet ??= new Set();
  res.maxId ??= 0;
  res.idToBuildMap ??= new Map();
  /** @type {Mapper.GraphNode[]} 封装模块节点 */
  const packageNodeList = [];
  nodes.forEach((n) => {
    if (n.id > res.maxId) res.maxId = n.id;

    if (isPackage && (n.modelId === Cfg.ModelId.input || n.modelId === Cfg.ModelId.output)) {
      // 封装建筑内的输入归到普通流速器里
      n.modelId = Cfg.ModelId.monitor;
    }

    var hasEdge = false;
    n.slots.forEach((s) => {
      if (s.edge != null) {
        hasEdge = true;
        if (
          s.edge.target.modelId !== Cfg.ModelId.package &&
          s.edge.source.modelId !== Cfg.ModelId.package &&
          s.edge.target.modelId !== Cfg.ModelId.set_zero &&
          s.edge.source.modelId !== Cfg.ModelId.set_zero
        ) {
          // 记录连线（排除连在封装模块/置零节点的连线）
          // 封装节点不新建连线，而是修改内置连线目标外置
          // 置0不生成消耗建筑，不连接
          res.edgeSet.add(s.edge);
        }
      }
    });
    // 只生成有连接的节点
    if (!hasEdge) return;
    switch (n.modelId) {
      case Cfg.ModelId.fdir: // 四向
        var priorityInIdx = []; // 优先输入插槽索引
        var priorityOutIdx = []; // 优先输出插槽索引
        var inputIdx = []; // 输入插槽索引
        var outputIdx = []; // 输出插槽索引
        for (let i = 0; i < 4; i++) {
          const s = n.slots[i];
          if (s.edge == null) continue;
          if (s.dir === 1) {
            // 输出
            outputIdx.push(i);
            if (s.priority === 1) priorityOutIdx.push(i);
          } else {
            // 输入
            inputIdx.push(i);
            if (s.priority === 1) priorityInIdx.push(i);
          }
        }
        // 四向两进两出，且没有带过滤的优先输出，优先输入口使用配速带（配绿带）
        if (
          inputIdx.length == 2 &&
          outputIdx.length == 2 &&
          (priorityOutIdx.length == 0 || !n.slots[priorityOutIdx[0]].filterId) &&
          priorityInIdx.length == 1
        ) {
          n.slots[priorityInIdx[0]]._onlyOnePriorityIpt = true;
        }
        // // 四向只有一个优先输入时，标记优先输入边使用配速带（无带：配黄带，直连：配绿带）
        // if (priorityInIdx.length == 1) {
        //   n.slots[priorityInIdx[0]]._onlyOnePriorityIpt = true;
        // }
        // 集装分拣器可满带速，无需两个分拣器了
        // // 无带流模式下，四向是否两进一出，标记输出口接两个分拣器
        // if (Cfg.globalSetting.generateMode === 0 && inputIdx.length == 2 && outputIdx.length == 1) {
        //   n.slots[outputIdx[0]]._doubleInserter = true;
        // }

        var fdir = createFdirGroup(n, res.builds.length);
        res.fdirList.push(fdir);
        res.builds.push(fdir);
        res.builds.push(...fdir._belts);
        res.idToBuildMap.set(n.id, fdir);
        break;
      case Cfg.ModelId.monitor: // 流速器
        var monitor = createMonitorGroup(n, res.builds.length);
        res.monitorList.push(monitor);
        res.builds.push(monitor);
        res.builds.push(...monitor._belts);
        res.idToBuildMap.set(n.id, monitor);
        break;
      case Cfg.ModelId.output: // 信号输出
        var output = createMonitorGroup(n, res.builds.length);
        res.outputList.push(output);
        res.builds.push(output);
        res.builds.push(...output._belts);
        res.idToBuildMap.set(n.id, output);
        break;
      case Cfg.ModelId.input: // 信号输入
        var input = createMonitorGroup(n, res.builds.length);
        res.inputList.push(input);
        res.builds.push(input);
        res.builds.push(...input._belts);
        res.idToBuildMap.set(n.id, input);
        break;
      case Cfg.ModelId.package: // 封装模块
        packageNodeList.push(n);
        break;
      case Cfg.ModelId.set_zero: // 置零
        // 置0不生成消耗建筑
        break;
    }
  });
  // 解析封装节点
  packageNodeList.forEach((n) => {
    let p = packageMap.get(n.packageHash);
    if (p == null) throw "数据异常，找不到封装组件数据！";
    // 校验图谱数据
    Util.checkGraphData(p.graphData, true, false);
    // 解析图谱数据(偏移节点id，避免id重复)
    let graphParse = Mapper.graphDataParse(p.graphData, res.maxId);

    n.slots.forEach((s) => {
      if (s.edge == null) return;
      // 已链接的封装模块内的 输入输出节点
      let outsideNode = graphParse._nodeMapByOriginId.get(s.packageNodeId);
      if (
        outsideNode == null ||
        (outsideNode.modelId != Cfg.ModelId.output && outsideNode.modelId != Cfg.ModelId.input) ||
        outsideNode.slots[0] == null
      ) {
        throw "封装组件插槽节点数据异常！";
      }
      let outsideNodeSlot = outsideNode.slots[0];
      // 内置输入输出口未连接，跳过
      if (outsideNodeSlot.edge == null) return;

      // 将内置输入输出口的连接线 链接到封装外插槽连接的节点
      if (s.dir == -1) {
        // 封装模块的信号输出插槽
        outsideNodeSlot.edge.source = s.edge.source;
        outsideNodeSlot.edge.sourceSlot = s.edge.sourceSlot;
        s.edge.sourceSlot.edge = outsideNodeSlot.edge;
      } else {
        // 封装模块的信号输入插槽
        outsideNodeSlot.edge.target = s.edge.target;
        outsideNodeSlot.edge.targetSlot = s.edge.targetSlot;
        s.edge.targetSlot.edge = outsideNodeSlot.edge;
      }
      // 记录这条连接
      if (
        outsideNodeSlot.edge.target.modelId !== Cfg.ModelId.package &&
        outsideNodeSlot.edge.source.modelId !== Cfg.ModelId.package &&
        outsideNodeSlot.edge.target.modelId !== Cfg.ModelId.set_zero &&
        outsideNodeSlot.edge.source.modelId !== Cfg.ModelId.set_zero
      ) {
        res.edgeSet.add(outsideNodeSlot.edge);
      }
      // 断开封装模块原插槽连接
      res.edgeSet.delete(s.edge); // 移除可能存在的连续封装模块的连线
      s.edge = null;
      // 断开封装内原输入输出口连接
      outsideNodeSlot.edge = null;
    });

    // 递归解析封装节点数据
    collateNodes(graphParse.nodes, packageMap, res, true);
  });
  return res;
}

/**
 * 根据布局对象排列建筑位置
 * @param {BuildingItem[]} builds 建筑列表
 * @param {BuildingSize} size 建筑大小信息
 * @param {Cfg.BuildingLayout} layout 建筑布局信息
 * @param {boolean} isStack 是否堆叠建筑
 */
export function formatBuildsLayout(builds, size, layout, isStack = false) {
  let cubeLayoutFun;
  switch (Cfg.globalSetting.layoutMode) {
    case 1: // 逐行铺满
      cubeLayoutFun = sequentialCubeLayout;
      break;
    case 0:
    default: // 原点扩散（默认）
      cubeLayoutFun = centralCubeLayout;
      break;
  }
  // 生成布局坐标数组
  let layoutCoords = cubeLayoutFun(
    builds.length,
    size,
    layout,
    [layout.start.x, layout.start.y, layout.start.z],
    layout.name
  );
  for (let i = 0; i < builds.length; i++) {
    let build = builds[i];
    let [x, y, z] = layoutCoords[i];
    if (isStack && z !== 0 && i > 0) {
      // 堆叠建筑z不为0，赋值上一个建筑做底
      build.inputObjIdx = builds[i - 1].index ?? -1;
    }
    // 原对象坐标
    let { x: ox1 = 0, y: oy1 = 0, z: oz1 = 0 } = build.localOffset[0] ?? {};
    let { x: ox2 = 0, y: oy2 = 0, z: oz2 = 0 } = build.localOffset[1] ?? {};
    // 更新坐标
    build.localOffset = [
      { x, y, z },
      { x: x + ox2 - ox1, y: y + oy2 - oy1, z: z + oz2 - oz1 },
    ];
    // 更新关联传送带坐标
    build._belts?.forEach((b) => {
      // 相对主建筑偏移
      let { x: bx = 0, y: by = 0, z: bz = 0 } = b.localOffset[0] ?? {};
      let os = { x: x + bx - ox1, y: y + by - oy1, z: z + bz - oz1 };
      b.localOffset = [os, os];
    });
  }
}

/**
 * 四向卡容量垂直距离
 * 卡29容量可以使黄绿带变1tick延迟（长度->容量：0.7->21, 0.6->19, 1.2->29, 1.3->31, 1.4->33, 1.6->35, 1.7->37, 1.8->39）
 *
 * 四个垂直带至少要放下两个货物，否则四向优先输出逻辑将失效
 */
const VerticalDistance = 1.2;

/**
 * 创建四向建筑组（四向带4个短垂直带结构）
 * @param {Mapper.GraphNode} node 节点
 * @param {number} startIndex 起始索引
 * @param {number[]} offset 偏移 [ox,oy,oz]
 * @return {BuildingItem} 四向建筑组对象
 */
export function createFdirGroup(node, startIndex = 0, [ox = 0, oy = 0, oz = 0] = []) {
  let filterId = 0;
  let priority = [false, false, false, false];

  // 创建四向底下四个垂直带
  const _belts = [];
  const _slotsBeltIdx = [];
  const HorizDistance = 0.7; // 传送带距离四向中心的偏移
  const os = [
    // 垂直带相对位置
    { x: ox, y: oy + HorizDistance, z: oz }, // 上
    { x: ox + HorizDistance, y: oy, z: oz }, // 右
    { x: ox, y: oy - HorizDistance, z: oz }, // 下
    { x: ox - HorizDistance, y: oy, z: oz }, // 左
  ];
  let offsetIndex = 0;
  for (let i = 0; i < 4; i++) {
    const s = node.slots[i];
    if (s.edge == null) continue; // 未连接
    if (s.priority === 1) {
      // 是否优先接口
      priority[i] = true;
    }
    // 优先输出过滤物品id
    if (s.priority === 1 && s.dir === 1 && s.filterId != null) {
      filterId = s.filterId;
    }
    // 创建四向直连的传送带
    let belt1 = {
      index: startIndex + ++offsetIndex, // 四向索引startIndex
      offset: [os[i].x, os[i].y, os[i].z + VerticalDistance / 2],
    };
    if (s.dir === 1) {
      // 输出口 从四向输入
      belt1.ipt = [startIndex, i];
    } else if (s.dir === -1) {
      // 输入口 输出到四向
      belt1.opt = [startIndex, i];
    }
    if (Cfg.globalSetting.generateMode === 0) {
      // 无带流模式 输出口生成垂直传送带
      const beltLevel = 3; // 传送带等级(1,2,3) 默认蓝带
      belt1.level = beltLevel;

      // 创建外接传送带
      let belt2 = {
        index: startIndex + ++offsetIndex,
        offset: [
          os[i].x + (i == 1 ? 0.01 : i == 3 ? -0.01 : 0), // 小偏移量，形成完美垂直带，并且都朝外
          os[i].y + (i == 0 ? 0.01 : i == 2 ? -0.01 : 0),
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
        if (s._onlyOnePriorityIpt) {
          // 四向只有一个优先输入时，优先输入端使用绿带
          belt1.level = 2;
          belt2.level = 2;
        }
      }
      const belt1_building = createBelt(belt1);
      const belt2_building = createBelt(belt2);
      // 记录关联的传送带对象
      _belts.push(belt1_building);
      _belts.push(belt2_building);
      // 记录插槽外接传送带建筑对象索引
      _slotsBeltIdx[i] = _belts.length - 1; // belt2_building
    } else if (Cfg.globalSetting.generateMode === 1) {
      // 传送带直连模式 输出口只生成一个传送带节点
      if (s._onlyOnePriorityIpt) {
        // 四向只有一个优先输入时，优先输入端使用绿带
        belt1.level = 2;
      } else {
        // 否则使用蓝带
        belt1.level = 3;
      }
      const belt1_building = createBelt(belt1);
      // 记录关联的传送带对象
      _belts.push(belt1_building);
      // 记录插槽外接传送带建筑对象索引
      _slotsBeltIdx[i] = _belts.length - 1; // belt1_building
    } else if (Cfg.globalSetting.generateMode === 2) {
      // 隔空直连模式
      if (s.dir === -1) {
        // 只保留输入的的传送带
        const beltLevel = s._onlyOnePriorityIpt ? 2 : 3; // 四向只有一个优先输入时，优先输入端使用绿带；默认蓝带
        belt1.level = beltLevel;
        // 创建外接传送带
        let belt2 = {
          index: startIndex + ++offsetIndex,
          offset: [
            os[i].x + (i == 1 ? 0.01 : i == 3 ? -0.01 : 0), // 小偏移量，形成完美垂直带，并且都朝外
            os[i].y + (i == 0 ? 0.01 : i == 2 ? -0.01 : 0),
            os[i].z - VerticalDistance / 2,
          ],
          level: beltLevel,
          opt: [belt1.index, 1], // 输出到上一节（传送带插槽默认为1）
        };
        const belt1_building = createBelt(belt1);
        const belt2_building = createBelt(belt2);
        // 记录关联的传送带对象
        _belts.push(belt1_building);
        _belts.push(belt2_building);
        // 记录插槽外接传送带建筑对象索引
        _slotsBeltIdx[i] = _belts.length - 1; // belt2_building
      } else {
        offsetIndex--;
      }
    }
  }

  // 创建四向分流器
  const _fdir = createFdir({
    index: startIndex,
    offset: [ox, oy, oz],
    priority,
    filterId,
  });
  _fdir._belts = _belts;
  _fdir._slotsBeltIdx = _slotsBeltIdx;
  return _fdir;
}

/**
 * 创建流速器组（流速器带两节传送带）
 * @param {Mapper.GraphNode} node 节点
 * @param {number} startIndex 起始索引
 * @param {number[]} offset 偏移 [ox,oy,oz]
 * @return {BuildingItem} 流速器组对象
 */
export function createMonitorGroup(node, startIndex = 0, [ox = 0, oy = 0, oz = 0] = []) {
  let spawnItemOperator = 1; // 0:不勾选 1:生成货物 2:消耗货物
  let passColorId = 1;
  let failColorId = 1;
  // 集装分拣器更新后，无带流和直连带都是配速绿带 使用蓝带
  let beltLevel = 3; // 传送带等级(1,2,3) 默认蓝带
  let targetCargoAmount = 120; // 目标流量(单位：0.1个)
  // if (Cfg.globalSetting.generateMode === 0) {
  //   // 无带流配速黄带 使用绿带
  //   targetCargoAmount = 60;
  //   beltLevel = 3;
  // } else if (Cfg.globalSetting.generateMode === 1) {
  //   // 直连传送带配速绿带 使用蓝带
  //   targetCargoAmount = 120;
  //   beltLevel = 3;
  // }
  if (node.modelId === Cfg.ModelId.output || node.modelId === Cfg.ModelId.input) {
    // 只有 信号输出、信号输入 才点亮流速器
    passColorId = Cfg.globalSetting.passColorId;
    failColorId = Cfg.globalSetting.failColorId;
  } else if (node.modelId === Cfg.ModelId.monitor && node.slots[0].dir === 1) {
    // 生成货物流速器 速度改为30/s，匹配优先口满带(用于提速初始化)
    targetCargoAmount = 300;
  }

  // 无带流使用集装分拣器，需要叠满层货物，避免集装分拣器自己叠层
  // if (Cfg.globalSetting.generateMode === 0) {
  // 为避免显示元件需要做两套，直连模式也叠层
  targetCargoAmount *= 4;
  if (node.modelId === Cfg.ModelId.output) {
    // 信号输出口的生成货物需要配速绿带，不然120*4不会叠满4层
    beltLevel = 2;
  }
  // }

  const yOffset = -0.1; // 整体偏移，避免非瞬间建造时流速器绑定错位问题
  const beltDistance = 0.7; // 传送带间距
  // 接流速器
  let belt1 = {
    index: startIndex + 1,
    offset: [ox, oy + yOffset, oz],
    level: beltLevel,
  };
  // 外接
  let belt2 = {
    index: startIndex + 2,
    offset: [ox, oy + yOffset - beltDistance, oz],
    level: beltLevel,
  };

  // 隔空直连 普通流速器下传送带改为固定容量垂直带，优化四向延迟
  if (node.modelId === Cfg.ModelId.monitor && Cfg.globalSetting.generateMode === 2) {
    belt2.offset = [
      belt1.offset[0],
      belt1.offset[1] - 0.01, // 小偏移量，形成完美垂直带
      belt1.offset[2] - VerticalDistance,
    ];
  }

  // 传送带图标标记
  if (
    Cfg.globalSetting.monitorIconMode == 0 || // 全显示
    (Cfg.globalSetting.monitorIconMode == 1 && node.modelId !== Cfg.ModelId.monitor) // 隐藏非终端标记
  ) {
    belt2.iconId = node.signalId; // 传送带标记图标id
    belt2.count = node.count; // 传送带标记数
  }

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
    if (node.modelId === Cfg.ModelId.input) {
      // 输入口不自动消耗
      spawnItemOperator = 1;
    }
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
  // 创建底下传送带
  const belt1_building = createBelt(belt1);
  const belt2_building = createBelt(belt2);
  // 记录关联的传送带对象
  _monitor._belts = [belt1_building, belt2_building];
  // 记录插槽外接传送带建筑对象索引
  _monitor._slotsBeltIdx = [_monitor._belts.length - 1]; // belt2_building
  return _monitor;
}

/**
 * 根据布局生成分拣器建筑（或者虚空连接）
 * @param {Set<Mapper.GraphEdge>} edgeSet 边集合
 * @param {Map<number,BuildingItem>} idToBuildMap 节点id->建筑对象映射
 * @param {BuildingItem[]} builds 建筑列表
 */
export function generateInserter(edgeSet, idToBuildMap, builds) {
  // 分拣器布局
  let inserterList = [];
  let deleteIndexs = []; // 标记删除的建筑索引
  edgeSet.forEach((e) => {
    let targetBuild = idToBuildMap.get(e.target.id);
    let sourceBuild = idToBuildMap.get(e.source.id);
    let targetBelt;
    let sourceBelt;
    // 获取插槽外接传送带对象
    if (targetBuild) {
      targetBelt = targetBuild._belts[targetBuild._slotsBeltIdx[e.targetSlot.index]];
    }
    if (sourceBuild) {
      sourceBelt = sourceBuild._belts[sourceBuild._slotsBeltIdx[e.sourceSlot.index]];
    }

    if (Cfg.globalSetting.generateMode === 0) {
      // 无带流模式 生成分拣器
      let outputObjIdx = targetBelt ? targetBelt.index : -1;
      let inputObjIdx = sourceBelt ? sourceBelt.index : -1;
      // 创建分拣器连接传送带，配速黄带满带
      const inserter1 = createInserter({
        index: builds.length,
        outputObjIdx,
        inputObjIdx,
      });
      builds.push(inserter1);
      inserterList.push(inserter1);

      // 集装分拣器可满带速，无需两个分拣器了
      // if (e.targetSlot?._doubleInserter || e.sourceSlot?._doubleInserter) {
      //   // 四向两进一出，输出口接两个分拣器（配速混带输出）
      //   const inserter2 = createInserter({
      //     index: builds.length,
      //     outputObjIdx,
      //     inputObjIdx,
      //   });
      //   builds.push(inserter2);
      //   inserterList.push(inserter2);
      // }
    } else if (Cfg.globalSetting.generateMode === 1) {
      // 传送带直连模式 修改传送带输出口到另一个传送带
      if (targetBelt && sourceBelt) {
        // 取两节传送带最慢的带速 作为整条传送带的速度
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
    } else if (Cfg.globalSetting.generateMode === 2) {
      // 隔空直连模式
      if (e.target.modelId === Cfg.ModelId.fdir && sourceBelt) {
        // 其他建筑->四向，外接传送带 隔空连到 目标四向的入口
        if (
          [Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(e.source.modelId)
        ) {
          // 处理流速器输入四向，移除四向上的外接带
          if (targetBelt) {
            deleteIndexs.push(targetBelt.index); // 外接带
            deleteIndexs.push(targetBelt.outputObjIdx); // 外接带的上一格带子
          }
          if (e.targetSlot._onlyOnePriorityIpt) {
            // 四向只有一个优先输入时，优先输入端流速器使用绿带
            sourceBuild._belts.forEach((b) => {
              b.itemId = 2002;
              b.modelIndex = 36;
            });
          }
        }
        sourceBelt.outputObjIdx = targetBuild.index;
        sourceBelt.outputToSlot = e.targetSlot.index;
      } else if (e.source.modelId === Cfg.ModelId.fdir && targetBelt) {
        // 四向->其他建筑，来源四向的出口 隔空连到 外接传送带
        targetBelt.inputObjIdx = sourceBuild.index;
        targetBelt.inputFromSlot = e.sourceSlot.index;
      } else if (targetBelt && sourceBelt) {
        // 其余连接，来源传送带 直接输出到 目标传送带
        sourceBelt.outputObjIdx = targetBelt.index;
        sourceBelt.outputToSlot = 1;
      }
    }
  });
  // 移除多余建筑
  if (deleteIndexs.length > 0) {
    deleteIndexs.sort((a, b) => b - a);
    // 索引从大到小排列删除建筑
    for (let index of deleteIndexs) {
      builds.splice(index, 1);
    }
    // 重排建筑index顺序
    resetBuildingsIndex(builds);
  }
  return inserterList;
}

/**
 * 创建四向分流器
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
    tilt: 0,
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
    filterId: mappingItemId(filterId),
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
 * @param {number} opt.iconId 传送带标记图标id
 * @param {number} opt.count 传送带标记数
 * @return {BuildingItem}
 */
export function createBelt({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  opt: [outputObjIdx = -1, outputToSlot = 0] = [],
  ipt: [inputObjIdx = -1, inputFromSlot = 0] = [],
  level = 1,
  iconId,
  count,
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
  let parameters = null;
  if (iconId != null) {
    parameters ??= {};
    parameters.iconId = iconId;
  }
  if (count != null) {
    parameters ??= {};
    parameters.count = count;
  }
  return {
    index,
    areaIndex: 0,
    localOffset: [
      { x, y, z },
      { x, y, z },
    ],
    yaw: [0, 0],
    tilt: 0,
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
    parameters,
  };
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
    tilt: 0,
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
      cargoFilter: mappingItemId(cargoFilter),
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
 * @param {number} opt.level 分拣器等级(1,2,3,4) 默认集装分拣器
 * @return {BuildingItem}
 */
export function createInserter({
  index = 0,
  offset: [x = 0, y = 0, z = 0] = [],
  outputObjIdx = -1,
  inputObjIdx = -1,
  level = 4,
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
      itemId = 2013;
      modelIndex = 43;
      break;
    case 4:
    default:
      itemId = 2014;
      modelIndex = 483;
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
    tilt: 0,
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
    tilt: 0,
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
 * 根据生成配置映射物品id
 */
function mappingItemId(itemId) {
  if (itemId == null || itemId == 0) return itemId;
  const itemMapping = Cfg.globalSetting.itemMapping;
  if (itemMapping.size == 0) return itemId;
  return itemMapping.has(itemId) ? itemMapping.get(itemId) : itemId;
}

/**
 * 生成无带流分拣器蓝图
 * 筛选出分拣器，排除其他建筑，并将分拣器设置连接到一个传送带节点
 * @param {object} blueprint
 * @param {string} rename 蓝图更名
 */
export function filterInserter(blueprint, rename) {
  const baseBelt = createBelt({ index: 0, offset: [0, 0, -10] });
  const buildings = [baseBelt];
  const _blueprint = { ...blueprint, buildings };
  if (rename) {
    _blueprint.header = { ..._blueprint.header, shortDesc: rename };
  }
  blueprint.buildings.forEach((b) => {
    if (ItemsUtil.isInserter(b.itemId)) {
      // 筛选分拣器，输入输出口绑定到单点传送带
      let _b = {
        ...b,
        outputObjIdx: baseBelt.index,
        inputObjIdx: baseBelt.index,
      };
      buildings.push(_b);
    }
  });
  return _blueprint;
}

/**
 * 求原点扩散布局坐标（优先叠满层，再原点扩散布局）
 * @description 优先叠满层，水平方向再从原点往外扩展
 * @param {number} n 建筑数量
 * @param {BuildingSize} size 建筑大小信息
 * @param {Cfg.BuildingLayout} layout 建筑布局信息
 * @param {number[]} start 起始点 [ox,oy,oz]
 * @param {string} title 建筑名（用于异常提示）
 * @return {[x,y,z][]} 坐标数组
 */
export function centralCubeLayout(
  n,
  { w = 0, h = 0, d = 0, cx = 0, cy = 0 },
  { maxW = 0, maxH = 0, maxD = 0, dir = 1, spaceX = 0, spaceY = 0, spaceZ = 0 },
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
  let maxRow = Math.floor((maxW + spaceX) / (w + spaceX));
  let maxCol = Math.floor((maxH + spaceY) / (h + spaceY));
  let maxLayer = Math.floor((maxD + spaceZ) / (d + spaceZ));
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 宽长高(${maxW},${maxH},${maxD})${
        spaceX > 0 || spaceY > 0 || spaceZ > 0 ? `,间隔(${spaceX},${spaceY},${spaceZ})` : ""
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
      if ((layoutRow > layoutCol && layoutCol < maxCol) || layoutRow + 1 > maxRow) {
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
    let x = ox + cx + xDir * row * (w + spaceX);
    let y = oy + cy + yDir * col * (h + spaceY);
    let z = oz + layer * (d + spaceZ); // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}

/**
 * 求逐行铺满布局坐标（层、行、列）
 * @description 依次优先填充摆放 层、行、列（z、x、y）
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
  { maxW = 0, maxH = 0, maxD = 0, dir = 1, spaceX = 0, spaceY = 0, spaceZ = 0 },
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
  let maxRow = Math.floor((maxW + spaceX) / (w + spaceX));
  let maxCol = Math.floor((maxH + spaceY) / (h + spaceY));
  let maxLayer = Math.floor((maxD + spaceZ) / (d + spaceZ));
  if (n > maxRow * maxCol * maxLayer) {
    throw new Error(
      `无法在给定的 宽长高(${maxW},${maxH},${maxD})${
        spaceX > 0 || spaceY > 0 || spaceZ > 0 ? `,间隔(${spaceX},${spaceY},${spaceZ})` : ""
      } 的条件范围内放置所有${title}！${title}数量: ${n}`
    );
  }
  // 初始化建筑坐标数组
  let cubes = [];

  // 依次优先填充摆放 层、行、列（z、x、y）
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
    let x = ox + cx + xDir * row * (w + spaceX);
    let y = oy + cy + yDir * col * (h + spaceY);
    let z = oz + layer * (d + spaceZ); // z轴锚点在建筑底部
    cubes.push([x, y, z]);
  }
  return cubes;
}
