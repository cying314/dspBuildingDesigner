<template>
  <!-- 全局设置 -->
  <div class="globalSetting">
    <div class="divider">
      <hr />
      <span class="title">画布</span>
    </div>
    <div class="item">
      <div class="name">是否网格对齐：</div>
      <div class="form">
        <el-switch v-model="globalSetting.gridAlignment" active-color="#13ce66" inactive-color="#f56c6c" @change="dspGraph.refreshBg(true)"></el-switch>
      </div>
    </div>
    <div class="item" v-if="globalSetting.gridAlignment">
      <div class="name">是否显示网格线：</div>
      <div class="form">
        <el-switch v-model="globalSetting.showGridLine" active-color="#13ce66" inactive-color="#f56c6c" @change="dspGraph.refreshBg(true)"></el-switch>
      </div>
    </div>
    <div class="item">
      <div class="name">背景色：</div>
      <div class="form">
        <el-color-picker
          class="bgColorPicker"
          popper-class="bgColorPickerPopper"
          v-model="globalSetting.bgColor"
          size="mini"
          :predefine="['#FFFFFF', '#F6FAFF', '#FDFFF0', '#E2E8EF', '#7D7D7D', '#000000']"
          @change="dspGraph.refreshBg(true)"
        />
      </div>
    </div>
    <div class="item">
      <div class="name">连接线方向：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.linkDir" size="mini" @change="dspGraph.updateLinkDir()">
          <el-radio :label="0">
            <span>传送带方向</span>
          </el-radio>
          <el-radio :label="1" :title="`物品流动方向与信号方向相反，因此信号方向为倒置的传送带方向`">
            <span>信号方向</span>
            <i class="el-icon-question primary" style="margin-left:5px"></i>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="item">
      <div class="name">连接线模式：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.linkMode" size="mini" @change="dspGraph.updateLinkMode()">
          <el-radio :label="0">直线</el-radio>
          <el-radio :label="1">曲线</el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="item" v-if="globalSetting.linkMode==1">
      <div class="name">连接曲线曲率：</div>
      <div class="form">
        <el-slider style="width:250px" v-model="curvePointOffset" :min="0" :max="60" :step="1" :marks="{0:'0', 15:'15', 30: '30', 60:'60'}" @change="changeCurvePointOffset"></el-slider>
      </div>
    </div>
    <div class="divider">
      <hr />
      <span class="title">操作</span>
    </div>
    <div class="item">
      <div class="name" title="开启时，框选节点时设置传送带标记，将批量修改至所有选中节点">
        <span>批量设置图标：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-switch v-model="globalSetting.selectionSettingSignal" active-color="#13ce66" inactive-color="#f56c6c"></el-switch>
      </div>
    </div>
    <div class="item">
      <div class="name" title="开启时，框选节点时设置标记数，将批量修改至所有选中节点">
        <span>批量设置标记数：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-radio-group v-model="globalSetting.selectionSettingCount" size="mini">
          <el-radio :label="0">
            <span>关</span>
          </el-radio>
          <el-radio :label="1">
            <span>复制编号</span>
          </el-radio>
          <el-radio :label="2" :title="`根据选中节点次序自动编号`">
            <span>自动编号</span>
            <i class="el-icon-question primary" style="margin-left:5px"></i>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="item">
      <div class="name" title="开启时，框选节点时设置物品(颜色)，将批量修改至所有选中节点">
        <span>批量设置物品(颜色)：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-radio-group v-model="globalSetting.selectionSettingItemId" size="mini">
          <el-radio :label="0">
            <span>关</span>
          </el-radio>
          <el-radio :label="1">
            <span>同色替换</span>
          </el-radio>
          <el-radio :label="2">
            <span>全部替换</span>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="divider">
      <hr />
      <span class="title">蓝图生成</span>
    </div>
    <BlueprintSetting />
    <div class="divider">
      <hr />
      <span class="title">工程导出</span>
    </div>
    <div class="item">
      <div class="name" :title="`导出JSON工程文件时，剔除未引用的封装模块、画布位置、布局配置等信息\n*用于导出纯粹的模块组件数据`">
        <span>简化导出JSON数据：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-switch v-model="globalSetting.reducedData" active-color="#13ce66" inactive-color="#f56c6c"></el-switch>
      </div>
    </div>
  </div>
</template>

<script>
import DspGraph from "@/graph/dspGraph.js";
import * as Cfg from "@/graph/graphConfig.js";
import BlueprintSetting from "@/components/BlueprintSetting.vue";
export default {
  name: "GlobalSetting",
  components: {
    BlueprintSetting,
  },
  props: {
    /**
     * 图谱实例
     */
    dspGraph: {
      type: DspGraph,
    },
  },
  data() {
    return {
      globalSetting: Cfg.globalSetting,
      curvePointOffset: Cfg.globalSetting.curvePointOffset,
      curvePointOffsetTimer: null,
    };
  },
  methods: {
    changeCurvePointOffset(val) {
      // 曲线曲率调整 防抖
      clearTimeout(this.curvePointOffsetTimer);
      this.curvePointOffsetTimer = setTimeout(() => {
        this.globalSetting.curvePointOffset = val;
        this.dspGraph.updateLinkMode();
      }, 300);
    },
  },
};
</script>

<style lang="scss" scoped>
.globalSetting {
  .item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    .name {
      white-space: nowrap;
      flex-shrink: 0;
    }
  }
  .item + .item {
    margin-top: 15px;
  }
  .divider {
    position: relative;
    hr {
      margin-top: 20px;
      margin-bottom: 15px;
      opacity: 0.2;
    }
    .title {
      position: absolute;
      background-color: #fff;
      padding: 0 10px;
      font-weight: 500;
      color: #888;
      font-size: 12px;
      top: 50%;
      left: 10px;
      transform: translate(0, -50%);
    }
  }
  .el-slider ::v-deep .el-slider__marks .el-slider__marks-text {
    white-space: nowrap;
    font-size: 12px;
  }
  .primary {
    color: $--color-primary;
  }
  .danger {
    color: $--color-danger;
  }
}
.bgColorPicker {
  vertical-align: bottom;
  ::v-deep .el-color-picker__trigger {
    width: 80px;
  }
}
</style>

<style lang="scss">
.bgColorPickerPopper {
  .el-color-predefine__color-selector {
    border: 1px solid #ccc;
  }
}
</style>