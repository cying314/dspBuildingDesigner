import pako from 'pako';
import { digest } from './md5';
import { getParamParser } from '@/utils/paramParser/paramParserFactory';
import { itemsMap } from "@/utils/itemsUtil";

class BufferIO {
    view;
    pos = 0;
    constructor(view) {
        this.view = view;
    }
    getView(length) {
        const r = new DataView(this.view.buffer, this.view.byteOffset + this.pos, length);
        this.pos += length;
        return r;
    }
}
class BufferReader extends BufferIO {
    getUint8() { const v = this.view.getUint8(this.pos); this.pos += 1; return v; }
    getInt8() { const v = this.view.getInt8(this.pos); this.pos += 1; return v; }
    getInt16() { const v = this.view.getInt16(this.pos, true); this.pos += 2; return v; }
    getInt32() { const v = this.view.getInt32(this.pos, true); this.pos += 4; return v; }
    getFloat32() { const v = this.view.getFloat32(this.pos, true); this.pos += 4; return v; }
}
class BufferWriter extends BufferIO {
    setUint8(value) { this.view.setUint8(this.pos, value); this.pos += 1; }
    setInt8(value) { this.view.setInt8(this.pos, value); this.pos += 1; }
    setInt16(value) { this.view.setInt16(this.pos, value, true); this.pos += 2; }
    setInt32(value) { this.view.setInt32(this.pos, value, true); this.pos += 4; }
    setFloat32(value) { this.view.setFloat32(this.pos, value, true); this.pos += 4; }
}
function btoUint8Array(b) {
    const arr = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) {
        arr[i] = b.charCodeAt(i);
    }
    return arr;
}
function Uint8ArrayTob(a) {
    let out = '';
    for (let i = 0; i < a.length; i++) {
        out += String.fromCharCode(a[i]);
    }
    return out;
}
const uint8ToHex = new Array(0x100);
for (let i = 0; i < uint8ToHex.length; i++) {
    uint8ToHex[i] = i.toString(16).toUpperCase().padStart(2, '0');
}
function hex(buffer) {
    const view = new Uint8Array(buffer);
    const hexBytes = new Array(view.length);
    for (let i = 0; i < view.length; i++) {
        hexBytes[i] = uint8ToHex[view[i]];
    }
    return hexBytes.join('');
}
function importArea(r) {
    return {
        index: r.getInt8(),
        parentIndex: r.getInt8(),
        tropicAnchor: r.getInt16(),
        areaSegments: r.getInt16(),
        anchorLocalOffset: {
            x: r.getInt16(),
            y: r.getInt16(),
        },
        size: {
            x: r.getInt16(),
            y: r.getInt16(),
        },
    };
}
function exportArea(w, area) {
    w.setInt8(area.index);
    w.setInt8(area.parentIndex);
    w.setInt16(area.tropicAnchor);
    w.setInt16(area.areaSegments);
    w.setInt16(area.anchorLocalOffset.x);
    w.setInt16(area.anchorLocalOffset.y);
    w.setInt16(area.size.x);
    w.setInt16(area.size.y);
}

