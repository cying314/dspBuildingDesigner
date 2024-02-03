import DefaultParamParser from "./defaultParamParser";
import BoolParamOpt from "./paramOptions/boolParamOpt";
import FunParamOpt from "./paramOptions/funParamOpt";
import ParamOpt, { getParam } from "./paramOptions/paramOpt";
import ParamParser from "./paramParser";
import * as itemUtil from "../itemsUtil";

export function getParamParser(itemId) {
    if (itemUtil.isBelt(itemId)) {
        // 传送带
        return beltParamParser;
    } else if (itemUtil.isInserter(itemId)) {
        // 分拣器
        return inserterParamParser;
    } else if (itemUtil.isAssembler(itemId)) {
        // 制造厂类建筑(需指定制造配方的建筑)
        return assembleParamParser;
    } else if (itemUtil.isLab(itemId)) {
        // 研究站
        return labParamParser;
    } else if (itemUtil.isTurret(itemId)) {
        // 炮台
        return turretParamParser;
    } else {
        const parameterParsers = new Map([
            [2103, getStationParamsParser(4, 12)], // 行星内物流运输站
            [2104, getStationParamsParser(5, 12)], // 星际物流运输站
            [2316, getStationParamsParser(1, 9)], // 大型采矿机
            [2101, getStorageParamParser(30)], // 小型储物仓
            [2102, getStorageParamParser(60)], // 大型储物仓
            [3009, battleBaseParamParser], // 战场分析基站
            [2020, splitterParamParser], // 四向分流器
            [2106, tankParamParser], // 储液罐
            [2311, ejectorParamParser], // 电磁轨道弹射器
            [2208, powerGeneratorParamParser], // 射线接收站
            [2209, energyExchangerParamParser], // 能量枢纽
            [2312, verticalLaunchingSiloParamParser], // 垂直发射井
            [2030, MonitorParamParser], // 流速监测器
            [2107, dispenserParamParser], // 物流配送器
        ]);
        const parser = parameterParsers.get(itemId);
        if (parser !== undefined) return parser;
    }
    // 无匹配特定解析器，使用默认
    return unknownParamParser;
}

// 最大充能功率 MW -> 原始值
function workEnergyPerTickEncode(pVal) { return Math.round(pVal * 50000 / 3) }
// 最大充能功率 原始值 -> MW
function workEnergyPerTickDecode(oVal) { return Math.round(oVal / 5000 * 3) / 10 }

/**
 * 获取 运输站类建筑 ParamParser
 * @param maxItemKind 最大物品栏位 
 * @param numSlots 建筑传送带插槽数目
 */
