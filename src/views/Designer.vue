<template>
  <div class="main" ref="mainRef" @mousedown="hideOperMenu">
    <!-- 顶部工具栏 -->
    <div class="topBar">
      <div class="lt">
        <el-scrollbar :vertical="false">
          <div class="btns">
            <!-- 校验成功才可执行 -->
            <el-button type="primary" icon="el-icon-document-add" title="新建" @click="newProject"></el-button>
            <el-upload style="margin-left:10px;" action :auto-upload="false" :show-file-list="false" accept=".json" :on-change="openFile_onChange">
              <el-button slot="trigger" type="primary" icon="el-icon-folder-opened" title="载入文件"></el-button>
            </el-upload>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="if-icon-save" title="保存(Ctrl+S)" @click="dspGraph.handleSave()"></el-button>
            <el-button type="primary" icon="if-icon-json" title="保存为JSON文件(Ctrl+D)" @click="dspGraph.handleSaveAsJson()"></el-button>
            <el-button type="primary" icon="if-icon-blueprint" title="导出蓝图(Ctrl+X)"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="el-icon-document-copy" title="复制(Ctrl+C)" @click="dspGraph.handleCopy()"></el-button>
            <el-button type="primary" icon="if-icon-paste" title="粘贴(Ctrl+V)" @click="dspGraph.handlePaste()"></el-button>
            <el-button type="primary" icon="el-icon-delete" title="删除(Delete)" @click="dspGraph.handleDelete()"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="if-icon-grid" :key="gridAlignment?'on':'off'" :title="(gridAlignment?'取消':'')+'网格对齐'" :plain="gridAlignment" @click="gridAlignment=!gridAlignment"></el-button>
          </div>
        </el-scrollbar>
      </div>
      <div class="rt">
        <span class="label">蓝图名：</span>
        <el-input class="ipt" v-model="graphName" maxlength="30" size="mini" clearable></el-input>
      </div>
    </div>
    <div class="content">
      <div class="leftDraw" :style="{'width':leftDrawW+'px'}" ref="leftDraw" :class="{'close':leftDrawClose,'dragging':leftDrawDragging}">
        <div v-show="!leftDrawClose" class="leftDraw_dragBar" @mousedown="leftDraw_startDrag"></div>
        <div class="leftContent" :style="{'width':leftDrawW+'px'}" @contextmenu.prevent>
          <div class="groupHeader flex-between">
            <span>拖拽创建组件</span>
            <div title="双击创建勾选的组件">
              <el-checkbox v-model="dbcCreate">双击创建</el-checkbox>
            </div>
          </div>
          <div class="groupName">节点</div>
          <ul class="group">
            <li
              class="modelItem flex-between"
              v-for="node,index in nodeModels"
              :key="'node_'+index"
              draggable
              @dragstart="handleItemDragStart()"
              @dragend="handleNodeDragEnd(node.modelId)"
              title="拖拽创建组件"
            >
              <span>
                <i style="margin-right:10px" :class="node.icon"></i>
                <span>{{node.name}}</span>
              </span>
              <div class="item_rt">
                <el-checkbox v-if="dbcCreate" :value="selectModel=='node_'+index" @click.native.prevent="changeSelectModel('node_'+index)" title="勾选双击创建的组件"></el-checkbox>
              </div>
            </li>
          </ul>
          <div class="groupName flex-between">
            <span>基础组件</span>
            <el-button class="btn" type="text" icon="el-icon-refresh" size="small" @click="getBaseModels" :loading="baseModelsLoading">刷新</el-button>
          </div>
          <ul class="group">
            <li class="modelItem flex-between" v-for="data,index in baseModels" :key="'base_'+index" draggable @dragstart="handleItemDragStart()" @dragend="handleModelDragEnd(data)">
              <span>{{index+1+'. '}}{{data.header?.graphName}}</span>
              <div class="item_rt">
                <el-checkbox v-if="dbcCreate" :value="selectModel=='base_'+index" @click.native.prevent="changeSelectModel('base_'+index)" title="勾选双击创建的组件"></el-checkbox>
              </div>
            </li>
          </ul>
          <div class="groupName flex-between">
            <span>导入组件</span>
            <el-button class="btn" type="text" icon="el-icon-refresh" size="small" @click="refreshUploadModels">刷新</el-button>
          </div>
          <ul class="group">
            <li class="modelItem flex-between" v-for="data,index in uploadModels" :key="'upload_'+index" draggable @dragstart="handleItemDragStart()" @dragend="handleModelDragEnd(data)">
              <span>{{index+1+'. '}}{{data.header?.graphName}}</span>
              <div class="item_rt">
                <div class="item_btns">
                  <el-button type="text" icon="el-icon-download" title="下载" @click="downloadUploadModel(data)"></el-button>
                  <el-button type="text" icon="el-icon-close" title="删除" @click="deleteUploadModel(index)"></el-button>
                </div>
                <el-checkbox v-if="dbcCreate" :value="selectModel=='upload_'+index" @click.native.prevent="changeSelectModel('upload_'+index)" title="勾选双击创建的组件"></el-checkbox>
              </div>
            </li>
          </ul>
          <el-upload class="uploader" drag action multiple :auto-upload="false" :show-file-list="false" accept=".json" :on-change="uploadModels_onChange">
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">
              将文件拖到此处，或
              <em>点击上传</em>
            </div>
          </el-upload>
        </div>
        <div class="bottomBtn" @click="leftDrawClose=!leftDrawClose">
          <i :class="leftDrawClose?'el-icon-s-unfold':'el-icon-s-fold'"></i>
        </div>
      </div>
      <div class="canvasWrap" @contextmenu.prevent>
        <div ref="canvasRef" id="canvas_dsp" @dragover="handleDragOverCanvas" @dragleave="handleDragLeaveCanvas"></div>
        <div class="operMenuWrap" v-show="operMenuVisible" @click="operMenuVisible=false" @contextmenu="operMenuVisible=false">
          <ul class="operMenu" :style="{top: operMenuTop+'px', left: operMenuLeft+'px'}" @contextmenu.prevent.stop @mousedown.stop>
            <li v-for="item,index in operMenuBtns" :key="index" :title="item.title" @click="item.handler" :style="item.style">
              <i :class="item.icon"></i>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import DspGraph from "@/graph/dspGraph.js";
