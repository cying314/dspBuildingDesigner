import * as Cfg from "./graphConfig.js";
import * as Util from "./graphUtil.js";
import { _toInt, _toFloat, _toStr } from "./graphUtil.js";

/**
 * @typedef {Object} GraphData 图谱 持久化数据
 * @property {HeaderData} header - 头部信息
 * @property {{
 *   nodes: NodeData[],
 *   lines: LineData[]
 * }} data - 节点连接信息
 * @property {PackageModel[]} packages - 引用封装模块列表【仅在主模块持久化】
 * @property {stirng[]} packageHashList - 引用封装模块hash列表【仅在主模块持久化，嵌套封装模块只通过childsHash记录hash，不记录对象】
 */
/**
 * @typedef {Object} BuildingLayoutData 建筑布局 持久化数据
 * @property {{x,y,z}} start - 布局起点 {x,y,z}
 * @property {number} maxW - 最大宽度（纬线方向）
 * @property {number} maxH - 最大长度（经线方向）
 * @property {number} maxD - 最大高度
 * @property {number} dir - 展开方向 (0:左上, 1:右上, 2:右下, 3:左下)
 * @property {number} spaceX - X方向建筑间隔
 * @property {number} spaceY - Y方向建筑间隔
 * @property {number} spaceZ - Z方向建筑间隔
 */
/**
 * @typedef {Object} HeaderLayoutData 生成蓝图布局 持久化数据
 * @property {BuildingLayoutData} fdirLayout - 四向分流器
 * @property {BuildingLayoutData} inserterLayout - 分拣器
 * @property {BuildingLayoutData} monitorLayout - 流速器-回收
 * @property {BuildingLayoutData} outputLayout - 流速器-信号输出
 * @property {BuildingLayoutData} inputLayout - 流速器-信号输入
 */
/**
 * @typedef {Object} HeaderData 头部信息
 * @property {string} hash - 图谱数据hash值（仅在封装模块packages中输出）
 * @property {string} version - 数据对应工具版本
 * @property {number} timestramp - 数据导出时间戳
 * @property {string} graphName - 蓝图名
 * @property {{x, y, k}} transform - 画布位移、缩放 { x, y, k }
 * @property {{minX, minY, maxX, maxY, w, h}} boundingBox - 节点包围盒边界信息 {minX, minY, maxX, maxY, w, h}
 * @property {HeaderLayoutData} layout - 生成蓝图布局
 * @property {number} simplified - 为1时为简化数据
 */
/**
 * @typedef {Object} PackageModel 封装节点
 * @property {string} hash - 图谱数据hash值
 * @property {string} name - 封装模块名称
 * @property {string[]} childsHash - 所有嵌套的子封装模块hash
 * @property {GraphData} graphData - 图谱数据
 * @property {NodeData} initNodeData - 封装节点初始化数据（需dataToNode创建）
 */

/**
 * @typedef {Object} GraphDataParse 图谱解析返回值
 * @property {HeaderData} header - 头部信息
 * @property {GraphNode[]} nodes - 节点对象集合
 * @property {GraphEdge[]} edges - 连接线集合
 * @property {PackageModel[]} packages - 引用封装模块列表
 * @property {stirng[]} packageHashList - 引用封装模块hash列表（嵌套封装模块中，只记录hash，不记录对象）
 * @property {number} maxId - 当前点集中最大节点id
 * @property {number} maxInputCount - 最大输入标记数
 * @property {number} maxOutputCount - 最大输出标记数
 * @property {Map<number,GraphNode>} nodeMap 节点id->节点对象
 * @property {Map<number,GraphNode>} _nodeMapByOriginId 节点导入原id->节点对象
 */
/**
 * 解析图谱持久化数据
 * @param {GraphData} graphData 图谱持久化数据
 * @param startId 起始id(默认0)
 * @param offset 整体偏移 [x,y]
 * @return {GraphDataParse} 图谱解析对象
 */
