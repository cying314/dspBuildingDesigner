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
            <el-button type="primary" icon="if-icon-save" title="保存到浏览器缓存(Ctrl+S)" @click="dspGraph.handleSave()"></el-button>
            <el-button type="primary" icon="if-icon-json" title="导出工程为JSON文件(Ctrl+D)" @click="dspGraph.handleSaveAsJson()"></el-button>
            <el-button type="primary" icon="if-icon-blueprint" title="导出蓝图(Ctrl+B)" @click="dspGraph.handleGenerateBlueprint()"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="if-icon-undo" title="撤回(Ctrl+Z)" :disabled="!(dspGraph?._undoList?.length>1)" @click="dspGraph.handleUndo()"></el-button>
            <el-button type="primary" icon="if-icon-redo" title="重做(Ctrl+Shift+Z)" :disabled="!(dspGraph?._redoList?.length>0)" @click="dspGraph.handleRedo()"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="el-icon-document-copy" title="复制(Ctrl+C)" @click="dspGraph.handleCopy()"></el-button>
            <el-button type="primary" icon="if-icon-paste" title="粘贴(Ctrl+V)" @click="dspGraph.handlePaste()"></el-button>
            <el-button type="primary" icon="el-icon-scissors" title="剪切(Ctrl+X)" @click="dspGraph.handleCut()"></el-button>
            <el-button type="primary" icon="el-icon-delete" title="删除(Delete)" @click="dspGraph.handleDelete()"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="el-icon-setting" title="全局设置" @click="showGlobalSetting=true"></el-button>
            <el-button type="primary" icon="el-icon-question" title="工具说明" @click="showTips=true"></el-button>
            <el-divider direction="vertical"></el-divider>
            <el-button type="primary" icon="el-icon-location-information" title="重置画布定位" @click="dspGraph.resetPosition(true)"></el-button>
            <el-button
              type="primary"
              icon="if-icon-grid"
              :key="globalSetting.gridAlignment?'on':'off'"
              :title="(globalSetting.gridAlignment?'取消':'')+'网格对齐'"
              :plain="globalSetting.gridAlignment"
              @click="globalSetting.gridAlignment=!globalSetting.gridAlignment,dspGraph.refreshBg(true)"
            ></el-button>
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
            <li class="modelItem" v-for="node,index in nodeModels" :key="'node_'+index" draggable @dragstart="handleItemDragStart()" @dragend="handleNodeDragEnd(node.modelId)" title="拖拽创建组件">
              <span>
                <i style="margin-right:10px" :class="node.icon"></i>
                <span>{{node.name}}</span>
              </span>
              <div class="item_rt">
                <el-checkbox v-if="dbcCreate" :value="selectModelType=='node'&&selectModel==node" @click.native.prevent="changeSelectModel('node',node)" title="勾选双击创建的组件"></el-checkbox>
              </div>
            </li>
          </ul>
          <template v-if="dspGraph && dspGraph.packageMap.size > 0">
            <div class="groupName flex-between" :title="`当前项目依赖到的所有封装模块\n这些模块将随着当前工程保存`">
              <span>
                <span>当前封装模块</span>
                <i class="if-icon-un-priority" style="margin-left:5px;color:var(--color-warning)"></i>
              </span>
              <el-button class="btn" type="text" :icon="packageExpand?'el-icon-arrow-up':'el-icon-arrow-down'" size="small" @click="packageExpand = !packageExpand">{{packageExpand?'折叠':'展开'}}</el-button>
            </div>
            <transition name="expandTrans">
              <ul class="group" v-show="packageExpand">
                <li
                  class="modelItem"
                  v-for="data,index in dspGraph.packageMap"
                  :key="'package_'+data[0]"
                  draggable
                  @dragstart="handleItemDragStart()"
                  @dragend="handleNodeDragEnd(packageModelId, data[0])"
                >
                  <span>
                    <i style="margin-right:10px" class="el-icon-box"></i>
                    <span>{{index+1+'. '}}{{data[1].name}}</span>
                  </span>
                  <div class="item_rt">
                    <div class="item_btns">
                      <el-button type="text" icon="el-icon-close" title="删除" @click="dspGraph.handleDeletePackage(data[1])"></el-button>
                    </div>
                    <el-checkbox v-if="dbcCreate" :value="selectModelType=='package'&&selectModel==data[0]" @click.native.prevent="changeSelectModel('package',data[0])" title="勾选双击创建的组件"></el-checkbox>
                  </div>
                </li>
              </ul>
            </transition>
          </template>
          <div class="groupName flex-between">
            <span :title="`作者提供的一些基础组件，将不定期更新\n欢迎联系作者提供优秀组件`">
              <span>基础组件</span>
              <i class="el-icon-question" style="margin-left:5px"></i>
            </span>
            <div class="btns">
              <el-button class="btn" type="text" :icon="baseExpand?'el-icon-arrow-up':'el-icon-arrow-down'" size="small" @click="baseExpand = !baseExpand">{{baseExpand?'折叠':'展开'}}</el-button>
              <el-button class="btn" type="text" icon="el-icon-refresh" size="small" @click="getBaseModels(true)" :loading="baseModelsLoading">刷新</el-button>
            </div>
          </div>
          <transition name="expandTrans">
            <BaseModelList
              v-show="baseExpand"
              :dbcCreate="dbcCreate"
              :selectModelType="selectModelType"
              :selectModel="selectModel"
              :baseModels="baseModels"
              @handleItemDragStart="handleItemDragStart"
              @handleModelDragEnd="handleModelDragEnd"
              @changeSelectModel="changeSelectModel"
            ></BaseModelList>
          </transition>
          <div class="groupName flex-between">
            <span title="将工程文件导出为JSON后，即可导入为组件">
              <span>导入组件</span>
              <i class="el-icon-question" style="margin-left:5px"></i>
            </span>
            <div class="btns">
              <el-button class="btn" type="text" :icon="uploadExpand?'el-icon-arrow-up':'el-icon-arrow-down'" size="small" @click="uploadExpand = !uploadExpand">{{uploadExpand?'折叠':'展开'}}</el-button>
              <el-button class="btn" type="text" icon="el-icon-refresh" size="small" @click="refreshUploadModels">刷新</el-button>
            </div>
          </div>
          <transition name="expandTrans">
            <ul class="group" v-show="uploadExpand">
              <li class="modelItem" v-for="data,index in uploadModels" :key="'upload_'+index" draggable @dragstart="handleItemDragStart()" @dragend="handleModelDragEnd(data)">
                <span>{{index+1+'. '}}{{data.header?.graphName}}</span>
                <div class="item_rt">
                  <div class="item_btns">
                    <el-button type="text" icon="el-icon-download" title="下载" @click="downloadUploadModel(data)"></el-button>
                    <el-button type="text" icon="el-icon-close" title="删除" @click="deleteUploadModel(index)"></el-button>
                  </div>
                  <el-checkbox v-if="dbcCreate" :value="selectModelType=='upload'&&selectModel==data" @click.native.prevent="changeSelectModel('upload',data)" title="勾选双击创建的组件"></el-checkbox>
                </div>
              </li>
            </ul>
          </transition>
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
          <ul class="operMenu" :style="{top: operMenuTop+'px', left: operMenuLeft+'px', maxWidth: operMenuBtns.length>9?'150px':'90px'}" @contextmenu.prevent.stop @mousedown.stop>
            <li v-for="item,index in operMenuBtns" :key="index" :title="item.title" @click="item.handler" :style="item.style">
              <img v-if="item.image" :src="item.image" />
              <i v-else :class="item.icon"></i>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <!-- 生成布局调整 -->
    <el-dialog title="生成布局调整" custom-class="layoutSettingDialog" :visible.sync="showLayoutSetting" width="700px" top="5vh" v-dialogDrag>
      <LayoutSetting ref="layoutSettingRef" v-if="showLayoutSetting">
        <el-button size="small" @click="showLayoutSetting = false">关 闭</el-button>
        <el-button size="small" @click="$refs.layoutSettingRef.resetLayout()">重置布局</el-button>
        <el-button size="small" type="primary" @click="generateBlueprintDone">生 成</el-button>
      </LayoutSetting>
    </el-dialog>
    <!-- 生成蓝图结果 -->
    <el-dialog title="生成蓝图成功" custom-class="blueprintResDialog" :visible.sync="showBlueprintRes" width="500px" top="25vh" :before-close="closeBlueprintRes" v-dialogDrag>
      <template v-if="blueprintRes">
        <div class="hint" v-if="globalSetting.generateMode===0">
          <i class="if-icon-un-priority danger" style="margin-right:5px"></i>
          <span>无带流蓝图需先粘贴</span>
          <span style="text-decoration: underline;">分拣器蓝图</span>
          <span>后，再在同位置粘贴</span>
          <span style="text-decoration: underline">完整蓝图</span>
          <i class="if-icon-un-priority danger" style="margin-left:5px"></i>
        </div>
        <div class="hint" v-else-if="globalSetting.generateMode===1">
          <i class="if-icon-un-priority danger" style="margin-right:5px"></i>
          <span>该蓝图存在传送带与建筑碰撞，请使用mod进行蓝图强制粘贴</span>
          <i class="if-icon-un-priority danger" style="margin-left:5px"></i>
        </div>
        <div class="item" v-if="globalSetting.generateMode===0 && blueprintRes.txt_onlyEdge">
          <div class="btnsWrap">
            <div class="title">1、分拣器蓝图：</div>
            <div class="btns">
              <el-button type="primary" icon="el-icon-document-copy" size="small" plain @click="copyBlueprint(blueprintRes.txt_onlyEdge, $refs.txtOnlyEdgeRef)">复制到剪贴板</el-button>
              <el-button type="primary" icon="el-icon-download" size="small" @click="downloadBlueprint(blueprintRes.txt_onlyEdge, blueprintRes.name+'_分拣器蓝图')">下载蓝图文件</el-button>
            </div>
          </div>
          <div class="textarea">
            <el-input type="textarea" v-model="blueprintRes.txt_onlyEdge" :rows="3" readonly ref="txtOnlyEdgeRef"></el-input>
          </div>
        </div>
        <div class="item">
          <div class="btnsWrap">
            <div class="title" v-if="globalSetting.generateMode===0 && blueprintRes.txt_onlyEdge">2、完整蓝图：</div>
            <div class="btns">
              <el-button type="primary" icon="el-icon-document-copy" size="small" plain @click="copyBlueprint(blueprintRes.txt, $refs.txtRef)">复制到剪贴板</el-button>
              <el-button type="primary" icon="el-icon-download" size="small" @click="downloadBlueprint(blueprintRes.txt, blueprintRes.name)">下载蓝图文件</el-button>
            </div>
          </div>
          <div class="textarea">
            <el-input type="textarea" v-model="blueprintRes.txt" :rows="3" readonly ref="txtRef"></el-input>
          </div>
        </div>
      </template>
    </el-dialog>
    <!-- 全局设置 -->
    <el-dialog title="全局设置" custom-class="globalSettingDialog" :visible.sync="showGlobalSetting" width="500px" v-dialogDrag>
      <GlobalSetting ref="layoutSettingRef" v-if="showGlobalSetting" :dspGraph="dspGraph">
        <el-button size="small" @click="showGlobalSetting = false">关 闭</el-button>
      </GlobalSetting>
    </el-dialog>
    <!-- 工具说明 -->
    <el-dialog title="工具说明" custom-class="tipsDialog" :visible.sync="showTips" width="700px" v-dialogDrag>
      <Tips ref="layoutSettingRef" v-if="showTips">
        <el-button size="small" @click="showTips = false">关 闭</el-button>
      </Tips>
    </el-dialog>
  </div>
