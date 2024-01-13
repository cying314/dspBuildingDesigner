import * as d3 from "d3";
import * as Cfg from "./graphConfig.js";
import * as Mapper from "./dataMapper.js";
import * as Util from "./graphUtil.js";
import * as Watermark from "@/utils/watermark.js";
export default class Graph {
  graphName; // 图谱名称
  transform = { x: 0, y: 0, k: 1 }; // 画布位移、缩放
  width; // 画布宽度
  height; // 画布高度
  _canvasDOM; // 画布容器dom对象
  gridAlignment; // 网格对齐(默认是)
  defaultScale; // 初始化缩放(默认1)
  minScale; // 最小缩放(默认0.1)
  maxScale; // 最大缩放(默认5)
  $svg; // 根节点SVGSelection
  $vis; // 视图层Selection
  $nodeGroup; // 节点层Selection
  $linkGroup; // 连接线层Selection
  $boxGroup; // 选择框层Selection
  $node; // 节点集Selection
  $link; // 连线集Selection
  $box; // 选择框Selection
  _nodeDrag; // 节点拖拽实例
  _slotDrag; // 节点插槽拖拽实例
  _nodes; // 节点数据
  _edges; // 连接线数据
  _maxId; // 最大节点id
  _nodeMap; // 节点id对应实体Map
  _selection = {
    // 节点选择框
    nodeMap: new Map(), // 选中节点id对应实体Map
    boundingBox: null, // 选中节点包围盒边界信息 {minX, minY, maxX, maxY, w, h}
  };
  _selectionWindow; // 右键选择框窗口
  _ctrlDown = false; // 按下ctrl
  _mouseIsEnter = false; // 当前鼠标是否在画布内
  _mouseOffset = [0, 0]; // 当前鼠标在画布内相对位置
  handleDblclick; // 画布空白位置双击事件
  handleRclickNode; // 右键点击节点事件
  handleRclickSlot; // 右键点击插槽事件

  /**
   * 图谱实例
   * @param {Object} options
   * @param {HTMLElement} options.canvasDOM 画布容器dom对象
   * @param {Object} options.graphData 图谱数据
   * @param {string} options.uniqueTag 画布内元素id唯一标识(默认def)
   * @param {string} options.graphName 图谱名称
   * @param {boolean} options.gridAlignment 网格对齐(默认是)
   * @param {number} options.defaultScale 初始化缩放
   * @param {number} options.minScale 最小缩放
   * @param {number} options.maxScale 最大缩放
   * @param {(event: Event) => void} options.handleDblclick 画布空白位置双击事件
   * @param {(event: Event, d: Object) => void} options.handleRclickNode 右键点击插槽事件
   * @param {(event: Event, d: Object) => void} options.handleRclickSlot 右键点击插槽事件
   */
  constructor({
    canvasDOM,
    graphData,
    uniqueTag = "def",
    graphName,
    gridAlignment = true, // 网格对齐
    defaultScale = Cfg.defaultScale,
    minScale = Cfg.minScale,
    maxScale = Cfg.maxScale,
    handleDblclick,
    handleRclickNode,
    handleRclickSlot,
  }) {
    if (!canvasDOM) throw "画布容器dom不存在！";
    this._canvasDOM = canvasDOM;
    this.uniqueTag = uniqueTag;
    this.graphName = graphName;
    this.gridAlignment = gridAlignment;
    this.defaultScale = defaultScale;
    this.minScale = minScale;
    this.maxScale = maxScale;
    this.handleDblclick = handleDblclick;
    this.handleRclickNode = handleRclickNode;
    this.handleRclickSlot = handleRclickSlot;
    this.init(graphData);
  }