export function graphDataParse(graphData, startId = 0, offset = [0, 0]) {
  // 还原简化数据
  let hasOldHash = false;
  graphData.packages?.forEach((p) => {
    // 判断特征码版本前缀标识，校验是否过时的封装模块hash码
    if (!hasOldHash && !p.hash.startsWith(Util.hashVersionPrefix)) {
      hasOldHash = true;
    }

    // 补全嵌套封装模块中省略的hash
    p.graphData.header.hash = p.hash;
    p.initNodeData.packageHash = p.hash;
    p.graphData.packageHashList = p.childsHash;

    // 存在简化数据，还原子模块节点被简化的packageHash
    if (p.graphData.header.simplified === 1 && p.childsHash?.length > 0) {
      p.graphData.data.nodes.forEach((n) => {
        if (n.modelId === Cfg.ModelId.package && n.packageHash == null && n.hashIdx != null) {
          n.packageHash = p.childsHash[n.hashIdx];
          n.hashIdx = undefined;
        }
      });
    }
  });
  // 存在过时的hash，重新生成封装模块hash
  if (hasOldHash) {
    updatePackageHash(graphData);
  }

  const nodes = graphData.data.nodes;
  const lines = graphData.data.lines;

  let maxId = startId;
  let maxInputCount = 0;
  let maxOutputCount = 0;
  const nodeMapByOriginId = new Map(); // 导入id映射节点：dataId -> node
  const _nodeMap = new Map(); // 自增id映射节点：nodeId -> node

  // 是否存在简化hash
  const simplifiedHash = graphData.header.simplified === 1 && graphData.packageHashList?.length > 0;
  /** @type {GraphNode[]} 解析节点数据 */
  const _nodes = [];
  nodes.forEach((d) => {
    if (d == null) return console.warn("存在空节点对象！已忽略");
    if (d.id == null) return console.warn("存在节点id为空！已忽略");
    if (nodeMapByOriginId.has(d.id)) return console.warn("存在重复节点id:" + d.id);
    if (
      simplifiedHash &&
      d.modelId === Cfg.ModelId.package &&
      d.packageHash == null &&
      d.hashIdx != null
    ) {
      // 存在简化数据，还原被简化的packageHash
      d.packageHash = graphData.packageHashList[d.hashIdx];
      d.hashIdx = undefined;
    }
    const node = dataToNode(d, ++maxId, offset);
    nodeMapByOriginId.set(d.id, node);
    _nodeMap.set(node.id, node);
    _nodes.push(node);
    if (node.modelId === Cfg.ModelId.input && node.count > maxInputCount) {
      maxInputCount = node.count;
    }
    if (node.modelId === Cfg.ModelId.output && node.count > maxOutputCount) {
      maxOutputCount = node.count;
    }
  });

  /** @type {GraphEdge[]} 解析连接线数据 */
  const _edges = [];
  lines.forEach((line) => {
    if (line == null) return console.warn("存在空连接线对象！已忽略");
    const edge = dataToEdge(line, nodeMapByOriginId);
    if (edge instanceof Error) return console.warn(edge.message);
    _edges.push(edge);
  });

  /** @type {PackageModel[]} 引用封装模块列表 */
  const _packages = Array.isArray(graphData.packages) ? graphData.packages : [];

  const {
    minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0,
    w = 0,
    h = 0,
  } = graphData.header.boundingBox ?? {};
  const { x = 0, y = 0, k = 1 } = graphData.header.transform ?? {};
  return {
    header: {
      graphName: graphData.header.graphName,
      transform: { x, y, k },
      boundingBox: {
        minX: minX + offset[0],
        minY: minY + offset[1],
        maxX: maxX + offset[0],
        maxY: maxY + offset[1],
        w: w,
        h: h,
      },
      layout: graphData.header.layout,
    },
    nodes: _nodes,
    edges: _edges,
    packages: _packages,
    packageHashList: graphData.packageHashList,
    maxId,
    maxInputCount,
    maxOutputCount,
    nodeMap: _nodeMap,
    _nodeMapByOriginId: nodeMapByOriginId,
  };
}

