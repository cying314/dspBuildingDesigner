import { items } from "@/data/itemsData";
export const itemsMap = new Map();
for (const i of items) {
    itemsMap.set(i.id, i);
}

/** 传送带类 建筑id */
export const beltBuildIds = new Set([
    2001, // 传送带
    2002, // 高速传送带
    2003, // 极速传送带
]);

/** 是否 传送带 */
export function isBelt(id) { return beltBuildIds.has(id); }

/** 分拣器类 建筑id */
export const inserterBuildIds = new Set([
    2011, // 分拣器
    2012, // 高速分拣器
    2013, // 极速分拣器
]);

/** 是否 分拣器 */
export function isInserter(id) { return inserterBuildIds.has(id); }

/** 制造厂类(需指定制造配方的建筑) 建筑id */
export const assemblerBuildIds = new Set([
    2303, // 制造台 Mk.I
    2304, // 制造台 Mk.II
    2305, // 制造台 Mk.III
    2318, // 重组式制造台
    2302, // 电弧熔炉
    2315, // 位面熔炉
    2319, // 负熵熔炉
    2308, // 原油精炼厂
    2309, // 化工厂
    2317, // 量子化工厂
    2310, // 微型粒子对撞机
]);

/** 是否 制造厂类建筑(需指定制造配方的建筑) */
export function isAssembler(id) { return assemblerBuildIds.has(id); }

/** 是否 研究站 */
export function isLab(id) { return id === 2901 || id === 2902; }

/** 是否 运输站类建筑（物流运输站、大型采矿机） */
export function isStation(id) { return id === 2103 || id === 2104 || id === 2316; }

/** 可悬空建造 建筑id */
export const hangingBuildIds = new Set([
    ...Array.from(beltBuildIds), // 传送带
    ...Array.from(inserterBuildIds), // 分拣器
    2030, // 流速监测器
    2313, // 喷涂机（不能用地基当底）
]);

/** 是否 可悬空建造 */
export function isHanging(id) { return hangingBuildIds.has(id); }

/** 可堆叠建造 建筑id */
export const stackableBuildIds = new Set([
    2020, // 四向分流器
    2040, // 自动集装器
    2101, // 小型储物仓
    2102, // 大型储物仓
    2106, // 储液罐
    2901, // 矩阵研究站
    2902, // 自演化研究站
    2313, // 喷涂机
]);

/** 是否 可堆叠建造 */
export function isStackable(id) { return stackableBuildIds.has(id); }

