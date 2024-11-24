import * as Cfg from "./graphConfig.js";
import { Notification, Message, MessageBox, Loading } from "element-ui";
import { saveAs } from "file-saver";
import crypto from "crypto";

/**
 * @typedef {import("./dataMapper.js").GraphData} GraphData 图谱 持久化数据
 * @typedef {import("./dataMapper.js").NodeData} NodeData 节点 持久化数据
 * @typedef {import("./dataMapper.js").NodeSlotData} NodeSlotData 节点插槽 持久化数据
 * @typedef {import("./dataMapper.js").LineData} LineData 连接线 持久化数据
 * @typedef {import("./dataMapper.js").PackageModel} PackageModel 封装节点
 *
 * @typedef {import("./dataMapper.js").GraphNode} GraphNode 图谱节点对象
 * @typedef {import("./dataMapper.js").GraphNodeSlot} GraphNodeSlot 图谱节点插槽对象
 * @typedef {import("./dataMapper.js").GraphEdge} GraphEdge 图谱边对象
 */
/**
 * 校验图谱持久化数据结构
 * @param {GraphData} graphData 图谱持久化数据 { header, data:{nodes,lines} }
 * @param {boolean} isThrow 是否抛出异常
 * @param {boolean} popupMessage 是否弹出提示
 * @return {boolean} 是否正常
 */
export function checkGraphData(graphData, isThrow, popupMessage) {
  try {
    if (graphData == null) throw "图谱数据为null！";
    if (!_isObject(graphData.header)) throw "header数据异常！";
    if (!_isObject(graphData.header.boundingBox, true)) throw "header.boundingBox数据异常！";
    if (!_isObject(graphData.header.transform, true)) throw "header.transform数据异常！";
    if (!_isObject(graphData.header.layout, true)) throw "header.layout数据异常！";
    if (!_isObject(graphData.data)) throw "data数据异常！";
    if (!_isArray(graphData.data.nodes)) throw "data.nodes数据异常！";
    if (!_isArray(graphData.data.lines)) throw "data.lines数据异常！";
    if (!_isArray(graphData.packages, true)) throw "packages数据异常！";
    if (!_isArray(graphData.packageHashList, true)) throw "packageHashList数据异常！";
  } catch (e) {
    if (popupMessage) {
      _warn("数据校验不通过：" + e);
    }
    if (isThrow) throw e;
    return false;
  }
  return true;
}
function _isArray(val, nullable = false) {
  if (val == null) return !!nullable;
  return Array.isArray(val);
}
function _isObject(val, nullable = false) {
  if (val == null) return !!nullable;
  return val instanceof Object;
}

/**
 * 相对画布svg坐标，转换画布内坐标
 * @param {number[]} offset 相对画布坐标 [ox, oy]
 * @param {object} transform 转换参数 {x, y, k}
 * @return {number[]} 画布内坐标 [cx, cx]
 */
export function offsetToCoord([ox, oy], { x, y, k }) {
  return [(ox - x) / k, (oy - y) / k];
}

/**
 * 画布内坐标，转换相对画布svg坐标
 * @param {number[]} coord 画布内坐标 [cx, cy]
 * @param {object} transform 转换参数 {x, y, k}
 * @return {number[]} 相对画布坐标 [ox, oy]
 */
export function coordToOffset([cx, cy], { x, y, k }) {
  return [cx * k + x, cy * k + y];
}

/**
 * 限制每行字符数，切换字符串
 * @param {string} text
 * @param {number} lineWidth 一行容纳多少个字符(非中文算0.5个字符)
 * @return {{lines:string[], maxWordNum:number}} {lines:分割字符串数组, maxWordNum:最长的行有多少个字符}
 */
