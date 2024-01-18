import * as d3 from "d3";
import * as Cfg from "./graphConfig.js";
import * as Mapper from "./dataMapper.js";
import * as Util from "./graphUtil.js";
import * as Watermark from "@/utils/watermark.js";
import * as BuildingUtil from "@/utils/buildingUtil.js";
import * as ItemsUtil from "@/utils/itemsUtil.js";
import * as Parser from "@/utils/parser";
export default class Graph {
  /** 图谱名称 @type {string} */ graphName;
  /** 画布位移、缩放 @type {{x, y, k}} */ transform = { x: 0, y: 0, k: 1 };
  /** 画布宽度 @type {number} */ width;
  /** 画布高度 @type {number} */ height;
  /** 画布容器dom对象 @type {HTMLElement} */ _canvasDOM;
  /** 初始化缩放(默认1) @type {number} */ defaultScale;
  /** 最小缩放(默认0.1) @type {number} */ minScale;
  /** 最大缩放(默认5) @type {number} */ maxScale;

  /** 根节点SVG Sel @type {d3.Selection<SVGSVGElement>} */ $svg;
  /** 视图层Sel @type {d3.Selection<SVGGElement>} */ $vis;
  /** 节点层Sel @type {d3.Selection<SVGGElement>} */ $nodeGroup;
  /** 连接线层Sel @type {d3.Selection<SVGGElement>} */ $linkGroup;
  /** 选择框层Sel @type {d3.Selection<SVGGElement>} */ $boxGroup;

  /** 节点g标签Selection @type {d3.Selection<SVGGElement, Mapper.GraphNode>} */ $node;
  /** 节点插槽g标签Selection @type {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} */ $nodeSlot;
  /** 连线集Selection @type {d3.Selection<,Mapper.GraphEdge>} */ $link;
  /** 选择框Selection @type {d3.Selection<,Mapper.GraphNode>} */ $box;

  /** 节点拖拽实例 @type {d3.DragBehavior} */ _nodeDrag;
  /** 节点插槽拖拽实例 @type {d3.DragBehavior} */ _slotDrag;

  /** 节点数据 @type {Mapper.GraphNode[]} */ _nodes;
  /** 连接线数据 @type {Mapper.GraphEdge[]} */ _edges;
  /** 最大节点id @type {number} */ _maxId;
  /** 节点id对应实体Map @type {Map<number,Mapper.GraphNode>} */ _nodeMap;

  /** 节点选择框 */ _selection = {
    /** 选中节点id对应实体Map @type {Map<number,Mapper.GraphNode>} */ nodeMap: new Map(),
    /** 选中节点包围盒边界信息 @type {{minX, minY, maxX, maxY, w, h}} */ boundingBox: null,
  };
  /** 右键选择框窗口 start拖拽起点 end拖拽终点 @type {{start:number[], end:number[]}} */ _selectionWindow;

  /** 是否按下ctrl */ _ctrlDown = false;
  /** 当前鼠标是否在画布内 */ _mouseIsEnter = false;
  /** 当前鼠标在画布内相对位置 */ _mouseOffset = [0, 0];
  /** 撤回列表 @type {Mapper.GraphData[]} */ _undoList = [];
  /** 重做列表 @type {Mapper.GraphData[]} */ _redoList = [];

  /** 封装节点映射 hash->PackageModel @type {Map<string, Mapper.PackageModel>} */ packageMap;

  /** 画布空白位置双击事件 */ handleDblclick;
  /** 右键点击节点事件 */ handleRclickNode;
  /** 右键点击插槽事件 */ handleRclickSlot;
  /** 生成蓝图事件前置调用 */ beforeGenerateBlueprint;

  /**
   * 图谱实例
   * @param {Object} options
   * @param {HTMLElement} options.canvasDOM 画布容器dom对象
   * @param {Mapper.GraphData} options.graphData 图谱数据
   * @param {string} options.uniqueTag 画布内元素id唯一标识(默认def)
   * @param {string} options.graphName 图谱名称
   * @param {number} options.defaultScale 初始化缩放
   * @param {number} options.minScale 最小缩放
   * @param {number} options.maxScale 最大缩放
   * @param {(event: Event) => void} options.handleDblclick 画布空白位置双击事件
   * @param {(event: Event, d: Object) => void} options.handleRclickNode 右键点击插槽事件
   * @param {(event: Event, d: Object) => void} options.handleRclickSlot 右键点击插槽事件
   * @param {(done: ()=>blueprintRes ) => void} options.beforeGenerateBlueprint 生成蓝图事件前置调用
   */
  constructor({
    canvasDOM,
    graphData,
    uniqueTag = "def",
    graphName,
    defaultScale = Cfg.defaultScale,
    minScale = Cfg.minScale,
    maxScale = Cfg.maxScale,
    handleDblclick,
    handleRclickNode,
    handleRclickSlot,
    beforeGenerateBlueprint,
  }) {
    if (!canvasDOM) throw "画布容器dom不存在！";
    this._canvasDOM = canvasDOM;
    this.uniqueTag = uniqueTag;
    this.graphName = graphName;
    this.defaultScale = defaultScale;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.handleDblclick = handleDblclick;
    this.handleRclickNode = handleRclickNode;
    this.handleRclickSlot = handleRclickSlot;
    this.beforeGenerateBlueprint = beforeGenerateBlueprint;
    this.init(graphData);
  }

  /**
   * 初始化视图
   * @param {Mapper.GraphData} graphData 图谱持久化数据
   */
  init(graphData) {
    // 画布外层节点
    const pNode = this._canvasDOM.parentNode;
    this.width = pNode ? pNode.clientWidth : Cfg.defaultW;
    this.height = pNode ? pNode.clientHeight : Cfg.defaultH;

    // 创建svg视图
    this.buildVis();

    // 绑定按钮事件
    this.bindKeyEvent();

    // 装载数据更新图谱
    this.resetGraphData(graphData);
    this._undoList = [graphData];
  }

  // 创建画布
  buildVis() {
    let canvas = d3.select(this._canvasDOM);
    // 清空画布
    canvas.html(null);
    // 画布设置水印背景
    Watermark.setWatermarkBg({
      EL: this._canvasDOM,
      option: Cfg.watermark,
    });
    // 缩放函数实例
    this._zoom = d3
      .zoom()
      .scaleExtent([this.minScale, this.maxScale])
      .on("zoom", () => {
        let { x, y, k } = d3.event.transform;
        let originK = this.transform.k;
        this.transform = { x, y, k };
        this.$vis.attr("transform", `translate(${x},${y}) scale(${k})`);
        if (originK !== k) {
          // 缩小时保持包围盒线段宽度
          this.$boxGroup
            ?.select("#box-wrap")
            .style("stroke-width", Util.fixedSize(Cfg.strokeW.light, this.transform.k));
        }
        // 移动水印
        d3.select(this._canvasDOM)
          .style("background-position", `${x}px ${y}px`)
          .style(
            "background-size",
            `${parseFloat(Cfg.watermark.width) * k}px ${parseFloat(Cfg.watermark.height) * k}px`
          );
      });

    const stopZoomTransition = () => {
      // 中断定位过渡动画
      this.$svg.interrupt("zoomTransition");
    };
    this.$svg = canvas
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .on("click.resetSelectNode", () => {
        // 单选空白处，重置选中节点
        this.resetSelectNode();
      })
      .on("dblclick.dblclickBlank", () => {
        // 双击事件
        if (this.handleDblclick instanceof Function) {
          this.handleDblclick(d3.event);
        }
      })
      .on("mousedown.selection", () => {
        // 监听右键框选
        this.bindSelectionWindowEvent();
      })
      .on("mouseenter", () => {
        // 进入画布
        this._mouseIsEnter = true;
      })
      .on("mouseleave", () => {
        // 离开画布
        this._mouseIsEnter = false;
      })
      .on("mousemove", () => {
        // 记录鼠标在画布内位置
        this._mouseOffset[0] = d3.event.offsetX;
        this._mouseOffset[1] = d3.event.offsetY;
      })
      // 开始拖拽、滚轮缩放时，中断动画
      .on("mousedown.stopZoomTransition", stopZoomTransition)
      .on("touchstart.stopZoomTransition", stopZoomTransition)
      .on("wheel.stopZoomTransition", stopZoomTransition)
      .call(this._zoom)
      .on("dblclick.zoom", null);

    this.$vis = this.$svg.append("g").attr("class", "all");

    // 默认缩放大小及位置
    this.resetPosition();
    return this.$vis;
  }

  // 创建视图中的元素分层
  buildGroup() {
    if (!this.$vis) throw "视图层Selection不存在！";
    // 节点层
    this.$vis.select(".nodeGroup").remove();
    this.$nodeGroup = this.$vis.append("g").attr("class", "nodeGroup");
    // 连接线层
    this.$vis.select(".linkGroup").remove();
    this.$linkGroup = this.$vis
      .append("g")
      .attr("class", "linkGroup")
      .style("pointer-events", "none"); // 事件穿透，防止拖拽线段遮挡插槽
    // 选择框层
    this.$vis.select(".boxGroup").remove();
    this.$boxGroup = this.$vis
      .append("g")
      .attr("class", "boxGroup")
      .style("pointer-events", "none"); // 事件穿透
  }

  // 绑定按钮事件
  bindKeyEvent() {
    d3.select("body").on("keydown." + this.uniqueTag, () => {
      // 删除、保存、导出事件绑定在整个页面上，避免未聚焦画布时，触发浏览器默认事件
      switch (d3.event.keyCode) {
        case 46: // delete键
          // 删除
          d3.event.preventDefault();
          this.handleDelete();
          break;
      }
      if (d3.event.ctrlKey) {
        switch (d3.event.keyCode) {
          case 83: // Ctrl+S键
            // 保存
            d3.event.preventDefault();
            this.handleSave();
            break;
          case 68: // Ctrl+D键
            // 导出JSON
            d3.event.preventDefault();
            this.handleSaveAsJson();
            break;
          case 66: // Ctrl+B键
            // 导出蓝图
            d3.event.preventDefault();
            this.handleGenerateBlueprint();
            break;
        }
      }
    });
    d3.select(this._canvasDOM)
      .attr("tabindex", 0) // dom设置该属性才可以绑定键盘事件
      .on("keydown." + this.uniqueTag, () => {
        // Ctrl键按下
        this._ctrlDown = d3.event.ctrlKey;
        if (this._ctrlDown) {
          switch (d3.event.keyCode) {
            case 65: // Ctrl+A键
              // 全选节点
              d3.event.preventDefault();
              this.selectAllNode();
              break;
            case 67: // Ctrl+C键
              // 复制节点
              d3.event.preventDefault();
              this.handleCopy();
              break;
            case 86: // Ctrl+V键
              // 粘贴
              d3.event.preventDefault();
              this.handlePaste();
              break;
            case 88: // Ctrl+X键
              // 剪切
              d3.event.preventDefault();
              this.handleCut();
              break;
            case 90: // Ctrl+Z键
              d3.event.preventDefault();
              if (!d3.event.shiftKey) {
                // 撤回
                this.handleUndo();
              } else {
                // Ctrl+Shift+Z键
                // 重做
                this.handleRedo();
              }
              break;
          }
        }
      })
      .on("keyup." + this.uniqueTag, () => {
        // Ctrl键释放
        this._ctrlDown = d3.event.ctrlKey;
      });
  }

