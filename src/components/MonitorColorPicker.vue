<template>
  <!-- 流速器颜色选择器 -->
  <div class="monitorColorPicker">
    <el-popover popper-class="monitorColorPickerPopper" v-model="popperVisible" placement="bottom" title="挑选颜色" width="320px" trigger="click">
      <span slot="reference" class="colorLump" :style="colorLumpStyle"></span>
      <ul class="palette">
        <li v-for="color,i in monitorColors" :key="i" @click="chooseColor(i)" :style="{'background-color': color}"></li>
      </ul>
    </el-popover>
  </div>
</template>

<script>
import { color as MONITOR_COLORS } from "@/data/monitorColor.js";
export default {
  name: "MonitorColorPicker",
  props: {
    value: { type: [Number, String] },
  },
  data() {
    return {
      monitorColors: MONITOR_COLORS,
      popperVisible: false,
    };
  },
  computed: {
    colorLumpStyle() {
      if (this.value >= 0 && this.value <= 255) {
        return { "background-color": MONITOR_COLORS[this.value] };
      }
      return null;
    },
  },
  methods: {
    chooseColor(colorIndex) {
      this.$emit("input", colorIndex);
      this.popperVisible = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.monitorColorPicker {
  display: inline-block;
  vertical-align: middle;
  .colorLump {
    width: 20px;
    height: 20px;
    display: inline-block;
    vertical-align: bottom;
    box-sizing: border-box;
    cursor: pointer;
    border: 1px solid #ccc;
  }
}
</style>

<style lang="scss">
.monitorColorPickerPopper {
  ul.palette {
    list-style: none;
    width: 320px;
    li {
      width: 20px;
      height: 20px;
      display: inline-block;
      vertical-align: bottom;
      cursor: pointer;
    }
  }
}
</style>