<template>
  <!-- 生成布局调整 -->
  <div class="layoutSetting">
    <el-table
      class="layoutSettingTable"
      :data="layoutSettingList"
      size="mini"
      border
      :header-cell-style="layoutTableHeaderCellStyle"
      :row-style="layoutTableRowStyle"
      :cell-style="layoutTableCellStyle"
    >
      <el-table-column prop="name" label="组件" align="center" min-width="110" show-overflow-tooltip></el-table-column>
      <el-table-column label="布局起点 (X, Y, Z)" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.start.x" :min="-9999" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="布局起点Y" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.start.y" :min="-9999" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="布局起点Z" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.start.z" :min="0" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大宽长高 (W, H, T)" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxW" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大长H" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxH" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大高T" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxD" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="建筑间隔 (X, Y)" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.spaceX" :min="0" :max="10" :step="0.01" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="建筑间隔Y" align="center" width="58">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.spaceY" :min="0" :max="10" :step="0.01" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="展开方向" align="center" width="80">
        <template slot-scope="{ row }">
          <el-select v-model="row.dir" size="mini">
            <el-option label="左上" :value="0"></el-option>
            <el-option label="右上" :value="1"></el-option>
            <el-option label="右下" :value="2"></el-option>
            <el-option label="左下" :value="3"></el-option>
          </el-select>
        </template>
      </el-table-column>
    </el-table>
    <div ref="grid" class="gridWrap" :style="layoutGridStyle()" @wheel="onGridWheel" @mousedown="onGridDrag">
      <div class="box" :class="'dir_'+item.dir" v-for="item,index in layoutSettingList" :key="index" :style="layoutBoxStyle(item)" @mousedown="onBoxDrag($event,item)">
        <span class="num">{{item.maxD}}T</span>
        <div class="anchor" :style="{background:item.previewBoxColor}"></div>
        <div class="xBar" :class="{'onDrag':item===dragItem}" :style="{background:item.previewBoxColor}" @mousedown="onXbarDrag($event,item)">
          <i class="if-icon-arrow-lr"></i>
        </div>
        <div class="yBar" :class="{'onDrag':item===dragItem}" :style="{background:item.previewBoxColor}" @mousedown="onYbarDrag($event,item)">
          <i class="if-icon-arrow-tb"></i>
        </div>
      </div>
    </div>
    <div class="bottomBtns">
      <div class="lt">
        <div class="radioGroup">
          <span>蓝图生成模式：</span>
          <el-radio-group v-model="globalSetting.generateMode" size="mini">
            <el-radio :label="0" :title="`使用分拣器进行无带流连接\n*需先提前粘贴分拣器，再在同位置粘贴完整蓝图\n*蓝图粘贴时请尽量使用沙盒瞬间建造`">
              <span>无带流</span>
              <i class="el-icon-question primary" style="margin-left:2px"></i>
            </el-radio>
            <el-radio :label="1" :title="`忽略碰撞，远距离直连传送带节点\n*需使用mod进行蓝图强制粘贴`">
              <span>传送带直连</span>
              <i class="if-icon-un-priority danger" style="margin-left:2px"></i>
            </el-radio>
            <el-radio :label="2" :title="`四向、传送带间直接远距离连接\n*需使用mod进行蓝图强制粘贴`">
              <span>隔空直连</span>
              <i class="if-icon-un-priority danger" style="margin-left:2px"></i>
            </el-radio>
          </el-radio-group>
        </div>
        <div class="radioGroup">
          <span>建筑布局模式：</span>
          <el-radio-group v-model="globalSetting.layoutMode" size="mini">
            <el-radio :label="0" :title="`从原点开始，优先填充层，再沿水平方向往外扩散填充。例：\n1  2  5 10\n3  4  6 11\n7  8  9 12`">
              <span>原点扩散</span>
            </el-radio>
            <el-radio :label="1" :title="`从原点开始，按层、行、列优先级依次填充，直至铺满区域。例：\n1  2  3  4\n5  6  7  8\n9 10 11 12`">
              <span>逐行铺满</span>
            </el-radio>
          </el-radio-group>
        </div>
        <el-button class="moreBtn" type="text" size="mini" icon="el-icon-s-operation" @click="showBlueprintSetting=true">更多选项</el-button>
      </div>
      <div class="rt">
        <slot></slot>
      </div>
    </div>

    <!-- 蓝图生成设置 -->
    <el-dialog title="蓝图生成设置" custom-class="blueprintSettingDialog" :visible.sync="showBlueprintSetting" width="550px" append-to-body v-dialogDrag>
      <BlueprintSetting />
    </el-dialog>
  </div>