import * as Cfg from "@/graph/graphConfig.js";
import * as Util from "@/graph/graphUtil.js";
export default {
  name: "test",
  data() {
    return {
      /**
       * 图谱实例
       * @type {DspGraph}
       */
      dspGraph: null,
      graphName: null,
      gridAlignment: true, // 是否网格对齐
      dbcCreate: true, // 是否双击创建
      // 抽屉start
      leftDrawW: 300, // 左边抽屉宽度
      leftDrawDragging: false, // 左边抽屉拖拽中
      leftDrawClose: false, // 关闭左侧菜单
      // 抽屉end
      // 右键菜单start
      operMenuVisible: false,
      operMenuTop: 0,
      operMenuLeft: 0,
      operMenuBtns: [], // {title,icon,color,handler}
      // 右键菜单end
      dragOverCanvas: false, // 是否拖拽进入画布
      dragX: null,
      dragY: null,
      // 基础节点
      nodeModels: Cfg.nodeModels,
      // 基础组件
      baseModelsLoading: false,
      baseModels: [],
      // 导入组件
      uploadModels: [],
      // 勾选组件
      selectModel: "node_1", // 默认选择四向
    };
  },
  watch: {
    gridAlignment(val) {
      this.dspGraph.gridAlignment = val;
    },
    graphName(val) {
      this.dspGraph.graphName = val;
    },
  },
  created() {
    this.getBaseModels();
    this.refreshUploadModels();
  },
  mounted() {
    const param = this.getUrlParams();
    let graphData;
    if (param._blank) {
      // 新建
      graphData = Util.getInitGraphData();
    } else {
      graphData = Util.getCacheGraphData() ?? Util.getInitGraphData(); // 优先获取缓存，没有则初始化
    }
    this.graphName = graphData.header.graphName;

    this.dspGraph = new DspGraph({
      graphName: this.graphName,
      graphData,
      canvasDOM: this.$refs.canvasRef,
      gridAlignment: this.gridAlignment,
      handleDblclick: this.handleDblclick,
      handleRclickNode: this.handleRclickNode,
      handleRclickSlot: this.handleRclickSlot,
    });
  },
  methods: {
    // 获取当前url参数
    getUrlParams() {
      const urlParams = new URLSearchParams(window.location.href.split("?")[1]);
      const params = {};
      for (let param of urlParams.entries()) {
        params[param[0]] = param[1];
      }
      return params;
    },
    // 新建
    newProject() {
      window.open("?_blank=1");
    },
    // 载入文件
    openFile_onChange(file) {
      Util.readFileToGraphData(file.raw)
        .then((graphData) => {
          this.$confirm("确定覆盖当前画布内容么?", "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning",
          })
            .then(() => {
              this.graphName = graphData.header.graphName;
              this.dspGraph.resetGraphData(graphData);
              Util._success("载入成功！");
            })
            .catch(() => {});
        })
        .catch((e) => {
          Util._warn("导入的JSON数据有误：" + e);
        });
    },
    // 导入组件
    uploadModels_onChange(file, fileList) {
      let len = fileList.length;
      Util.readFileToGraphData(file.raw)
        .then((graphData) => {
          this.addUploadModel(graphData);
        })
        .catch((e) => {
          Util._warn(`导入的JSON数据有误${len > 1 ? `[${file.name}](${len})` : ""}：` + e);
        });
    },
    addUploadModel(graphData) {
      if (!graphData) return;
      this.refreshUploadModels();
      graphData.header.graphName ??= Cfg.defaultGraphName;
      let idx = this.uploadModels.findIndex(
        (e) => e.header.graphName == graphData.header.graphName
      );
      if (idx != -1) {
        this.$confirm(`是否覆盖[${idx + 1}. ${graphData.header.graphName}]？`, "提示", {
          confirmButtonText: "确定",
          cancelButtonText: "取消",
          type: "warning",
        })
          .then(() => {
            this.uploadModels[idx] = graphData;
            this.cacheUploadModels();
            Util._success("导入组件成功！");
          })
          .catch(() => {});
      } else {
        this.uploadModels.push(graphData);
        this.cacheUploadModels();
        Util._success("导入组件成功！");
      }
    },
    deleteUploadModel(i) {
      let d = this.uploadModels[i];
      if (!d) return;
      this.$confirm(`确定要移除组件[${i + 1}. ${d.header?.graphName}]？`, "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          this.uploadModels.splice(i, 1);
          this.cacheUploadModels();
        })
        .catch(() => {});
    },
    downloadUploadModel(data) {
      Util.saveAsJson(data);
    },
    // 从localStorage获取更新导入组件
    refreshUploadModels() {
      let uploadModels = window.localStorage.getItem("uploadModels");
      if (uploadModels == null) return;
      try {
        uploadModels = JSON.parse(uploadModels);
        if (uploadModels instanceof Array) {
          this.uploadModels = uploadModels;
        }
      } catch (e) {
        // 解析数据失败
        console.error("解析缓存导入组件数据失败：" + e);
      }
    },
    // 将当前导入组件列表更新到localStorage
    cacheUploadModels() {
      try {
        if (this.uploadModels?.length > 0) {
          window.localStorage.setItem("uploadModels", JSON.stringify(this.uploadModels));
        } else {
          window.localStorage.setItem("uploadModels", null);
        }
      } catch (e) {
        // 缓存数据失败
        console.error("缓存导入组件数据失败：" + e);
      }
    },
    // 读取基础组件JSON
    getBaseModels() {
      if (this.baseModelsLoading) return;
      this.baseModelsLoading = true;
      fetch("/static/data/models.json")
        .then((response) => response.json())
        .then((data) => {
          this.baseModels = data;
        })
        .catch((e) => {
          this.$notify({
            title: "读取基础组件失败！",
            message: e,
            type: "warning",
          });
        })
        .finally(() => {
          this.baseModelsLoading = false;
        });
    },
    changeSelectModel(val) {
      if (this.selectModel != val) {
        this.selectModel = val;
      } else {
        this.selectModel = null;
      }
    },
    // 双击画布创建
    handleDblclick(event) {
      if (!this.dbcCreate || this.selectModel == null) return;
      let [type, index] = this.selectModel.split("_");
      let offset = [event.offsetX, event.offsetY];
      switch (type) {
        case "node": // 节点
          this.dspGraph.createNode(this.nodeModels[index].modelId, offset);
          break;
        case "base": // 基础组件
          this.dspGraph.appendGraphData(this.baseModels[index], offset);
          break;
        case "upload": // 导入组件
          this.dspGraph.appendGraphData(this.uploadModels[index], offset);
          break;
      }
    },
    // 右键菜单start
    handleCancelLink() {
      // 取消连接
      this.dspGraph.deleteEdge();
    },
    // 右键节点
    handleRclickNode(event, d) {
      this.dspGraph.handleSelectNode(d); // 选中节点
      this.operMenuBtns = [
        {
          title: "删除选中节点",
          icon: "el-icon-delete",
          style: `color:${Cfg.color.danger}`,
          handler: () => {
            this.dspGraph.handleDelete();
          },
        },
        {
          title: "置于顶层",
          icon: "el-icon-top",
          handler: () => {
            // 所有选中节点置于顶层
            const selectionNodeMap = this.dspGraph._selection.nodeMap;
            if (selectionNodeMap.size > 0) {
              this.dspGraph.nodesBringToFront(Array.from(selectionNodeMap.values()));
            }
          },
        },
        {
          title: "置于底层",
          icon: "el-icon-bottom",
          handler: () => {
            // 所有选中节点置于底层
            const selectionNodeMap = this.dspGraph._selection.nodeMap;
            if (selectionNodeMap.size > 0) {
              this.dspGraph.nodesSendToBack(Array.from(selectionNodeMap.values()));
            }
          },
        },
      ];
      this.showOperMenu(event.offsetX, event.offsetY);
    },
    // 右键插槽
    handleRclickSlot(event, d) {
      const node = this.dspGraph._nodeMap.get(d.nodeId);
      if (node.modelId === 2 || node.modelId === 3) {
        // 起终点没有插槽事件，代理到节点事件
        return this.handleRclickNode(event, node);
      }
      this.operMenuBtns = [];
      if (d.edge != null) {
        // 存在连接线
        this.operMenuBtns.push({
          title: "断开连接线",
          icon: "if-icon-unlink",
          style: `color:${Cfg.color.danger}`,
          handler: () => {
            this.dspGraph.deleteEdge(d.edge);
          },
        });
      }
      if (node.modelId === 0 || node.modelId === 1) {
        // 只有四向/流速器可调转输入输出口
        this.operMenuBtns.push({
          title: (d.dir === 1 ? "切换为输入口" : "切换为输出口") + "\n(快捷键：双击插槽)",
          icon: d.dir === 1 ? "el-icon-remove-outline" : "el-icon-circle-plus-outline",
          handler: () => {
            this.dspGraph.changeSlotDir(d);
          },
        });
      }
      if (node.modelId === 0) {
        // 四向
        this.operMenuBtns.push({
          title: d.priority === 1 ? "取消优先" : "设为优先",
          icon: d.priority === 1 ? "if-icon-un-priority" : "if-icon-priority",
          style: `color:${
            d.priority === 1
              ? "#aaa"
              : d.dir === 1
              ? Cfg.color.priorityOutStroke
              : Cfg.color.priorityInStroke
          }`,
          handler: () => {
            this.dspGraph.changeSlotPriority(d);
          },
        });
        if (d.priority === 1 && d.dir === 1) {
          // 优先输出接口
          Cfg.filterItem.forEach((item) => {
            this.operMenuBtns.push({
              title: "过滤" + item.name,
              icon: "el-icon-circle-plus",
              style: `color:${item.color};text-shadow:0 0 1px #5a5a5a`,
              handler: () => {
                this.dspGraph.changeSlotFilter(d, item.id);
              },
            });
          });
          if (d.filterId) {
            this.operMenuBtns.push({
              title: "取消过滤",
              icon: "el-icon-close",
              handler: () => {
                this.dspGraph.changeSlotFilter(d, null);
              },
            });
          }
        }
      }
      this.showOperMenu(event.offsetX, event.offsetY);
    },
    showOperMenu(offsetX, offsetY) {
      this.operMenuVisible = true;
      this.operMenuLeft = offsetX + 5;
      this.operMenuTop = offsetY + 5;
    },
    hideOperMenu() {
      this.operMenuVisible = false;
      this.operMenuBtns = [];
    },
    // 右键菜单end
    // 拖拽元素进入画布
    handleDragOverCanvas(e) {
      e.preventDefault(); // 解除默认的鼠标禁用标识
      // 记录拖拽坐标
      this.dragOverCanvas = true;
      this.dragX = e.offsetX;
      this.dragY = e.offsetY;
    },
    // 拖拽元素离开画布
    handleDragLeaveCanvas() {
      this.dragOverCanvas = false;
    },
    // 开始拖拽组件
    handleItemDragStart() {
      this.dragOverCanvas = false;
    },
    // 结束拖拽节点
    handleNodeDragEnd(modelId) {
      // 落在画布上
      if (this.dragOverCanvas) {
        // 创建节点
        this.dspGraph.createNode(modelId, [this.dragX, this.dragY]);
      }
    },
    // 结束拖拽模型
    handleModelDragEnd(data) {
      // 落在画布上
      if (this.dragOverCanvas) {
        // 创建模型
        this.dspGraph.appendGraphData(data, [this.dragX, this.dragY]);
      }
    },
    // 抽屉宽度拖拽start
    leftDraw_startDrag(e) {
      const minW = 150; // 最小拖拽宽度
      const maxW = this.$refs.mainRef.clientWidth * 0.7; // 最大拖拽宽度
      this.leftDrawDragging = true;
      // 鼠标按下，在原来页面上增加透明遮罩，防止部分元素例如iframe监听不到鼠标事件
      const mask = this.addMask();
      const oriW = this.leftDrawW;
      const oriX = e.clientX;
      document.body.onmousemove = (e) => {
        // 防抖
        e.preventDefault(); // 移动时禁用默认事件
        const dtX = e.clientX - oriX;
        this.leftDrawW = Math.min(maxW, Math.max(minW, oriW + dtX + 2));
      };
      document.body.onmouseup = () => {
        this.leftDrawDragging = false;
        document.body.removeChild(mask); // 移除mask遮罩
        document.body.onmousemove = null;
        document.body.onmouseup = null;
      };
    },
    addMask() {
      // 鼠标按下，在原来页面上增加透明遮罩，防止部分元素例如iframe监听不到鼠标事件
      const mask = document.createElement("div");
      mask.setAttribute(
        "style",
        "position:fixed;top:0px;bottom:0px;left:0px;right:0px;background:rgba(0,0,0,0)"
      );
      document.body.appendChild(mask);
      return mask;
    },
    // 抽屉宽度拖拽end
  },
};
</script>

