<template>
  <!-- 全局设置 -->
  <div class="globalSetting">
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
      <div class="name">蓝图生成模式：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.generateMode" size="mini">
          <el-radio :label="0" :title="`使用分拣器进行无带流连接\n*需先提前粘贴分拣器，再在同位置粘贴完整蓝图\n*蓝图粘贴时请尽量使用[沙盒瞬间建造]`">
            <span>无带流(分拣器)</span>
            <i class="el-icon-question primary" style="margin-left:5px"></i>
          </el-radio>
          <el-radio :label="1" :title="`直连传送带节点\n*需使用mod进行蓝图强制粘贴`">
            <span>传送带直连</span>
            <i class="if-icon-un-priority danger" style="margin-left:5px"></i>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="item">
      <div class="name">连接线方向：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.linkMode" size="mini" @change="dspGraph.updateLinkMode()">
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
            <span>批量复制</span>
          </el-radio>
          <el-radio :label="2" :title="`根据选中节点次序自动编号`">
            <span>自动排序</span>
            <i class="el-icon-question primary" style="margin-left:5px"></i>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="bottomBtns">
      <slot></slot>
    </div>
  </div>
</template>

<script>
import DspGraph from "@/graph/dspGraph.js";
import * as Cfg from "@/graph/graphConfig.js";
export default {
  name: "GlobalSetting",
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
    };
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
  .bottomBtns {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
  .primary {
    color: $--color-primary;
  }
  .danger {
    color: $--color-danger;
  }
}
.bgColorPicker {
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