export function getStationParamsParser(maxItemKind, numSlots) {
    let offset = 0; // 偏移量
    // 物品栏位参数
    const storage = [];
    const storageStride = 6; // 物品栏参数 每行长度 
    for (var i = 0; i < maxItemKind; i++) {
        storage.push({
            itemId: ParamOpt.of(offset + i * storageStride + 0), // 物品id
            localRole: ParamOpt.of(offset + i * storageStride + 1), // 本地供需配置 -> 0:本地仓储 1:本地供应 2:本地需求
            remoteRole: ParamOpt.of(offset + i * storageStride + 2), // 星际供需配置 -> 0:星际仓储 1:星际供应 2:星际需求
            max: ParamOpt.of(offset + i * storageStride + 3), // 物品上限
            lockAmount: BoolParamOpt.of(offset + i * storageStride + 4, 1, 0), // 锁定数量 Boolean_1_0
        });
    }

    // 传送带插槽参数
    const slots = [];
    offset = 192; // 插槽参数偏移量
    const slotsStride = 4; // 物品栏参数 每行长度 
    for (i = 0; i < numSlots; i++) {
        slots.push({
            dir: ParamOpt.of(offset + i * slotsStride + 0), // 传送带接入方向 -> 0:未接入 1:输出 2:输入
            storageIdx: ParamOpt.of(offset + i * slotsStride + 1), // 输出货物对应物品栏索引 -> 0:不输出 1-5:物品栏索引 6:翘曲器
        });
    }

    // 主参数
    offset = 320; // 主参数偏移量
    return new ParamParser(2048, {
        storage: storage, // 物品栏位参数
        slots: slots, // 传送带插槽参数
        workEnergyPerTick: FunParamOpt.of(offset + 0, workEnergyPerTickEncode, workEnergyPerTickDecode), // 最大充能功率(单位：MW) -> 30-300
        tripRangeOfDrones: FunParamOpt.of(offset + 1, (pVal) => {
            return Math.round(Math.sin((90 - pVal) * Math.PI / 180) * 100000000);
        }, (oVal) => {
            return 90 - Math.round(Math.asin(oVal / 100000000) * 180 / Math.PI);
        }), // 运输机最远路程(单位：度) -> 20-180
        tripRangeOfShips: FunParamOpt.of(offset + 2, (pVal) => pVal * 24000, (oVal) => oVal / 24000), // 运输船最远路程 -> 1-60:有限路程(单位：ly) 10000:无限
        includeOrbitCollector: BoolParamOpt.of(offset + 3), // 是否会去轨道采集器取货 Boolean
        warpEnableDistance: FunParamOpt.of(offset + 4, (pVal) => pVal * 40000, (oVal) => oVal / 40000), // 曲速启用路程(单位：AU) -> 0.5-60
        warperNecessary: BoolParamOpt.of(offset + 5), // 是否翘曲器必备 Boolean
        deliveryAmountOfDrones: ParamOpt.of(offset + 6), // 运输机起送量(单位：%) -> 1-100
        deliveryAmountOfShips: ParamOpt.of(offset + 7), // 运输船起送量(单位：%) -> 1-100
        pilerCount: ParamOpt.of(offset + 8), // 输出货物集装数量 -> 0:使用科技上限 1-4:指定数量
        miningSpeed: ParamOpt.of(offset + 9), // 开采速度
        droneAutoReplenish: BoolParamOpt.of(offset + 10, 1, 0), // 是否自动补充运输机 Boolean_1_0
        shipAutoReplenish: BoolParamOpt.of(offset + 11, 1, 0), // 是否自动补充运输船 Boolean_1_0
    });
}

/**
 * 获取 储物仓 ParamParser
 * @param gridNum 格子数目
 */
export function getStorageParamParser(gridNum = 60) {
    // 储物仓物品过滤器
    const storageFilters = [];
    for (let i = 0; i < gridNum; i++) {
        storageFilters.push(ParamOpt.of(10 + i)); // 过滤物品id
    }
    return new ParamParser(110, {
        bans: ParamOpt.of(0), // 限制不可自动放入的格子数
        storageType: ParamOpt.of(1), // 储物仓类型 -> 0:不过滤 9:存在过滤器
        filters: storageFilters, // 储物仓物品过滤器
    });
}

// 战场分析基站 ParamParser
export const battleBaseParamParser = (() => {
    // 储物仓物品过滤器
    const storageFilters = [];
    const gridNum = 60;
    const baseOffset = 10; // 基础参数偏移量
    const filterDecode = (val, v) => {
        let storageType = getParam(v, 1); // 储物仓类型 -> 0:不过滤 9:存在过滤器
        return storageType === 9 ? val : 0; // 不存在过滤器时置为0
    }
    for (let i = 0; i < gridNum; i++) {
        storageFilters.push(FunParamOpt.of(baseOffset + i, e => e, filterDecode)); // 过滤物品id
    }
    // 动态获取偏移量方法（storageType为0时忽略filters，不占偏移量）
    let getPos = (pos) => {
        return (v) => {
            let storageType = getParam(v, 1); // 储物仓类型 -> 0:不过滤 9:存在过滤器
            const filtersOffset = storageType === 9 ? gridNum : 0; // 存在过滤器时增加偏移量gridNum
            return baseOffset + filtersOffset + pos;
        }
    };
    // 战斗无人机组
    const fighters = [];
    const fightersNum = 12;
    for (let i = 0; i < fightersNum; i++) {
        fighters.push(ParamOpt.of(getPos(7 + i))); // 无人机物品id
    }
    return new ParamParser(110, {
        bans: ParamOpt.of(0), // 限制不可自动放入的格子数
        storageType: ParamOpt.of(1), // 储物仓类型 -> 0:不过滤 9:存在过滤器
        filters: storageFilters, // 储物仓物品过滤器
        workEnergyPerTick: FunParamOpt.of(getPos(0), workEnergyPerTickEncode, workEnergyPerTickDecode), // 最大充能功率(单位：MW) -> 30-300
        autoPickEnabled: BoolParamOpt.of(getPos(1), 1, 0), // 是否自动拾取 Boolean_1_0
        autoReplenishFleet: BoolParamOpt.of(getPos(2), 1, 0), // 是否自动补充编队 Boolean_1_0
        moduleEnabled: BoolParamOpt.of(getPos(3), 1, 0), // 是否开启战斗无人机 Boolean_1_0
        autoReconstruct: BoolParamOpt.of(getPos(4), 1, 0), // 是否自动标记重建 Boolean_1_0
        droneEnabled: BoolParamOpt.of(getPos(5), 1, 0), // 是否开启建设无人机 Boolean_1_0
        dronesPriority: ParamOpt.of(getPos(6)), // 建设无人机模式 -> 0:优先修理 1:均衡模式 2:优先建造
        fighters: fighters, // 战斗无人机编队
    });
})();

