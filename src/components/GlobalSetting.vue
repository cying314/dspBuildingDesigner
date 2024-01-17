<template>
  <!-- 全局设置 -->
  <div class="globalSetting">
    <div class="item">
      <div class="name">是否网格对齐：</div>
      <div class="form">
        <el-switch v-model="globalSetting.gridAlignment" active-color="#13ce66" inactive-color="#f56c6c"></el-switch>
      </div>
    </div>
    <div class="item">
      <div class="name">蓝图生成模式：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.generateMode" size="mini">
          <el-radio :label="0" :title="`使用分拣器进行无带流连接\n*需先提前粘贴分拣器，再在同位置粘贴完整蓝图`">
            无带流(分拣器)
            <i class="el-icon-question primary"></i>
          </el-radio>
          <el-radio :label="1" :title="`直连传送带节点\n*需使用mod进行蓝图强制粘贴`">
            传送带直连
            <i class="if-icon-un-priority danger"></i>
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
import * as Cfg from "@/graph/graphConfig.js";
export default {
  name: "GlobalSetting",
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
</style>