function importBuilding(r) {
    function fix(num) {
        // 保留4位小数
        return +num?.toFixed(4) || 0;
    }
    function readXYZ() {
        return {
            x: fix(r.getFloat32()),
            y: fix(r.getFloat32()),
            z: fix(r.getFloat32()),
        };
    }
    const num = r.getInt32(); // 兼容(V0.10.30.22239)[2024/05/29]后更新的倾斜字段，新版蓝图数据前缀多个-100
    const b = {
        index: num <= -100 ? r.getInt32() : num,
        areaIndex: r.getInt8(),
        localOffset: [readXYZ(), readXYZ()],
        yaw: [fix(r.getFloat32()), fix(r.getFloat32())],
        tilt: num <= -100 ? r.getFloat32() : 0,
        itemId: r.getInt16(),
        modelIndex: r.getInt16(),
        outputObjIdx: r.getInt32(),
        inputObjIdx: r.getInt32(),
        outputToSlot: r.getInt8(),
        inputFromSlot: r.getInt8(),
        outputFromSlot: r.getInt8(),
        inputToSlot: r.getInt8(),
        outputOffset: r.getInt8(),
        inputOffset: r.getInt8(),
        recipeId: r.getInt16(),
        filterId: r.getInt16(),
        parameters: null,
    };
    b.itemName = itemsMap.get(b.itemId)?.name || `未知物品_${b.itemId}`;
    const length = r.getInt16();
    if (length > 0) {
        const v = r.getView(length * Int32Array.BYTES_PER_ELEMENT);
        b.parameters = getParamParser(b.itemId).decode(v);
    }
    return b;
}
function exportBuilding(w, b) {
    function writeXYZ(v) {
        w.setFloat32(v.x);
        w.setFloat32(v.y);
        w.setFloat32(v.z);
    }
    w.setInt32(-100); // 兼容(V0.10.30.22239)[2024/05/29]后更新的倾斜字段，新版蓝图数据前缀多个-100
    w.setInt32(b.index);
    w.setInt8(b.areaIndex);
    writeXYZ(b.localOffset[0]);
    writeXYZ(b.localOffset[1]);
    w.setFloat32(b.yaw[0]);
    w.setFloat32(b.yaw[1]);
    w.setFloat32(b.tilt);
    w.setInt16(b.itemId);
    w.setInt16(b.modelIndex);
    w.setInt32(b.outputObjIdx);
    w.setInt32(b.inputObjIdx);
    w.setInt8(b.outputToSlot);
    w.setInt8(b.inputFromSlot);
    w.setInt8(b.outputFromSlot);
    w.setInt8(b.inputToSlot);
    w.setInt8(b.outputOffset);
    w.setInt8(b.inputOffset);
    w.setInt16(b.recipeId);
    w.setInt16(b.filterId);
    if (b.parameters !== null) {
        const parser = getParamParser(b.itemId);
        const length = parser.getLength(b.parameters);
        w.setInt16(length);
        parser.encode(b.parameters, w.getView(length * Int32Array.BYTES_PER_ELEMENT));
    }
    else {
        w.setInt16(0);
    }
}
const START = 'BLUEPRINT:';
const TIME_BASE = new Date(0).setUTCFullYear(1);
export function fromStr(strData) {
    if (!strData.startsWith(START))
        throw Error('Invalid start');
    const p1 = strData.indexOf('"', START.length);
    const cells = strData.substring(START.length, p1).split(',');
    if (cells.length < 12)
        throw Error('Header too short');
    const header = {
        layout: parseInt(cells[1]),
        icons: cells.slice(2, 7).map(s => parseInt(s)),
        time: new Date(TIME_BASE + parseInt(cells[8]) / 10000),
        gameVersion: cells[9],
        shortDesc: decodeURIComponent(cells[10]),
        desc: decodeURIComponent(cells[11]),
    };
    const p2 = strData.length - 33;
    if (strData[p2] !== '"')
        throw Error('Checksum not found');
    const d = hex(digest(btoUint8Array(strData.substring(0, p2)).buffer));
    const expectedD = strData.substring(p2 + 1);
    if (d !== expectedD)
        throw Error('Checksum mismatch');
    const encoded = strData.substring(p1 + 1, p2);
    const decoded = pako.ungzip(btoUint8Array(atob(encoded)));
    const reader = new BufferReader(new DataView(decoded.buffer));
    const meta = {
        version: reader.getInt32(),
        cursorOffset: {
            x: reader.getInt32(),
            y: reader.getInt32(),
        },
        cursorTargetArea: reader.getInt32(),
        dragBoxSize: {
            x: reader.getInt32(),
            y: reader.getInt32(),
        },
        primaryAreaIdx: reader.getInt32(),
    };
    const numAreas = reader.getUint8();
    const areas = [];
    for (let i = 0; i < numAreas; i++)
        areas.push(importArea(reader));
    const numBuildings = reader.getInt32();
    const buildings = [];
    for (let i = 0; i < numBuildings; i++)
        buildings.push(importBuilding(reader));
    return {
        header,
        ...meta,
        areas,
        buildings,
    };
}
function encodedSize(bp) {
    let result = 28 // meta
        + 1 // numAreas
        + 14 * bp.areas.length
        + 4 // numBuildings
        + 69 * bp.buildings.length;
    for (const b of bp.buildings) {
        if (b.parameters === null)
            continue;
        const parser = getParamParser(b.itemId);
        result += parser.getLength(b.parameters) * Int32Array.BYTES_PER_ELEMENT;
    }
    return result;
}
export function toStr(bp) {
    let result = START;
    result += '0,';
    result += bp.header.layout;
    result += ',';
    for (const i of bp.header.icons) {
        result += i;
        result += ',';
    }
    result += '0,';
    result += (new Date(bp.header.time).getTime() - TIME_BASE) * 10000;
    result += ',';
    result += bp.header.gameVersion;
    result += ',';
    result += encodeURIComponent(bp.header.shortDesc);
    result += ',';
    result += encodeURIComponent(bp.header.desc);
    result += '"';
    const decoded = new Uint8Array(encodedSize(bp));
    const writer = new BufferWriter(new DataView(decoded.buffer));
    writer.setInt32(bp.version);
    writer.setInt32(bp.cursorOffset.x);
    writer.setInt32(bp.cursorOffset.y);
    writer.setInt32(bp.cursorTargetArea);
    writer.setInt32(bp.dragBoxSize.x);
    writer.setInt32(bp.dragBoxSize.y);
    writer.setInt32(bp.primaryAreaIdx);
    writer.setUint8(bp.areas.length);
    for (const a of bp.areas)
        exportArea(writer, a);
    writer.setInt32(bp.buildings.length);
    for (const b of bp.buildings)
        exportBuilding(writer, b);
    result += btoa(Uint8ArrayTob(pako.gzip(decoded)));
    const d = hex(digest(btoUint8Array(result).buffer));
    result += '"';
    result += d;
    return result;
}