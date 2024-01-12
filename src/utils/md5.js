const K = Int32Array.of(0xd76aa478, 0xe8d7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304623, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b9f1122, 0xfd987193, 0xa679438e, 0x39b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xc9b6c7aa, 0xd62f105d, 0x02443453, 0xd8a1e681, 0xe7d3fbc8, 0x21f1cde6, 0xc33707d6, 0xf4d50d87, 0x475a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391);
const S = Uint8Array.of(7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21);
const INIT_MD5F = new DataView(Uint8Array.of(0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xdc, 0xef, 0xfe, 0xdc, 0xba, 0x98, 0x46, 0x57, 0x32, 0x10).buffer);
const MASK32 = -1;
function rotateLeft(x, s) {
    return ((x << s) | (x >>> (32 - s))) & MASK32;
}
function updateBlock(s, buf) {
    let a = s[0];
    let b = s[1];
    let c = s[2];
    let d = s[3];
    for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) {
            f = (b & c) | (~b & d);
            g = i;
        }
        else if (i < 32) {
            f = (d & b) | (~d & c);
            g = (5 * i + 1) % 16;
        }
        else if (i < 48) {
            f = b ^ c ^ d;
            g = (3 * i + 5) % 16;
        }
        else {
            f = c ^ (b | ~d);
            g = (7 * i) % 16;
        }
        f = (f + a + K[i] + buf.getInt32(g * Int32Array.BYTES_PER_ELEMENT, true)) & MASK32;
        a = d;
        d = c;
        c = b;
        b = b + rotateLeft(f, S[i]);
    }
    s[0] = (s[0] + a) & MASK32;
    s[1] = (s[1] + b) & MASK32;
    s[2] = (s[2] + c) & MASK32;
    s[3] = (s[3] + d) & MASK32;
}
const BLOCK_SIZE = 64;
export function digest(data) {
    const s = Int32Array.of(INIT_MD5F.getInt32(0 * Int32Array.BYTES_PER_ELEMENT, true), INIT_MD5F.getInt32(1 * Int32Array.BYTES_PER_ELEMENT, true), INIT_MD5F.getInt32(2 * Int32Array.BYTES_PER_ELEMENT, true), INIT_MD5F.getInt32(3 * Int32Array.BYTES_PER_ELEMENT, true));
    let i = 0;
    for (; i <= data.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(data, i, BLOCK_SIZE));
    }
    const last = new ArrayBuffer(Math.ceil((data.byteLength - i + 9) / BLOCK_SIZE) * BLOCK_SIZE);
    const dataView = new Uint8Array(data);
    const lastView = new DataView(last);
    let j = 0;
    for (; i + j < data.byteLength; j++) {
        lastView.setUint8(j, dataView[i + j]);
    }
    lastView.setUint8(j, 0x80);
    lastView.setUint32(last.byteLength - 8, data.byteLength * 8, true);
    for (i = 0; i <= last.byteLength - BLOCK_SIZE; i += BLOCK_SIZE) {
        updateBlock(s, new DataView(last, i, BLOCK_SIZE));
    }
    const result = new ArrayBuffer(16);
    const resultView = new DataView(result);
    for (let i = 0; i < s.length; i++) {
        resultView.setInt32(i * Int32Array.BYTES_PER_ELEMENT, s[i], true);
    }
    return result;
}