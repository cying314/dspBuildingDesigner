/**
 * 建筑参数配置
 */
export default class ParamOpt {
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     */
    constructor(pos) {
        this.pos = pos;
    }
    /**
     * @param {Number | Function} pos 参数相对位置（在DataView中的字节偏移量/4）
     */
    static of(pos) {
        return new ParamOpt(pos);
    }
    /**
     * @param {DataView} v 
     * @param value 属性值
     */
    setParam(v, value) {
        let pos = typeof this.pos === 'function' ? this.pos(v) : this.pos; // 若pos为函数则动态获取
        setParam(v, pos, value);
    }
    /**
     * @param {DataView} v 
     */
    getParam(v) {
        let pos = typeof this.pos === 'function' ? this.pos(v) : this.pos; // 若pos为函数则动态获取
        return getParam(v, pos);
    }
}

export function setParam(v, pos, value) {
    v.setInt32(pos * Int32Array.BYTES_PER_ELEMENT, value, true);
}

export function getParam(v, pos) {
    return v.getInt32(pos * Int32Array.BYTES_PER_ELEMENT, true);
}