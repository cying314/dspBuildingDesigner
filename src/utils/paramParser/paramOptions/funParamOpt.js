import ParamOpt from "./paramOpt";
/**
 * 自定义转换方法 建筑参数配置
 */
export default class FunParamOpt extends ParamOpt {
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Function} encode 编码转换方法（对象值->原始值）
     * @param {Function} decode 解码转换方法（原始值->对象值）
     */
    constructor(pos, encode, decode) {
        super(pos);
        this.encode = encode;
        this.decode = decode;
    }
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     * @param {Function} encode 编码转换方法（对象值->原始值）
     * @param {Function} decode 解码转换方法（原始值->对象值）
     */
    static of(pos, encode, decode) {
        return new FunParamOpt(pos, encode, decode);
    }
    /**
     * @param {DataView} v 
     * @param value 属性值
     */
    setParam(v, value) {
        // 编码转为原始值
        super.setParam(v, this.encode(value, v));
    }
    /**
     * @param {DataView} v 
     */
    getParam(v) {
        // 解码转换
        return this.decode(super.getParam(v), v);
    }
}