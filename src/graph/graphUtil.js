import * as Cfg from "./graphConfig.js";
import { Notification, Message } from "element-ui";
import { saveAs } from "file-saver";

/**
 * 校验图谱持久化数据结构
 * @param graphData 图谱持久化数据 { header, data:{nodes,lines} }
 * @param isThrow 是否抛出异常
 * @param popupMessage 是否弹出提示
 * @return {Boolean} 是否正常
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
      _warn("图谱数据校验失败：" + e);
    }
    if (isThrow) throw e;
    return false;
  }
  return true;
}

/**
 * 相对画布svg坐标，转换画布内坐标
 * @param offset 相对画布坐标 [ox, oy]
 * @param transform 转换参数 {x, y, k}
 * @return 画布内坐标 [cx, cx]
 */
export function offsetToCoord([ox, oy], { x, y, k }) {
  return [(ox - x) / k, (oy - y) / k];
}

/**
 * 画布内坐标，转换相对画布svg坐标
 * @param coord 画布内坐标 [cx, cy]
 * @param transform 转换参数 {x, y, k}
 * @return 相对画布坐标 [ox, oy]
 */
export function coordToOffset([cx, cy], { x, y, k }) {
  return [cx * k + x, cy * k + y];
}

/**
 * 限制每行字符数，切换字符串
 * @param text
 * @param lineWidth 一行容纳多少个字符(非中文算0.5个字符)
 * @return {Array} 分割字符串数组
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
 * @param text 文本
 * @param lineWidth 一行容纳多少个字符(非中文算0.5个字符)
 */
export function getLineNum(text, lineWidth = Cfg.lineWordNum) {
  text = text?.trim() || Cfg.defaultText;
  if (text.length == 0) return 1;
  return splitLines(text, lineWidth).length;
}

/**
 * 获取固定大小（随着视图缩小变大，以保持相对窗口大小不变）
 * @param size 未缩放的数值
 * @param scale 缩放量
 * @param minSize 最小数值(默认size)
 * @param maxSize 最大数值(默认Number.MAX_VALUE)
 */
export function fixedSize(size, scale, minSize = size, maxSize = Number.MAX_VALUE) {
  return Math.min(Math.max(size / scale, minSize), maxSize);
}

/**
 * 获取网格对齐坐标偏移量
 * @param x
 * @param y
 * @return 对齐坐标偏移量 [dtX, dtY]
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
 * @param x
 * @param y
 * @return 对齐后坐标 [x, y]
 */
export function gridAlignment(x, y) {
  let [dtX, dtY] = getGridAlignmentOffset(x, y);
  return [x + dtX, y + dtY];
}

/**
 * 计算节点包围盒边界
 * @description 节点集为空 或 长度为0 时，返回null
 * @param nodes 节点集 [{x, y, w, h},...]
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
 * @param nodes 节点对象集合
 * @return edges 连接线对象集合
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
 * @param nodeMap 节点对象映射
 * @return edges 连接线对象集合
 */
export function getEdgesByNodeMap(nodeMap) {
  const edges = new Set(); // 去重
  nodeMap.forEach((n) => {
    n.slots.forEach((s) => {
      // 排除节点映射外的边
      if (s.edge && nodeMap.has(s.edge.source) && nodeMap.has(s.edge.target)) {
        edges.add(s.edge);
      }
    });
  });
  return Array.from(edges);
}

/**
 * 读取json文件，获取graphData
 * @param {File} file
 * @return Promise
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
 * 保存为json文件
 * @param graphData
 */
export function saveAsJson(graphData) {
  try {
    let fileName = (graphData.header.graphName ?? Cfg.defaultGraphName) + ".json";
    saveAs(new Blob([JSON.stringify(graphData)], { type: "text/plain;charset=utf-8" }), fileName);
  } catch (e) {
    this.warning("导出JSON文件失败！");
    throw e;
  }
}

/**
 * 从localStorage获取缓存数据，若不存在或校验失败则返回null
 * @param {File} file
 * @return Promise
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