</template>

<script>
import * as Cfg from "@/graph/graphConfig.js";
import BlueprintSetting from "@/components/BlueprintSetting.vue";
export default {
  name: "LayoutSetting",
  components: {
    BlueprintSetting,
  },
  data() {
    return {
      globalSetting: Cfg.globalSetting,
      layoutSettingList: Cfg.layoutSettingList,
      gridSize: 5,
      minScale: 3,
      maxScale: 8,
      scale: 5,
      ox: 0,
      oy: 0,
      dragItem: null,
      showBlueprintSetting: false,
    };
  },
  mounted() {
    this.resetPos();
  },
  methods: {
    // 重置布局
    resetLayout() {
      Cfg.resetLayout();
      this.resetPos();
    },
    resetPos() {
      this.scale = 5;
      const gridEl = this.$refs.grid;
      this.ox = gridEl.clientWidth / 2;
      this.oy = (gridEl.clientHeight / 3) * 2;
    },
    // 拖拽盒子宽度
    onXbarDrag(e1, item) {
      e1.stopPropagation();
      let startW = item.maxW ?? 0;
      let startDir = item.dir ?? 0;
      let startX = e1.pageX;
      this.dragItem = item;
      let onMove = (e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        let w;
        if (startDir === 1 || startDir === 2) {
          w = startW + (e2.pageX - startX) / this.scale;
        } else {
          w = startW - (e2.pageX - startX) / this.scale;
        }
        let dir = startDir;
        if (w < 0) {
          // 调换展开方向
          if (startDir === 0) {
            dir = 1;
          } else if (startDir === 1) {
            dir = 0;
          } else if (startDir === 2) {
            dir = 3;
          } else if (startDir === 3) {
            dir = 2;
          }
          this.$set(item, "dir", dir);
          w = -w;
        } else {
          this.$set(item, "dir", startDir);
        }
        this.$set(item, "maxW", Math.round(w));
      };
      let onEnd = () => {
        this.dragItem = null;
        document.body.removeEventListener("mousemove", onMove);
        document.body.removeEventListener("mouseup", onEnd);
      };
      document.body.addEventListener("mousemove", onMove);
      document.body.addEventListener("mouseup", onEnd);
    },
    // 拖拽盒子高度
    onYbarDrag(e1, item) {
      e1.stopPropagation();
      let startH = item.maxH ?? 0;
      let startDir = item.dir ?? 0;
      let startY = e1.pageY;
      this.dragItem = item;
      let onMove = (e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        let h;
        if (startDir === 0 || startDir === 1) {
          h = startH - (e2.pageY - startY) / this.scale;
        } else {
          h = startH + (e2.pageY - startY) / this.scale;
        }
        let dir = startDir;
        if (h < 0) {
          // 调换展开方向
          if (startDir === 0) {
            dir = 3;
          } else if (startDir === 1) {
            dir = 2;
          } else if (startDir === 2) {
            dir = 1;
          } else if (startDir === 3) {
            dir = 0;
          }
          this.$set(item, "dir", dir);
          h = -h;
        } else {
          this.$set(item, "dir", startDir);
        }
        this.$set(item, "maxH", Math.round(h));
      };
      let onEnd = () => {
        this.dragItem = null;
        document.body.removeEventListener("mousemove", onMove);
        document.body.removeEventListener("mouseup", onEnd);
      };
      document.body.addEventListener("mousemove", onMove);
      document.body.addEventListener("mouseup", onEnd);
    },
    // 拖拽盒子位置
    onBoxDrag(e1, item) {
      e1.stopPropagation();
      let x = item.start?.x ?? 0;
      let y = item.start?.y ?? 0;
      let startX = e1.pageX;
      let startY = e1.pageY;
      let onMove = (e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        let x2 = x + (e2.pageX - startX) / this.scale;
        let y2 = y - (e2.pageY - startY) / this.scale;
        let modX = x2 % 0.5;
        let modY = y2 % 0.5;
        x2 = modX > 0.25 ? x2 - modX + 0.5 : x2 - modX;
        y2 = modY > 0.25 ? y2 - modY + 0.5 : y2 - modY;
        this.$set(item.start, "x", +x2.toFixed(1));
        this.$set(item.start, "y", +y2.toFixed(1));
      };
      let onEnd = () => {
        document.body.removeEventListener("mousemove", onMove);
        document.body.removeEventListener("mouseup", onEnd);
      };
      document.body.addEventListener("mousemove", onMove);
      document.body.addEventListener("mouseup", onEnd);
    },
    // 拖拽网格定位
    onGridDrag(e1) {
      e1.stopPropagation();
      let startX = e1.pageX - this.ox;
      let startY = e1.pageY - this.oy;
      let onMove = (e2) => {
        e2.stopPropagation();
        e2.preventDefault();
        this.ox = e2.pageX - startX;
        this.oy = e2.pageY - startY;
      };
      let onEnd = () => {
        document.body.removeEventListener("mousemove", onMove);
        document.body.removeEventListener("mouseup", onEnd);
      };
      document.body.addEventListener("mousemove", onMove);
      document.body.addEventListener("mouseup", onEnd);
    },
    // 缩放网格
    onGridWheel(event) {
      event.stopPropagation();
      event.preventDefault();
      let scale = this.scale + -event.deltaY / 100;
      // 限制缩放范围
      scale = Math.min(Math.max(this.minScale, scale), this.maxScale);
      this.scale = scale;
    },
    // 盒子样式
    layoutBoxStyle(item) {
      let w = item.maxW;
      let h = item.maxH;
      let x;
      let y;
      switch (item.dir) {
        case 0: // 左上
          // 锚点右下角
          x = item.start.x - w;
          y = -item.start.y - h;
          break;
        case 1: // 右上
          // 锚点左下角
          x = item.start.x;
          y = -item.start.y - h;
          break;
        case 2: // 右下
          // 锚点左上角
          x = item.start.x;
          y = -item.start.y;
          break;
        case 3: // 左下
          // 锚点右上角
          x = item.start.x - w;
          y = -item.start.y;
          break;
      }
      const style = {
        transform: `translate(${this.ox}px, ${this.oy}px)`,
        left: this.scale * x + "px",
        top: this.scale * y + "px",
        background: item.previewBoxColor,
        width: this.scale * w + "px",
        height: this.scale * h + "px",
      };
      if (item.start.z > 0) {
        style.zIndex = item.start.z + 1;
        let blur = Math.min(10, item.start.z / 5);
        style.boxShadow = `0 0 ${blur}px ${blur}px rgba(200, 200, 200, 0.5)`;
      }
      return style;
    },
    // 网格样式
    layoutGridStyle() {
      let size = this.scale * this.gridSize;
      return {
        backgroundPosition: `${size / 2 + this.ox}px ${size / 2 + this.oy}px`,
        backgroundSize: `${size}px ${size}px`,
      };
    },
    // 表格 行样式
    layoutTableRowStyle({ row }) {
      return {
        background: row.previewBoxColor,
      };
    },
    layoutTableCellStyle({ row, columnIndex }) {
      return {
        background: columnIndex == 0 ? row.previewBoxColor : null,
        padding: "4px 0",
      };
    },
    // 表格 合并表头样式
    layoutTableHeaderCellStyle({ column, rowIndex, columnIndex }) {
      // 将第2/3列(起始y,z)，第5/6列(最大h,d)，第8列(间隔y)隐去
      if ([2, 3, 5, 6, 8].includes(columnIndex)) {
        return { display: "none" };
      }
      if ((rowIndex == 0) & (columnIndex == 1)) {
        this.$nextTick(() => {
          // 第1列(起始x) 改为占据三列
          document.querySelector(`.${column.id}`).setAttribute("colspan", "3");
        });
      }
      if ((rowIndex == 0) & (columnIndex == 4)) {
        this.$nextTick(() => {
          // 第3列(最大w) 改为占据三列
          document.querySelector(`.${column.id}`).setAttribute("colspan", "3");
        });
      }
      if ((rowIndex == 0) & (columnIndex == 7)) {
        this.$nextTick(() => {
          // 第7列(间隔x) 改为占据两列
          document.querySelector(`.${column.id}`).setAttribute("colspan", "2");
        });
      }
      return { fontSize: "12px", height: "20px", lineHeight: "20px", background: "#fafafa" };
    },
  },
};
</script>

