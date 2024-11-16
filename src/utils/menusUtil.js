import * as Cfg from "@/graph/graphConfig.js";
import * as ItemsUtil from "@/utils/itemsUtil.js";
/**
 * @typedef {import("../graph/dspGraph.js").default} Graph 图谱实例
 * @typedef {import("../graph/dataMapper.js").GraphNode} GraphNode 节点实例
 * @typedef {import("../graph/dataMapper.js").GraphNodeSlot} GraphNodeSlot 插槽实例
 * @typedef {import("../graph/dataMapper.js").GraphEdge} GraphEdge 边实例
 */
/**
 * 右键节点菜单
 * @param {GraphNode} d 节点实例
 * @param {Graph} dspGraph 图谱实例
 */
export function getNodeMenus(d, dspGraph) {
  const modelId = d.modelId;
  const menus = [
    {
      title: "删除选中节点",
      icon: "el-icon-delete",
      style: `color:${Cfg.color.danger}`,
      handler: () => {
        dspGraph.handleDelete();
      },
    },
    {
      title: "置于顶层",
      icon: "el-icon-top",
      handler: () => {
        // 所有选中节点置于顶层
        dspGraph.handleSelectionBringToFront();
      },
    },
    {
      title: "置于底层",
      icon: "el-icon-bottom",
      handler: () => {
        // 所有选中节点置于底层
        dspGraph.handleSelectionSendToBack();
      },
    },
  ];
  if (dspGraph._selection.nodeMap.size > 1) {
    // 选中多个节点
    menus.push({
      title: "组合封装选中节点",
      icon: "el-icon-box",
      handler: () => {
        // 组合封装选中节点
        dspGraph.handlePackageComponent();
      },
    });
  }
  if (modelId === Cfg.ModelId.text) {
    // 选中普通文本
    if (d.textAlign != 1) {
      menus.push({
        title: "文本左对齐",
        icon: "if-icon-align-left",
        handler: () => {
          dspGraph.changeTextAlign(d, 1);
        },
      });
    }
    if (d.textAlign == 1 || d.textAlign == 2) {
      menus.push({
        title: "文本居中对齐",
        icon: "if-icon-align-center",
        handler: () => {
          dspGraph.changeTextAlign(d, 0);
        },
      });
    }
    if (d.textAlign != 2) {
      menus.push({
        title: "文本右对齐",
        icon: "if-icon-align-right",
        handler: () => {
          dspGraph.changeTextAlign(d, 2);
        },
      });
    }
  } else if (modelId === Cfg.ModelId.fdir) {
    // 选中四向
    menus.push({
      title: "左旋转90°",
      icon: "el-icon-refresh-left",
      handler: () => {
        dspGraph.transformFdirSlot(d, 0);
      },
    });
    menus.push({
      title: "右旋转90°",
      icon: "el-icon-refresh-right",
      handler: () => {
        dspGraph.transformFdirSlot(d, 1);
      },
    });
    menus.push({
      title: "垂直翻转",
      icon: "if-icon-vert-flip",
      handler: () => {
        dspGraph.transformFdirSlot(d, 2);
      },
    });
    menus.push({
      title: "水平翻转",
      icon: "if-icon-hori-flip",
      handler: () => {
        dspGraph.transformFdirSlot(d, 3);
      },
    });
  } else if (modelId === Cfg.ModelId.package) {
    // 选中封装模块
    menus.push({
      title: "展开封装模块",
      icon: "el-icon-files",
      handler: () => {
        // 组合封装选中节点
        dspGraph.unfoldPackage(d);
      },
    });
    menus.push({
      title: "替换为其他模块",
      icon: "el-icon-news",
      handler: () => {
        // 替换节点引用的封装模块
        this.operChangeNode = d;
        this.showChangeModelDialog = true;
      },
    });
  }
  if ([Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)) {
    // 流速器、信号输出、信号输入
    // 切换生成/消耗物品id
    const dir = d.slots[0]?.dir ?? 1;
    let tag = dir == 1 ? "生成" : "消耗";
    menus.push({
      title: "切换" + tag + "物品",
      icon: "el-icon-help",
      handler: (event) => {
        // 阻止关闭窗口
        event.stopPropagation();
        // 清空菜单，切换菜单选项为物品列表
        menus.splice(0, menus.length);
        Cfg.filterItem.forEach((item) => {
          menus.push({
            title: (dir == 1 ? "生成" : "消耗") + item.name,
            image: ItemsUtil.getItemImage(item.id),
            style: d.itemId === item.id ? "border:2px solid #80a7dd" : null,
            handler: () => {
              dspGraph.changeNodeItemId(d, item.id);
            },
          });
        });
      },
    });

    // 切换传送带标记图标id
    menus.push({
      title: "切换传送带标记",
      icon: "el-icon-info",
      handler: (event) => {
        // 阻止关闭窗口
        event.stopPropagation();
        // 清空菜单，切换菜单选项为标记列表
        menus.splice(0, menus.length);
        Cfg.signalIds.forEach((signalId) => {
          menus.push({
            title: "切换标记",
            image: ItemsUtil.getSignalImage(signalId),
            style: d.signalId === signalId ? "border:2px solid #80a7dd" : null,
            handler: () => {
              dspGraph.changeNodeSignalId(d, signalId);
            },
          });
        });
        if (d.signalId) {
          menus.push({
            title: "取消标记",
            icon: "el-icon-close",
            handler: () => {
              dspGraph.changeNodeSignalId(d, null);
            },
          });
        }
      },
    });
    // 流速器、信号输出、信号输入 更改传送带标记数
    menus.push({
      title: "更改传送带标记数\n生成的输入输出口将根据标记数升序排列",
      icon: "if-icon-count",
      handler: () => {
        dspGraph.handleChangeNodeCount(d);
      },
    });
  }
  if (
    [
      Cfg.ModelId.text,
      Cfg.ModelId.monitor,
      Cfg.ModelId.output,
      Cfg.ModelId.input,
      Cfg.ModelId.set_zero,
      Cfg.ModelId.package,
    ].includes(modelId)
  ) {
    // 普通文本、流速器、信号输出、信号输入、置零、封装模块 切换节点文本
    menus.push({
      title: "更改节点文本描述",
      icon: "if-icon-textarea",
      handler: () => {
        dspGraph.handleChangeNodeText(d);
      },
    });
  }
  return menus;
}

