import * as Cfg from "./graphConfig.js";
import * as Util from "./graphUtil.js";
/**
 * @typedef {Object} GraphNode 图谱节点对象
 * @property {number} modelId - 模型id
 * @property {number} id - 节点id
 * @property {number} x - 节点x偏移
 * @property {number} y - 节点y偏移
 * @property {number} w - 节点宽度
 * @property {number} h - 节点高度
 * @property {string} text - 节点文本
 * @property {number} itemId - 生成/消耗物品id
 * @property {GraphNodeSlot[]} slots - 插槽
 */
/**
 * @typedef {Object} GraphNodeSlot 图谱节点插槽对象
 * @property {number} index - 插槽数组索引
 * @property {number} nodeId - 节点id
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (1:输出, -1:输入)
 * @property {number} priority - 是否优先插槽 (1:是, -1:否) [当modelId=0时生效]
 * @property {number} filterId - 过滤优先输出物品id [当modelId=0时生效]
 */

/**
 * @typedef {Object} NodeData 节点持久化数据
 * @property {number} modelId - 模型id
 * @property {number} id - 节点id
 * @property {number} x - 节点x偏移
 * @property {number} y - 节点y偏移
 * @property {number} w - 节点宽度
 * @property {number} h - 节点高度
 * @property {string} text - 节点文本
 * @property {number} itemId - 生成/消耗物品id
 * @property {NodeSlotData[]} slots - 插槽
 */
/**
 * @typedef {Object} NodeSlotData 节点插槽持久化数据
 * @property {number} nodeId - 节点id
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (1:输出, -1:输入)
 * @property {number} priority - 是否优先插槽 (1:是, -1:否) [当modelId=0时生效]
 * @property {number} filterId - 过滤优先输出物品id [当modelId=0时生效]
 */

/**
 * 解析图谱持久化数据
 * @param graphData 图谱持久化数据 { header:{boundingBox}, data:{nodes,lines} }
 * @param startId 起始id(默认0)
 * @param offset 整体偏移 [x,y]
 * @return 图谱对象 {_header:{_graphName, _transform, _boundingBox}, _nodes, _edges, _maxId, _nodeMap}
 */
export function graphDataParse(graphData, startId = 0, offset = [0, 0]) {
  Util.checkGraphData(graphData, true, true);
  const nodes = graphData.data.nodes;
  const lines = graphData.data.lines;

  let _maxId = startId;
  const nodeMap = new Map(); // 导入id映射节点：dataId -> node
  const _nodeMap = new Map(); // 自增id映射节点：nodeId -> node

  // 解析节点数据
  const _nodes = [];
  nodes.forEach((d) => {
    if (d == null) return console.warn("存在空节点对象！已忽略");
    if (d.id == null) return console.warn("存在节点id为空！已忽略");
    if (nodeMap.has(d.id)) return console.warn("存在重复节点id:" + d.id);
    const node = dataToNode(d, ++_maxId, offset);
    nodeMap.set(d.id, node);
    _nodeMap.set(node.id, node);
    _nodes.push(node);
  });

  // 解析连接线数据
  const _edges = [];
  lines.forEach((line) => {
    if (line == null) return console.warn("存在空连接线对象！已忽略");
    const edge = dataToEdge(line, nodeMap);
    if (edge instanceof Error) return console.warn(edge.message);
    _edges.push(edge);
  });

  const { minX = 0, minY = 0, maxX = 0, maxY = 0, w = 0, h = 0 } = graphData.header.boundingBox;
  const { x = 0, y = 0, k = 1 } = graphData.header.transform;
  return {
    _header: {
      _graphName: graphData.header.graphName,
      _transform: { x, y, k },
      _boundingBox: {
        minX: minX + offset[0],
        minY: minY + offset[1],
        maxX: maxX + offset[0],
        maxY: maxY + offset[1],
        w: w,
        h: h,
      },
    },
    _nodes,
    _edges,
    _maxId,
    _nodeMap,
  };
}

/**
 * 点边数据 转换为 图谱持久化数据
 * @param nodes 节点数据
 * @param edges 边数据
 * @param header 图谱相关信息 header:{transform, graphName}
 * @return 图谱持久化数据 { header, data:{nodes,lines} }
 */
