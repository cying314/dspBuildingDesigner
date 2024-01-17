import * as Cfg from "./graphConfig.js";
import { Notification, Message } from "element-ui";
import { saveAs } from "file-saver";
import crypto from "crypto";

/**
 * @typedef {import("./dataMapper.js").GraphData} GraphData
 * @typedef {import("./dataMapper.js").GraphNode} GraphNode
 * @typedef {import("./dataMapper.js").GraphNodeSlot} GraphNodeSlot
 * @typedef {import("./dataMapper.js").GraphEdge} GraphEdge
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
    if (!(graphData.header instanceof Object)) throw "header数据异常！";
    if (!(graphData.header.boundingBox instanceof Object)) throw "header.boundingBox数据异常！";
    if (!(graphData.header.transform instanceof Object)) throw "header.transform数据异常！";
    if (!(graphData.data instanceof Object)) throw "data数据异常！";
    if (!(graphData.data.nodes instanceof Array)) throw "data.nodes数据异常！";
    if (!(graphData.data.lines instanceof Array)) throw "data.lines数据异常！";
  } catch (e) {
    if (popupMessage) {
      _warn("数据校验不通过：" + e);
    }
    if (isThrow) throw e;
    return false;
  }
  return true;
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
 * @return {string[]} 分割字符串数组
 */
export function splitLines(text, lineWidth = Cfg.lineWordNum) {
  text = text?.trim() || Cfg.defaultText;
  if (text.length == 0) return [];
  var totalWidth = 0;
  var lines = [];
  var line = "";
  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    if (char === "\n") {
      // 换行符
      lines.push(line + "\n");
      line = "";
      totalWidth = 0;
      continue;
    }
    var charWidth;
    if (/[\u4e00-\u9fa5]/.test(char)) {
      // 中文字符
      charWidth = 1;
    } else {
      // 英文字符
      charWidth = 0.5;
    }
    // 检查是否需要换行
    if (totalWidth + charWidth > lineWidth) {
      lines.push(line);
      line = char;
      totalWidth = charWidth;
    } else {
      totalWidth += charWidth;
      line += char;
    }
  }
  // 添加最后一行
  if (line !== "") {
    lines.push(line);
  }
  return lines;
}

/**
 * 计算文本行数(至少一行)
 * @param {string} text 文本
 * @param {number} lineWidth 一行容纳多少个字符(非中文算0.5个字符)
 */
export function getLineNum(text, lineWidth = Cfg.lineWordNum) {
  text = text?.trim() || Cfg.defaultText;
  if (text.length == 0) return 1;
  return splitLines(text, lineWidth).length;
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
 */
export function saveGraphDataAsJson(graphData) {
  try {
    let fileName = graphData.header.graphName ?? Cfg.defaultGraphName;
    saveAsTxt(JSON.stringify(graphData), fileName, "json");
  } catch (e) {
    this.warning("导出JSON文件失败！");
    throw e;
  }
}

/**
 * 从localStorage获取缓存数据，若不存在或校验失败则返回null
 * @param {File} file
 * @return {GraphData}
 */
export function getCacheGraphData() {
  const json = window.localStorage.getItem("cacheGraphData");
  if (json != null) {
    try {
      let cacheGraphData = JSON.parse(json);
      let check = checkGraphData(cacheGraphData, false, false);
      if (check) {
        // 校验成功返回
        return cacheGraphData;
      }
    } catch (e) {
      console.warn("加载缓存数据失败：" + e);
    }
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
 * 提取图谱数据特征，创建hash值（剔除多余信息，只保留蓝图建筑关键信息）
 * @param {GraphData} graphData
 * @return {string}
 */
export function getGraphDataHash(graphData) {
  const nodes = graphData.data.nodes ?? [];
  const lines = graphData.data.lines ?? [];
  const packages = graphData.packages ?? [];
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
    feature += n.id + "," + n.modelId; // 节点id,模型id
    if (n.itemId) {
      feature += "," + n.itemId; // 生成/消耗物品id
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
        if (s.priority) {
          feature += "," + s.priority; // 是否优先插槽
        }
        if (s.filterId) {
          feature += "," + s.filterId; // 过滤优先输出物品id
        }
        if (s.packageId) {
          feature += "," + s.packageId; // 封装模块插槽-对应package中原输入输出节点id
        }
      }
      feature += "]";
    }
  }
  feature += "]";

  // 边特征
  feature += ",l[";
  let firstLine = true;
  for (let l of lines) {
    if (firstLine) {
      firstLine = false;
    } else {
      feature += "|";
    }
    feature += l.startId + "-" + l.startSlot + "," + l.endId + "-" + l.endSlot;
  }
  feature += "]";

  // 复制模块特征
  feature += ",p[";
  let firstPackage = true;
  for (let p of packages) {
    if (firstPackage) {
      firstPackage = false;
    } else {
      feature += "|";
    }
    feature += p.hash;
  }
  feature += "]";
  // 使用SHA-256哈希函数生成哈希值
  return crypto.createHash("sha256").update(feature).digest("hex");
}

/**
 * 成功信息
 */
export function _success(mes) {
  Message({
    message: mes,
    type: "success",
    duration: 1000,
  });
}

/**
 * 警告信息
 */
export function _warn(mes) {
  Message({
    message: mes,
    type: "warning",
  });
}

/**
 * 异常信息
 */
export function _err(mes) {
  Notification({
    title: "错误",
    message: mes,
    type: "error",
  });
}