export function splitLines(text, lineWidth = Cfg.lineWordNum) {
  text = text?.trim() || Cfg.defaultText;
  if (text.length == 0) return [];
  var totalWidth = 0;
  var maxWordNum = 0;
  var lines = [];
  var line = "";
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    if (char === "\n") {
      // 换行符
      lines.push(line);
      line = "";
      totalWidth = 0;
      continue;
    }
    var charWidth = getWidthByCharCode(char.charCodeAt(0));
    // 检查是否需要换行
    if (totalWidth + charWidth > lineWidth) {
      lines.push(line);
      line = char;
      totalWidth = charWidth;
    } else {
      totalWidth += charWidth;
      if (totalWidth > maxWordNum) maxWordNum = totalWidth;
      line += char;
    }
  }
  // 添加最后一行
  if (line !== "") {
    lines.push(line);
  }
  return {
    maxWordNum,
    lines,
  };
}

/**
 * 获取字符串宽度
 * @param {string} text
 * @return {number} 字符串宽度(非中文算0.5)
 */
export function getStringWidth(text) {
  let width = 0;
  for (var i = 0; i < text.length; i++) {
    width += getWidthByCharCode(text.charCodeAt(i));
  }
  return width;
}

/**
 * 获取字符宽度
 * @param {number} charCode
 * @return {number} 字符宽度(非中文算0.5)
 */
export function getWidthByCharCode(charCode) {
  if (
    (charCode >= 0x3000 && charCode <= 0x9fff) || // 顿号、句号等中文符号-中文字符
    (charCode >= 0xff00 && charCode <= 0xffef) // 全角字符
  ) {
    return 1;
  } else {
    // 其他字符
    return 0.5;
  }
}

/**
 * 计算文本行数(至少一行)
 * @param {string} text 文本
 * @param {number} lineWidth 一行容纳多少个字符(非中文算0.5个字符)
 */
export function getLineNum(text, lineWidth = Cfg.lineWordNum) {
  text = text?.trim() || Cfg.defaultText;
  if (text.length == 0) return 1;
  return splitLines(text, lineWidth).lines.length;
}

/**
 * 获取固定大小（随着视图缩小变大，以保持相对窗口大小不变）
 * @param {number} size 未缩放的数值
 * @param {number} scale 缩放量
 * @param {number} minSize 最小数值(默认size)
 * @param {number} maxSize 最大数值(默认Number.MAX_VALUE)
 */
export function fixedSize(size, scale, minSize = size, maxSize = Number.MAX_VALUE) {
  return Math.min(Math.max(size / scale, minSize), maxSize);
}

/**
 * 获取网格对齐坐标偏移量
 * @param {number} x
 * @param {number} y
 * @return {number[]} 对齐坐标偏移量 [dtX, dtY]
 */
export function getGridAlignmentOffset(x, y) {
  let dtX, dtY;
  let modX = x % Cfg.gridStep;
  // 向最近的对齐线偏移
  if (modX >= Cfg.gridStep / 2) {
    dtX = Cfg.gridStep - modX;
  } else {
    dtX = -modX;
  }
  let modY = y % Cfg.gridStep;
  if (modY >= Cfg.gridStep / 2) {
    dtY = Cfg.gridStep - modY;
  } else {
    dtY = -modY;
  }
  return [dtX, dtY];
}

/**
 * 网格对齐坐标
 * @param {number} x
 * @param {number} y
 * @return {number[]} 对齐后坐标 [x, y]
 */
export function gridAlignment(x, y) {
  let [dtX, dtY] = getGridAlignmentOffset(x, y);
  return [x + dtX, y + dtY];
}

/**
 * 计算节点包围盒边界
 * @description 节点集为空 或 长度为0 时，返回null
 * @param {GraphNode[]} nodes 节点集 [{x, y, w, h},...]
 * @return 包围盒边界信息 {minX, minY, maxX, maxY, w, h}
 */
export function calcuBoundingBox(nodes) {
  if (!(nodes.length > 0)) return null;
  let minX, minY, maxX, maxY, w, h;
  nodes.forEach((n) => {
    const x1 = n.x - n.w / 2;
    const y1 = n.y - n.h / 2;
    const x2 = n.x + n.w / 2;
    const y2 = n.y + n.h / 2;
    minX = Math.min(minX ?? x1, x1);
    minY = Math.min(minY ?? y1, y1);
    maxX = Math.max(maxX ?? x2, x2);
    maxY = Math.max(maxY ?? y2, y2);
  });
  w = maxX - minX;
  h = maxY - minY;
  return { minX, minY, maxX, maxY, w, h };
}