export function toGraphData(
  nodes,
  edges,
  { transform: { x = 0, y = 0, k = 1 } = {}, graphName = Cfg.defaultGraphName } = {}
) {
  const graphData = {
    header: {
      version: Cfg.version,
      graphName: graphName,
      timestramp: new Date().getTime(),
      boundingBox: Util.calcuBoundingBox(nodes),
      transform: { x, y, k },
    },
    data: {
      nodes: nodes.map((n) => nodeToData(n)),
      lines: edges.map((e) => edgeToData(e)),
    },
  };
  return graphData;
}

/**
 * 初始化一个基本的节点对象
 * @param {NodeData} d 初始化的节点数据对象(只需传入非默认值)
 * @return {GraphNode} 节点持久化数据
 */
export function initGraphNode(d) {
  if (d == null) d = {};
  /** @type {GraphNode} */
  const node = {
    modelId: _toInt(d.modelId, 0), // 默认四向
    id: _toInt(d.id),
    x: _toFloat(d.x, 0),
    y: _toFloat(d.y, 0),
    w: _toFloat(d.w, Cfg.nodeSize),
    h: _toFloat(d.h, Cfg.nodeSize),
    itemId: _toInt(d.itemId),
    text: _toStr(d.text, Cfg.defaultText),
    slots: [],
  };
  d.slots?.forEach((s, si) => {
    /** @type {GraphNodeSlot} */
    const slot = {
      index: si,
      nodeId: _toInt(d.id),
      ox: _toFloat(s.ox, 0),
      oy: _toFloat(s.oy, 0),
      dir: s.dir === 1 || s.dir === -1 ? s.dir : 1, // 默认输出
    };
    if (node.modelId == 0) {
      // 四向分流器
      if (s.priority === 1) {
        // 优先插槽
        slot.priority = 1;
        slot.filterId = _toInt(s.filterId);
      } else {
        slot.priority = 0;
      }
    }
    node.slots.push(slot);
  });
  return node;
}

/**
 * 模型Id 转 节点对象
 * @param {number} modelId 模型ID
 * @param {number} nodeId 节点id
 * @param {NodeData} other 需更改的其他节点数据
 * @param {number[]} offset 偏移 [ox,oy]
 * @return {GraphNode} node对象
 */
export function modelIdToNode(modelId, nodeId, other, [ox = 0, oy = 0] = []) {
  if (modelId == null) throw "模型ID不能为空！";
  if (nodeId == null) throw "节点ID不能为空！";
  other ??= {};
  ox += _toFloat(other.x, 0);
  oy += _toFloat(other.y, 0);
  // 创建节点对象
  const d = { ...other, id: nodeId, modelId, x: ox, y: oy };
  switch (modelId) {
    case -1: // 文本
      d.w = Cfg.lineWordNum * Cfg.fontSize;
      d.h = Util.getLineNum(d.text) * Cfg.lineHeight; // 根据实际文本行数修改高度
      break;
    case 0: // 四向分流器
      d.w = d.h = Cfg.nodeSize;
      // 固定插槽位置
      d.slots = [
        { ox: 0, oy: -d.h / 2, dir: -1 }, // 默认 上输入
        { ox: d.w / 2, oy: 0, dir: -1 }, // 默认 右输入
        { ox: 0, oy: d.h / 2, dir: 1 }, // 默认 下输出
        { ox: -d.w / 2, oy: 0, dir: 1 }, // 默认 左输出
      ];
      // 合并传入的插槽参数
      if (other.slots?.length > 0) {
        d.slots.forEach((s, si) => {
          let source = other.slots[si];
          if (!source) return;
          if (source.dir === 1 || source.dir === -1) {
            s.dir = source.dir; // 插槽方向
          }
          if (source.priority === 1) {
            s.priority = 1; // 是否优先
          }
          if (s.dir === 1 && s.priority === 1 && source.filterId != null) {
            s.filterId = source.filterId; // 过滤优先输出物品id
          }
        });
      }
      break;
    case 1: // 流速器(生成/消耗)
    case 2: // 起点(信号输出口)
    case 3: // 终点(信号输入口)
      d.w = d.h = Cfg.nodeSize / 2; // 一半四向宽
      d.itemId = 6002; // 生成/消耗物品id（默认红糖）
      d.slots = [
        { dir: modelId === 3 ? 0 : 1 }, // 默认输出->1 [终点默认输入->0]
      ];
      // 合并传入的插槽参数
      if (other.slots && other.slots[0]) {
        let source = other.slots[0];
        if (source.dir === 1 || source.dir === -1) {
          d.slots[0] = source.dir; // 插槽方向
        }
      }
      break;
  }
  return initGraphNode(d);
}