// 四向分流器 ParamParser
export const splitterParamParser = (() => {
    const splitterPriority = [];
    for (let i = 0; i < 4; i++) {
        splitterPriority[i] = BoolParamOpt.of(i, 1, 0); // 是否优先接口 Boolean_1_0
    }
    return new ParamParser(6, {
        priority: splitterPriority, // 四向四个接口的优先级
    })
})();

// 矩阵研究站 ParamParser
export const labParamParser = new ParamParser(2, {
    researchMode: ParamOpt.of(0), // 研究模式 -> 0:未选择 1:矩阵合成 2:科研模式
    acceleratorMode: ParamOpt.of(1), // 增产效果 -> 0:额外产出 1:生产加速
});

// 制造厂类建筑(需指定制造配方的建筑) ParamParser
export const assembleParamParser = new ParamParser(1, {
    acceleratorMode: ParamOpt.of(0), // 增产效果 -> 0:额外产出 1:生产加速
});

// 传送带 ParamParser
export const beltParamParser = new ParamParser(2, {
    iconId: ParamOpt.of(0), // 图标标签物品id
    count: ParamOpt.of(1), // 图标标签下的数字
});

// 分拣器 ParamParser
export const inserterParamParser = new ParamParser(1, {
    length: ParamOpt.of(0), // 分拣器长度 -> 1-3
});

// 储液罐 ParamParser
export const tankParamParser = new ParamParser(2, {
    output: BoolParamOpt.of(0), // 是否输出 Boolean
    input: BoolParamOpt.of(1), // 是否输入 Boolean
});

// 电磁轨道弹射器 ParamParser
export const ejectorParamParser = new ParamParser(2, {
    orbitId: ParamOpt.of(0), // 送入轨道编号 -> 0:无 1-20:轨道列表编号
    tenfoldSpeed: BoolParamOpt.of(1, 1, 0), // 是否开启十倍射速 Boolean_1_0
});

// 射线接收站 ParamParser
export const powerGeneratorParamParser = new ParamParser(1, {
    productId: ParamOpt.of(0), // 模式 -> 0:直接发电 1208:光子生成
});

// 能量枢纽 ParamParser
export const energyExchangerParamParser = new ParamParser(1, {
    mode: ParamOpt.of(0), // 模式 -> -1:放电 0:待机 1:充电
});

// 垂直发射井 ParamParser
export const verticalLaunchingSiloParamParser = new ParamParser(1, {
    tenfoldSpeed: BoolParamOpt.of(0, 1, 0), // 是否开启十倍射速 Boolean_1_0
});

