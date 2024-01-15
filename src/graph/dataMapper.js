import * as Cfg from "./graphConfig.js";
import * as Util from "./graphUtil.js";

/**
 * @typedef {Object} GraphData 图谱 持久化数据
 * @property {HeaderData} header - 头部信息
 * @property {{
 *   nodes: NodeData[],
 *   lines: LineData[]
 * }} data - 节点连接信息
 */
/**
 * @typedef {Object} HeaderData 头部信息
 * @property {string} version - 数据对应工具版本
 * @property {number} timestramp - 数据导出时间戳
 * @property {string} graphName - 蓝图名
 * @property {{x, y, k}} transform - 画布位移、缩放 { x, y, k }
 * @property {{minX, minY, maxX, maxY, w, h}} boundingBox - 节点包围盒边界信息 {minX, minY, maxX, maxY, w, h}
 * @property {object} layout - 生成蓝图布局 { fdirLayout: { start: { x, y }, maxW, maxH, maxD }, ...}
 */
/**
 * 解析图谱持久化数据
 * @param {GraphData} graphData 图谱持久化数据 { header:{boundingBox}, data:{nodes,lines} }
 * @param startId 起始id(默认0)
 * @param offset 整体偏移 [x,y]
 * @return 图谱对象 {_header:{_graphName, _transform, _boundingBox, _layout}, _nodes, _edges, _maxId, _nodeMap}
 */
export function graphDataParse(graphData, startId = 0, offset = [0, 0]) {
  Util.checkGraphData(graphData, true, true);
  try {
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
        _layout: graphData.header.layout,
      },
      _nodes,
      _edges,
      _maxId,
      _nodeMap,
    };
  } catch (e) {
    Util._err("载入数据失败：" + e);
    throw e;
  }
}

/**
 * 点边数据 转换为 图谱持久化数据
 * @param {GraphNode[]} nodes 节点数据
 * @param {GraphEdge[]} edges 边数据
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
      transform: { x, y, k },
      boundingBox: Util.calcuBoundingBox(nodes),
      layout: Cfg.layoutSetting,
    },
    data: {
      nodes: nodes.map((n) => nodeToData(n)),
      lines: edges.map((e) => edgeToData(e)),
    },
  };
  const _lay = (graphData.header.layout = {});
  Object.keys(Cfg.layoutSetting).forEach((key) => {
    let {
      start: { x = 0, y = 0 } = {},
      maxW = 0,
      maxH = 0,
      maxD = 0,
      dir = 0,
    } = Cfg.layoutSetting[key];
    _lay[key] = { start: { x, y }, maxW, maxH, maxD, dir };
  });
  return graphData;
}

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
 * @property {GraphNode} node - 节点
 * @property {GraphEdge} edge - 连接线对象(不存在连接时为null)
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (1:输出, -1:输入)
 * @property {number} priority - 是否优先插槽 (1:是, -1:否) [当模型为四向时生效]
 * @property {number} filterId - 过滤优先输出物品id [当模型为四向时生效]
 */
/**
 * 初始化一个基本的节点对象
 * @param {NodeData} d 初始化的节点数据对象(只需传入非默认值)
 * @return {GraphNode} 节点持久化数据
 */