/**
 * 通过节点集合获取边集（排除节点集合外的边）
 * @param {GraphNode[]} nodes 节点对象集合
 * @return {GraphEdge[]} edges 连接线对象集合
 */
export function getEdgesByNodes(nodes) {
  const nodeMap = new Map();
  nodes.forEach((n) => {
    nodeMap.set(n.id, n);
  });
  return getEdgesByNodeMap(nodeMap);
}

/**
 * 通过节点映射获取边集（排除节点映射外的边）
 * @param {Map<number,GraphNode>} nodeMap 节点对象映射
 * @return {GraphEdge[]} edges 连接线对象集合
 */
export function getEdgesByNodeMap(nodeMap) {
  const edges = new Set(); // 去重
  nodeMap.forEach((n) => {
    n.slots.forEach((s) => {
      // 排除节点映射外的边
      if (s.edge && nodeMap.has(s.edge.source.id) && nodeMap.has(s.edge.target.id)) {
        edges.add(s.edge);
      }
    });
  });
  return Array.from(edges);
}

/**
 * 读取json文件，获取graphData
 * @param {File} file
 * @return {Promise<GraphData>}
 */
export function readFileToGraphData(file) {
  return new Promise((resolve, reject) => {
    if (file.type != "application/json") {
      return reject("请上传json格式的文件");
    }
    if (typeof FileReader === "undefined") {
      return reject("您的浏览器不支持FileReader接口");
    }
    let reader = new FileReader();
    reader.readAsText(file, "UTF-8");

    reader.onload = (r) => {
      try {
        const graphData = JSON.parse(r.target.result);
        checkGraphData(graphData, true, false);
        resolve(graphData);
      } catch (e) {
        reject(e);
      }
    };
  });
}

/**
 * 保存字符串为txt文件
 * @param {string} content 内容字符串
 * @param {string} fileName 文件名
 * @param {string} fileSuffix 文件后缀
 */
export function saveAsTxt(content, fileName = "默认", fileSuffix = "txt") {
  saveAs(new Blob([content], { type: "text/plain;charset=utf-8" }), fileName + "." + fileSuffix);
}

/**
 * 保存图谱数据为json文件
 * @param {GraphData} graphData
 * @param {string} fileName 文件名
 */
export function saveGraphDataAsJson(graphData, fileName) {
  try {
    if (fileName == null) {
      fileName = graphData.header.graphName ?? Cfg.defaultGraphName;
    } else if (fileName.toLocaleLowerCase().endsWith(".json")) {
      fileName = fileName.slice(0, -5);
    }
    if (Cfg.globalSetting.reducedData) {
      // 简化导出JSON数据
      reducedGraphData(graphData);
    }
    saveAsTxt(JSON.stringify(graphData), fileName, "json");
  } catch (e) {
    this.warning("导出JSON文件失败！");
    throw e;
  }
}

/**
 * 简化图谱持久化数据
 * @param {GraphData} graphData
 * @param {PackageModel} subPack 子模块
 */
