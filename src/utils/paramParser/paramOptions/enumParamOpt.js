import ParamOpt from "./paramOpt";
/**
 * 枚举 建筑参数配置
 */
export default class EnumParamOpt extends ParamOpt {
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Map} enumMap 枚举Map
     */
    constructor(pos, enumMap) {
        super(pos);
        this.enumMap = enumMap;
    }
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Map} enumMap 枚举Map
     */
    static of(pos, enumMap) {
        return new EnumParamOpt(pos, enumMap);
    }
    /**
     * @param {DataView} v 
     * @param value 属性值
     */
    setParam(v, value) {
        // 从枚举值转回原始值
        const et = this.enumMap.entries();
        while (!et.done) {
            if (value === et.value[1]) {
                value = et.value[0];
                break;
            }
        }
        super.setParam(v, value);
    }
    /**
     * @param {DataView} v 
     */
    getParam(v) {
        let value = super.getParam(v);
        // 转为枚举值
        if (this.enumMap.has(value)) {
            value = this.enumMap.get(value);
        }
        return value;
    }
}