/**
 * 重新生成封装模块hash
 * @param {GraphData} graphData 图谱持久化数据
 */
function updatePackageHash(graphData) {
  const packages = graphData.packages;
  if (packages == null || packages.length == 0) return;
  // 存在过时的hash码，重新生成hash
  const oldToNewHash = new Map();
  /** @type {Map<string,PackageModel[]>} 旧hash对应引用改模块的上级模块 */
  const oldHashToExtends = new Map();
  /** @type {PackageModel[]} 已处理完子依赖的待处理队列 */
  const packageQueue = [];
  packages.forEach((p) => {
    if (p.childsHash.length > 0) {
      // 存在子模块，需从里到外解析
      p._oldHashToIdx = new Map();
      p.childsHash.forEach((h, i) => {
        p._oldHashToIdx.set(h, i);
        if (oldHashToExtends.has(h)) {
          oldHashToExtends.get(h).push(p);
        } else {
          oldHashToExtends.set(h, [p]);
        }
      });
    } else {
      // 没有子模块，加入待处理队列
      packageQueue.push(p);
    }
  });
  let i = 0;
  while (packageQueue.length > 0) {
    i++;
    const p = packageQueue.shift();
    const oldHash = p.hash;
    if (p.childsHash?.length > 0) {
      // 更新嵌套的子封装模块的节点引用的hash
      p.graphData.data.nodes.forEach((n) => {
        if (n.modelId === Cfg.ModelId.package) {
          const newHash = oldToNewHash.get(n.packageHash);
          if (newHash) n.packageHash = newHash;
        }
      });
    }

    // 重新生成hash
    const newHash = Util.getGraphDataHash(p.graphData);
    oldToNewHash.set(oldHash, newHash);
    // 更新封装模块hash
    p.hash = newHash;
    p.graphData.header.hash = newHash;
    p.initNodeData.packageHash = newHash;

    // 更新引用了该模块的上级模块
    let extendPackages = oldHashToExtends.get(oldHash);
    extendPackages?.forEach((ep) => {
      let idx = ep._oldHashToIdx?.get(oldHash);
      if (idx != null) {
        ep.childsHash[idx] = newHash;
        if (ep._oldHashToIdx.size == 1) {
          // 所有依赖已经更新，加入待处理队列
          ep._oldHashToIdx = undefined;
          packageQueue.push(ep);
        } else {
          ep._oldHashToIdx.delete(oldHash);
        }
      }
    });
  }

  if (packages.length != i) {
    console.warn(`重新生成封装模块hash逻辑异常！存在${packages.length}个模块，实际处理${i}个模块`);
  }

  // 更新直接引用的封装模块hash
  graphData.packageHashList?.forEach((hash, i) => {
    const newHash = oldToNewHash.get(hash);
    if (newHash) graphData.packageHashList[i] = newHash;
  });

  // 更新节点引用的hash
  graphData.data.nodes.forEach((n) => {
    if (n.modelId === Cfg.ModelId.package) {
      const newHash = oldToNewHash.get(n.packageHash);
      if (newHash) {
        n.packageHash = newHash;
      }
    }
  });
}

/**
 * 点边数据 转换为 图谱持久化数据
 * @param {GraphNode[]} nodes 节点数据
 * @param {GraphEdge[]} edges 边数据
 * @param {HeaderData} header 图谱相关信息 header:{transform, graphName}
 * @param {PackageModel[]} packages 引用封装模块列表
 * @property {stirng[]} packageHashList - 引用封装模块hash列表（嵌套封装模块中，只记录hash，不记录对象）
 * @param {boolean} weedOutUnusedPackage 是否剔除未引用的封装模块（默认否）
 * @return {GraphData} 图谱持久化数据 { header, data:{nodes,lines} }
 */