/**
 * 右键插槽菜单
 * @param {GraphNodeSlot} d 插槽实例
 * @param {Graph} dspGraph 图谱实例
 */
export function getSlotMenus(d, dspGraph) {
  const modelId = d.node.modelId;
  const menus = [];
  if (d.edge != null) {
    // 存在连接线
    menus.push({
      title: "断开连接线",
      icon: "if-icon-unlink",
      style: `color:${Cfg.color.danger}`,
      handler: () => {
        dspGraph.deleteEdge(d.edge);
      },
    });
  }
  if (
    [Cfg.ModelId.fdir, Cfg.ModelId.monitor, Cfg.ModelId.output, Cfg.ModelId.input].includes(modelId)
  ) {
    // 只有四向、流速器、信号输出、信号输入 可调转输入输出口
    menus.push({
      title: (d.dir === 1 ? "切换为输入口" : "切换为输出口") + "\n(快捷键：双击插槽)",
      icon: d.dir === 1 ? "el-icon-remove-outline" : "el-icon-circle-plus-outline",
      handler: () => {
        dspGraph.changeSlotDir(d);
      },
    });
  }
  if (modelId === Cfg.ModelId.fdir) {
    // 四向
    // 切换指定传送带等级
    menus.push({
      title: "指定传送带等级",
      icon: "if-icon-belt",
      handler: (event) => {
        // 阻止关闭窗口
        event.stopPropagation();
        // 清空菜单，切换菜单选项为传送带列表
        menus.splice(0, menus.length);
        const beltOptions = [
          { title: "黄带", beltLevel: 1, itemId: 2001 },
          { title: "绿带", beltLevel: 2, itemId: 2002 },
          { title: "蓝带", beltLevel: 3, itemId: 2003 },
        ];
        beltOptions.forEach((item) => {
          menus.push({
            title: item.title,
            image: ItemsUtil.getItemImage(item.itemId),
            style: d.beltLevel === item.beltLevel ? "border:2px solid #80a7dd" : null,
            handler: () => {
              dspGraph.changeSlotBeltLevel(d, item.beltLevel);
            },
          });
        });
        menus.push({
          title: "取消指定\n自动匹配传送带速度",
          icon: "el-icon-close",
          handler: () => {
            dspGraph.changeSlotBeltLevel(d, null);
          },
        });
      },
    });
    // 优先输入输出口
    menus.push({
      title: d.priority === 1 ? "取消优先" : "设为优先",
      icon: d.priority === 1 ? "if-icon-un-priority" : "if-icon-priority",
      style: `color:${
        d.priority === 1
          ? Cfg.color.danger
          : d.dir === 1
          ? Cfg.color.priorityOutStroke
          : Cfg.color.priorityInStroke
      }`,
      handler: () => {
        dspGraph.changeSlotPriority(d);
      },
    });
    if (d.priority === 1 && d.dir === 1) {
      // 优先输出接口
      menus.push({
        title: "设置过滤物品",
        icon: "el-icon-help",
        handler: (event) => {
          // 阻止关闭窗口
          event.stopPropagation();
          // 清空菜单，切换菜单选项为物品列表
          menus.splice(0, menus.length);
          Cfg.filterItem.forEach((item) => {
            menus.push({
              title: "过滤" + item.name,
              // icon: "el-icon-circle-plus",
              // style: `color:${item.color};text-shadow:0 0 1px #5a5a5a`,
              image: ItemsUtil.getItemImage(item.id),
              style: d.filterId === item.id ? "border:2px solid #80a7dd" : null,
              handler: () => {
                dspGraph.changeSlotFilter(d, item.id);
              },
            });
          });
          if (d.filterId) {
            menus.push({
              title: "取消过滤",
              icon: "el-icon-close",
              handler: () => {
                dspGraph.changeSlotFilter(d, null);
              },
            });
          }
        },
      });
    }
  }
  return menus;
}