<style lang="scss" scoped>
.layoutSettingTable {
  user-select: none;
  .el-input-number,
  .el-select {
    width: 100%;
    ::v-deep .el-input {
      line-height: 24px;
      padding: 0;
      input {
        padding: 0 10px;
        text-align: left;
        height: 24px;
        line-height: 24px;
        font-size: 12px;
      }
    }
  }
  ::v-deep td.el-table__cell .cell {
    padding: 0 8px;
  }
}
.gridWrap {
  width: 100%;
  height: 220px;
  background: #fcfcfc;
  position: relative;
  overflow: hidden;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAKhJREFUaEPt1TEOgCAUREHp9f4H1QMYEzzAFDTkWX8hjOsyjvXPNbe4V241Vi4+1+4ggtwXAa2iBVhH0QKtogVYRUuwipZo1VqgVbQAq9YSrKIlWrUWaBUtwKq1BKtoidbXWr+YvCez5xx+5CWd3eogenid7x8RsW520CpagNXNLlhFS7RqLdAqWoBVawlW0RKtWgu0ihZg1VqCVbREq9YCraIFWPu01gthgjJN1EEqQwAAAABJRU5ErkJggg==);
  cursor: pointer;
  .box {
    user-select: none;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #aaa;
    color: #555;
    box-sizing: border-box;
    white-space: nowrap;
    cursor: move;
    .num {
      font-size: 12px;
      color: #999;
    }
    .anchor {
      position: absolute;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      border: 1px solid #999;
      box-sizing: border-box;
    }
    .xBar,
    .yBar {
      opacity: 0;
      font-size: 14px;
      color: #999;
      position: absolute;
      border-radius: 3px;
      display: flex;
      justify-content: center;
      align-items: center;
      transform: translate(-50%, -50%);
      &.onDrag {
        opacity: 1;
      }
    }
    &:hover {
      .xBar,
      .yBar {
        opacity: 1;
      }
    }
    .xBar {
      top: 50%;
      width: 12px;
      height: 6px;
      padding: 1px 4px;
      cursor: e-resize;
    }
    .yBar {
      left: 50%;
      width: 6px;
      height: 12px;
      padding: 4px 1px;
      cursor: n-resize;
    }
    &.dir_0 {
      // 左上展开
      .anchor {
        // 右下锚点
        right: -3px;
        bottom: -3px;
      }
      .xBar {
        left: 0;
      }
      .yBar {
        top: 0;
      }
    }
    &.dir_1 {
      // 右上展开
      .anchor {
        // 左下锚点
        left: -3px;
        bottom: -3px;
      }
      .xBar {
        left: 100%;
      }
      .yBar {
        top: 0;
      }
    }
    &.dir_2 {
      // 右下展开
      .anchor {
        // 左上锚点
        left: -3px;
        top: -3px;
      }
      .xBar {
        left: 100%;
      }
      .yBar {
        top: 100%;
      }
    }
    &.dir_3 {
      // 左下展开
      .anchor {
        // 右上锚点
        right: -3px;
        top: -3px;
      }
      .xBar {
        left: 0;
      }
      .yBar {
        top: 100%;
      }
    }
  }
}
.bottomBtns {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  .lt {
    flex: 1;
    position: relative;
    .radioGroup {
      width: 110%;
      transform: scale(0.9);
      transform-origin: left center;
    }
    .radioGroup + .radioGroup {
      margin-top: 8px;
    }
    .moreBtn {
      position: absolute;
      bottom: 2px;
      right: 15px;
      padding: 0;
      transform: scale(0.9);
      transform-origin: left center;
    }
  }
  .rt {
    flex-shrink: 0;
  }
}
.primary {
  color: $--color-primary;
}
.danger {
  color: $--color-danger;
}
</style>