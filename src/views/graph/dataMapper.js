import * as Cfg from "./graphConfig.js";
import * as Util from "./graphUtil.js";

/**
 * 解析图谱序列化数据
 * @param graphData 图谱序列化数据 { header:{boundingBox}, data:{nodes,lines} }
 * @param startId 起始id(默认0)
 * @param offset 整体偏移 [x,y]
 * @return 图谱对象 {_bbox, _nodes, _edges, _maxId, _nodeMap}
 */
export function graphDataParse(graphData, startId = 0, offset) {
  Util.checkGraphData(graphData, true, true);
  let dtx = 0;
  let dty = 0;
  if (offset) {
    dtx = offset[0] ?? 0;
    dty = offset[1] ?? 0;
  }
  const { minX = 0, minY = 0, maxX = 0, maxY = 0, w = 0, h = 0 } = graphData.header.boundingBox;
  const _bbox = {
    minX: minX + dtx,
    minY: minY + dty,
    maxX: maxX + dtx,
    maxY: maxY + dty,
    w,
    h,
  };
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

  return { _bbox, _nodes, _edges, _maxId, _nodeMap };
}

/**
 * 点边数据 转换为 图谱序列化数据
 * @param nodes 节点数据
 * @param edges 边数据
 * @return 图谱序列化数据 { header, data:{nodes,lines} }
 */
export function toGraphData(nodes, edges) {
  const graphData = {
    header: {
      version: Cfg.version,
      timestramp: new Date().getTime(),
      boundingBox: Util.calcuBoundingBox(nodes),
    },
    data: {
      nodes: nodes.map((n) => nodeToData(n)),
      lines: edges.map((e) => edgeToData(e)),
    },
  };
  return graphData;
}

/**
 * 模型Id 转 节点对象
 * @param modelId 模型ID
 * @param nodeId 节点id
 * @param offset 偏移 [x,y]
 * @return node对象
 */
export function modelIdToNode(modelId, nodeId, offset = [0, 0]) {
  if (modelId == null) throw "模型ID不能为空！";
  const modelBuilder = Cfg.nodeModelMap.get(modelId);
  if (modelBuilder == null) throw "找不到该模型！modelId:" + modelId;
  // 创建节点对象
  const node = modelBuilder.build(nodeId, offset);
  node.slots ??= [];
  return node;
}

/**
 * 节点序列化数据 转 图谱对象
 * @param data 节点数据
 * @param nodeId 节点id
 * @param offset 偏移 [x,y]
 * @return node对象
 */
export function dataToNode(data, nodeId, offset = [0, 0]) {
  if (!data) throw "节点数据不能为空！";
  const modelId = data.modelId || 0; // 模型ID
  const ox = offset[0] + data.x ?? 0;
  const oy = offset[1] + data.y ?? 0;
  let node;
  if (Cfg.nodeModelMap.has(modelId)) {
    // 默认节点模型
    const modelBuilder = Cfg.nodeModelMap.get(modelId);
    node = modelBuilder.build(nodeId, [ox, oy]);
    if (modelId == -1) {
      // 普通文本
      node.text = data.text || "";
      node.w = Cfg.lineWordsNum * Cfg.fontSize;
      node.h = Util.getLineNum(node.text) * Cfg.lineHeight; // 根据实际文本行数修改高度
    }
    // 插槽参数
    node.slots ??= [];
    if (data.slots?.length > 0) {
      for (let si = 0; si < data.slots.length && si < node.slots.length; si++) {
        const dSlot = data.slots[si];
        const nSlot = node.slots[si];
        if (dSlot.dir === 1 || dSlot.dir === -1) {
          nSlot.dir = dSlot.dir; // 1:输出口 -1:输入口（默认输出口）
        }
        if (!modelBuilder.fixedSlot) {
          // 非固定插槽
          nSlot.ox = dSlot.ox;
          nSlot.oy = dSlot.oy;
        }
        if (modelId == 0) {
          // 四向
          nSlot.priority = dSlot.priority ? 1 : 0; // 是否优先
          if (nSlot.dir === 1 && nSlot.priority === 1 && dSlot.filterId) {
            nSlot.filterId = dSlot.filterId; // 过滤优先输出物品id
          }
        }
      }
    }
  } else {
    // TODO:其他模型
    node = {
      id: nodeId,
      x: ox,
      y: oy,
      modelId: modelId,
    };
    node.w = data.w ?? Cfg.nodeSize;
    node.h = data.h ?? Cfg.nodeSize;
    node.slots =
      data.slots?.map((s, si) => {
        return {
          index: si,
          nodeId: nodeId,
          ox: s.ox,
          oy: s.oy,
          dir: s.dir === 1 || s.dir === -1 ? s.dir : 1, // 1:输出口 -1:输入口（默认输出口）
        };
      }) ?? [];
  }
  return node;
}

/**
 * 节点图谱对象 转 序列化数据
 * @param node 节点图谱对象
 * @return 节点序列化数据对象
 */
export function nodeToData(node) {
  if (!node) throw "节点对象不能为空！";
  const modelId = node.modelId; // 模型类型（0:四向）
  const data = {
    id: node.id,
    x: node.x,
    y: node.y,
    modelId: node.modelId,
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
 * 连接线序列化数据 转 图谱对象
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
 * 连接线图谱对象 转 序列化数据
 * @param edge 连接线图谱对象
 * @return 连接线序列化数据对象
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