export function toGraphData(
  nodes,
  edges,
  { transform: { x = 0, y = 0, k = 1 } = {}, graphName = Cfg.defaultGraphName } = {},
  packages,
  weedOutUnusedPackage = false
) {
  let usedPackageHashSet = new Set();
  /** @type {GraphData} */
  const graphData = {
    header: {
      version: Cfg.version,
      graphName: graphName,
      timestramp: new Date().getTime(),
      transform: { x, y, k },
      boundingBox: Util.calcuBoundingBox(nodes),
      layout: Cfg.layoutSetting,
    },
    data: {},
  };

  // 节点
  let maxId = 0;
  let nodeMapByOriginId = new Map(); // 传入id映射到节点
  graphData.data.nodes = nodes.map((n) => {
    if (weedOutUnusedPackage && n.modelId === Cfg.ModelId.package) {
      usedPackageHashSet.add(n.packageHash); // 记录节点使用的封装模块Hash
    }
    let nodeData = nodeToData(n);
    nodeMapByOriginId.set(nodeData.id, nodeData);
    // 将节点id修改为自增id
    nodeData.id = ++maxId;
    return nodeData;
  });

  // 连接线
  graphData.data.lines = edges.map((e) => {
    let lineData = edgeToData(e);
    // 映射到自增id
    if (nodeMapByOriginId.has(lineData.startId)) {
      lineData.startId = nodeMapByOriginId.get(lineData.startId).id;
    }
    if (nodeMapByOriginId.has(lineData.endId)) {
      lineData.endId = nodeMapByOriginId.get(lineData.endId).id;
    }
    return lineData;
  });

  const _packages = [];
  const _packageHashList = [];

  if (packages?.length > 0) {
    // 记录节点使用的封装中，使用到的子hash
    if (weedOutUnusedPackage) {
      packages.forEach((p) => {
        if (usedPackageHashSet.has(p.hash) && p.childsHash?.length > 0) {
          p.childsHash.forEach((hash) => {
            usedPackageHashSet.add(hash);
          });
        }
      });
    }

    packages.forEach((p) => {
      // 剔除未使用的封装模块
      if (weedOutUnusedPackage && !usedPackageHashSet.has(p.hash)) {
        return;
      }
      /** @type {PackageModel} */
      const _p = {
        hash: p.hash,
        name: p.name,
        childsHash: [...p.childsHash],
        graphData: {
          header: {
            version: p.graphData.header.version,
            timestramp: p.graphData.header.timestramp,
            boundingBox: p.graphData.header.boundingBox,
            // 头部信息剔除冗余的graphName、transform、hash
          },
          data: JSON.parse(JSON.stringify(p.graphData.data)), // 深拷贝节点连接信息
          // 剔除封装模块中嵌套封装模块信息packages、packageHashList（以childsHash为准）
        },
        initNodeData: JSON.parse(JSON.stringify(p.initNodeData)), // 深拷贝封装节点初始化数据
      };
      _packages.push(_p);
      _packageHashList.push(_p.hash);
    });
  }
  if (_packages.length > 0) {
    graphData.packages = _packages;
  }
  if (_packageHashList.length > 0) {
    graphData.packageHashList = _packageHashList;
  }

  const _lay = (graphData.header.layout = {});
  Object.keys(Cfg.layoutSetting).forEach((key) => {
    let {
      start: { x = 0, y = 0, z = 0 } = {},
      maxW = 0,
      maxH = 0,
      maxD = 0,
      dir = 0,
      spaceX = 0,
      spaceY = 0,
      spaceZ = 0,
    } = Cfg.layoutSetting[key];
    _lay[key] = { start: { x, y, z }, maxW, maxH, maxD, dir, spaceX, spaceY, spaceZ };
  });
  return graphData;
}