function reducedGraphData(graphData, subPack) {
  if (!checkGraphData(graphData)) return;
  // 剔除画布位置信息
  graphData.header.transform = undefined;
  // 剔除生成蓝图布局信息
  graphData.header.layout = undefined;
  // 节点位置统一移动画布到左上角，并将坐标取整2位小数
  const { minX: omX, minY: omY, w: ow, h: oh } = graphData.header.boundingBox;
  // 计算距离左上角的空白距离（对齐网格线）
  const Space = Cfg.gridStep * 2 + Cfg.selectionMargin;
  let spX = Space;
  let spY = Space;
  if (graphData.data.nodes.length > 0) {
    // 若存在节点，使用第一个节点中心做网格对齐
    let { x = 0, y = 0 } = graphData.data.nodes[0];
    let gridOffset = getGridAlignmentOffset(x - omX + spX, y - omY + spY);
    spX += gridOffset[0];
    spY += gridOffset[1];
  }
  if (omX != spX || omY != spY) {
    graphData.header.boundingBox.minX = spX;
    graphData.header.boundingBox.minY = spY;
    graphData.header.boundingBox.maxX = +(+ow + spX).toFixed(2);
    graphData.header.boundingBox.maxY = +(+oh + spY).toFixed(2);
    graphData.header.boundingBox.w = +(+ow).toFixed(2);
    graphData.header.boundingBox.h = +(+oh).toFixed(2);
    graphData.data.nodes.forEach((n) => {
      n.x = +(n.x - omX + spX).toFixed(2);
      n.y = +(n.y - omY + spY).toFixed(2);
    });
  }
  const hashList = subPack ? subPack.childsHash : graphData.packageHashList;
  if (hashList?.length > 0) {
    // 标识为简化数据
    graphData.header.simplified = 1;

    // 将hash排序
    hashList.sort();
    const hashToIndexMap = new Map();
    for (let i in hashList) {
      hashToIndexMap.set(hashList[i], +i);
    }
    // 将节点引用packageHash简化为索引
    graphData.data.nodes.forEach((n) => {
      if (n.modelId === Cfg.ModelId.package) {
        n.hashIdx = hashToIndexMap.get(n.packageHash);
        n.packageHash = undefined;
      }
    });

    if (graphData.packages?.length > 0) {
      let packages = [];
      graphData.packages.forEach((p) => {
        p = JSON.parse(JSON.stringify(p));
        // 剔除冗余的hash
        p.initNodeData.packageHash = undefined;
        // 递归处理引用封装模块数据
        reducedGraphData(p.graphData, p);
        packages.push(p);
      });
      graphData.packages = packages;
    }
  }
}

let _getCacheLoading = null;
/**
 * 从localStorage/localforage获取缓存数据，若不存在或校验失败则返回null
 * @param {File} file
 * @return {GraphData}
 */
export async function getCacheGraphData() {
  if (_getCacheLoading) return;
  _getCacheLoading = _loading("加载数据中");
  try {
    // 优先从localforage获取
    let cacheGraphData = await window.localforage.getItem("cacheGraphData");
    if (cacheGraphData == null) {
      // localforage中没有数据，尝试从localStorage中获取，兼容旧版本
      const json = window.localStorage.getItem("cacheGraphData");
      if (json != null) {
        cacheGraphData = JSON.parse(json);
      }
    }
    let check = checkGraphData(cacheGraphData, false, false);
    if (check) {
      // 校验成功返回
      return cacheGraphData;
    }
  } catch (e) {
    console.warn("加载缓存数据失败：" + e);
  } finally {
    _getCacheLoading.close();
    _getCacheLoading = null;
  }
  return null;
}

/**
 * 获取初始化图谱数据
 * @return {GraphData}
 */
export function getInitGraphData() {
  return {
    header: {
      version: Cfg.version,
      graphName: Cfg.defaultGraphName,
      timestramp: new Date().getTime(),
      transform: { x: 0, y: 0, k: 1 },
      boundingBox: { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 0, h: 0 },
    },
    data: {
      lines: [],
      nodes: [],
    },
  };
}

/**
 * 图谱特征码版本前缀标识
 */
export const hashVersionPrefix = "v2-";
/**
 * 提取图谱数据特征，创建hash值（剔除多余信息，只保留蓝图建筑关键信息）
 * @param {GraphData} graphData
 * @return {string}
 */
