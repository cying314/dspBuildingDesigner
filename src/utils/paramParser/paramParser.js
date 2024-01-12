import DefaultParamParser from "./defaultParamParser";
import ParamOpt from "./paramOptions/paramOpt";

/**
 * 建筑参数解析器
 */
export default class ParamParser extends DefaultParamParser {
    /**
     * @param {Number} size 参数长度（每单位：4字节）
     * @param {Object} params 参数模板 {
     *   ...key: @param {ParamOpt} 建筑参数配置
     * }
     */
    constructor(size, params) {
        super();
        this.size = size;
        this.params = params;
    }
    /**
     * 获取参数长度（每单位：4字节）
     * @param {Object} p 建筑参数
     */
    getLength(p) {
        if (!this.size) return super.getLength(p);
        return this.size;
    }
    /**
     * @param {Object} p 建筑参数
     * @param {DataView} v 
     */
    encode(p, v) {
        if (!this.params) return super.encode(p, v);
        deepEncode(this.params, p, v);
    }
    /**
     * @param {DataView} v 
     * @return {Object} 建筑参数
     */
    decode(v) {
        if (!this.params) return super.decode(v);
        return deepDecode(this.params, v);
    }
}

/**
 * 递归遍历参数模板对象，将建筑参数 解析回 字节数据
 * @param _params 参数模板
 * @param _pValue 建筑参数
 * @param {DataView} v  
 */
function deepEncode(_params, _pValue, v) {
    if (_params === null || typeof _params !== "object") {
        return;
    }
    if (_params instanceof ParamOpt) {
        return _params.setParam(v, _pValue);
    }
    for (var key in _params) {
        if (Object.prototype.hasOwnProperty.call(_params, key)) {
            if (_pValue === null || typeof _pValue !== "object") {
                deepEncode(_params[key], null, v);
            } else {
                deepEncode(_params[key], _pValue[key], v);
            }
        }
    }
}

/**
 * 递归遍历参数模板对象，从字节数据中 解析出 实际的建筑参数
 * @param _params 参数模板
 * @param {DataView} v
 * @return {Object} 建筑参数
 */
function deepDecode(_params, v) {
    if (_params === null || typeof _params !== "object") {
        return _params;
    }
    if (_params instanceof ParamOpt) {
        return _params.getParam(v);
    }
    var p = Array.isArray(_params) ? [] : {};
    for (var key in _params) {
        if (Object.prototype.hasOwnProperty.call(_params, key)) {
            p[key] = deepDecode(_params[key], v);
        }
    }
    return p;
}