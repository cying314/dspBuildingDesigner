<template>
  <div class="blueprintSetting">
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
      <div class="name">建筑布局模式：</div>
      <div class="form">
        <el-radio-group v-model="globalSetting.layoutMode" size="mini">
          <el-radio :label="0" :title="`从原点开始，优先填充层，再沿水平方向往外扩散填充。例：\n1  2  5 10\n3  4  6 11\n7  8  9 12`">
            <span>原点扩散</span>
          </el-radio>
          <el-radio :label="1" :title="`从原点开始，按层、行、列优先级依次填充，直至铺满区域。例：\n1  2  3  4\n5  6  7  8\n9 10 11 12`">
            <span>逐行铺满</span>
          </el-radio>
        </el-radio-group>
      </div>
    </div>
    <div class="item">
      <div class="name" :title="`生成蓝图时，使 输入/输出流速器 提前建造\n*用于建筑过多时，避免因渲染优化导致终端流速器无法显示`">
        <span>生成时前移终端建筑：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-switch v-model="globalSetting.forwardEndBuilding" active-color="#13ce66" inactive-color="#f56c6c"></el-switch>
      </div>
    </div>
  </div>
</template>

<script>
import * as Cfg from "@/graph/graphConfig.js";
export default {
  name: "BlueprintSetting",
  data() {
    return {
      globalSetting: Cfg.globalSetting,
    };
  },
};
</script>

<style lang="scss" scoped>
.blueprintSetting {
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
  .primary {
    color: $--color-primary;
  }
  .danger {
    color: $--color-danger;
  }
}
</style>