  /**
   * 加载数据，重置图谱
   * @param {Mapper.GraphData} graphData 图谱持久化数据
   * @param {boolean} isTransform 是否更新视图位置
   */
  resetGraphData(graphData, isTransform = true) {
    const graphParse = Mapper.graphDataParse(graphData, 0);
    this._nodes = graphParse.nodes;
    this._edges = graphParse.edges;
    this._maxId = graphParse.maxId;
    this._nodeMap = graphParse.nodeMap;
    this._selection.nodeMap.clear();

    const header = graphParse.header;
    // 图谱名称
    this.graphName = header.graphName;
    // 设置画布位移、缩放
    if (isTransform) this.setTransform(header.transform);
    // 载入生成布局
    if (header.layout instanceof Object) {
      Object.keys(header.layout).forEach((key) => {
        let _lay = header.layout[key];
        if (Object.hasOwnProperty.call(Cfg.layoutSetting, key)) {
          let _cfgLay = Cfg.layoutSetting[key];
          let { x = 0, y = 0 } = _lay.start ?? {};
          _cfgLay.start = { x, y };
          _cfgLay.maxW = _lay.maxW ?? 0;
          _cfgLay.maxH = _lay.maxH ?? 0;
          _cfgLay.maxD = _lay.maxD ?? 0;
          _cfgLay.dir = _lay.dir ?? 0;
        }
      });
    }

    // 重置引用封装模块列表
    this.packageMap = new Map();
    if (graphParse.packages?.length > 0) {
      graphParse.packages.forEach((p) => {
        this.packageMap.set(p.hash, p);
      });
    }

    // 重置视图中的元素分层（否则可能会出现数据绑定异常）
    this.buildGroup();
    // 重绘节点
    this.buildNode();
    // 重绘连线
    this.buildLink();
    // 重绘选择框
    this.buildBox();
  }

  /**
   * 加载数据，并追加到当前图谱
   * @param {Mapper.GraphData} graphData 图谱持久化数据
   * @param {number[]} offset 相对画布svg坐标 [ox, oy]
   */
  appendGraphData(graphData, [ox = 0, oy = 0] = []) {
    Util.checkGraphData(graphData, true, true); // 校验图谱数据
    const { minX = 0, minY = 0, w = 0, h = 0 } = graphData.header.boundingBox ?? {};
    // 将坐标转换为视图内坐标
    const coord = Util.offsetToCoord([ox, oy], this.transform);
    let bboxOffset;
    if (Cfg.globalSetting.gridAlignment) {
      // 网格对齐
      const ga = Util.gridAlignment(-w / 2 + coord[0], -h / 2 + coord[1]);
      bboxOffset = [-minX + ga[0], -minY + ga[1]];
    } else {
      bboxOffset = [-minX - w / 2 + coord[0], -minY - h / 2 + coord[1]];
    }
    const { nodes, edges, maxId, nodeMap, packages } = Mapper.graphDataParse(
      graphData,
      this._maxId,
      bboxOffset // 整体偏移
    );
    this._nodes.push(...nodes);
    this._edges.push(...edges);
    this._maxId = maxId;
    nodeMap.forEach((n, nid) => {
      this._nodeMap.set(nid, n);
    });
    this._selection.nodeMap = nodeMap; // 选中粘贴的节点

    // 追加引用封装模块列表
    this.appendPackages(packages);

    // 重绘节点
    this.buildNode();
    // 重绘连线
    this.buildLink();
    // 重绘选择框
    this.buildBox();

    // 记录操作
    this.recordUndo();
  }

  /**
   * 重置缩放大小及位置
   * @param {boolean} isTransition 是否动画过渡
   */
  resetPosition(isTransition) {
    if (!this._zoom) throw "缩放实例不存在！";
    if (!this.$svg) throw "根节点SVGSelection不存在！";
    // 若画布外层宽高变化，重置画布大小
    const pNode = this._canvasDOM.parentNode; // 获取画布外层节点
    if (pNode && (pNode.clientWidth != this.width || pNode.clientHeight != this.height)) {
      const originCenterX = this.width / this.defaultScale / 2;
      this.width = pNode.clientWidth;
      this.height = pNode.clientHeight;
      const newCenterX = this.width / this.defaultScale / 2;
      if (newCenterX != originCenterX) {
        const dtCenterX = newCenterX - originCenterX; // 横坐标中心差
        // 更新节点位置
        this._nodes.forEach((node) => {
          node.x = node.x + dtCenterX;
        });
        // 更新坐标
        this.buildTick(isTransition);
      }
    }
    // 默认缩放，初始定位
    this.setTransform({ x: 0, y: 0, k: this.defaultScale }, isTransition);
  }

  /**
   * 设置画布位移、缩放
   * @param {object} transform 转换参数 {x, y, k}
   * @param {boolean} isTransition 是否动画过渡
   */
  setTransform({ x, y, k }, isTransition) {
    if (!this.$svg) throw "根节点SVGSelection不存在！";
    const Transform = d3.zoomIdentity.translate(x, y).scale(k);
    let svgSelection = this.$svg;
    if (isTransition) {
      // 过渡动画命名：zoomTransition （同名会直接中断，不会重复）
      svgSelection = svgSelection.transition("zoomTransition");
    }
    this._zoom.transform(svgSelection, Transform);
  }

  /**
   * 创建节点
   * @param {number} modelId 模型ID
   * @param {number[]} offset 相对画布坐标 [ox,oy]
   * @param {string} packageHash 封装模块hash
   */
  createNode(modelId, offset = [0, 0], packageHash) {
    const coord = Util.offsetToCoord(offset, this.transform);
    const other = {};
    if (modelId === Cfg.ModelId.output) {
      // 输出默认标记 黄色三角感叹号
      other.signalId = 402;
    } else if (modelId === Cfg.ModelId.input) {
      // 输入默认标记 红色三角感叹号
      other.signalId = 403;
    } else if (modelId === Cfg.ModelId.package) {
      // 封装模块节点
      if (packageHash == null) throw "封装模块hash不能为空！";
      let packageModel = this.packageMap.get(packageHash);
      if (packageModel == null) throw "找不到该封装模块数据！packageHash:" + packageHash;
      Object.assign(other, packageModel.initNodeData);
    }
    const newNode = Mapper.modelIdToNode(modelId, ++this._maxId, other, coord); // 模型Id 转 节点对象
    if (Cfg.globalSetting.gridAlignment) {
      // 网格对齐
      const ga = Util.gridAlignment(newNode.x, newNode.y);
      newNode.x = ga[0];
      newNode.y = ga[1];
    }
    this._nodes.push(newNode);
    this._nodeMap.set(newNode.id, newNode);
    this._selection.nodeMap.clear();
    this._selection.nodeMap.set(newNode.id, newNode); // 选中创建的节点

    // 重绘节点
    this.buildNode();
    // 重绘选择框
    this.buildBox();

    // 记录操作
    this.recordUndo();
  }

  /**
   * 选中节点
   * @param {Mapper.GraphNode} node
   */
  handleSelectNode(node) {
    if (this._ctrlDown) {
      // ctrl+单击：多选节点
      this.multipleSelectNode(node);
    } else {
      // 单选节点
      this.singleSelectNode(node);
    }
  }

  /**
   * 单选节点
   * @param {Mapper.GraphNode} node
   */
  singleSelectNode(node) {
    if (!node) return;
    if (this._selection.nodeMap.has(node.id)) {
      // 已选中不做操作
      return;
    }
    // 单选
    this._selection.nodeMap.clear();
    this._selection.nodeMap.set(node.id, node);
    // 重绘选择框
    this.buildBox();
  }

  /**
   * 多选节点
   * 未选中则增选，选中则取消选择
   * @param {Mapper.GraphNode} node
   */
  multipleSelectNode(node) {
    if (!node) return;
    if (this._selection.nodeMap.has(node.id)) {
      // 已选中则取消选择
      this._selection.nodeMap.delete(node.id);
    } else {
      // 未选择则增选
      this._selection.nodeMap.set(node.id, node);
    }
    // 重绘选择框
    this.buildBox();
  }

  /**
   * 全选节点
   */
  selectAllNode() {
    this._selection.nodeMap = new Map(this._nodeMap);
    // 重绘选择框
    this.buildBox();
  }

  // 重置选中节点
  resetSelectNode() {
    this._selection.nodeMap.clear();
    // 重绘选择框
    this.buildBox();
  }

  /**
   * @typedef {Object} ToBeRebuild 是否需要重绘
   * @property {boolean} tbLink 是否待重绘连接线
   * @property {boolean} tbNode 是否待重绘节点
   * @property {boolean} tbBox 是否待重绘选择框
   */
  /**
   * 删除节点
   * @param {Mapper.GraphNode} node 节点对象
   * @param {boolean} rebuild 是否触发重绘(默认是)
   * @return {ToBeRebuild} 是否需要重绘 {tbLink, tbNode, tbBox}
   */
  deleteNode(node, rebuild = true) {
    if (!node) return;
    let tbLink = false;
    let tbNode = false;
    let tbBox = false;
    // 删除节点插槽连线
    let edgeSet = new Set();
    node.slots.forEach((s) => {
      if (s.edge) edgeSet.add(s.edge);
    });
    if (edgeSet.size > 0) {
      if (this.deleteEdges(Array.from(edgeSet), rebuild).tbLink) {
        tbLink = true;
      }
    }
    // 删除节点
    this._nodeMap.delete(node.id);
    let i = this._nodes.findIndex((e) => e.id == node.id);
    if (i > -1) {
      this._nodes.splice(i, 1);
      // 重绘节点
      if (rebuild) this.buildNode();
      else tbNode = true;
    }
    // 删除选中节点
    if (this._selection.nodeMap.has(node.id)) {
      this._selection.nodeMap.delete(node.id);
      // 重绘选择框
      if (rebuild) this.buildBox();
      else tbBox = true;
    }

    // 记录操作
    if (rebuild) this.recordUndo();
    return { tbLink, tbNode, tbBox };
  }