/**
 * 节点持久化数据 转 图谱对象
 * @param {NodeData} data 节点数据
 * @param {number} nodeId 节点id
 * @param {number[]} offset 偏移 [ox,oy]
 * @return {GraphNode} node对象
 */
export function dataToNode(data, nodeId, offset) {
  if (!data) throw "节点数据不能为空！";
  const modelId = data.modelId ?? 0; // 模型ID(默认四向)
  return modelIdToNode(modelId, nodeId, data, offset);
}

/**
 * 节点图谱对象 转 持久化数据
 * @param node 节点图谱对象
 * @return 节点持久化数据对象
 */
export function nodeToData(node) {
  if (!node) throw "节点对象不能为空！";
  const modelId = node.modelId; // 模型类型（0:四向）
  const data = {
    id: node.id,
    x: node.x,
    y: node.y,
    modelId: node.modelId,
    text: node.text,
  };
  if (modelId == 0) {
    // 四向
    data.slots = [];
    node.slots.forEach((s) => {
      let slot = {
        dir: s.dir, // 1:输出口 -1:输入口
      };
      if (s.priority == 1) {
        // 是否优先
        slot.priority = 1;
      }
      if (s.dir === 1 && s.priority === 1 && s.filterId) {
        // 过滤优先输出物品id
        slot.filterId = s.filterId;
      }
      data.slots.push(slot);
    });
  } else {
    // TODO:其他模型
    data.w = node.w;
    data.h = node.h;
    data.slots =
      node.slots?.map((s) => ({
        ox: s.ox,
        oy: s.oy,
        dir: s.dir, // 1:输出口 -1:输入口
      })) || [];
  }
  return data;
}

/**
 * 连接线持久化数据 转 图谱对象
 * @description 连接线起终点匹配不到节点时，返回Error
 * @description 起点到终点不是输出口到输入口，返回Error
 * @description 起点或终点插槽已占用，返回Error
 * @param data 连接线数据
 * @param nodeMap 节点id->对象Map
 * @return edge对象
 */
export function dataToEdge(data, nodeMap) {
  if (!data) throw "连接线数据不能为空！";
  if (!nodeMap) throw "未传入节点Map！";
  const sourceNode = nodeMap.get(data.startId);
  const targetNode = nodeMap.get(data.endId);
  if (!sourceNode) return new Error("连接线找不到起始节点:" + data.startId);
  if (!targetNode) return new Error("连接线找不到终点节点:" + data.endId);

  const sourceSlot = sourceNode.slots[data.startSlot];
  const targetSlot = targetNode.slots[data.endSlot];
  if (!sourceSlot) return new Error("连接线找不到起始插槽:" + data.startId + "-" + data.startSlot);
  if (!targetSlot) return new Error("连接线找不到终点节点:" + data.endId + "-" + data.endSlot);
  if (sourceSlot.dir !== 1) return new Error("连接线起点不是输出口！");
  if (targetSlot.dir !== -1) return new Error("连接线终点不是输入口！");
  if (sourceSlot.edge != null) return new Error("连接线起点插槽已占用！");
  if (targetSlot.edge != null) return new Error("连接线终点插槽已占用！");

  const edge = {
    source: sourceNode.id,
    sourceSlot: sourceSlot,
    target: targetNode.id,
    targetSlot: targetSlot,
  };
  sourceSlot.edge = targetSlot.edge = edge;
  return edge;
}

/**
 * 连接线图谱对象 转 持久化数据
 * @param edge 连接线图谱对象
 * @return 连接线持久化数据对象
 */
export function edgeToData(edge) {
  if (!edge) throw "连接线对象不能为空！";
  const line = {
    startId: edge.source,
    startSlot: edge.sourceSlot.index,
    endId: edge.target,
    endSlot: edge.targetSlot.index,
  };
  return line;
}

function _toInt(num, def) {
  if (num == null || isNaN(num)) return def;
  return parseInt(num);
}
function _toFloat(num, def) {
  if (num == null || isNaN(num)) return def;
  return parseInt(num);
}
function _toStr(str, def) {
  if (str == null || typeof str != "string") return def;
  return str;
}
