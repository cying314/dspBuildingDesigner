<template>
  <ul class="group" v-if="baseModels">
    <template v-for="bm,index in baseModels">
      <template v-if="bm.isGroup">
        <li class="item groupTitle" :key="'title_'+index">
          <span>{{pIndex+(index+1)+'. '}}{{bm.name}}</span>
          <div class="item_rt">
            <div class="item_btns">
              <el-button type="text" :icon="bm.expand?'el-icon-arrow-up':'el-icon-arrow-down'" size="small" @click="$set(bm,'expand',!bm.expand)">{{bm.expand?'折叠':'展开'}}</el-button>
            </div>
          </div>
        </li>
        <transition name="expandTrans" :key="'sub_'+index">
          <li class="subGroup" v-show="bm.expand">
            <!-- 递归目录 -->
            <BaseModelList
              :dbcCreate="dbcCreate"
              :selectModelType="selectModelType"
              :selectModel="selectModel"
              :pIndex="pIndex+(index+1)+'.'"
              :baseModels="bm.list"
              @handleItemDragStart="$emit('handleItemDragStart')"
              @handleModelDragEnd="(data)=>$emit('handleModelDragEnd',data)"
              @changeSelectModel="(type,data)=>$emit('changeSelectModel',type,data)"
            ></BaseModelList>
          </li>
        </transition>
      </template>
      <li v-else-if="bm.data" class="item modelItem" :key="'base_'+index" draggable @dragstart="$emit('handleItemDragStart')" @dragend="$emit('handleModelDragEnd',bm.data)">
        <span>{{pIndex+(index+1)+'. '}}{{bm.name}}</span>
        <div class="item_rt">
          <el-checkbox v-if="dbcCreate" :value="selectModelType=='base'&&selectModel==bm.data" @click.native.prevent="$emit('changeSelectModel','base',bm.data)" title="勾选双击创建的组件"></el-checkbox>
        </div>
      </li>
    </template>
  </ul>
</template>

<script>
export default {
  name: "BaseModelList",
  props: {
    baseModels: {
      type: Array,
      default() {
        return [];
      },
    },
    dbcCreate: {},
    selectModelType: {},
    selectModel: {},
    pIndex: {
      type: [Number, String],
      default: "",
    },
  },
};
</script>

<style lang="scss" scoped>
$barColor: $--color-primary-light-9;
.group {
  list-style: none;
  margin-bottom: 10px;
  .item {
    padding: 3px 5px;
    margin-left: 10px;
    font-size: 16px;
    line-height: 20px;
    min-height: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    & + .item {
      margin-top: 5px;
    }
    &:hover {
      background: $barColor;
    }
    .item_rt {
      flex-shrink: 0;
      margin-left: auto;
      display: flex;
      align-items: center;
    }
    .item_btns {
      display: flex;
      align-items: center;
      opacity: 0.4;
      .el-button {
        padding: 0;
      }
    }
    .item_btns + .el-checkbox {
      margin-left: 5px;
    }
    &:hover .item_btns {
      opacity: 1;
    }
    &.groupTitle {
      margin-bottom: 5px;
    }
    &.modelItem {
      cursor: grab;
    }
  }
  .subGroup {
    margin-left: 1em;
    .group {
      margin-bottom: 5px;
    }
    .item {
      padding-top: 1px;
      padding-bottom: 1px;
      border-left: 1px solid #000;
      font-size: 14px;
    }
    .groupTitle {
      padding-left: 1em;
    }
    .modelItem {
      padding-left: 0;
      &::before {
        content: "-";
        display: inline-block;
        width: 0.5em;
        margin-left: 0.1em;
        margin-right: 0.4em;
      }
    }
  }
}
</style>