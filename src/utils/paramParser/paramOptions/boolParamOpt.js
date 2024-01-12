import ParamOpt from "./paramOpt";
/**
 * 布尔 建筑参数配置
 */
export default class BoolParamOpt extends ParamOpt {
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Number} trueValue true对应的值（默认1）
     * @param {Number} falseValue false对应的值（默认-1）
     */
    constructor(pos, trueValue = 1, falseValue = -1) {
        super(pos);
        this.trueValue = trueValue;
        this.falseValue = falseValue;
    }
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Number} trueValue true对应的值（默认1）
     * @param {Number} falseValue false对应的值（默认-1）
     */
    static of(pos, trueValue = 1, falseValue = -1) {
        return new BoolParamOpt(pos, trueValue, falseValue);
    }
    /**
     * @param {DataView} v 
     * @param value 属性值
     */
    setParam(v, value) {
        // 从布尔值转回原始值
        if (value === true) {
            value = this.trueValue;
        } else if (value === false) {
            value = this.falseValue;
        }
        super.setParam(v, value);
    }
    /**
     * @param {DataView} v 
     */
    getParam(v) {
        let value = super.getParam(v);
        // 转为布尔值
        if (value === this.trueValue) {
            value = true;
        } else if (value === this.falseValue) {
            value = false;
        }
        return value;
    }
}