/**
 * @typedef {Object} GraphNode 图谱节点对象
 * @property {number} modelId - 模型id
 * @property {string} packageHash - 封装模块hash
 * @property {number} id - 节点id
 * @property {number} x - 节点x偏移
 * @property {number} y - 节点y偏移
 * @property {number} w - 节点宽度
 * @property {number} h - 节点高度
 * @property {string} text - 节点文本
 * @property {number} textAlign - 文本对齐方向（0:居中对齐 1:左对齐 2:右对齐）
 * @property {number} itemId - 生成/消耗物品id
 * @property {number} signalId - 传送带标记图标id
 * @property {number} count - 传送带标记数
 * @property {GraphNodeSlot[]} slots - 插槽
 */
/**
 * @typedef {Object} GraphNodeSlot 图谱节点插槽对象
 * @property {number} index - 插槽数组索引
 * @property {GraphNode} node - 节点
 * @property {GraphEdge} edge - 连接线对象(不存在连接时为null)
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (传送带方向——1:输出, -1:输入)
 * @property {number} priority - 四向插槽-是否优先口 (1:是, -1:否)
 * @property {number} filterId - 四向插槽-过滤优先输出物品id
 * @property {number} beltLevel - 四向插槽-连接传送带等级（1:黄带，2:绿带，3:蓝带，null-自动识别）
 * @property {number} packageNodeId - 封装模块插槽-对应package中原输入输出节点id
 * @property {number} itemId - 封装模块插槽-生成/消耗物品id
 * @property {number} signalId - 封装模块插槽-插槽传送带标记图标id
 * @property {number} count - 封装模块插槽-插槽传送带标记数
 * @property {string} text - 封装模块插槽-插槽文本
 * @property {boolean} _onlyOnePriorityIpt (蓝图生成时临时属性) 四向两进两出，且没有带过滤的优先输出的情况下，优先输入口标记为true
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
    signalId: _toInt(d.signalId),
    text: _toStr(d.text, d.modelId == Cfg.ModelId.text ? Cfg.defaultText : null),
    slots: [],
  };
  switch (node.modelId) {
    case Cfg.ModelId.text: // 普通文本
      node.textAlign = _toInt(d.textAlign, 0);
      break;
    case Cfg.ModelId.output:
    case Cfg.ModelId.input: // 输入输出口节点
      node.count = _toInt(d.count); // 传送带标记数
      break;
    case Cfg.ModelId.package: // 封装模块节点
      node.packageHash = _toStr(d.packageHash); // 封装模块hash
      break;
  }
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
      slot.beltLevel = _toInt(s.beltLevel); // 连接传送带等级
    } else if (node.modelId === Cfg.ModelId.package) {
      // 封装模块
      slot.packageNodeId = _toInt(s.packageNodeId); // 对应package中原输入输出节点id
      slot.itemId = _toInt(s.itemId); // 生成/消耗物品id
      slot.signalId = _toInt(s.signalId); // 插槽传送带标记图标id
      slot.count = _toInt(s.count); // 插槽传送带标记数
      slot.text = _toStr(s.text); // 插槽文本
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
  const d = { ...other, id: nodeId, modelId, x: _toFloat(ox), y: _toFloat(oy) };
  switch (modelId) {
    case Cfg.ModelId.text: // 文本
      var { lines, maxWordNum } = Util.splitLines(d.text);
      d.w = _toFloat(Math.max(10, maxWordNum * Cfg.fontSize)); // 根据实际文本修改宽度和高度
      d.h = _toFloat(lines.length * Cfg.lineHeight);
      break;
    case Cfg.ModelId.fdir: // 四向分流器
      d.w = d.h = _toFloat(Cfg.nodeSize);
      // 固定插槽位置
      d.slots = [
        { ox: 0, oy: _toFloat(-d.h / 2), dir: -1 }, // 默认 上输入
        { ox: _toFloat(d.w / 2), oy: 0, dir: -1 }, // 默认 右输入
        { ox: 0, oy: _toFloat(d.h / 2), dir: 1 }, // 默认 下输出
        { ox: _toFloat(-d.w / 2), oy: 0, dir: 1 }, // 默认 左输出
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
          if (slot.beltLevel) {
            s.beltLevel = _toInt(slot.beltLevel); // 连接传送带等级
          }
        });
      }
      break;
    case Cfg.ModelId.monitor: // 流速器(生成/消耗)
    case Cfg.ModelId.output: // 信号输出(生成)
    case Cfg.ModelId.input: // 信号输入(消耗)
      d.w = d.h = _toFloat(Cfg.nodeSize / 2); // 一半四向宽
      d.itemId = _toInt(other.itemId, 6002); // 生成/消耗物品id（默认红糖）
      d.signalId = _toInt(other.signalId); // 传送带标记图标id
      d.count = _toInt(other.count); // 传送带标记数
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
    case Cfg.ModelId.set_zero: // 置零
      d.w = d.h = _toFloat(Cfg.nodeSize / 2); // 一半四向宽
      d.slots = [{ dir: -1 }]; // 默认输入
      break;
    case Cfg.ModelId.package: // 封装模块节点
      // if (d.packageHash == null) throw "封装模块hash不能为空！";
      // if (other.slots?.length > 0) {
      //   for (const s of other.slots) {
      //     if (s.packageNodeId == null) throw "封装模块插槽原输入输出节点id丢失！";
      //   }
      // }
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
 * @property {string} packageHash - 封装模块hash
 * @property {number} hashIdx - 简化数据下只记录packageHash在packageHashList中的索引【仅在持久化时存在】
 * @property {number} id - 节点id
 * @property {number} x - 节点x偏移
 * @property {number} y - 节点y偏移
 * @property {number} w - 节点宽度
 * @property {number} h - 节点高度
 * @property {string} text - 节点文本
 * @property {number} itemId - 生成/消耗物品id
 * @property {number} signalId - 传送带标记图标id
 * @property {number} count - 传送带标记数
 * @property {NodeSlotData[]} slots - 插槽
 */
