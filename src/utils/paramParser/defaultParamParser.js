import { setParam, getParam } from "./paramOptions/paramOpt";
/**
 * 默认建筑参数解析器
 */
export default class DefaultParamParser {
    /**
     * 获取参数长度（每单位：4字节）
     * @param {Object} p 建筑参数
     */
    getLength(p) {
        if (p._defaultParams instanceof Int32Array) {
            return p._defaultParams.length;
        } if (p._defaultParams) {
            return Object.keys(p._defaultParams).length;
        } else {
            return 0;
        }
    }
    /**
     * @param {Object} p 建筑参数
     * @param {DataView} v 
     */
    encode(p, v) {
        for (let i = 0; i < this.getLength(p); i++) {
            setParam(v, i, p._defaultParams[i]);
        }
    }
    /**
     * @param {DataView} v 
     * @return {Object} 建筑参数
     */
    decode(v) {
        const p = {
            _defaultParams: new Int32Array(v.byteLength / Int32Array.BYTES_PER_ELEMENT),
        };
        for (let i = 0; i < p._defaultParams.length; i++) {
            p._defaultParams[i] = getParam(v, i);
        }
        return p;
    }
}