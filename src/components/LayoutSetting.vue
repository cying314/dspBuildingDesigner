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
      <el-table-column prop="name" label="组件" align="center" width="120" show-overflow-tooltip></el-table-column>
      <el-table-column label="布局起点 (X, Y)" align="center" min-width="60">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.start.x" :min="-9999" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="布局起点Y" align="center" min-width="60">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.start.y" :min="-9999" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大宽长高 (W, H, T)" align="center" min-width="60px">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxW" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大长H" align="center" min-width="60">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxH" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="最大高T" align="center" min-width="60">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.maxD" :min="1" :max="9999" :step="0.1" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="建筑间隔" align="center" min-width="60">
        <template slot-scope="{ row }">
          <el-input-number v-model="row.space" :min="0" :max="10" :step="0.01" step-strictly :controls="false"></el-input-number>
        </template>
      </el-table-column>
      <el-table-column label="展开方向" align="center" width="90">
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
        <span>蓝图生成模式：</span>
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
      <div class="rt">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import * as Cfg from "@/graph/graphConfig.js";
export default {
  name: "LayoutSetting",
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
        this.$set(item.start, "x", Math.round(x + (e2.pageX - startX) / this.scale));
        this.$set(item.start, "y", Math.round(y - (e2.pageY - startY) / this.scale));
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
      return {
        transform: `translate(${this.ox}px, ${this.oy}px)`,
        left: this.scale * x + "px",
        top: this.scale * y + "px",
        background: item.previewBoxColor,
        width: this.scale * w + "px",
        height: this.scale * h + "px",
      };
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
      // 将第2列(起始y)，第4/5列(最大h,d)隐去
      if ((columnIndex == 2) | (columnIndex == 4) | (columnIndex == 5)) {
        return { display: "none" };
      }
      if ((rowIndex == 0) & (columnIndex == 1)) {
        this.$nextTick(() => {
          // 第1列(起始x) 改为占据三列
          document.querySelector(`.${column.id}`).setAttribute("colspan", "2");
        });
      }
      if ((rowIndex == 0) & (columnIndex == 3)) {
        this.$nextTick(() => {
          // 第3列(最大w) 改为占据三列
          document.querySelector(`.${column.id}`).setAttribute("colspan", "3");
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
      }
    }
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
}
.primary {
  color: $--color-primary;
}
.danger {
  color: $--color-danger;
}
</style>