/**
 * @typedef {Object} NodeSlotData 节点插槽 持久化数据
 * @property {number} ox - 节点内x偏移
 * @property {number} oy - 节点内y偏移
 * @property {number} dir - 输入输出方向 (传送带方向——1:输出, -1:输入)
 * @property {number} priority - 四向插槽-是否优先口 (1:是, -1:否)
 * @property {number} filterId - 四向插槽-过滤优先输出物品id
 * @property {number} beltLevel - 四向插槽-连接传送带等级（1:黄带，2:绿带，3:蓝带，null-自动识别）
 * @property {number} packageNodeId - 封装模块插槽-对应package中原输入输出节点id
 * @property {number} itemId - 封装模块插槽-生成/消耗物品id
 * @property {number} signalId - 封装模块插槽-插槽传送带标记图标id
 * @property {number} count - 封装模块插槽-插槽传送带标记数
 * @property {string} text - 封装模块插槽-插槽文本
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
    text: node.text || undefined,
    textAlign: node.textAlign || undefined,
    signalId: node.signalId || undefined, // 传送带标记图标id
    count: node.count || undefined, // 传送带标记数
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
      if (s.beltLevel) {
        // 连接传送带等级
        slot.beltLevel = s.beltLevel;
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
  } else if (modelId === Cfg.ModelId.package) {
    // 封装模块节点
    data.w = node.w;
    data.h = node.h;
    data.packageHash = node.packageHash; // 封装模块hash
    data.slots =
      node.slots?.map((s) => ({
        ox: s.ox,
        oy: s.oy,
        dir: s.dir, // 1:输出口 -1:输入口
        packageNodeId: s.packageNodeId, // 对应package中原输入输出节点id
        itemId: s.itemId, // 生成/消耗物品id
        signalId: s.signalId || undefined, // 插槽传送带标记图标id
        count: s.count || undefined, // 插槽传送带标记数
        text: s.text || undefined, // 插槽文本
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