/** 带分拣器插槽的建筑 翻转信息 */
export const inserterSlotBuildInfos = {
    // axis:模型不旋转(yaw=0)时的对称轴方向(x纬线 y经线) alterSlot:翻转时需调换的插槽索引(y轴对称插槽)
    2101: { // 小型储物仓
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2102: { // 大型储物仓
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2204: { // 火力发电厂
        axis: "y", alterSlot: [[0, 4], [1, 3]], // 2不对称
    },
    2211: { // 微型聚变发电站
        axis: "y", alterSlot: [[0, 4], [1, 3]], // 2不对称
    },
    2302: { // 电弧熔炉
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2315: { // 位面熔炉
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2319: { // 负熵熔炉
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2303: { // 制造台 Mk.I
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2304: { // 制造台 Mk.II
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2305: { // 制造台 Mk.III
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2318: { // 重组式制造台
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2308: { // 原油精炼厂
        axis: "y", alterSlot: [[0, 5], [1, 4], [2, 3], [6, 8]],
    },
    2309: { // 化工厂
        axis: "x", alterSlot: [[0, 6], [1, 5], [2, 4], [3, 7]],
    },
    2317: { // 量子化工厂
        axis: "x", alterSlot: [[0, 6], [1, 5], [2, 4], [3, 7]],
    },
    2310: { // 微型粒子对撞机
        axis: "x", alterSlot: [[0, 8], [1, 7], [2, 6], [3, 5]],
    },
    2311: { // 电磁轨道弹射器
        axis: "y", alterSlot: [[0, 1]],
    },
    2210: { // 人造恒星
        axis: "y", alterSlot: [[1, 3]],
    },
    2312: { // 垂直发射井
        axis: "y", alterSlot: [[1, 2]],
    },
    2901: { // 矩阵研究站
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2902: { // 自演化研究站
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    3009: { // 战场分析基站
        axis: "y", alterSlot: [[0, 8], [1, 7], [2, 6], [3, 5]],
    },
};


/** 是否 带分拣器插槽的建筑 */
export function isInserterSlotBuild(id) { return Object.prototype.hasOwnProperty.call(inserterSlotBuildInfos, id); }

/** 获取 带分拣器插槽的建筑 翻转信息 */
export function getInserterSlotBuildInfo(id) { return inserterSlotBuildInfos[id] }

/** 获取 带分拣器插槽的建筑 的对称方向 */
export function getInserterSlotBuildAxis(id) { return getInserterSlotBuildInfo(id)?.axis }

/**
 * 翻转调换 分拣器插槽索引
 * @param id 带分拣器插槽的建筑itemId
 * @param originSlot 原插槽索引
 */
export function alterInserterSlot(id, originSlot) {
    const alterSlot = getInserterSlotBuildInfo(id)?.alterSlot;
    if (alterSlot) {
        for (let arr of alterSlot) {
            if (arr[0] == originSlot) return arr[1];
            if (arr[1] == originSlot) return arr[0];
        }
    }
    return null;
}

/** 带传送带插槽的建筑 翻转信息 */
export const beltSlotBuildInfos = {
    // axis:模型不旋转(yaw=0)时的对称轴方向(x纬线 y经线) alterSlot:翻转时需调换的插槽索引(y轴对称插槽)
    2020: { // 四向分流器
        multiModel: true,
        models: {
            38: { // 十字单层
                axis: "y", alterSlot: [[1, 3]],
            },
            39: { // 一字双层
                axis: "y", alterSlot: [],
            },
            40: { // 十字双层
                axis: "y", alterSlot: [[1, 3]],
            }
        }
    },
    2103: { // 行星内物流运输站
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2104: { // 星际物流运输站
        axis: "y", alterSlot: [[0, 2], [3, 11], [4, 10], [5, 9], [6, 8]],
    },
    2316: { // 大型采矿机
        axis: "y", alterSlot: [[0, 2], [3, 8], [4, 7], [5, 6]],
    },
}

/** 是否 带传送带插槽的建筑 */
export function isBeltSlotBuild(id) { return Object.prototype.hasOwnProperty.call(beltSlotBuildInfos, id); }

/** 获取 传送带插槽的建筑 翻转信息 */
export function getBeltSlotBuildInfo(id, modelIndex) {
    let item = beltSlotBuildInfos[id];
    if (item?.multiModel) return item.models[modelIndex];
    return item;
}

/** 获取 传送带插槽的建筑 的对称方向 */
export function getBeltSlotBuildAxis(id, modelIndex) { return getBeltSlotBuildInfo(id, modelIndex)?.axis }

/**
 * 翻转调换 传送带插槽索引
 * @param id 带传送带插槽的建筑itemId
 * @param modelIndex 模型索引 
 * @param originSlot 原插槽索引
 */
export function alterBeltSlot(id, modelIndex, originSlot) {
    const alterSlot = getBeltSlotBuildInfo(id, modelIndex)?.alterSlot;
    if (alterSlot) {
        for (let arr of alterSlot) {
            if (arr[0] == originSlot) return arr[1];
            if (arr[1] == originSlot) return arr[0];
        }
    }
    return null;
}

/** 炮台类 建筑id */
export const turretBuildIds = new Set([
    3001, // 高斯机枪塔
    3002, // 高频激光塔
    3003, // 聚爆加农炮
    3004, // 磁化电浆炮
    3005, // 导弹防御塔
]);

/** 是否 炮台 */
export function isTurret(id) { return turretBuildIds.has(id); }