// 流速监测器 ParamParser
export const MonitorParamParser = new ParamParser(128, {
    targetBeltId: ParamOpt.of(0), // 绑定的传送带节点ID（实际id，不是蓝图index，疑似无效参数）
    offset: ParamOpt.of(1), // ?

    targetCargoAmount: ParamOpt.of(2), // 目标流量(单位：0.1个)
    periodTicksCount: ParamOpt.of(3), // 监测周期(单位：秒)
    passOperator: ParamOpt.of(4), // 监测条件 -> 0:等于 1:不等于 2:大于等于 3:大于 4:小于等于 5:小于
    passColorId: ParamOpt.of(5), // 满足条件颜色索引 -> 0-255
    failColorId: ParamOpt.of(6), // 不满足条件颜色索引 -> 0-255
    cargoFilter: ParamOpt.of(14), // 货物过滤物品id -> 0:不过滤 物品id->过滤
    spawnItemOperator: ParamOpt.of(20), // 生成/消耗货物模式 -> 0:不勾选 1:生成货物 2:消耗货物

    systemWarningMode: ParamOpt.of(10), // 系统警报模式 -> 0:无 1:未满足条件 2:满足条件 3:有货物响 4:无货物响 5:未满足且有货物 6:未满足且无货物
    systemWarningIconId: ParamOpt.of(17), // 系统警报图标id

    alarmMode: ParamOpt.of(12), // 声音警报模式 -> 0:无 1:未满足条件 2:满足条件 3:有货物响 4:无货物响 5:未满足且有货物 6:未满足且无货物
    tone: ParamOpt.of(7), // 声音警报-音色 -> 20-24:警报 1-2:钢琴 3-4:贝斯 5-6:风琴 7-9:铺底 10:铜管乐 11:梦铃 12:玻璃 13:吉他 14:音乐盒 15:电子琴 16:小号 17:小提琴 18:低音贝斯 19:鼓
    falloffRadius: [ // 声音警报-声音衰减范围
        FunParamOpt.of(18, (pVal) => pVal * 10, (oVal) => oVal / 10), // 开始衰减距离(单位：米) -> 默认为 衰减为0距离/3（0-133）
        FunParamOpt.of(19, (pVal) => pVal * 10, (oVal) => oVal / 10), // 衰减为0距离(单位：米) -> 1-400
    ],
    repeat: BoolParamOpt.of(11, 1, 0), // 声音警报-是否循环 Boolean_1_0
    pitch: ParamOpt.of(9), // 声音警报-音阶 -> 例：25:C2 26:C#2 27:D2 ...
    volume: ParamOpt.of(8), // 声音警报-音量 -> 0-100
    length: FunParamOpt.of(13, (pVal) => pVal * 10000, (oVal) => oVal / 10000), // 声音警报-时长(只有音色为警报时有该参数) -> 0.1-20
});

// 物流配送器 ParamParser
export const dispenserParamParser = new ParamParser(128, {
    playerMode: ParamOpt.of(0), // 机甲供需模式 -> 1:从伊卡洛斯回收 2:向伊卡洛斯供应和回收 3:向伊卡洛斯供应
    storageMode: ParamOpt.of(1), // 配送器间模式 -> 0:不勾选 1:向其他配送器供应 2:向其他配送器需求
    workEnergyPerTick: FunParamOpt.of(2, workEnergyPerTickEncode, workEnergyPerTickDecode), // 最大充能功率(单位：MW) -> 0.9-9
    courierAutoReplenish: BoolParamOpt.of(3, 1, 0), // 是否自动补充运输单位 Boolean_1_0
});

// 炮台类建筑 ParamParser
export const turretParamParser = new ParamParser(128, {
    group: ParamOpt.of(1), // 分组编号 -> 0:不分组 1-5:分组
    vsSettings: FunParamOpt.of(2, (pVal) => {
        if (!pVal) return 0;
        return (pVal[0] << 0) + (pVal[1] << 2) + (pVal[2] << 4) + (pVal[3] << 6)
    }, (oVal) => {
        // 使用8位二进制数代表4个开关分别4种状态
        // 0:关闭
        // 1:地面低优先 2:地面均衡 3:地面高优先 01 10 11
        // 4:低空低优先 8:低空均衡 12:低空高优先 0100 1000 1100
        // 16:高空低优先 32:高空均衡 48:高空高优先 010000 100000 110000
        // 64:太空低优先 128:太空均衡 192:太空高优先 01000000 10000000 11000000
        return [
            oVal & 3, // 地面优先级 -> 0:关闭 1:低优先 2:均衡 3:高优先
            oVal >> 2 & 3, // 低空优先级 -> 0:关闭 1:低优先 2:均衡 3:高优先
            oVal >> 4 & 3, // 高空优先级 -> 0:关闭 1:低优先 2:均衡 3:高优先
            oVal >> 6 & 3, // 太空优先级 -> 0:关闭 1:低优先 2:均衡 3:高优先
        ]
    }), // 攻击设置优先级
    phasePos: FunParamOpt.of(3, (pVal) => pVal * 60, (oVal) => oVal / 60), // 干扰塔相位偏移(单位：秒) -> 0-5
});

// 默认 ParamParser
export const unknownParamParser = new DefaultParamParser();