  /**
   * 删除多个节点
   * @param {Mapper.GraphNode[]} nodes 节点对象数组
   * @param {boolean} rebuild 是否触发重绘(默认是)
   * @return {ToBeRebuild} 是否需要重绘 {tbLink, tbNode, tbBox}
   */
  deleteNodes(nodes, rebuild = true) {
    if (!(nodes?.length > 0)) return;
    let tbLink = false;
    let tbNode = false;
    let tbBox = false;
    nodes.forEach((node) => {
      let needRebuild = this.deleteNode(node, false);
      tbLink ||= needRebuild.tbLink;
      tbNode ||= needRebuild.tbNode;
      tbBox ||= needRebuild.tbBox;
    });
    if (rebuild) {
      if (tbLink) {
        this.buildLink(); // 重绘连接线
        tbLink = false;
      }
      if (tbNode) {
        this.buildNode(); // 重绘节点
        tbNode = false;
      }
      if (tbBox) {
        this.buildBox(); // 重绘选择框
        tbBox = false;
      }
      // 记录操作
      this.recordUndo();
    }

    return { tbLink, tbNode, tbBox };
  }

  /**
   * 单个节点-置于顶层
   * @param {Mapper.GraphNode} node 节点对象
   */
  nodeBringToFront(node) {
    if (!node) return;
    this.nodesBringToFront(new Map([node.id, node]));
    // 记录操作
    this.recordUndo();
  }

  /**
   * 多个节点-置于顶层
   * @param {Map<number,Mapper.GraphNode>} nodeMap 节点对象id映射
   */
  nodesBringToFront(nodeMap) {
    if (!(nodeMap?.size > 0)) return;
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    let nodes = Array.from(nodeMap.values());
    // 元素移置父级的最后
    this.$nodeGroup
      .selectAll(".node")
      .data(nodes, (d) => d.id)
      .raise();
    // 数据数组也移置最后，否则复制和持久化将丢失置顶
    this._nodes = this._nodes.filter((n) => !nodeMap.has(n.id)).concat(nodes);
    // 记录操作
    this.recordUndo();
  }

  /**
   * 所有选中节点置于顶层
   */
  handleSelectionBringToFront() {
    this.nodesBringToFront(this._selection.nodeMap);
  }

  /**
   * 单个节点-置于底层
   * @param {Mapper.GraphNode} node 节点对象
   */
  nodeSendToBack(node) {
    if (!node) return;
    this.nodesSendToBack(new Map([node.id, node]));
  }

  /**
   * 多个节点-置于底层
   * @param {Map<number,Mapper.GraphNode>} nodeMap 节点对象id映射
   */
  nodesSendToBack(nodeMap) {
    if (!(nodeMap?.size > 0)) return;
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    let nodes = Array.from(nodeMap.values());
    // 元素移置父级的最前
    this.$nodeGroup
      .selectAll(".node")
      .data(nodes, (d) => d.id)
      .lower();
    // 数据数组也移置最前，否则复制和持久化将丢失置底
    this._nodes = nodes.concat(this._nodes.filter((n) => !nodeMap.has(n.id)));
    // 记录操作
    this.recordUndo();
  }

  /**
   * 所有选中节点置于底层
   */
  handleSelectionSendToBack() {
    this.nodesSendToBack(this._selection.nodeMap);
  }

  /**
   * 切换插槽输入输出方向
   * @param {Mapper.GraphNodeSlot} slot 插槽对象
   */
  changeSlotDir(slot) {
    const modelId = slot?.node?.modelId;
    if (modelId === Cfg.ModelId.package) {
      // 双击封装模块插槽，断开连接
      this.deleteEdge(slot.edge);
    }
    // 只有四向、流速器、信号输出、信号输入 可调转输入输出口
    let legalModelIds = [
      Cfg.ModelId.fdir,
      Cfg.ModelId.monitor,
      Cfg.ModelId.output,
      Cfg.ModelId.input,
    ];
    if (!legalModelIds.includes(modelId)) return;
    if (modelId === Cfg.ModelId.output || modelId === Cfg.ModelId.input) {
      if (modelId === Cfg.ModelId.output) {
        // 输出口切换为输入口
        slot.node.modelId = Cfg.ModelId.input;
      } else {
        // 输入口切换为输出口
        slot.node.modelId = Cfg.ModelId.output;
      }
      // 重绘节点模型
      let nodeSel = this.$node.filter((d) => d.id === slot.node.id);
      this.insertNodeBg(nodeSel);
    }

    // 删除节点上带的连接线
    this.deleteEdge(slot.edge);
    slot.dir = slot.dir === 1 ? -1 : 1;
    if (slot.priority === 1) {
      // 如果是优先插槽，移除同节点同向的其他插槽的优先标识
      for (let s of slot.node.slots) {
        // 移除同节点同向的其他插槽的优先标识
        if (s.dir == slot.dir && s.priority === 1 && s !== slot) {
          s.priority = 0;
        }
      }
    }
    // 重绘节点插槽
    this.updateSingleNodeSlot(slot);
    // 记录操作
    this.recordUndo();
  }

  /**
   * 切换四向插槽是否优先
   * @param {Mapper.GraphNodeSlot} slot 插槽对象
   */
  changeSlotPriority(slot) {
    const modelId = slot?.node?.modelId;
    if (modelId !== Cfg.ModelId.fdir) return; // 不是四向
    // 删除节点上带的连接线
    if (slot.priority === 1) {
      slot.priority = 0;
    } else {
      // 改为优先
      slot.priority = 1;
      for (let s of slot.node.slots) {
        // 移除同节点同向的其他插槽的优先标识
        if (s.dir == slot.dir && s.priority === 1 && s !== slot) {
          s.priority = 0;
        }
      }
    }
    // 重绘节点插槽
    this.updateSingleNodeSlot(slot);
    // 记录操作
    this.recordUndo();
  }

  /**
   * 切换四向优先输出插槽 过滤物品id
   * @param {Mapper.GraphNodeSlot} slot 插槽对象
   * @param {number} filterItemId 过滤物品id
   */
  changeSlotFilter(slot, filterItemId) {
    const modelId = slot?.node?.modelId;
    if (modelId !== Cfg.ModelId.fdir) return; // 不是四向
    if (slot.dir !== 1) return; // 输入口不可设置过滤物品
    slot.filterId = filterItemId;
    // 重绘节点插槽
    this.updateSingleNodeSlot(slot);
    // 记录操作
    this.recordUndo();
  }