export function initGraphNode(d) {
  if (d == null) d = {};
  /** @type {GraphNode} */
  const node = {
    modelId: _toInt(d.modelId, Cfg.ModelId.fdir), // 默认四向
    id: _toInt(d.id),
    x: _toFloat(d.x, 0),
    y: _toFloat(d.y, 0),
    w: _toFloat(d.w, Cfg.nodeSize),
    h: _toFloat(d.h, Cfg.nodeSize),
    itemId: _toInt(d.itemId),
    text: _toStr(d.text, d.modelId == Cfg.ModelId.text ? Cfg.defaultText : null),
    slots: [],
  };
  d.slots?.forEach((s, si) => {
    /** @type {GraphNodeSlot} */
    const slot = {
      index: si,
      node: node,
      ox: _toFloat(s.ox, 0),
      oy: _toFloat(s.oy, 0),
      dir: s.dir === 1 || s.dir === -1 ? s.dir : 1, // 默认输出
    };
    if (node.modelId == Cfg.ModelId.fdir) {
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
    case Cfg.ModelId.text: // 文本
      d.w = Cfg.lineWordNum * Cfg.fontSize;
      d.h = Util.getLineNum(d.text) * Cfg.lineHeight; // 根据实际文本行数修改高度
      break;
    case Cfg.ModelId.fdir: // 四向分流器
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
          let slot = other.slots[si];
          if (!slot) return;
          if (slot.dir === 1 || slot.dir === -1) {
            s.dir = slot.dir; // 插槽方向
          }
          if (slot.priority === 1) {
            s.priority = 1; // 是否优先
          }
          if (s.dir === 1 && s.priority === 1 && slot.filterId != null) {
            s.filterId = _toInt(slot.filterId); // 过滤优先输出物品id
          }
        });
      }
      break;
    case Cfg.ModelId.monitor: // 流速器(生成/消耗)
    case Cfg.ModelId.output: // 信号输出(生成)
    case Cfg.ModelId.input: // 信号输入(消耗)
      d.w = d.h = Cfg.nodeSize / 2; // 一半四向宽
      d.itemId = _toInt(other.itemId, 6002); // 生成/消耗物品id（默认红糖）
      d.slots = [
        { dir: modelId === Cfg.ModelId.input ? -1 : 1 }, // 默认输出->1 [信号输入->-1]
      ];
      // 流速器合并传入的插槽参数（信号输出、信号输入方向不可变）
      if (modelId === Cfg.ModelId.monitor && other.slots && other.slots[0]) {
        let slot = other.slots[0];
        if (slot.dir === 1 || slot.dir === -1) {
          d.slots[0].dir = slot.dir; // 插槽方向
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
  const modelId = data.modelId ?? Cfg.ModelId.fdir; // 模型ID(默认四向)
  return modelIdToNode(modelId, nodeId, data, offset);
}

/**
 * @typedef {Object} NodeData 节点 持久化数据
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
 * @typedef {Object} NodeSlotData 节点插槽 持久化数据
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (1:输出, -1:输入)
 * @property {number} priority - 是否优先插槽 (1:是, -1:否) [当modelId=0时生效]
 * @property {number} filterId - 过滤优先输出物品id [当modelId=0时生效]
 */
/**
 * 节点图谱对象 转 持久化数据
 * @param {GraphNode} node 节点图谱对象
 * @return {NodeData} 节点持久化数据对象
 */
export function nodeToData(node) {
  if (!node) throw "节点对象不能为空！";
  const modelId = node.modelId; // 模型类型（0:四向）
  /** @type {NodeData} */
  const data = {
    id: node.id,
    x: node.x,
    y: node.y,
    modelId: node.modelId,
    text: node.text,
  };
  if (modelId === Cfg.ModelId.fdir) {
    // 四向
    data.slots = [];
    node.slots.forEach((s) => {
      // 固定插槽，不保存偏移
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
  } else if ([Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) {
    // 流速器、信号输出、信号输入
    data.itemId = node.itemId; // 生成/消耗物品id
    data.slots =
      node.slots?.map((s) => ({
        // 固定插槽，不保存偏移
        dir: s.dir, // 1:输出口 -1:输入口
      })) || [];
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
 * @typedef {Object} GraphEdge 图谱边对象
 * @property {GraphNode} source - 起点节点
 * @property {GraphNodeSlot} sourceSlot - 起点节点插槽对象
 * @property {GraphNode} target - 终点节点
 * @property {GraphNodeSlot} targetSlot - 终点节点插槽对象
 */
/**
 * 连接线持久化数据 转 图谱对象
 * @description 连接线起终点匹配不到节点时，返回Error
 * @description 起点到终点不是输出口到输入口，返回Error
 * @description 起点或终点插槽已占用，返回Error
 * @param {LineData} data 连接线数据
 * @param {Map<number,GraphNode>} nodeMap 节点id->对象Map
 * @return {GraphEdge} edge对象
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

  /** @type {GraphEdge} */
  const edge = {
    source: sourceNode,
    sourceSlot: sourceSlot,
    target: targetNode,
    targetSlot: targetSlot,
  };
  sourceSlot.edge = targetSlot.edge = edge;
  return edge;
}

/**
 * @typedef {Object} LineData 连接线 持久化数据
 * @property {number} startId - 起点节点id
 * @property {number} startSlot - 起点插槽索引index
 * @property {number} endId - 终点节点id
 * @property {number} endSlot - 终点插槽索引index
 */
/**
 * 连接线图谱对象 转 持久化数据
 * @param {GraphEdge} edge 连接线图谱对象
 * @return {LineData} 连接线持久化数据对象
 */
export function edgeToData(edge) {
  if (!edge) throw "连接线对象不能为空！";
  return {
    startId: edge.source.id,
    startSlot: edge.sourceSlot.index,
    endId: edge.target.id,
    endSlot: edge.targetSlot.index,
  };
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
