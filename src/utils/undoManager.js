import * as Cfg from "../graph/graphConfig.js";
import localforage from "localforage"; // 离线存储
const STORE = localforage.createInstance({
  driver: localforage.INDEXEDDB,
  name: "dsp-building-designer", // 数据库名称
  version: 1, // 数据库版本号
  storeName: "dsp-graph-undo-manager", // 存储对象的名称
});
const UNDO_PREFIX = "undo_";
const REDO_PREFIX = "redo_";

const DESTROY_KEY = "0000"; // 销毁key（需按字符排序在最前面）
const ACT_TIME_KEY = "0001"; // 激活时间key
const SEP = "--";

const RECORD_EXPIRES = 48 * 3600 * 1000; // 撤回对象过期时间（48小时未操作则过期）
export default class UndoManager {
  /** 撤回重做记录ID @type {string} */ _id;
  /** 撤回开始索引 @type {number} */ _undoStart = 0;
  /** 撤回结束索引 @type {number} */ _undoEnd = 0;
  /** 重做开始索引 @type {number} */ _redoStart = 0;
  /** 重做结束索引 @type {number} */ _redoEnd = 0;
  /** 最大撤回次数 @type {number} */ maxUndoNum = Cfg.maxUndoNum;

  constructor() {
    this._id = Date.now() + "_" + this.randomNum(3);
    this.clearExpiredRecord();
    // 监听页面关闭时，销毁离线存储对象
    window.addEventListener("beforeunload", () => {
      this.destroy();
    });
  }

  // 生成指定长度的随机数字字符串
  randomNum(len) {
    if (len >= 1) {
      let num = Math.round(Math.random() * Math.pow(10, len));
      return num.toString().padStart(len, "0"); // 补零
    } else {
      return "";
    }
  }

  init(record) {
    this.clear();
    this.pushUndo(record);
  }

  clear() {
    this.clearUndo();
    this.clearRedo();
  }

  destroy() {
    // 标记为销毁
    this.setItem(DESTROY_KEY, 1).then(() => {
      // 清除所有记录
      this.clearAllItem();
    });
  }

  // store start
  /** 记录id激活时间 */
  active(id) {
    let now = Date.now();
    STORE.setItem(id + SEP + ACT_TIME_KEY, now);
    return now;
  }
  getItem(key, callback) {
    this.active(this._id);
    return STORE.getItem(this._id + SEP + key, callback).then((record) => {
      if (record == null) {
        throw Error("记录数据丢失：" + this._id + SEP + key);
      }
      return record.d;
    });
  }
  setItem(key, value, callback) {
    let now = this.active(this._id);
    return STORE.setItem(this._id + SEP + key, { t: now, d: value }, callback);
  }
  removeItem(key, callback) {
    return STORE.removeItem(this._id + SEP + key, callback);
  }
  clearAllItem() {
    return STORE.keys().then(async (keys) => {
      keys.sort().reverse(); // 最后清除0000
      for (let k of keys) {
        if (k.startsWith(this._id + SEP)) {
          await STORE.removeItem(k);
        }
      }
    });
  }
  /** 清理过期的对象 */
  async clearExpiredRecord() {
    await STORE.keys().then(async (keys) => {
      keys.sort(); // 优先判断0000
      let keyPrefix;
      for (let k of keys) {
        if (keyPrefix && k.startsWith(keyPrefix)) {
          await STORE.removeItem(k);
        } else if (k.endsWith(DESTROY_KEY)) {
          // 判断为销毁标记，删除同一前缀所有记录
          keyPrefix = k.slice(0, -DESTROY_KEY.length);
          await STORE.removeItem(k);
        } else if (k.endsWith(ACT_TIME_KEY)) {
          // 判断为激活时间标记，获取激活时间判断是否过期（兜底来不及设置销毁标记的情况）
          let actTime = await STORE.getItem(k);
          if (actTime == null || Date.now() - actTime > RECORD_EXPIRES) {
            // 判断对象过期，删除同一前缀所有记录
            keyPrefix = k.slice(0, -DESTROY_KEY.length);
            await STORE.removeItem(k);
          }
        } else {
          keyPrefix = null;
        }
      }
    });
  }
  // store end

  // 撤回 start
  getUndoLen() {
    return this._undoEnd - this._undoStart;
  }
  isCanUndo() {
    return this.getUndoLen() > 1;
  }
  clearUndo() {
    let i = this._undoStart;
    this._undoStart = this._undoEnd;
    for (; i < this._undoStart; i++) {
      this.removeUndoByIndex(i);
    }
  }
  getUndoByIndex(idx) {
    return this.getItem(UNDO_PREFIX + idx).catch((e) => {
      let msg = "读取撤回数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  setUndoByIndex(idx, record) {
    return this.setItem(UNDO_PREFIX + idx, record).catch((e) => {
      let msg = "记录撤回数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  removeUndoByIndex(idx) {
    return this.removeItem(UNDO_PREFIX + idx).catch((e) => {
      let msg = "删除撤回数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  pushUndo(record) {
    if (this.getUndoLen() >= this.maxUndoNum) {
      this.removeUndoByIndex(this._undoStart++);
    }
    return this.setUndoByIndex(this._undoEnd++, record);
  }
  popUndo() {
    return this.getUndoByIndex(--this._undoEnd);
  }
  getLastOfUndo() {
    return this.getUndoByIndex(this._undoEnd - 1);
  }
  // 撤回 end

  // 重做 start
  getRedoLen() {
    return this._redoEnd - this._redoStart;
  }
  isCanRedo() {
    return this.getRedoLen() > 0;
  }
  clearRedo() {
    let i = this._redoStart;
    this._redoStart = this._redoEnd;
    for (; i < this._redoStart; i++) {
      this.removeRedoByIndex(i);
    }
  }
  getRedoByIndex(idx) {
    return this.getItem(REDO_PREFIX + idx).catch((e) => {
      let msg = "读取重做数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  setRedoByIndex(idx, record) {
    return this.setItem(REDO_PREFIX + idx, record).catch((e) => {
      let msg = "记录重做数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  removeRedoByIndex(idx) {
    return this.removeItem(REDO_PREFIX + idx).catch((e) => {
      let msg = "删除重做数据失败-" + idx;
      console.error(msg, e);
      throw new Error(msg);
    });
  }
  pushRedo(record) {
    return this.setRedoByIndex(this._redoEnd++, record);
  }
  popRedo() {
    return this.getRedoByIndex(--this._redoEnd);
  }
  // 重做 end
}