export function getGraphDataHash(graphData) {
  const nodes = graphData.data.nodes ?? [];
  const lines = graphData.data.lines ?? [];
  // 引用封装模块hash列表
  const hashList = graphData.packageHashList?.sort() ?? []; // 忽略模块引入顺序
  const hashToIndexMap = new Map();
  for (let i in hashList) {
    hashToIndexMap.set(hashList[i], i);
  }
  /** @type {Map<number, NodeData>} 引用封装模块节点 node.id -> node */
  const packageNodeMap = new Map();

  // 节点特征
  let feature = "n[";
  let firstNode = true;
  for (let n of nodes) {
    // 剔除文本节点
    if (n.modelId == Cfg.ModelId.text) continue;
    if (firstNode) {
      firstNode = false;
    } else {
      feature += "|";
    }
    feature += n.id + "-" + n.modelId; // 节点id,模型id
    if (n.modelId === Cfg.ModelId.package) {
      // 引用封装模块
      feature += ",p" + hashToIndexMap.get(n.packageHash); // 封装hash索引
      packageNodeMap.set(n.id, n);
      continue;
    }
    if (n.itemId) {
      feature += ",c" + n.itemId; // 生成/消耗物品id
    }
    // 插槽
    if (n.slots?.length > 0) {
      feature += ",s[";
      var firstSlot = true;
      for (let s of n.slots) {
        if (firstSlot) {
          firstSlot = false;
        } else {
          feature += "|";
        }
        feature += s.dir; // 插槽方向
        if (s.beltLevel) {
          feature += ",b" + s.beltLevel; // 连接传送带等级
        }
        if (s.priority == 1) {
          feature += ",p"; // 是否优先插槽
          if (s.filterId) {
            feature += s.filterId; // 过滤优先输出物品id
          }
        }
      }
      feature += "]";
    }
  }
  feature += "]";

  // 边特征
  if (lines.length > 0) {
    feature += ",l[";
    feature += lines
      .map((l) => {
        let startSlotIdx = l.startSlot;
        let endSlotIdx = l.endSlot;
        // 引用封装模块不使用插槽索引，以关联内部id为依据
        let sp = packageNodeMap.get(l.startId);
        let ep = packageNodeMap.get(l.endId);
        if (sp) {
          startSlotIdx = "n" + sp.slots[startSlotIdx].packageNodeId;
        }
        if (ep) {
          endSlotIdx = "n" + ep.slots[endSlotIdx].packageNodeId;
        }
        return l.startId + "-" + startSlotIdx + "," + l.endId + "-" + endSlotIdx;
      })
      .sort() // 忽略连线引入顺序
      .join("|");
    feature += "]";
  }

  // 引用封装模块特征
  if (hashList.length > 0) {
    feature += ",p[";
    feature += hashList.join("|");
    feature += "]";
  }
  // 使用SHA-256哈希函数生成哈希值
  return hashVersionPrefix + crypto.createHash("sha256").update(feature).digest("hex");
}

/**
 * 成功信息
 */
export function _success(mes, duration = 800) {
  Message({
    message: mes,
    type: "success",
    duration,
    offset: 60,
  });
}

/**
 * 警告信息
 */
export function _warn(mes, duration = 2000) {
  Message({
    message: mes,
    type: "warning",
    duration,
    offset: 60,
  });
}

/**
 * 异常信息
 */
export function _err(mes) {
  console.error(mes);
  Notification({
    title: "错误",
    message: mes,
    type: "error",
    offset: 60,
  });
}

/**
 * 弹窗html内容提示确认
 */
export function _confirmHtml(html, otherOption = {}) {
  return MessageBox.confirm(html, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
    dangerouslyUseHTMLString: true, // 渲染html
    ...otherOption,
  });
}

/**
 * 弹窗输入框提示确认
 * @param {string} title 输入框标题
 * @param {string} inputValue 输入框默认内容
 * @param {object} otherOption 其他MessageBox.prompt option参数
 */
export function _prompt(title, inputValue, otherOption = {}) {
  return MessageBox.prompt(title, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    inputValue,
    ...otherOption,
  }).then(({ value }) => value);
}

export function _loading(title = "加载中") {
  return Loading.service({
    text: title,
    lock: true,
  });
}

export function _toInt(num, def) {
  if (num == null || isNaN(num)) return def;
  return parseInt(num);
}
export function _toFloat(num, def, precision = 4) {
  if (num == null || isNaN(num)) return def;
  return +parseFloat(num).toFixed(precision); // 默认小数精度控制4位
}
export function _toStr(str, def) {
  if (str == null || typeof str != "string") return def;
  return str;
}