</template>

<script>
import DspGraph from "@/graph/dspGraph.js";
import * as Cfg from "@/graph/graphConfig.js";
import * as Util from "@/graph/graphUtil.js";
import * as ItemsUtil from "@/utils/itemsUtil.js";
import LayoutSetting from "@/components/LayoutSetting.vue";
import GlobalSetting from "@/components/GlobalSetting.vue";
import Tips from "@/components/Tips.vue";
import BaseModelList from "@/components/BaseModelList.vue";
/**
 * @typedef {import("../graph/dataMapper.js").GraphData} GraphData
 * @typedef {Object} BaseModel 基础组件对象
 * @property {boolean} isGroup - 是否子目录
 * @property {string} name - 名称
 * @property {BaseModel[]} list - 目录内容列表（isGroup为true）
 * @property {boolean} expand - 是否展开（isGroup为true）
 * @property {GraphData} data - 图谱持久化数据（isGroup为false）
 */
export default {
  name: "Designer",
  components: {
    LayoutSetting,
    GlobalSetting,
    Tips,
    BaseModelList,
  },
  data() {
    return {
      /**
       * 图谱实例
       * @type {DspGraph}
       */
      dspGraph: null,
      graphName: null,
      dbcCreate: true, // 是否双击创建
      globalSetting: Cfg.globalSetting, // 全局设置
      showGlobalSetting: false,
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
      /**
       * @type {BaseModel[]} 基础组件对象列表
       */
      baseModels: [],
      baseExpand: true,
      // 封装模块
      packageModelId: Cfg.ModelId.package,
      packageExpand: true,
      // 导入组件
      uploadModels: [],
      uploadExpand: true,
      // 勾选组件
      selectModelType: "node",
      selectModel: Cfg.nodeModels[1], // 默认选择四向
      // 生成布局调整
      showLayoutSetting: false,
      // 生成蓝图
      showBlueprintRes: false,
      blueprintRes: null,
      // 工具说明
      showTips: false,
    };
  },
  watch: {
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
      // 更新路由，去掉新建参数标识
      window.history.replaceState({}, "", window.location.origin + window.location.pathname);
    } else {
      graphData = Util.getCacheGraphData() ?? Util.getInitGraphData(); // 优先获取缓存，没有则初始化
    }
    this.graphName = graphData.header.graphName;

    this.dspGraph = new DspGraph({
      graphName: this.graphName,
      graphData,
      canvasDOM: this.$refs.canvasRef,
      handleDblclick: this.handleDblclick,
      handleRclickNode: this.handleRclickNode,
      handleRclickSlot: this.handleRclickSlot,
      beforeGenerateBlueprint: this.beforeGenerateBlueprint,
    });
  },
  methods: {
    closeBlueprintRes(done) {
      this.$confirm("确定关闭生成结果么?", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(() => {
          this.showBlueprintRes = false;
          done();
        })
        .catch(() => {});
    },
    // 复制蓝图
    async copyBlueprint(txt, textRef) {
      if (txt == null) {
        return Util._warn("请先生成数据！");
      }
      if (textRef == null) {
        return Util._warn("复制失败！");
      }
      textRef.select(); // 聚焦元素才可复制
      let errMsg;
      const Clipboard = navigator?.clipboard;
      if (Clipboard) {
        try {
          await Clipboard.writeText(txt);
          return Util._success(`已将蓝图复制到剪贴板！`);
        } catch (e) {
          errMsg = "未授权复制权限";
        }
      } else {
        errMsg = "浏览器不支持复制";
      }
      try {
        // 降级尝试使用execCommand复制
        document.execCommand("copy");
        Util._success(`已将蓝图复制到剪贴板！`);
      } catch (e) {
        Util._warn(errMsg);
      }
    },
    // 下载蓝图
    downloadBlueprint(txt, fileName) {
      Util.saveAsTxt(txt, fileName, "txt");
    },
    // 生成蓝图
    generateBlueprintDone() {
      let blueprintRes = this.dspGraph.generateBlueprint();
      if (blueprintRes) {
        this.blueprintRes = blueprintRes;
        this.showBlueprintRes = true;
        // this.showLayoutSetting = false;
      }
    },
    // 生成蓝图事件前置调用
    beforeGenerateBlueprint() {
      this.showLayoutSetting = true;
    },
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
              // 初始化撤回、重做记录
              this.dspGraph._redoList = [];
              this.dspGraph._undoList = [graphData];
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
      Util.saveGraphDataAsJson(data);
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
    getBaseModels(refresh) {
      if (this.baseModelsLoading) return;
      this.baseModelsLoading = true;
      let headers = {};
      if (refresh) {
        // 忽略缓存，强制刷新
        headers["Cache-Control"] = "no-cache";
      }
      this.baseModels = [];
      // 获取基础组件配置
      fetch("./static/data/baseModelsConfig.json", {
        method: "GET",
        headers: headers,
      })
        .then((response) => response.json())
        .then((configList) => {
          // 深度优先遍历基础组件配置，依次获取基础组件
          let p = Promise.resolve();
          this.fetchBaseModels(headers, this.baseModels, configList).forEach((fetchBind) => {
            p = p.then(fetchBind);
          });
          p.finally(() => {
            this.baseModelsLoading = false;
          });
        })
        .catch(() => {
          Util._err(`读取基础组件配置失败！`);
          this.baseModelsLoading = false;
        });
    },
    /**
     * 深度优先遍历基础组件配置，依次获取基础组件
     * @param {Object} headers 请求头
     * @param {BaseModel[]} targetModelList 组件目录列表
     * @param {Array} configList 基础组件配置列表
     * @param {(()=>Promise)[]} fetchBindList 异步方法句柄
     */
    fetchBaseModels(headers, targetModelList, configList, fetchBindList = []) {
      if (!configList) return fetchBindList;
      for (let config of configList) {
        // 深度优先，依次获取
        if (config.isGroup) {
          let subList = [];
          fetchBindList.push(() => {
            // 异步创建子列表
            return new Promise((resolve) => {
              targetModelList.push({
                isGroup: true,
                expand: !!config.expand,
                name: config.name,
                list: subList,
                tip: config.tip,
              });
              resolve();
            });
          });
          this.fetchBaseModels(headers, subList, config.list ?? [], fetchBindList);
        } else {
          fetchBindList.push(() =>
            fetch(config.path, {
              method: "GET",
              headers: headers,
            })
              .then((response) => response.json())
              .then((data) => {
                targetModelList.push({
                  isGroup: false,
                  name: config.name,
                  data: data,
                  tip: config.tip,
                });
              })
              .catch(() => {
                Util._err(`读取基础组件[${config.name}]失败！`);
              })
          );
        }
      }
      return fetchBindList;
    },
    changeSelectModel(type, val) {
      if (this.selectModelType == type && this.selectModel == val) {
        this.selectModelType = null;
        this.selectModel = null;
      } else {
        this.selectModelType = type;
        this.selectModel = val;
      }
    },
    // 双击画布创建
    handleDblclick(event) {
      if (!this.dbcCreate || this.selectModelType == null || this.selectModel == null) return;
      let offset = [event.offsetX, event.offsetY];
      switch (this.selectModelType) {
        case "node": // 节点
          this.dspGraph.createNode(this.selectModel.modelId, offset);
          break;
        case "package": // 封装模块
          if (!this.dspGraph.packageMap.has(this.selectModel)) return;
          this.dspGraph.createNode(Cfg.ModelId.package, offset, this.selectModel);
          break;
        case "base": // 基础组件
          this.dspGraph.appendGraphData(this.selectModel, offset);
          break;
        case "upload": // 导入组件
          this.dspGraph.appendGraphData(this.selectModel, offset);
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
      const modelId = d.modelId;
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
            this.dspGraph.handleSelectionBringToFront();
          },
        },
        {
          title: "置于底层",
          icon: "el-icon-bottom",
          handler: () => {
            // 所有选中节点置于底层
            this.dspGraph.handleSelectionSendToBack();
          },
        },
      ];
      if (this.dspGraph._selection.nodeMap.size > 1) {
        // 选中多个节点
        this.operMenuBtns.push({
          title: "组合封装选中节点",
          icon: "el-icon-box",
          handler: () => {
            // 组合封装选中节点
            this.dspGraph.handlePackageComponent();
          },
        });
      }
      if (modelId === Cfg.ModelId.fdir) {
        // 选中四向
        this.operMenuBtns.push({
          title: "左旋转90°",
          icon: "el-icon-refresh-left",
          handler: () => {
            this.dspGraph.transformFdirSlot(d, 0);
          },
        });
        this.operMenuBtns.push({
          title: "右旋转90°",
          icon: "el-icon-refresh-right",
          handler: () => {
            this.dspGraph.transformFdirSlot(d, 1);
          },
        });
        this.operMenuBtns.push({
          title: "垂直翻转",
          icon: "if-icon-vert-flip",
          handler: () => {
            this.dspGraph.transformFdirSlot(d, 2);
          },
        });
        this.operMenuBtns.push({
          title: "水平翻转",
          icon: "if-icon-hori-flip",
          handler: () => {
            this.dspGraph.transformFdirSlot(d, 3);
          },
        });
      } else if (modelId === Cfg.ModelId.package) {
        // 选中封装模块
        this.operMenuBtns.push({
          title: "展开封装模块",
          icon: "el-icon-files",
          handler: () => {
            // 组合封装选中节点
            this.dspGraph.unfoldPackage(d);
          },
        });
      }
      if ([Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) {
        // 流速器、信号输出、信号输入 切换生成/消耗物品id
        const dir = d.slots[0]?.dir ?? 1;
        let tag = dir == 1 ? "生成" : "消耗";
        this.operMenuBtns.push({
          title: "切换" + tag + "物品",
          icon: "el-icon-help",
          handler: (event) => {
            // 阻止关闭窗口
            event.stopPropagation();
            // 切换菜单选项为物品列表
            this.operMenuBtns = [];
            Cfg.filterItem.forEach((item) => {
              this.operMenuBtns.push({
                title: (dir == 1 ? "生成" : "消耗") + item.name,
                image: ItemsUtil.getItemImage(item.id),
                style: d.itemId === item.id ? "border:2px solid #80a7dd" : null,
                handler: () => {
                  this.dspGraph.changeNodeItemId(d, item.id);
                },
              });
            });
          },
        });
      }
      if ([Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) {
        // 信号输出、信号输入 切换传送带标记图标id
        this.operMenuBtns.push({
          title: "切换传送带标记",
          icon: "el-icon-info",
          handler: (event) => {
            // 阻止关闭窗口
            event.stopPropagation();
            // 切换菜单选项为物品列表
            this.operMenuBtns = [];
            Cfg.signalIds.forEach((signalId) => {
              this.operMenuBtns.push({
                title: "切换标记",
                image: ItemsUtil.getSignalImage(signalId),
                style: d.signalId === signalId ? "border:2px solid #80a7dd" : null,
                handler: () => {
                  this.dspGraph.changeNodeSignalId(d, signalId);
                },
              });
            });
            if (d.signalId) {
              this.operMenuBtns.push({
                title: "取消标记",
                icon: "el-icon-close",
                handler: () => {
                  this.dspGraph.changeNodeSignalId(d, null);
                },
              });
            }
          },
        });
        // 信号输出、信号输入 更改传送带标记数
        this.operMenuBtns.push({
          title: "更改传送带标记数\n生成的输入输出口将根据标记数升序排列",
          icon: "if-icon-count",
          handler: () => {
            this.dspGraph.handleChangeNodeCount(d);
          },
        });
      }
      if (
        [Cfg.ModelId.text, Cfg.ModelId.output, Cfg.ModelId.input, Cfg.ModelId.package].includes(
          modelId
        )
      ) {
        // 普通文本、信号输出、信号输入、封装模块 切换节点文本
        this.operMenuBtns.push({
          title: "更改节点文本描述",
          icon: "if-icon-textarea",
          handler: () => {
            this.dspGraph.handleChangeNodeText(d);
          },
        });
      }
      if (this.operMenuBtns.length > 0) {
        // 有操作按钮才打开
        this.showOperMenu(event.offsetX, event.offsetY);
      }
    },
    // 右键插槽
    handleRclickSlot(event, d) {
      const modelId = d.node.modelId;
      // if (modelId === Cfg.ModelId.output || modelId === Cfg.ModelId.input) {
      //   // 信号输出、信号输入没有插槽事件，代理到节点事件
      //   return this.handleRclickNode(event, d.node);
      // }
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
      if (
        [Cfg.ModelId.fdir, Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(
          modelId
        )
      ) {
        // 只有四向、流速器、信号输出、信号输入 可调转输入输出口
        this.operMenuBtns.push({
          title: (d.dir === 1 ? "切换为输入口" : "切换为输出口") + "\n(快捷键：双击插槽)",
          icon: d.dir === 1 ? "el-icon-remove-outline" : "el-icon-circle-plus-outline",
          handler: () => {
            this.dspGraph.changeSlotDir(d);
          },
        });
      }
      if (modelId === Cfg.ModelId.fdir) {
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
              // icon: "el-icon-circle-plus",
              // style: `color:${item.color};text-shadow:0 0 1px #5a5a5a`,
              image: ItemsUtil.getItemImage(item.id),
              style: d.filterId === item.id ? "border:2px solid #80a7dd" : null,
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
      if (this.operMenuBtns.length > 0) {
        // 有操作按钮才打开
        this.showOperMenu(event.offsetX, event.offsetY);
      } else {
        // 没有插槽按钮，映射到节点右键事件
        this.handleRclickNode(event, d.node);
      }
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
    handleNodeDragEnd(modelId, packageHash) {
      // 落在画布上
      if (this.dragOverCanvas) {
        // 创建节点
        try {
          this.dspGraph.createNode(modelId, [this.dragX, this.dragY], packageHash);
        } catch {
          //
        }
      }
    },
    // 结束拖拽模型
    handleModelDragEnd(data) {
      // 落在画布上
      if (this.dragOverCanvas) {
        // 创建模型
        try {
          this.dspGraph.appendGraphData(data, [this.dragX, this.dragY]);
          this.dspGraph._canvasDOM.focus(); // 获取画布焦点
        } catch {
          //
        }
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
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            cursor: grab;
            &:hover {
              background: $barColor;
            }
            & + .modelItem {
              margin-top: 5px;
            }
            .item_rt {
              flex-shrink: 0;
              margin-left: auto;
              display: flex;
              align-items: center;
            }
            .item_btns {
              opacity: 0.4;
              .el-button {
                padding: 0;
              }
            }
            &:hover .item_btns {
              opacity: 1;
            }
            .item_btns + .el-checkbox {
              margin-left: 5px;
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
        z-index: 99;
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
        outline: none; // 去除聚焦边框
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
            box-sizing: border-box;
            &:hover {
              background: #ecf5ff;
            }
            img {
              width: 100%;
              height: 100%;
              transform: scale(0.8);
              transform-origin: center;
              background: #ced6e1;
              border-radius: 5px;
            }
          }
        }
      }
    }
  }
}
</style>

<style lang="scss">
.layoutSettingDialog {
  .el-dialog__body {
    padding-top: 10px;
  }
}
.globalSettingDialog {
  .el-dialog__body {
    padding-bottom: 15px;
  }
}
.tipsDialog {
  .el-dialog__body {
    padding-top: 0;
    padding-bottom: 15px;
  }
}
.blueprintResDialog {
  .hint {
    font-size: 14px;
    color: $--color-warning;
    margin-bottom: 10px;
  }
  .item {
    .btnsWrap {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .title {
        width: 140px;
        font-size: 14px;
        margin-bottom: 5px;
      }
    }
    .btns {
      flex: 1;
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    .textarea {
      margin-top: 10px;
    }
  }
  .item + .item {
    margin-top: 20px;
  }
}
</style>

<style>
/* 展开动画 */
.expandTrans-enter-active {
  animation: move 0.3s;
}

/* 折叠动画 */
.expandTrans-leave-active {
  animation: move 0.15s reverse;
}

@keyframes move {
  from {
    transform-origin: top;
    transform: scaleY(0.5);
    opacity: 0;
  }
  to {
    transform-origin: top;
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>