  /**
   * 切换流速器生成/消耗物品id 过滤物品id
   * @param {Mapper.GraphNode} node 节点对象
   * @param {number} itemId 物品id
   */
  changeNodeItemId(node, itemId) {
    const modelId = node?.modelId;
    if (![Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) return; // 不是流速器、信号输出、信号输入
    node.itemId = itemId;
    // 重绘节点颜色
    if (modelId === Cfg.ModelId.monitor) {
      d3.select(`#${this.uniqueTag}_node-bg-${node.id}`).style(
        "fill",
        Cfg.filterItemMap.get(itemId)?.color ?? Cfg.color.item_default
      );
    } else {
      d3.select(`#${this.uniqueTag}_node-bg-${node.id}`)
        .select("circle")
        .style("fill", Cfg.filterItemMap.get(itemId)?.color ?? Cfg.color.item_default);
    }

    // 记录操作
    this.recordUndo();
  }

  /**
   * 切换流速器生成/消耗物品id 标记id
   * @param {Mapper.GraphNode} node 节点对象
   * @param {number} signalId 标记id
   */
  changeNodeSignalId(node, signalId) {
    const modelId = node?.modelId;
    if (![Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) return; // 不是流速器、信号输出、信号输入
    node.signalId = signalId;
    // 重绘节点颜色
    d3.select(`#${this.uniqueTag}_node-bg-${node.id}`)
      .select("image")
      .attr("xlink:href", ItemsUtil.getSignalImage(signalId));
    // 记录操作
    this.recordUndo();
  }

  /**
   * 增加连接线
   * @param {number} startId 起点节点id
   * @param {number} startSlot 起点插槽索引index
   * @param {number} endId 终点节点id
   * @param {number} endSlot 终点插槽索引index
   * */
  addEdge(startId, startSlot, endId, endSlot) {
    const newEdge = Mapper.dataToEdge({ startId, startSlot, endId, endSlot }, this._nodeMap);
    if (newEdge instanceof Error) return;
    this._edges.push(newEdge);
    // 重绘连线
    this.buildLink();
    // 记录操作
    this.recordUndo();
  }

  /**
   * 删除连接线
   * @param {Mapper.GraphEdge} edge 连接线对象
   * @param {boolean} rebuild 是否触发重绘(默认是)
   * @return {ToBeRebuild} 是否需要重绘 {tbLink}
   */
  deleteEdge(edge, rebuild = true) {
    if (!edge) return;
    let tbLink = false;
    edge.sourceSlot.edge = null;
    edge.targetSlot.edge = null;
    let i = this._edges.findIndex(
      (e) =>
        e.source.id === edge.source.id &&
        e.sourceSlot.index === edge.sourceSlot.index &&
        e.target.id === edge.target.id &&
        e.targetSlot.index === edge.targetSlot.index
    );
    if (i > -1) {
      this._edges.splice(i, 1);
    }
    // 重绘连线
    if (rebuild) {
      this.buildLink();
      // 记录操作
      this.recordUndo();
    } else {
      tbLink = true;
    }
    return { tbLink };
  }

  /**
   * 删除多条连接线
   * @param {Mapper.GraphEdge[]} edges 连接线对象数组
   * @param {boolean} rebuild 是否触发重绘(默认是)
   * @return {ToBeRebuild} 是否需要重绘 {tbLink}
   */
  deleteEdges(edges, rebuild = true) {
    if (!(edges?.length > 0)) return;
    let tbLink = false;
    edges.forEach((edge) => {
      if (this.deleteEdge(edge, false).tbLink) {
        tbLink = true;
      }
    });
    // 重绘连线
    if (tbLink && rebuild) {
      this.buildLink();
      tbLink = false;
      // 记录操作
      this.recordUndo();
    }
    return { tbLink };
  }

  /**
   * 查询节点元素并绑定数据
   */
  getNodeSel() {
    if (!this._nodes) throw "节点数据不存在！";
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    return this.$nodeGroup.selectAll(".node").data(this._nodes, (d) => d.id);
  }

  /**
   * 查询节点插槽元素并绑定数据
   * @param {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeSel
   */
  getNodeSlotSel(nodeSel) {
    if (!nodeSel) {
      if (!this.$node) throw "节点集Selection不存在！";
      nodeSel = this.$node;
    }
    return nodeSel.selectAll(".node-slot").data(
      (d) => d.slots,
      (slot) => slot.index
    );
  }

  /**
   * 查询连接线元素并绑定数据
   */
  getLinkSel() {
    if (!this._edges) throw "连接线数据不存在！";
    if (!this.$linkGroup) throw "连接线层Selection不存在！";
    return this.$linkGroup
      .selectAll(".link")
      .data(
        this._edges,
        (d) => `${d.source.id}-${d.sourceSlot.index}_${d.target.id}-${d.targetSlot.index}`
      );
  }

  /**
   * 查询节点选择框元素并绑定数据
   */
  getNodeBoxSel() {
    if (!this.$boxGroup) throw "选择框层Selection不存在！";
    return this.$boxGroup
      .selectAll(".node-box")
      .data(Array.from(this._selection.nodeMap.values()), (d) => d.id);
  }

  /**
   * 绘制节点
   * @return {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeGMerge
   */
  buildNode() {
    this.$node = this.getNodeSel().join(
      (enter) => this.appendNode(enter, false),
      (update) => this.updateNode(update),
      (exit) => exit.remove()
    );
    // 绘制节点插槽
    this.buildNodeSlot(this.$node);
    return this.$node;
  }

  /**
   * 创建节点
   * @param {d3.Selection<BaseType, Mapper.GraphNode>} nodeEnter
   * @param {boolean} overwrite 覆盖
   * @return {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeGEnter 返回带绑定g标签的enter
   */
  appendNode(nodeEnter, overwrite = true) {
    if (overwrite) nodeEnter.selectAll(".node").remove();
    const nodeGEnter = nodeEnter
      .append("g")
      .attr("class", "node")
      .attr("id", (d) => {
        return `${this.uniqueTag}_node-${d.id}`;
      })
      .on("click.selectNode", (d) => {
        // 选中节点
        d3.event.stopPropagation();
        this.handleSelectNode(d);
      })
      .on("dblclick.deleteNode", () => {
        // 双击节点
        d3.event.stopPropagation(); // 阻止创建事件传播
        // this.deleteNode(d);
      })
      .on("contextmenu.rclickSlot", (d) => {
        // 右键节点
        d3.event.preventDefault();
        d3.event.stopPropagation();
        if (this.handleRclickNode instanceof Function) {
          this.handleRclickNode(d3.event, d);
        }
      })
      .call(this.bindNodeDragEvent()); // 绑定节点拖拽事件
    // 更新新增节点
    this.updateNode(nodeGEnter);
    // 创建节点模型
    this.insertNodeBg(nodeGEnter, false);
    return nodeGEnter;
  }

  /**
   * 更新节点
   * @param {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeUpdate
   * @return {d3.Selection<SVGGElement, Mapper.GraphNode>}
   */
  updateNode(nodeUpdate) {
    // 更新节点坐标
    this.updateNodePosition(nodeUpdate);
    return nodeUpdate;
  }

  /**
   * 创建节点模型
   * @param {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeSel
   * @param {boolean} overwrite 覆盖
   */
  insertNodeBg(nodeSel, overwrite = true) {
    let _this = this;
    if (overwrite) nodeSel.selectAll(".node-bg").remove();
    nodeSel.each(function (d) {
      let bg;
      if (d.modelId === Cfg.ModelId.text) {
        // 普通文本
        bg = d3
          .select(this)
          .insert("text", ".node-slot") // 在插槽前插入
          .style("font-size", Cfg.fontSize + "px")
          .attr("text-anchor", "middle")
          .on("dblclick.deleteNode", function (d) {
            d3.event.stopPropagation(); // 阻止创建事件传播
            // 双击文本，创建输入框
            // 获取当前的text元素
            var textEl = d3.select(this);
            const offset = Util.coordToOffset([d.x, d.y], _this.transform);
            const w = Math.max(100, Math.min(500, d.w * _this.transform.k));
            const h = Math.max(20, Math.min(200, d.h * _this.transform.k));
            // 创建一个输入框
            const input = d3
              .select(_this._canvasDOM)
              .append("textarea")
              .style("width", w + "px")
              .style("height", h + "px")
              .style("position", "absolute")
              .style("left", offset[0] - w / 2 + "px")
              .style("top", offset[1] - h / 2 + "px")
              .text(d.text) // 设置输入框的初始值为text元素的文本
              .on("keydown", () => {
                d3.event.stopPropagation();
              })
              .on("keyup", () => {
                d3.event.stopPropagation();
              });
            let inputDom = input.node();
            inputDom.focus(); // 获取焦点
            // 设置光标到文本的最后面
            inputDom.selectionStart = inputDom.selectionEnd = inputDom.value.length;

            // 当输入框失去焦点时，更新text元素的文本并删除输入框
            input.on("blur", () => {
              d.text = input.node().value || "";
              textEl.html(null);
              const lines = Util.splitLines(d.text);
              d.h = lines.length * Cfg.lineHeight; // 根据实际文本行数修改高度
              _this.createTspan(textEl, lines);
              input.remove();
            });
          });
        // 创建多行文本
        _this.createTspan(bg, Util.splitLines(d.text));
      } else if (d.modelId === Cfg.ModelId.output || d.modelId === Cfg.ModelId.input) {
        // 信号输出、信号输入模型
        bg = d3.select(this).insert("g", ".node-slot"); // 在插槽前插入
        bg.append("circle")
          .attr("r", d.w / 2)
          .style("fill", Cfg.filterItemMap.get(d.itemId)?.color ?? Cfg.color.item_default)
          .style(
            "stroke",
            d.modelId === Cfg.ModelId.output
              ? Cfg.color.priorityOutStroke
              : Cfg.color.priorityInStroke
          )
          .style("stroke-width", Cfg.strokeW.bold);
        bg.append("image")
          .attr("xlink:href", ItemsUtil.getSignalImage(d.signalId))
          .attr("x", d.w / 2 - Cfg.signalSize / 2)
          .attr("y", d.h / 2 - Cfg.signalSize / 2)
          .attr("width", Cfg.signalSize)
          .attr("height", Cfg.signalSize);
      } else if (d.modelId === Cfg.ModelId.monitor) {
        // 流速器模型
        bg = d3
          .select(this)
          .insert("rect", ".node-slot") // 在插槽前插入
          .attr("x", -d.w / 2)
          .attr("y", -d.h / 2)
          .attr("width", d.w)
          .attr("height", d.h)
          .attr("rx", 5) // 圆角
          .attr("ry", 5)
          .style("fill", Cfg.filterItemMap.get(d.itemId)?.color ?? Cfg.color.item_default) // 生成消耗物品颜色
          .style("stroke", Cfg.color.nodeStroke)
          .style("stroke-width", Cfg.strokeW.light);
      } else if (d.modelId === Cfg.ModelId.package) {
        // 封装模块节点
        bg = d3
          .select(this)
          .insert("rect", ".node-slot") // 在插槽前插入
          .attr("x", -d.w / 2)
          .attr("y", -d.h / 2)
          .attr("width", d.w)
          .attr("height", d.h)
          .attr("rx", 10) // 圆角
          .attr("ry", 10)
          .style("fill", Cfg.color.packageNodeFill)
          .style("stroke", Cfg.color.packageNodeStroke)
          .style("stroke-width", Cfg.strokeW.light);
        let nodeText = d3
          .select(this)
          .insert("text", ".node-slot") // 在插槽前插入
          .attr("class", "node-text")
          .style("font-size", Cfg.fontSize + "px")
          .attr("text-anchor", "middle");
        // 创建1行文本
        _this.createTspan(nodeText, [d.text]);
      } else {
        // 其他模型：矩形
        let fill = Cfg.color.nodeFill;
        bg = d3
          .select(this)
          .insert("rect", ".node-slot") // 在插槽前插入
          .attr("x", -d.w / 2)
          .attr("y", -d.h / 2)
          .attr("width", d.w)
          .attr("height", d.h)
          .attr("rx", 10) // 圆角
          .attr("ry", 10)
          .style("fill", fill)
          .style("stroke", Cfg.color.nodeStroke)
          .style("stroke-width", Cfg.strokeW.light);
      }
      bg.attr("class", "node-bg")
        .attr("id", `${_this.uniqueTag}_node-bg-${d.id}`)
        .style("opacity", 0.8);
    });
  }

  /**
   * 创建多行文本
   * @param {d3.Selection} Sel
   * @param {string[]} texts
   */
  createTspan(Sel, texts = []) {
    if (!Sel) throw "文本容器Selection不能为空";
    let startY = Cfg.lineHeight / 3 - (Cfg.lineHeight / 2) * (texts.length - 1); // 首行偏移量(居中对齐)
    if (texts.length > 0) {
      texts.forEach((text, i) => {
        Sel.append("tspan")
          .attr("x", 0)
          .attr("dy", i == 0 ? startY : Cfg.lineHeight)
          .style("fill", Cfg.color.text)
          .text(text.trim().length == 0 ? String.fromCharCode(8203) : text); // 空串使用零宽空格，否则不会占一行
      });
    } else {
      Sel.append("tspan")
        .attr("x", 0)
        .attr("dy", startY)
        .style("fill", Cfg.color.emptyText)
        .text("(空文本)");
    }
  }

  /**
   * 绘制节点插槽
   * @param {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeSel
   * @return {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} nodeSlotGMerge
   */
  buildNodeSlot(nodeSel) {
    this.$nodeSlot = this.getNodeSlotSel(nodeSel).join(
      (enter) => this.appendNodeSlot(enter, false),
      (update) => this.updateNodeSlot(update),
      (exit) => exit.remove()
    );
    // 绘制四向插槽优先标记
    this.buildSlotPriority(this.$nodeSlot);
    return this.$nodeSlot;
  }

  /**
   * 创建节点插槽
   * @param {d3.Selection<, Mapper.GraphNodeSlot, SVGGElement, Mapper.GraphNode>} nodeSlotEnter
   * @param {boolean} overwrite 覆盖
   * @return {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} nodeSlotGEnter 返回带绑定g标签的enter
   */
  appendNodeSlot(nodeSlotEnter, overwrite = true) {
    if (overwrite) nodeSlotEnter.selectAll(".node-slot").remove();
    const nodeSlotGEnter = nodeSlotEnter
      .append("g")
      .attr("class", "node-slot")
      .attr("id", (slot) => {
        return `${this.uniqueTag}_node-slot-${slot.node.id}-${slot.index}`;
      });

    // 封装模块插槽
    nodeSlotGEnter
      .filter((d) => d.node.modelId === Cfg.ModelId.package)
      .each(function (d) {
        const packageSlot = d3.select(this);
        const packageSlotBg = packageSlot
          .append("g")
          .attr("class", "slot-bg")
          .style("opacity", 0.6);
        packageSlotBg
          .append("circle")
          .attr("r", Cfg.packageSlotSize / 2)
          .style("fill", Cfg.filterItemMap.get(d.itemId)?.color ?? Cfg.color.item_default)
          .style("stroke", d.dir === 1 ? Cfg.color.priorityInStroke : Cfg.color.priorityOutStroke)
          .style("stroke-width", Cfg.strokeW.light);
        packageSlotBg
          .append("image")
          .attr("xlink:href", ItemsUtil.getSignalImage(d.signalId))
          .attr("x", Cfg.packageSlotSize / 4)
          .attr("y", Cfg.packageSlotSize / 4)
          .attr("width", Cfg.signalSize / 2) // 插槽图标大小减半
          .attr("height", Cfg.signalSize / 2);
      });

    // 新增 插槽节点
    nodeSlotGEnter
      .append("circle")
      .attr("class", "slot-point")
      .style("cursor", "pointer")
      .attr("r", Cfg.pointSize)
      .style("fill", Cfg.color.slotFill)
      .style("stroke", Cfg.color.slotStroke)
      .style("stroke-width", Cfg.strokeW.light)
      .on("click", () => {
        d3.event.stopPropagation(); // 点击插槽不触发选中节点
      })
      .on("dblclick.changeSlotDir", (d) => {
        // 双击插槽，切换插槽输入输出方向
        d3.event.stopPropagation();
        this.changeSlotDir(d);
      })
      .on("contextmenu.rclickSlot", (d) => {
        // 右键插槽
        d3.event.preventDefault();
        d3.event.stopPropagation();
        if (this.handleRclickSlot instanceof Function) {
          this.handleRclickSlot(d3.event, d);
        }
      })
      .call(this.bindSlotDragEvent()); // 绑定插槽圆点拖拽事件

    // 新增 插槽+-号
    nodeSlotGEnter
      .append("path")
      .attr("class", "slot-dir")
      .style("pointer-events", "none") // 事件穿透
      .style("stroke", Cfg.color.slotStroke);

    // 更新新增的节点插槽
    this.updateNodeSlot(nodeSlotGEnter);
    return nodeSlotGEnter;
  }

  /**
   * 更新节点插槽
   * @param {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} nodeSlotUpdate
   * @return {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>}
   */
  updateNodeSlot(nodeSlotUpdate) {
    // 更新插槽节点相对位置
    nodeSlotUpdate
      .selectAll(".slot-point")
      .attr("transform", (slot) => `translate(${slot.ox},${slot.oy})`);
    // 更新插槽节点相对位置
    nodeSlotUpdate
      .selectAll(".slot-bg")
      .attr("transform", (slot) => `translate(${slot.ox},${slot.oy})`);

    // 更新 插槽+-号
    nodeSlotUpdate.selectAll(".slot-dir").attr("d", (d) => {
      const r = Cfg.pointSize;
      let dAttr = `M${d.ox - r / 2},${d.oy} L${d.ox + r / 2},${d.oy}`;
      if (d.dir === 1) {
        return dAttr + ` M${d.ox},${d.oy + r / 2} L${d.ox},${d.oy - r / 2}`; // 输出口：＋
      } else if (d.dir === -1) {
        return dAttr; // 输入口：－
      }
    });
    return nodeSlotUpdate;
  }

  /**
   * 传入数据对象 更新单个节点插槽
   * @param {Mapper.GraphNodeSlot} nodeSlot
   */
  updateSingleNodeSlot(nodeSlot) {
    let nodeSlotSel = d3.select(
      `#${this.uniqueTag}_node-slot-${nodeSlot.node.id}-${nodeSlot.index}`
    );
    if (nodeSlotSel.empty() || !nodeSlotSel.datum()) {
      // 元素不存在 或 未绑定数据，则重绘所有插槽
      this.buildNodeSlot();
    } else {
      // 更新插槽
      this.updateNodeSlot(nodeSlotSel);
      // 更新节点下四个插槽
      let nodeAllSlotSel = d3.selectAll(`[id^="${this.uniqueTag}_node-slot-${nodeSlot.node.id}-"]`);
      // 绘制四向插槽优先标记
      this.buildSlotPriority(nodeAllSlotSel);
    }
  }

  /**
   * 绘制四向插槽优先标记
   * @param {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} nodeSlotSel
   */
  buildSlotPriority(nodeSlotSel) {
    let _this = this;
    if (nodeSlotSel == null) {
      nodeSlotSel = this.getNodeSlotSel();
    }
    nodeSlotSel.each(function (d) {
      const nodeSlotG = d3.select(this);
      if (d.node.modelId !== Cfg.ModelId.fdir || d.priority !== 1) {
        // 删除非四向模型、非优先的优先标记
        nodeSlotG.selectAll(".slot-priority").remove();
        return;
      }
      const prioritySel = nodeSlotG.select(".slot-priority");
      if (prioritySel.empty()) {
        // 创建四向插槽优先标记
        _this.insertSlotPriority(nodeSlotG, false);
      } else {
        // 更新标记
        _this.updateSlotPriority(prioritySel);
      }
    });
  }

  /**
   * 创建四向插槽优先标记
   * @param {d3.Selection<SVGGElement, Mapper.GraphNodeSlot>} nodeSlotSel
   * @param {boolean} overwrite 覆盖
   * @return {d3.Selection<SVGPathElement, Mapper.GraphNodeSlot>} prioritySel
   */
  insertSlotPriority(nodeSlotSel, overwrite = true) {
    if (overwrite) nodeSlotSel.selectAll(".slot-priority").remove();
    const priority = nodeSlotSel
      .insert("path", ".slot-point") // 在插槽圆点前插入
      .attr("class", "slot-priority")
      .style("pointer-events", "none") // 事件穿透
      .style("stroke-width", Cfg.strokeW.bold)
      .style("opacity", 0.8)
      .attr("d", (d) => {
        const bw = Cfg.nodeSize / 2; // 三角形底宽
        if (d.oy == 0) {
          // 左右边缘插槽
          return `M${d.ox},${bw / 2} L${d.ox},${-bw / 2} L${d.ox / 5},${0} Z`;
        } else if (d.ox == 0) {
          // 上下边缘插槽
          return `M${bw / 2},${d.oy} L${-bw / 2},${d.oy} L${0},${d.oy / 5} Z`;
        }
      });
    this.updateSlotPriority(priority);
    return priority;
  }

  /**
   * 更新四向插槽优先标记
   * @param {d3.Selection<SVGPathElement, Mapper.GraphNodeSlot>} prioritySel
   * @return {d3.Selection<SVGPathElement, Mapper.GraphNodeSlot>}
   */
  updateSlotPriority(prioritySel) {
    prioritySel
      .style("stroke", (d) => {
        if (d.dir === 1) return Cfg.color.priorityOutStroke; // 输出优先
        else if (d.dir === -1) return Cfg.color.priorityInStroke; // 输入优先
      })
      .style("fill", (d) => {
        if (d.dir === 1) {
          // 输出口
          if (!d.filterId) return Cfg.color.priorityOutFill;
          // 过滤物品
          return Cfg.filterItemMap.get(d.filterId)?.color ?? Cfg.color.item_default;
        } else if (d.dir === -1) {
          return Cfg.color.priorityInFill; // 输入优先
        }
      });
    return prioritySel;
  }

  // 绘制连线
  buildLink() {
    this.createArrow("arrow-link", Cfg.color.linkStroke);
    this.$link = this.getLinkSel().join(
      (enter) => this.appendLink(enter, false),
      (update) => this.updateLink(update),
      (exit) => exit.remove()
    );
  }

  /**
   * 创建连接线
   * @param {d3.Selection<, Mapper.GraphEdge>} edgeEnter
   * @param {boolean} overwrite 覆盖
   * @return {d3.Selection<SVGPathElement, Mapper.GraphEdge>} edgePathEnter 返回带绑定path标签的enter
   */
  appendLink(edgeEnter, overwrite = true) {
    if (overwrite) edgeEnter.selectAll(".link").remove();
    // 创建 连接线
    const edgePathEnter = edgeEnter
      .append("path")
      .attr("id", (d) => {
        return `${this.uniqueTag}_link-source-${d.source.id}-${d.sourceSlot.index}-target-${d.target.id}-${d.targetSlot.index}`;
      })
      .attr("stroke-width", Cfg.strokeW.link)
      .attr("class", "link")
      .style("stroke", Cfg.color.linkStroke)
      .attr("fill", "none")
      .attr("marker-end", `url(#arrow-link)`);
    // 更新 连接线
    this.updateLink(edgePathEnter);
    return edgePathEnter;
  }

  /**
   * 更新连接线
   * @param {d3.Selection<SVGPathElement, Mapper.GraphEdge>} edgeSel
   * @return {d3.Selection<SVGPathElement, Mapper.GraphEdge>}
   */
  updateLink(edgeSel) {
    // 更新连接线路径
    this.updateLinkPath(edgeSel);
    return edgeSel;
  }

  // 创建连接线箭头
  createArrow(id, color) {
    if (!this.$linkGroup) throw "连接线层Selection不存在！";
    this.$linkGroup.select("#" + id).remove();
    this.$linkGroup
      .append("marker")
      .attr("class", "arrow")
      .attr("id", id)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4")
      .attr("fill", color)
      .attr("stroke", color)
      .attr("stroke-width", Cfg.strokeW.link / 2);
  }

  // 绘制节点选择框
  buildBox() {
    this.$box = this.getNodeBoxSel().join(
      (enter) => this.appendNodeBox(enter, false),
      (update) => this.updateNodeBox(update),
      (exit) => exit.remove()
    );
    // 更新选中节点包围盒
    this.updateSelectionBox();
  }

  /**
   * 创建节点选择框
   * @param {d3.Selection<, Mapper.GraphNode>} nodeBoxEnter
   * @param {boolean} overwrite 覆盖
   * @return {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeBoxGEnter 返回带绑定g标签的enter
   */
  appendNodeBox(nodeBoxEnter, overwrite = true) {
    if (overwrite) nodeBoxEnter.selectAll(".node-box").remove();
    // 创建 节点选择框g标签
    const nodeBoxGEnter = nodeBoxEnter
      .append("g")
      .attr("class", "node-box")
      .attr("id", (d) => {
        return `${this.uniqueTag}_node-box-${d.id}`;
      });

    // 创建 节点角框
    nodeBoxGEnter
      .append("path")
      .attr("class", "node-corner")
      .attr("id", (d) => {
        return `${this.uniqueTag}_box-wrap-${d.id}`;
      })
      .attr("fill", "none")
      .style("stroke", Cfg.color.selectionCornerStroke)
      .style("stroke-width", Cfg.strokeW.bold);

    // 更新节点选择框
    this.updateNodeBox(nodeBoxGEnter);
    return nodeBoxGEnter;
  }

  /**
   * 更新节点选择框
   * @param {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeBoxSel
   * @return {d3.Selection<SVGGElement, Mapper.GraphNode>} nodeBoxSel
   */
  updateNodeBox(nodeBoxSel) {
    // 更新节点选择框坐标
    this.updateBoxPosition(nodeBoxSel);

    // 更新节点角框
    const mg = Cfg.selectionMargin; // 选择框与元素间距
    const cw = Cfg.nodeCornerWidth; // 角框长度
    nodeBoxSel.selectAll(".node-corner").attr("d", (d) => {
      let dx = d.w / 2 + mg;
      let dy = d.h / 2 + mg;
      return (
        `M${-dx},${-dy + cw} L${-dx},${-dy} L${-dx + cw},${-dy}` +
        ` M${dx - cw},${-dy} L${dx},${-dy} L${dx},${-dy + cw}` +
        ` M${dx},${dy - cw} L${dx},${dy} L${dx - cw},${dy}` +
        ` M${-dx + cw},${dy} L${-dx},${dy} L${-dx},${dy - cw}`
      );
    });
    return nodeBoxSel;
  }

  /**
   * 更新选中节点包围盒
   * @param {boolean} recalcu 是否重新计算包围盒
   */
  updateSelectionBox(recalcu = true) {
    if (!this.$boxGroup) throw "选择框层Selection不存在！";
    this.$boxGroup.select("#box-wrap").remove();
    // 选中节点包围盒边界信息
    let bbox = this._selection.boundingBox;
    if (recalcu) {
      // 重新计算包围盒边界
      bbox = this._selection.boundingBox = Util.calcuBoundingBox(
        Array.from(this._selection.nodeMap.values())
      );
    }
    if (bbox) {
      const mg = Cfg.selectionMargin; // 选择框与元素间距
      // 创建节点包围盒
      this.$boxGroup
        .append("path")
        .attr("id", "box-wrap")
        .attr(
          "d",
          `M${bbox.minX - mg},${bbox.minY - mg} L${bbox.maxX + mg},${bbox.minY - mg}` +
            ` L${bbox.maxX + mg},${bbox.maxY + mg} L${bbox.minX - mg},${bbox.maxY + mg} Z`
        )
        .attr("fill", "none")
        .style("stroke", Cfg.color.selectionStroke)
        .style("stroke-width", Util.fixedSize(Cfg.strokeW.light, this.transform.k))
        .style("stroke-dasharray", "1,6")
        .style("stroke-linecap", "round"); // 圆点虚线边框
    }
  }

  // 相对移动选中节点包围盒
  moveSelectionBox(dtX, dtY) {
    const bbox = this._selection.boundingBox;
    if (bbox) {
      bbox.minX += dtX;
      bbox.maxX += dtX;
      bbox.minY += dtY;
      bbox.maxY += dtY;
    }
    this.updateSelectionBox(false);
  }

  // 创建右键框选窗口
  initSelectionWindow(x, y) {
    if (!this.$svg) throw "根节点SVGSelection不存在！";
    this._selectionWindow = { start: [x, y] };
    this.$svg.select("#selection-window").remove();
    this.$svg
      .append("rect")
      .attr("id", "selection-window")
      .attr("x", x)
      .attr("y", y)
      .attr("width", 0)
      .attr("height", 0)
      .attr("fill", "none")
      .style("stroke", Cfg.color.selectionStroke)
      .style("stroke-width", Cfg.strokeW.light)
      .style("stroke-dasharray", "3,3"); // 圆点虚线边框
  }

  // 更新右键框选窗口大小
  updateSelectionWindow(toX, toY) {
    if (!this.$svg) throw "根节点SVGSelection不存在！";
    if (!this._selectionWindow?.start) return;
    const start = this._selectionWindow.start;
    this.$svg
      .select("#selection-window")
      .attr("x", Math.min(start[0], toX))
      .attr("y", Math.min(start[1], toY))
      .attr("width", Math.abs(start[0] - toX))
      .attr("height", Math.abs(start[1] - toY));
    this._selectionWindow.end = [toX, toY];
  }

  // 移除右键框选窗口
  removeSelectionWindow() {
    this._selectionWindow = null;
    this.$svg?.select("#selection-window").remove();
  }

  // 右键框选事件
  bindSelectionWindowEvent() {
    if (d3.event.button !== 2) return;
    d3.event.preventDefault();
    d3.event.stopPropagation();
    this.initSelectionWindow(d3.event.offsetX, d3.event.offsetY);
    this.$svg.on("mousemove.selection", () => {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      // 右键移动
      this.updateSelectionWindow(d3.event.offsetX, d3.event.offsetY);
    });

    d3.select("body").on("mouseup.selection", () => {
      // 松开右键
      this.$svg.on("mousemove.selection", null);
      d3.select("body").on("mouseup.selection", null);
      // 拖拽起终点
      let start = this._selectionWindow?.start;
      let end = this._selectionWindow?.end;
      this.removeSelectionWindow();
      if (start && end) {
        // 若按住右键移动超过一定距离，则阻止右键事件
        const distance = 30; // 像素距离
        if (
          Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2) >
          Math.pow(distance, 2)
        ) {
          d3.select("body").on(
            "contextmenu.stopPropagation",
            () => {
              d3.event.stopPropagation();
              d3.event.preventDefault();
              d3.select("body").on("contextmenu.stopPropagation", null);
            },
            { once: true, capture: true } // 捕获阶段触发，配合stopPropagation阻止右键事件捕获
          );
        } else {
          // 否则视为右键点击，不触发框选
          return;
        }

        // 判断右键框选元素
        // 将坐标转换为视图内坐标
        let [minX, minY] = Util.offsetToCoord(start, this.transform);
        let [maxX, maxY] = Util.offsetToCoord(end, this.transform);
        if (minX > maxX) {
          [minX, maxX] = [maxX, minX];
        }
        if (minY > maxY) {
          [minY, maxY] = [maxY, minY];
        }
        let changeBox = false;
        if (!this._ctrlDown) {
          // 未按照ctrl时，重置框选节点
          this._selection.nodeMap.clear();
          changeBox = true;
        }
        this._nodes.forEach((n) => {
          let lt = { x: n.x - n.w / 2, y: n.y - n.h / 2 }; // 节点左上坐标
          let rb = { x: n.x + n.w / 2, y: n.y + n.h / 2 }; // 节点右下坐标
          // 节点的左上坐标和右下坐标都在包围盒内，即为框选中节点
          if (
            lt.x >= minX &&
            lt.x <= maxX &&
            lt.y >= minY &&
            lt.y <= maxY &&
            rb.x >= minX &&
            rb.x <= maxX &&
            rb.y >= minY &&
            rb.y <= maxY
          ) {
            // 增选
            this._selection.nodeMap.set(n.id, n);
            changeBox = true;
          }
        });
        if (changeBox) {
          // 重绘选择框
          this.buildBox();
        }
      }
    });
  }

  // 节点拖拽事件
  bindNodeDragEvent() {
    // 开始拖拽
    const dragstart = (d) => {
      // 中断重置定位的过渡动画
      this.$link?.interrupt("moveTransition");
      this.$node?.interrupt("moveTransition");
      this.$box?.interrupt("moveTransition");
      // 选中节点
      this.handleSelectNode(d);
    };
    // 正在拖拽
    const dragmove = () => {
      // 设置更新选中节点的坐标
      this._selection.nodeMap.forEach((n) => {
        n.x += d3.event.dx;
        n.y += d3.event.dy;
      });
      // 相对移动选中节点包围盒
      this.moveSelectionBox(d3.event.dx, d3.event.dy);
      // 更新节点、连接线
      this.buildTick();
    };
    // 结束拖拽
    const dragend = () => {
      // 网格对齐
      if (Cfg.globalSetting.gridAlignment && this._selection.boundingBox) {
        let x, y;
        const { minX, minY, w, h } = this._selection.boundingBox;
        if (this._selection.nodeMap.size == 1) {
          // 如果只选中一个节点，则使用包围盒中心对齐
          x = minX + w / 2;
          y = minY + h / 2;
        } else {
          // 选中多个节点则使用包围盒左上角对齐
          x = minX;
          y = minY;
        }
        // 获取网格对齐坐标偏移量
        const [dtX, dtY] = Util.getGridAlignmentOffset(x, y);
        if (dtX != 0 || dtY != 0) {
          this._selection.nodeMap.forEach((n) => {
            n.x += dtX;
            n.y += dtY;
          });
          // 相对移动选中节点包围盒
          this.moveSelectionBox(dtX, dtY);
          // 更新节点、连接线
          this.buildTick();
        }
      }
      // 记录操作
      this.recordUndo();
    };

    if (!this._nodeDrag) {
      this._nodeDrag = d3.drag();
    }
    this._nodeDrag.on("start", dragstart).on("drag", dragmove).on("end", dragend);
    return this._nodeDrag;
  }

  // 解除绑定节点拖拽事件
  unbindNodeDragEvent() {
    if (!this._nodeDrag) return;
    this._nodeDrag.on("start", null).on("drag", null).on("end", null);
  }

  // 节点插槽拖拽事件
  bindSlotDragEvent() {
    let _this = this;
    const dragLineArrowId = "arrow_dragLine";

    // 使圆点可拖动并在拖动时创建线段
    // 开始拖拽
    function dragstart(d) {
      // 已占用插槽 || 不是输出口，显示红色边框提示
      if (d.edge || d.dir !== 1) {
        d3.select(this).style("stroke", Cfg.color.danger).style("stroke-width", Cfg.strokeW.bold);
        return;
      }
      // 在拖动开始时创建一个新的线段
      // 创建拖拽箭头
      _this.createArrow(dragLineArrowId, Cfg.color.tmpLineStroke);

      // 创建拖拽线段
      _this.$linkGroup.select(`#${_this.uniqueTag}_dragLine`).remove();
      _this.$linkGroup
        .append("path")
        .attr("stroke-width", Cfg.strokeW.link)
        .attr("class", "link")
        .attr("id", `${_this.uniqueTag}_dragLine`)
        .attr(
          "d",
          `M${d.node.x + d.ox},${d.node.y + d.oy} ${d.node.x + d3.event.x},${d.node.y + d3.event.y}`
        )
        .style("stroke", Cfg.color.tmpLineStroke)
        .attr("fill", "none")
        .attr("marker-end", `url(#${dragLineArrowId})`);

      // 监听进入其他节点
      let sourceD = d;
      _this.$nodeGroup
        .selectAll(".slot-point")
        .on("mouseenter.onDragLine", function () {
          d3.select(this)
            .style("stroke", (targetD) => {
              // 同节点插槽 || 已占用插槽 || 不是输入口，显示红色边框提示
              if (sourceD.node.id == targetD.node.id || targetD.edge || targetD.dir !== -1) {
                return Cfg.color.danger; // 红色
              }
              return Cfg.color.success; // 绿色
            })
            .style("stroke-width", Cfg.strokeW.bold);
        })
        .on("mouseleave.onDragLine", function () {
          d3.select(this)
            .style("stroke", Cfg.color.slotStroke)
            .style("stroke-width", Cfg.strokeW.light);
        });
    }

    // 正在拖拽
    function dragmove(d) {
      // 在拖动过程中更新线段的终点
      _this.$linkGroup
        .select(`#${_this.uniqueTag}_dragLine`)
        .attr(
          "d",
          `M${d.node.x + d.ox},${d.node.y + d.oy} ${d.node.x + d3.event.x},${d.node.y + d3.event.y}`
        );
    }

    // 结束拖拽
    function dragend(d) {
      // 移除监听
      _this.$nodeGroup
        .selectAll(".slot-point")
        .on("mouseenter.onDragLine", null)
        .on("mouseleave.onDragLine", null)
        .style("stroke", Cfg.color.slotStroke)
        .style("stroke-width", Cfg.strokeW.light);

      // 移除拖拽线段及箭头
      _this.$linkGroup.select(`#${_this.uniqueTag}_dragLine`).remove();
      _this.$linkGroup.select("#" + dragLineArrowId).remove();

      const targetEl = d3.event.sourceEvent.toElement
        ? d3.select(d3.event.sourceEvent.toElement)
        : null;
      // 在拖动结束时，检查鼠标是否落在另一个圆点上
      if (targetEl.classed("slot-point")) {
        const targetD = targetEl.datum();
        if (d.node.id == targetD.node.id) {
          // 同节点插槽，限制不可连接
          return;
        }
        // 如果在另一个圆点上停止，则连接两个圆点
        _this.addEdge(d.node.id, d.index, targetD.node.id, targetD.index);
      }
    }

    if (!this._slotDrag) {
      this._slotDrag = d3.drag();
    }
    this._slotDrag.on("start", dragstart).on("drag", dragmove).on("end", dragend);
    return this._slotDrag;
  }

  // 解除绑定节点插槽拖拽事件
  unbindSlotDragEvent() {
    if (!this._slotDrag) return;
    this._slotDrag.on("start", null).on("drag", null).on("end", null);
  }

  /**
   * 更新坐标
   * @param {boolean} isTransition 是否动画过渡
   */
  buildTick(isTransition) {
    let node = this.$node;
    let link = this.$link;
    let box = this.$box;
    if (isTransition) {
      // 过渡动画命名：moveTransition （同名会直接中断，不会重复）
      node = node.transition("moveTransition");
      link = link.transition("moveTransition");
      box = box.transition("moveTransition");
    }
    this.updateNodePosition(node);
    this.updateLinkPath(link);
    this.updateBoxPosition(box);
  }

  /**
   * 更新节点坐标
   * @param {d3.Selection<,Mapper.GraphNode>} node
   */
  updateNodePosition(node) {
    node?.attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
  }

  /**
   * 更新节点选择框坐标
   * @param {d3.Selection<,Mapper.GraphNode>} box
   */
  updateBoxPosition(box) {
    box?.attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
  }

  /**
   * 更新连接线路径
   * @param {d3.Selection<,Mapper.GraphEdge>} edgeSel
   */
  updateLinkPath(edgeSel) {
    edgeSel?.attr("d", (d) => {
      const startNodeX = d.source.x + d.sourceSlot.ox;
      const startNodeY = d.source.y + d.sourceSlot.oy;
      const endNodeX = d.target.x + d.targetSlot.ox;
      const endNodeY = d.target.y + d.targetSlot.oy;
      return `M${startNodeX},${startNodeY} L${endNodeX},${endNodeY}`;
    });
  }

  /**
   * 将当前图谱数据转换为持久化数据
   */
  getGraphData() {
    return Mapper.toGraphData(
      this._nodes,
      this._edges,
      {
        transform: this.transform,
        graphName: this.graphName,
      },
      Array.from(this.packageMap.values()),
      false
    );
  }

  /**
   * 将当前选中节点数据转换为持久化数据
   */
  getSelectionGraphData() {
    return Mapper.toGraphData(
      Array.from(this._selection.nodeMap.values()), // 选中节点集合
      Util.getEdgesByNodeMap(this._selection.nodeMap), // 通过节点映射获取边集
      {
        transform: this.transform,
        graphName: this.graphName,
      },
      Array.from(this.packageMap.values()),
      true
    );
  }

  /**
   * 复制
   */
  handleCopy(showSuccess = true) {
    // 复制选中节点
    if (this._selection.nodeMap.size == 0) {
      Util._warn("请先框选节点后进行复制！");
      return false;
    }
    const graphData = this.getSelectionGraphData();
    window.localStorage.setItem("copyGraphData", JSON.stringify(graphData));
    if (showSuccess) Util._success("复制成功！");
    return true;
  }

  /**
   * 粘贴
   */
  handlePaste(showSuccess = true) {
    let copyGraphData = window.localStorage.getItem("copyGraphData");
    if (copyGraphData == null) {
      Util._warn("请先框选节点后进行复制！");
      return false;
    }
    try {
      let offset;
      if (this._mouseIsEnter) {
        // 如果鼠标在画布内，则粘贴到鼠标位置
        offset = this._mouseOffset;
      } else {
        // 否则粘贴到当前视图中央
        offset = [this.width / 2, this.height / 2];
      }
      this.appendGraphData(JSON.parse(copyGraphData), offset);
      if (showSuccess) Util._success("粘贴成功！");
      return true;
    } catch (e) {
      console.error(e);
      Util._warn("粘贴失败！");
      return false;
    }
  }

  /**
   * 删除
   */
  handleDelete(showSuccess = true) {
    if (this._selection.nodeMap.size > 0) {
      // 删除所有选中的节点
      this.deleteNodes(Array.from(this._selection.nodeMap.values()));
      if (showSuccess) Util._success("删除成功！");
      return true;
    } else {
      Util._warn("请先框选节点后进行删除！");
      return false;
    }
  }

  /**
   * 剪切
   */
  handleCut(showSuccess = true) {
    if (this.handleCopy(false) && this.handleDelete(false)) {
      if (showSuccess) Util._success("剪切成功！");
      return true;
    }
    return false;
  }

  /**
   * 记录操作到撤回列表
   */
  recordUndo() {
    // 记录撤回间隔防抖
    clearTimeout(this._recordUndoTimer);
    this._recordUndoTimer = setTimeout(() => {
      const graphData = this.getGraphData();
      this._undoList.push(graphData);
      this._redoList = []; // 重置重做列表
      // 超过记录的撤回次数
      if (this._undoList.length - 1 > Cfg.undoNum) this._undoList.shift();
    }, Cfg.undoInterval);
  }

  /**
   * 撤回
   */
  handleUndo() {
    if (this._undoList.length <= 1) {
      Util._warn("没有可撤回的记录！");
      return false;
    }
    this._redoList.push(this._undoList.pop());
    const undoData = this._undoList[this._undoList.length - 1];
    // 一段时间内多次撤回只重绘一次
    clearTimeout(this._undoTimer);
    this._undoTimer = setTimeout(() => {
      this.resetGraphData(undoData, false);
      Util._success("撤回成功！");
    }, Cfg.undoRebuildInterval);
  }

  /**
   * 重做
   */
  handleRedo() {
    if (this._redoList.length == 0) {
      Util._warn("没有可重做的记录！");
      return false;
    }
    const redoData = this._redoList.pop();
    this._undoList.push(redoData);
    // 一段时间内多次撤回只重绘一次
    clearTimeout(this._undoTimer);
    this._undoTimer = setTimeout(() => {
      this.resetGraphData(redoData, false);
      Util._success("重做成功！");
    }, Cfg.undoRebuildInterval);
  }

  /**
   * 保存当前图谱数据到localStorage
   */
  handleSave() {
    try {
      const graphData = this.getGraphData();
      window.localStorage.setItem("cacheGraphData", JSON.stringify(graphData));
      Util._success("已保存至浏览器缓存！");
    } catch (e) {
      Util._err("保存失败：" + e);
    }
  }

  /**
   * 导出当前图谱数据为JSON
   */
  handleSaveAsJson() {
    if (this._nodes.length == 0) {
      Util._warn("当前没有可导出的节点！");
      return false;
    }
    try {
      const graphData = this.getGraphData();
      Util.saveGraphDataAsJson(graphData);
      Util._success("导出成功！");
    } catch (e) {
      Util._err("导出失败：" + e);
    }
  }

  /**
   * 生成蓝图数据事件处理
   */
  handleGenerateBlueprint() {
    if (this.beforeGenerateBlueprint instanceof Function) {
      this.beforeGenerateBlueprint(() => this.generateBlueprint());
    } else {
      // 生成并下载蓝图
      const blueprintRes = this.generateBlueprint();
      if (Cfg.globalSetting.generateMode === 0) {
        // 无带流，多下载一个分拣器接地基的蓝图
        Util.saveAsTxt(blueprintRes.txt, blueprintRes.name + "_无带流分拣器", "txt");
      }
      Util.saveAsTxt(blueprintRes.txt_onlyEdge, blueprintRes.name, "txt");
    }
  }

  /**
   * @typedef {Object} blueprintRes
   * @property {name} name 蓝图名称（不带txt后缀）
   * @property {stirng} txt 蓝图文本
   * @property {stirng} txt_onlyEdge 仅分拣器的蓝图文本
   */
  /**
   * 生成蓝图数据
   * @return {blueprintRes}
   */
  generateBlueprint() {
    if (this._nodes.length == 0) {
      Util._warn("当前没有可导出的节点！");
      return false;
    }
    try {
      /** @type {blueprintRes} */
      const blueprintRes = {
        name: this.graphName,
      };
      const blueprint = BuildingUtil.generateBlueprint(this._nodes, this._edges, this.graphName);
      if (Cfg.globalSetting.generateMode === 0) {
        // 如果是无带流，多生成一个只有分拣器的蓝图
        const blueprint_onlyEdge = BuildingUtil.filterInserter(
          blueprint,
          this.graphName + "_分拣器蓝图"
        );
        blueprintRes.txt_onlyEdge = Parser.toStr(blueprint_onlyEdge);
      }
      blueprintRes.txt = Parser.toStr(blueprint);
      Util._success("生成蓝图成功！");
      return blueprintRes;
    } catch (e) {
      Util._err("生成蓝图失败：" + (e?.message || e));
      return false;
    }
  }

  /**
   * 封装框选建筑事件处理
   */
  async handlePackageComponent() {
    if (this._selection.nodeMap.size <= 1) {
      let err = "请先框选两个及以上的节点进行封装！";
      Util._warn(err);
      throw err;
    }
    try {
      const graphData = this.getSelectionGraphData();
      const packageModel = await this.packageComponent(graphData);
      if (packageModel) {
        // 删除当前选中组件，粘贴一个封装组件
        this.handleDelete(false);
        let offset;
        if (this._mouseIsEnter) {
          // 如果鼠标在画布内，则粘贴到鼠标位置
          offset = this._mouseOffset;
        } else {
          // 否则粘贴到当前视图中央
          offset = [this.width / 2, this.height / 2];
        }
        this.createNode(Cfg.ModelId.package, offset, packageModel.hash);
        Util._success("封装成功");
      }
      return true;
    } catch (e) {
      Util._err("封装失败：" + e);
      return false;
    }
  }

  /**
   * 封装框选建筑
   * @param {Mapper.GraphData} graphData
   * @return {Mapper.PackageModel}
   */
  async packageComponent(graphData) {
    const graphDataHash = Util.getGraphDataHash(graphData);
    graphData.header.hash = graphDataHash;

    let defaultName = "封装模块" + (this.packageMap.size + 1);
    // 查询已有封装
    let packageModel = this.packageMap.get(graphDataHash);
    if (packageModel != null) {
      defaultName = packageModel.name;
      // 是否覆盖更新已有的封装
      try {
        await Util._confirmHtml(`存在相同结构的封装，是否覆盖更新封装数据？<br/>
        相似模块名：<span style="font-weight:bold;color:var(--color-warning)">${packageModel.name}</span>`);
      } catch {
        // 取消 不更新
        return false;
      }
    }
    // 模块名
    let packageName;
    try {
      packageName = await Util._prompt("请输入封装模块名", defaultName);
    } catch {
      // 取消
      return false;
    }
    if (!packageName) {
      packageName = defaultName;
    }

    // 新增、更新
    packageModel = {
      hash: graphDataHash,
      name: packageName,
      graphData,
      initNodeData: {
        modelId: Cfg.ModelId.package,
        packageHash: graphDataHash,
        text: packageName, // 节点文本-package名称
        slots: [],
      },
      outsideNodeMap: new Map(),
    };
    // 遍历节点创建输入输出插槽
    const inputSlots = [];
    const outputSlots = [];
    graphData.data.nodes.forEach((n) => {
      if (n.modelId === Cfg.ModelId.input) {
        // 信号输入口
        packageModel.outsideNodeMap.set(n.id, n);
        /** @type {Mapper.NodeSlotData} */
        const slot = {
          packageNodeId: n.id, // 对应package中原输入输出节点id
          itemId: n.itemId, // 生成/消耗物品id
          signalId: n.signalId, // 文本标记id
          text: n.text, // 插槽文本
          dir: 1, // 外部插槽需要倒置输入输出
        };
        packageModel.initNodeData.slots.push(slot);
        inputSlots.push(slot);
      } else if (n.modelId === Cfg.ModelId.output) {
        // 信号输出口
        packageModel.outsideNodeMap.set(n.id, n);
        const slot = {
          packageNodeId: n.id,
          itemId: n.itemId,
          signalId: n.signalId,
          text: n.text,
          dir: -1, // 倒置为输入
        };
        packageModel.initNodeData.slots.push(slot);
        outputSlots.push(slot);
      }
    });
    if (inputSlots.length == 0 || outputSlots.length == 0) {
      throw "所要封装的节点里，需要包含至少一个输入及输出节点！";
    }
    // 根据插槽数量决定盒子大小
    packageModel.initNodeData.w =
      Math.max(inputSlots.length, outputSlots.length) *
        (Cfg.packageSlotSize + Cfg.packageSlotSpace) +
      Cfg.packageSlotSpace;
    packageModel.initNodeData.h = Cfg.nodeSize;
    const W = packageModel.initNodeData.w;
    const H = packageModel.initNodeData.h;

    // 插槽布局（横向等距排列，输出口在上边缘，输入口在下边缘，高度不变）
    const iptDis = W / (inputSlots.length + 1);
    const optDis = W / (outputSlots.length + 1);
    inputSlots.forEach((s, si) => {
      s.ox = -W / 2 + (si + 1) * iptDis;
      s.oy = H / 2;
    });
    outputSlots.forEach((s, si) => {
      s.ox = -W / 2 + (si + 1) * optDis;
      s.oy = -H / 2;
    });

    // 追加引用封装模块
    this.appendPackages(graphData.packages);
    this.packageMap.set(graphDataHash, packageModel);
    return packageModel;
  }

  /**
   * 展开封装
   * @param {Mapper.GraphNode} node
   */
  unfoldPackage(node) {
    if (!node || node.modelId !== Cfg.ModelId.package || !node.packageHash) {
      Util._err("节点数据异常");
      throw false;
    }
    const _package = this.packageMap.get(node.packageHash);
    if (!_package) {
      Util._err("封装数据异常");
      throw false;
    }
    try {
      // 删除当前节点，粘贴一个封装展开组件
      this.deleteNode(node);
      let offset;
      if (this._mouseIsEnter) {
        // 如果鼠标在画布内，则粘贴到鼠标位置
        offset = this._mouseOffset;
      } else {
        // 否则粘贴到当前视图中央
        offset = [this.width / 2, this.height / 2];
      }
      this.appendGraphData(_package.graphData, offset);
      return true;
    } catch (e) {
      console.error(e);
      Util._warn("展开封装节点失败！");
      return false;
    }
  }

  /**
   * 删除封装模块事件
   * @param {Mapper.PackageModel} packageModel
   */
  async handleDeletePackage(packageModel) {
    if (!packageModel) return;
    try {
      await Util._confirmHtml(
        `是否删除封装模块<span style="font-weight:bold;color:var(--color-warning)">${packageModel.name}</span>，及其相应的引用节点`
      );
    } catch {
      // 取消
      return false;
    }
    this.deletePackage(packageModel.hash);
    Util._success("删除成功！");
    return true;
  }

  /**
   * 删除封装模块及相应的引用节点
   * @param {String} packageHash
   */
  deletePackage(packageHash) {
    if (!packageHash) return;

    // 构建依赖链
    const treeMap = {};
    this.packageMap.forEach((c, cHash) => {
      c.graphData?.packageHashList?.forEach((pHash) => {
        if (!treeMap[pHash]) {
          treeMap[pHash] = [cHash];
        } else {
          treeMap[pHash].push(cHash);
        }
      });
    });

    this.packageMap.delete(packageHash);
    const referencePackageHash = new Set(); // 记录嵌套引用了packageHash的所有封装模块Hash
    referencePackageHash.add(packageHash);

    let childs = treeMap[packageHash] ?? [];
    while (childs.length > 0) {
      let _hash = childs.shift();
      if (referencePackageHash.has(_hash)) continue;
      // 删除嵌套引用的模块
      this.packageMap.delete(_hash);
      referencePackageHash.add(_hash);
      let _childs = treeMap[_hash];
      if (_childs?.length > 0) {
        childs.push(..._childs);
      }
    }

    // 找到所有引用该封装模块的节点
    let packageNodes = this._nodes.filter((n) => {
      return n.modelId === Cfg.ModelId.package && referencePackageHash.has(n.packageHash);
    });
    this.deleteNodes(packageNodes);
    // 记录操作
    this.recordUndo();
  }

  /**
   * 追加引用封装模块
   * @param {Mapper.PackageModel[]} packages
   */
  appendPackages(packages) {
    if (packages?.length > 0) {
      packages.forEach((p) => {
        if (!this.packageMap.has(p.hash)) {
          this.packageMap.set(p.hash, p);
        }
      });
    }
  }
}