<style lang="scss" scoped>
$borderColor: #a4acb9;
$barColor: $--color-primary-light-9;
$topBarH: 55px;
$bottomBarH: 50px; // 左侧抽屉顶部按钮高度
.main {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  .topBar {
    flex-shrink: 0;
    width: 100%;
    height: $topBarH;
    border-bottom: 1px solid $borderColor;
    background-color: $barColor;
    overflow: hidden;
    padding: 0 8px;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .lt {
      flex: 1;
      min-width: 100px;
      height: 100%;
      .btns {
        width: 100%;
        height: $topBarH;
        display: flex;
        align-items: center;
        .el-button {
          padding: 7px 10px;
          font-size: 20px;
        }
        .el-divider--vertical {
          margin: 0 8px;
        }
      }
    }
    .rt {
      flex-shrink: 0;
      height: 100%;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      .label {
        padding-left: 10px;
        font-size: 12px;
      }
      .ipt {
        width: 200px;
      }
    }
  }
  .content {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
    .leftDraw {
      flex-shrink: 0;
      height: 100%;
      border-right: 1px solid $borderColor;
      box-sizing: content-box;
      background-color: white;
      position: relative;
      z-index: 99;
      transition: width 0.3s ease;
      user-select: none;
      &.close {
        width: 0 !important;
        .bottomBtn {
          width: 40px;
          opacity: 0.5;
          border-radius: 0 10px 0 0;
          border-right: 1px solid $borderColor;
          &:hover {
            opacity: 1;
          }
        }
      }
      &.dragging {
        transition: unset;
      }
      .leftDraw_dragBar {
        position: absolute;
        z-index: 2;
        height: 100%;
        width: 4px;
        right: -2px;
        top: 0;
        cursor: e-resize;
      }
      .leftContent {
        width: 100%;
        height: 100%;
        padding: 0 10px calc(#{$bottomBarH} + 5px) 15px;
        box-sizing: border-box;
        position: absolute;
        right: 0;
        top: 0;
        overflow: auto;
        .flex-between {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
        }
        .groupHeader {
          line-height: 18px;
          font-size: 18px;
          margin: 15px 0;
        }
        .groupName {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          .btn {
            padding: 0;
          }
        }
        .group {
          list-style: none;
          margin-bottom: 10px;
          .modelItem {
            padding: 3px 5px;
            margin-left: 10px;
            font-size: 16px;
            line-height: 20px;
            min-height: 20px;
            &:hover {
              background: $barColor;
            }
            & + .modelItem {
              margin-top: 5px;
            }
            .item_rt {
              flex-shrink: 0;
              display: flex;
              align-items: center;
            }
            .item_btns {
              margin-right: 5px;
              opacity: 0.4;
              .el-button {
                padding: 0;
              }
            }
            &:hover .item_btns {
              opacity: 1;
            }
          }
        }
        .uploader {
          width: 100%;
          ::v-deep .el-upload {
            width: 100%;
          }
          ::v-deep .el-upload-dragger {
            width: 100%;
            height: 150px;
          }
        }
      }
      .bottomBtn {
        position: absolute;
        width: 100%;
        height: $bottomBarH;
        bottom: 0;
        left: 0;
        box-sizing: border-box;
        border-top: 1px solid $borderColor;
        background-color: $barColor;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        color: $--color-primary-dark;
        font-size: 25px;
        transition: width 0.3s ease, opacity 0.3s ease, border-radius 1s ease;
      }
    }
    .canvasWrap {
      flex: 1;
      min-width: 0;
      height: 100%;
      user-select: none;
      position: relative;
      #canvas_dsp {
        width: 100%;
        height: 100%;
      }
      .operMenuWrap {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 3;
        // overflow: hidden;
        .operMenu {
          margin: 0;
          position: absolute;
          list-style-type: none;
          padding: 5px;
          border-radius: 4px;
          max-width: 90px;
          box-sizing: content-box;
          display: flex;
          flex-wrap: wrap;
          border: 1px solid $borderColor;
          background: rgba(255, 255, 255, 0.8);
          li {
            width: 30px;
            height: 30px;
            margin: 0;
            line-height: 30px;
            font-size: 18px;
            text-align: center;
            overflow: hidden;
            border-radius: 4px;
            cursor: pointer;
            &:hover {
              background: #ecf5ff;
            }
          }
        }
      }
    }
  }
}
</style>