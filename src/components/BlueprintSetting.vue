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
      <div class="name" :title="`生成蓝图时，将工程中标记的物品映射为其他物品`">
        <span>生成货物映射：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-badge :value="globalSetting.itemMapping.size" :type="globalSetting.itemMapping.size==0?'info':'danger'">
          <el-button plain size="mini" @click="clickItemMappingSetting">配置</el-button>
        </el-badge>
      </div>
    </div>
    <div class="item">
      <div class="name" :title="`生成蓝图时，使 输入/输出流速器 提前建造\n*用于建筑过多时，避免因渲染优化导致终端流速器无法显示 [未证实有效]`">
        <span>生成时前移终端建筑：</span>
        <i class="el-icon-question"></i>
      </div>
      <div class="form">
        <el-switch v-model="globalSetting.forwardEndBuilding" active-color="#13ce66" inactive-color="#f56c6c"></el-switch>
      </div>
    </div>

    <!-- 生成货物映射 -->
    <el-dialog title="生成货物映射" custom-class="itemMappingDialog" :visible.sync="showItemMappingSetting" width="500px" :before-close="beforeItemMappingSettingClose" append-to-body v-dialogDrag>
      <el-table :data="itemMappingForm" border :header-cell-style="{ background: '#fafafa' }" size="small">
        <el-table-column label="序号" type="index" width="55" align="center"></el-table-column>
        <el-table-column label="物品映射" align="center">
          <template slot-scope="{row}">
            <div class="mappingForm">
              <el-select class="fromSelect" popper-class="itemSelectPopper" v-model="row.from" filterable size="small" :title="row.from">
                <el-option v-for="opt in fromOptions" :key="opt.value" :value="opt.value" :label="`${opt.label} ${opt.value}`">
                  <img class="itemImg" :src="opt.img" :alt="opt.name" :title="opt.name" />
                  <span>{{opt.label}}</span>
                </el-option>
              </el-select>
              <span class="separator">{{'=>'}}</span>
              <el-select class="toSelect" popper-class="itemSelectPopper" v-model="row.to" filterable size="small" :title="row.to">
                <el-option v-for="opt in toOptions" :key="opt.value" :value="opt.value" :label="`${opt.label} ${opt.value}`">
                  <img v-if="opt.img" class="itemImg" :src="opt.img" :alt="opt.name" :title="opt.name" />
                  <span v-else class="itemId">{{opt.value}}</span>
                  <span>{{opt.label}}</span>
                </el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" width="55">
          <template #header>
            <div class="iconBtn primary" @click="addMapping">
              <i class="el-icon-circle-plus"></i>
            </div>
          </template>
          <template slot-scope="{$index}">
            <div class="iconBtn danger" @click="removeMapping($index)">
              <i class="el-icon-remove-outline"></i>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="beforeItemMappingSettingClose" size="small">关 闭</el-button>
        <el-button @click="saveMapping" type="primary" size="small">保 存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import * as Cfg from "@/graph/graphConfig.js";
import * as ItemsUtil from "@/utils/itemsUtil.js";
import { items as ALL_ITEMS } from "@/data/itemsData";
export default {
  name: "BlueprintSetting",
  data() {
    return {
      globalSetting: Cfg.globalSetting,
      showItemMappingSetting: false,
      itemMappingForm: [], // Array
      itemMappingForm_: [], // Array
      fromOptions: [],
      toOptions: [],
      num: 0,
    };
  },
  mounted() {
    let projectItemIds = new Set();
    let projectItems = Cfg.filterItem.map((item) => {
      projectItemIds.add(item.id);
      return {
        label: item.name,
        value: item.id,
        img: ItemsUtil.getItemImage(item.id),
      };
    });
    let otherItems = ALL_ITEMS.filter((item) => !projectItemIds.has(item.id)).map((item) => ({
      label: item.name,
      value: item.id,
    }));
    this.fromOptions = projectItems;
    this.toOptions = projectItems.concat(otherItems);
  },
  methods: {
    clickItemMappingSetting() {
      this.itemMappingForm = [];
      this.itemMappingForm_ = [];
      this.globalSetting.itemMapping.forEach((v, k) => {
        this.itemMappingForm.push({ from: k, to: v });
        this.itemMappingForm_.push({ from: k, to: v });
      });
      this.showItemMappingSetting = true;
    },
    beforeItemMappingSettingClose() {
      if (JSON.stringify(this.itemMappingForm) !== JSON.stringify(this.itemMappingForm_)) {
        this.$confirm("数据未保存，确认关闭？")
          .then(() => {
            this.showItemMappingSetting = false;
          })
          .catch(() => {});
      } else {
        this.showItemMappingSetting = false;
      }
    },
    addMapping() {
      this.itemMappingForm.push({});
    },
    removeMapping(index) {
      this.itemMappingForm.splice(index, 1);
    },
    saveMapping() {
      let fromIds = new Set();
      for (let opt of this.itemMappingForm) {
        if (opt.from == null || opt.to == null) {
          return this.$message.warning("映射表不能存在空值，请完善后保存！");
        }
        if (fromIds.has(opt.from)) {
          let item = ItemsUtil.itemsMap.get(opt.from);
          return this.$message.warning(`同一物品不能多次映射：${item.id} ${item.name}`);
        }
        fromIds.add(opt.from);
      }
      this.globalSetting.itemMapping = new Map(
        this.itemMappingForm.map((opt) => [opt.from, opt.to])
      );
      this.showItemMappingSetting = false;
    },
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
}
.primary {
  color: $--color-primary;
}
.danger {
  color: $--color-danger;
}
.itemMappingDialog {
  .mappingForm {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .separator {
      flex-shrink: 0;
      font-size: 14px;
      color: #999;
      margin: 0 8px;
    }
    .fromSelect {
      flex: 1;
    }
    .toSelect {
      flex: 1;
    }
  }

  .iconBtn {
    font-size: 16px;
    cursor: pointer;
  }
}
</style>

<style lang="scss">
.itemSelectPopper {
  .el-select-dropdown__item {
    height: 35px;
    line-height: 35px;
    padding-left: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    .itemImg {
      width: 30px;
      height: 30px;
      vertical-align: middle;
      margin-right: 10px;
    }
    .itemId {
      font-size: 12px;
      font-weight: bold;
      opacity: 0.7;
      margin-right: 10px;
    }
  }
}
</style>