  init(graphData) {
    // 画布外层节点
    const pNode = this._canvasDOM.parentNode;
    this.width = pNode ? pNode.clientWidth : Cfg.defaultW;
    this.height = pNode ? pNode.clientHeight : Cfg.defaultH;

    // 创建svg视图
    this.buildVis();
    // 创建视图中的元素分层
    this.buildGroup();

    // 绑定按钮事件
    this.bindKeyEvent();

    // 装载数据更新图谱
    this.resetGraphData(graphData);
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
      // 保存、导出事件绑定在整个页面上，避免未聚焦画布时，触发浏览器默认事件
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
          case 88: // Ctrl+X键
            break;
        }
      }
    });
    d3.select(this._canvasDOM)
      .attr("tabindex", 0) // dom设置该属性才可以绑定键盘事件
      .on("keydown." + this.uniqueTag, () => {
        // Ctrl键按下
        this._ctrlDown = d3.event.ctrlKey;
        switch (d3.event.keyCode) {
          case 46: // delete键
            d3.event.preventDefault();
            this.handleDelete();
            break;
        }
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
   * @param graphData 图谱持久化数据
   */
  resetGraphData(graphData) {
    try {
      const { _header, _nodes, _edges, _maxId, _nodeMap } = Mapper.graphDataParse(graphData, 0);
      this._nodes = _nodes;
      this._edges = _edges;
      this._maxId = _maxId;
      this._nodeMap = _nodeMap;
      this._selection.nodeMap.clear();

      // 图谱名称
      this.graphName = _header._graphName;
      // 设置画布位移、缩放
      this.setTransform(_header._transform);

      // 重绘节点
      this.buildNode();
      // 重绘连线
      this.buildLink();
      // 重绘选择框
      this.buildBox();
    } catch (e) {
      Util._err("载入数据失败：" + e);
      throw e;
    }
  }

  /**
   * 加载数据，并追加到当前图谱
   * @param graphData 图谱持久化数据
   * @param offset 相对画布svg坐标 [ox, oy]
   */
  appendGraphData(graphData, [ox = 0, oy = 0] = []) {
    try {
      Util.checkGraphData(graphData, true, true); // 校验图谱数据
      const { minX = 0, minY = 0, w = 0, h = 0 } = graphData.header.boundingBox ?? {};
      // 将坐标转换为视图内坐标
      const coord = Util.offsetToCoord([ox, oy], this.transform);
      let bboxOffset;
      if (this.gridAlignment) {
        // 网格对齐
        const ga = Util.gridAlignment(-w / 2 + coord[0], -h / 2 + coord[1]);
        bboxOffset = [-minX + ga[0], -minY + ga[1]];
      } else {
        bboxOffset = [-minX - w / 2 + coord[0], -minY - h / 2 + coord[1]];
      }
      const { _nodes, _edges, _maxId, _nodeMap } = Mapper.graphDataParse(
        graphData,
        this._maxId,
        bboxOffset // 整体偏移
      );
      this._nodes.push(..._nodes);
      this._edges.push(..._edges);
      this._maxId = _maxId;
      _nodeMap.forEach((n, nid) => {
        this._nodeMap.set(nid, n);
      });
      this._selection.nodeMap = _nodeMap; // 选中粘贴的节点

      // 重绘节点
      this.buildNode();
      // 重绘连线
      this.buildLink();
      // 重绘选择框
      this.buildBox();
    } catch (e) {
      Util._err("载入数据失败：" + e);
      throw e;
    }
  }

  /**
   * 重置缩放大小及位置
   * @param isTransition 是否动画过渡
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
   * @param transform 转换参数 {x, y, k}
   * @param isTransition 是否动画过渡
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
   * @param modelId 模型ID
   * @param offset 相对画布坐标 [ox,oy]
   */
  createNode(modelId, offset = [0, 0]) {
    const coord = Util.offsetToCoord(offset, this.transform);
    const newNode = Mapper.modelIdToNode(modelId, ++this._maxId, null, coord); // 模型Id 转 节点对象
    if (this.gridAlignment) {
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
  }

  /**
   * 选中节点
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
   * 删除节点
   * @param node 节点对象
   * @param rebuild 是否触发重绘(默认是)
   * @return 是否需要重绘 {nbLink, nbNode, nbBox}
   */
  deleteNode(node, rebuild = true) {
    if (!node) return;
    let nbLink = false;
    let nbNode = false;
    let nbBox = false;
    // 删除节点插槽连线
    let edgeSet = new Set();
    node.slots.forEach((s) => {
      if (s.edge) edgeSet.add(s.edge);
    });
    if (edgeSet.size > 0) {
      nbLink ||= this.deleteEdges(Array.from(edgeSet), rebuild).nbLink;
    }
    // 删除节点
    this._nodeMap.delete(node.id);
    let i = this._nodes.findIndex((e) => e.id == node.id);
    if (i > -1) {
      this._nodes.splice(i, 1);
      // 重绘节点
      if (rebuild) this.buildNode();
      else nbNode = true;
    }
    // 删除选中节点
    if (this._selection.nodeMap.has(node.id)) {
      this._selection.nodeMap.delete(node.id);
      // 重绘选择框
      if (rebuild) this.buildBox();
      else nbBox = true;
    }
    return { nbLink, nbNode, nbBox };
  }

  /**
   * 删除多个节点
   * @param nodes 节点对象数组
   * @param rebuild 是否触发重绘(默认是)
   * @return 是否需要重绘 {nbLink, nbNode, nbBox}
   */
  deleteNodes(nodes, rebuild = true) {
    if (!(nodes?.length > 0)) return;
    let nbLink = false;
    let nbNode = false;
    let nbBox = false;
    nodes.forEach((node) => {
      let needRebuild = this.deleteNode(node, false);
      nbLink ||= needRebuild.nbLink;
      nbNode ||= needRebuild.nbNode;
      nbBox ||= needRebuild.nbBox;
    });
    if (rebuild) {
      if (nbLink) {
        this.buildLink(); // 重绘连接线
        nbLink = false;
      }
      if (nbNode) {
        this.buildNode(); // 重绘节点
        nbNode = false;
      }
      if (nbBox) {
        this.buildBox(); // 重绘选择框
        nbBox = false;
      }
    }

    return { nbLink, nbNode, nbBox };
  }

  /**
   * 单个节点-置于顶层
   * @param node 节点对象
   */
  nodeBringToFront(node) {
    if (!node) return;
    return this.nodesBringToFront([node]);
  }

  /**
   * 多个节点-置于顶层
   * @param nodes 节点对象数组
   */
  nodesBringToFront(nodes) {
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    this.$nodeGroup
      .selectAll(".node")
      .data(nodes, (d) => d.id)
      .raise();
  }

  /**
   * 单个节点-置于底层
   * @param node 节点对象
   */
  nodeSendToBack(node) {
    if (!node) return;
    return this.nodesSendToBack([node]);
  }

  /**
   * 多个节点-置于底层
   * @param nodes 节点对象数组
   */
  nodesSendToBack(nodes = []) {
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    this.$nodeGroup
      .selectAll(".node")
      .data(nodes, (d) => d.id)
      .lower();
  }

  /**
   * 切换插槽输入输出方向
   * @param slot 插槽对象
   */
  changeSlotDir(slot) {
    // 删除节点上带的连接线
    this.deleteEdge(slot.edge);
    slot.dir = slot.dir === 1 ? -1 : 1;
    if (slot.priority === 1) {
      // 如果是优先插槽，移除同节点同向的其他插槽的优先标识
      const node = this._nodeMap.get(slot.nodeId);
      for (let s of node.slots) {
        // 移除同节点同向的其他插槽的优先标识
        if (s.dir == slot.dir && s.priority === 1 && s !== slot) {
          s.priority = 0;
        }
      }
    }
    // 重绘节点插槽
    this.buildNodeSlot();
  }

  /**
   * 切换四向插槽是否优先
   * @param slot 插槽对象
   */
  changeSlotPriority(slot) {
    // 删除节点上带的连接线
    if (slot.priority === 1) {
      slot.priority = 0;
    } else {
      // 改为优先
      slot.priority = 1;
      const node = this._nodeMap.get(slot.nodeId);
      for (let s of node.slots) {
        // 移除同节点同向的其他插槽的优先标识
        if (s.dir == slot.dir && s.priority === 1 && s !== slot) {
          s.priority = 0;
        }
      }
    }
    // 重绘节点插槽
    this.buildNodeSlot();
  }

  /**
   * 切换四向优先输出插槽 过滤物品id
   * @param slot 插槽对象
   * @param filterItemId 过滤物品id
   */
  changeSlotFilter(slot, filterItemId) {
    if (slot.dir !== 1) return; // 输入口不可设置过滤物品
    slot.filterId = filterItemId;
    // 重绘节点插槽
    this.buildNodeSlot();
  }

  // 增加连接线
  addEdge(startId, startSlot, endId, endSlot) {
    const newEdge = Mapper.dataToEdge(
      {
        startId: startId,
        startSlot: startSlot,
        endId: endId,
        endSlot: endSlot,
      },
      this._nodeMap
    );
    if (newEdge instanceof Error) return;
    this._edges.push(newEdge);
    // 重绘连线
    this.buildLink();
  }

  /**
   * 删除连接线
   * @param edge 连接线对象
   * @param rebuild 是否触发重绘(默认是)
   * @return 是否需要重绘 {nbLink}
   */
  deleteEdge(edge, rebuild = true) {
    if (!edge) return;
    let nbLink = false;
    edge.sourceSlot.edge = null;
    edge.targetSlot.edge = null;
    let i = this._edges.findIndex((e) => e == edge);
    if (i > -1) {
      this._edges.splice(i, 1);
    }
    // 重绘连线
    if (rebuild) this.buildLink();
    else nbLink = true;
    return { nbLink };
  }

  /**
   * 删除多条连接线
   * @param edges 连接线对象数组
   * @param rebuild 是否触发重绘(默认是)
   * @return 是否需要重绘 {nbLink}
   */
  deleteEdges(edges, rebuild = true) {
    if (!(edges?.length > 0)) return;
    let nbLink = false;
    edges.forEach((edge) => {
      nbLink ||= this.deleteEdge(edge, false).nbLink;
    });
    // 重绘连线
    if (nbLink && rebuild) {
      this.buildLink();
      nbLink = false;
    }
    return { nbLink };
  }

  // 绘制节点
  buildNode() {
    if (!this._nodes) throw "节点数据不存在！";
    if (!this.$nodeGroup) throw "节点层Selection不存在！";
    const node = this.$nodeGroup.selectAll(".node").data(this._nodes, (d) => d.id);
    node.exit().remove(); // 移除多余对象

    // 新增 节点g标签
    const nodeEnter = node
      .enter()
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
    // 合并新增/更新对象
    const nodeMerge = node.merge(nodeEnter);
    this.$node = nodeMerge;
    // 更新节点坐标
    this.updateNodePosition(nodeMerge);

    // 创建节点模型
    this.createNodeBg(nodeEnter);
    // 绘制节点插槽
    this.buildNodeSlot();
  }

  // 创建节点模型
  createNodeBg(nodeEnter) {
    let _this = this;
    nodeEnter.each(function (d) {
      let bg;
      if (d.modelId === -1) {
        // 普通文本
        bg = d3
          .select(this)
          .append("text")
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
      } else if (d.modelId === 2 || d.modelId === 3) {
        // 起/终点模型
        bg = d3
          .select(this)
          .append("circle")
          .attr("r", d.w / 2)
          .style("fill", Cfg.filterItemMap.get(d.itemId)?.color ?? Cfg.color.item_default)
          .style(
            "stroke",
            d.modelId === 2 ? Cfg.color.priorityOutStroke : Cfg.color.priorityInStroke
          )
          .style("stroke-width", Cfg.strokeW.bold);
      } else {
        // 其他模型：矩形
        let fill = Cfg.color.nodeFill;
        if (d.modelId === 1) {
          // 流速器：生成消耗物品颜色
          fill = Cfg.filterItemMap.get(d.itemId)?.color ?? Cfg.color.item_default;
        }
        bg = d3
          .select(this)
          .append("rect")
          .attr("x", -d.w / 2)
          .attr("y", -d.h / 2)
          .attr("width", d.w)
          .attr("height", d.h)
          .style("fill", fill)
          .style("stroke", Cfg.color.nodeStroke)
          .style("stroke-width", Cfg.strokeW.light);
      }
      bg.attr("class", "node-bg")
        .attr("id", `${this.uniqueTag}_node-bg-${d.id}`)
        .style("opacity", 0.8);
    });
  }

  // 创建多行文本
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

  // 绘制节点插槽
  buildNodeSlot() {
    if (!this.$node) throw "节点集Selection不存在！";
    const nodeSlot = this.$node.selectAll(".node-slot").data(
      (d) => d.slots,
      (point) => point.index
    );
    nodeSlot.exit().remove(); // 移除多余对象

    // 新增 插槽g标签
    const nodeSlotEnter = nodeSlot
      .enter()
      .append("g")
      .attr("class", "node-slot")
      .attr("id", (point) => {
        return `${this.uniqueTag}_node-slot-${point.nodeId}-${point.index}`;
      });
    // 合并新增/更新对象
    const nodeSlotMerge = nodeSlot.merge(nodeSlotEnter);

    // 绘制四向插槽优先标记
    this.buildSlotPriority();

    // 新增 插槽节点
    nodeSlotEnter
      .append("circle")
      .attr("class", "slot-point")
      .style("cursor", "pointer")
      .attr("transform", (point) => `translate(${point.ox},${point.oy})`)
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
        const node = this._nodeMap.get(d.nodeId);
        if (node.modelId === 0 || node.modelId === 1) {
          // 只有四向/流速器可调转输入输出口
          this.changeSlotDir(d);
        }
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
    // // 更新插槽节点相对位置
    // nodeSlotMerge
    //   .selectAll(".slot-point")
    //   .attr("transform", (point) => `translate(${point.ox},${point.oy})`);

    // 新增 插槽+-号
    nodeSlotEnter
      .append("path")
      .attr("class", "slot-dir")
      .style("pointer-events", "none") // 事件穿透
      .style("stroke", Cfg.color.slotStroke);
    // 更新 插槽+-号
    nodeSlotMerge.selectAll(".slot-dir").attr("d", (d) => {
      const r = Cfg.pointSize;
      let dAttr = `M${d.ox - r / 2},${d.oy} L${d.ox + r / 2},${d.oy}`;
      if (d.dir === 1) {
        return dAttr + ` M${d.ox},${d.oy + r / 2} L${d.ox},${d.oy - r / 2}`; // 输出口：＋
      } else if (d.dir === -1) {
        return dAttr; // 输入口：－
      }
    });
  }

  // 绘制四向插槽优先标记
  buildSlotPriority() {
    if (!this.$node) throw "节点集Selection不存在！";
    let nodeSlot = this.$node
      .filter((d) => d.modelId === 0) // 过滤四向模型(modelId=0)
      .selectAll(".node-slot");
    // 移除非优先数据的标记
    nodeSlot
      .filter((d) => d.priority !== 1)
      .selectAll(".slot-priority")
      .remove();

    nodeSlot
      .filter((d) => d.priority === 1) // 优先插槽
      .each(function (d) {
        let priority = d3
          .select(this)
          .selectAll(".slot-priority")
          .data([d], (s) => s.index);
        priority.exit().remove();
        // 新增优先标记
        let priorityEnter = priority
          .enter()
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
        // 更新优先标记
        priority
          .merge(priorityEnter)
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
      });
  }

  // 绘制连线
  buildLink() {
    if (!this._edges) throw "连接线数据不存在！";
    if (!this.$linkGroup) throw "连接线层Selection不存在！";
    const arrowId = "arrow-line";
    this.createArrow(arrowId, Cfg.color.lineStroke);

    const link = this.$linkGroup
      .selectAll(".line")
      .data(this._edges, (d) => d.source + "_" + d.target);
    link.exit().remove(); // 移除多余对象

    // 新增 连接线
    const linkEnter = link
      .enter()
      .append("path")
      .attr("stroke-width", Cfg.strokeW.line)
      .attr("class", "line")
      .style("stroke", Cfg.color.lineStroke)
      .attr("fill", "none")
      .attr("marker-end", `url(#${arrowId})`);
    // 合并新增/更新对象
    const linkMerge = link.merge(linkEnter);
    this.$link = linkMerge;
    // 更新连接线路径
    this.updateLinkPath(linkMerge);

    // 更新 连接线
    linkMerge.attr("id", (d) => {
      return `${this.uniqueTag}_line-source-${d.source}-target-${d.target}`;
    });
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
      .attr("stroke-width", Cfg.strokeW.line / 2);
  }

  // 绘制节点选择框
  buildBox() {
    if (!this.$boxGroup) throw "选择框层Selection不存在！";
    const box = this.$boxGroup
      .selectAll(".node-box")
      .data(Array.from(this._selection.nodeMap.values()), (d) => d.id);
    box.exit().remove(); // 移除多余对象

    // 新增 节点选择框g标签
    const boxEnter = box
      .enter()
      .append("g")
      .attr("class", "node-box")
      .attr("id", (d) => {
        return `${this.uniqueTag}_node-box-${d.id}`;
      });
    // 合并新增/更新对象
    const boxMerge = box.merge(boxEnter);
    this.$box = boxMerge;
    // 更新节点选择框坐标
    this.updateBoxPosition(boxMerge);

    const mg = Cfg.selectionMargin; // 选择框与元素间距
    const cw = Cfg.nodeCornerWidth; // 角框长度
    // 创建 节点角框
    boxEnter
      .append("path")
      .attr("class", "node-corner")
      .attr("id", (d) => {
        return `${this.uniqueTag}_box-wrap-${d.id}`;
      })
      .attr("fill", "none")
      .style("stroke", Cfg.color.selectionCornerStroke)
      .style("stroke-width", Cfg.strokeW.bold);
    // 更新节点角框
    boxMerge.selectAll(".node-corner").attr("d", (d) => {
      let dx = d.w / 2 + mg;
      let dy = d.h / 2 + mg;
      return (
        `M${-dx},${-dy + cw} L${-dx},${-dy} L${-dx + cw},${-dy}` +
        ` M${dx - cw},${-dy} L${dx},${-dy} L${dx},${-dy + cw}` +
        ` M${dx},${dy - cw} L${dx},${dy} L${dx - cw},${dy}` +
        ` M${-dx + cw},${dy} L${-dx},${dy} L${-dx},${dy - cw}`
      );
    });

    // 更新选中节点包围盒
    this.updateSelectionBox();
  }

  /**
   * 更新选中节点包围盒
   * @param recalcu 是否重新计算包围盒
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
      // 右键移动
      this.updateSelectionWindow(d3.event.offsetX, d3.event.offsetY);
    });
    d3.select("body").on("mouseup.selection", () => {
      // 松开右键
      this.$svg.on("mousemove.selection", null);
      d3.select("body").on("mouseup.selection", null);

      // 判断右键框选元素
      let start = this._selectionWindow?.start;
      let end = this._selectionWindow?.end;
      if (start && end) {
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
      this.removeSelectionWindow();
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
      if (this.gridAlignment && this._selection.boundingBox) {
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
      const node = _this._nodeMap.get(d.nodeId);
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
        .attr("stroke-width", Cfg.strokeW.line)
        .attr("class", "line")
        .attr("id", `${_this.uniqueTag}_dragLine`)
        .attr(
          "d",
          `M${node.x + d.ox},${node.y + d.oy} ${node.x + d3.event.x},${node.y + d3.event.y}`
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
              if (sourceD.nodeId == targetD.nodeId || targetD.edge || targetD.dir !== -1) {
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
      const node = _this._nodeMap.get(d.nodeId);
      // 在拖动过程中更新线段的终点
      _this.$linkGroup
        .select(`#${_this.uniqueTag}_dragLine`)
        .attr(
          "d",
          `M${node.x + d.ox},${node.y + d.oy} ${node.x + d3.event.x},${node.y + d3.event.y}`
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
        if (d.nodeId == targetD.nodeId) {
          // 同节点插槽，限制不可连接
          return;
        }
        // 如果在另一个圆点上停止，则连接两个圆点
        _this.addEdge(d.nodeId, d.index, targetD.nodeId, targetD.index);
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
   * @param isTransition 是否动画过渡
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
   */
  updateNodePosition(node) {
    node?.attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
  }

  /**
   * 更新节点选择框坐标
   */
  updateBoxPosition(box) {
    box?.attr("transform", (d) => "translate(" + d.x + "," + d.y + ")");
  }

  /**
   * 更新连接线路径
   */
  updateLinkPath(link) {
    link?.attr("d", (d) => {
      let startNode = this._nodeMap.get(d.source);
      let endNode = this._nodeMap.get(d.target);
      const startNodeX = startNode.x + d.sourceSlot.ox;
      const startNodeY = startNode.y + d.sourceSlot.oy;
      const endNodeX = endNode.x + d.targetSlot.ox;
      const endNodeY = endNode.y + d.targetSlot.oy;
      return `M${startNodeX},${startNodeY} L${endNodeX},${endNodeY}`;
    });
  }

  /**
   * 复制
   */
  handleCopy() {
    // 复制选中节点
    if (this._selection.nodeMap.size == 0) {
      Util._warn("请先框选节点后进行复制！");
      return;
    }
    const graphData = Mapper.toGraphData(
      Array.from(this._selection.nodeMap.values()), // 选中节点集合
      Util.getEdgesByNodeMap(this._selection.nodeMap), // 通过节点映射获取边集
      {
        transform: this.transform,
        graphName: this.graphName,
      }
    );
    window.localStorage.setItem("copyGraphData", JSON.stringify(graphData));
    Util._success("复制成功！");
  }

  /**
   * 粘贴
   */
  handlePaste() {
    let copyGraphData = window.localStorage.getItem("copyGraphData");
    if (copyGraphData == null) {
      Util._warn("请先框选节点后进行复制！");
      return;
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
    } catch (e) {
      console.error(e);
      Util._warn("粘贴失败！");
      return;
    }
    Util._success("粘贴成功！");
  }

  /**
   * 保存当前图谱数据到localStorage
   */
  handleSave() {
    const graphData = Mapper.toGraphData(this._nodes, this._edges, {
      transform: this.transform,
      graphName: this.graphName,
    });
    window.localStorage.setItem("cacheGraphData", JSON.stringify(graphData));
    Util._success("已保存至浏览器缓存！")
  }

  /**
   * 导出当前图谱数据为JSON
   */
  handleSaveAsJson() {
    const graphData = Mapper.toGraphData(this._nodes, this._edges, {
      transform: this.transform,
      graphName: this.graphName,
    });
    Util.saveAsJson(graphData);
    Util._success("导出成功！")
  }

  /**
   * 删除
   */
  handleDelete() {
    if (this._selection.nodeMap.size > 0) {
      // 删除所有选中的节点
      this.deleteNodes(Array.from(this._selection.nodeMap.values()));
      Util._success("删除成功！")
    } else {
      Util._warn("请先框选节点后进行删除！")
    }
  }
}
