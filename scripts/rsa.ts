/**
 * https://github.com/WhiteCat6142/syake
 */

import * as bigInt from 'big-integer';
import * as crypto from 'crypto';

function fromS(str: string): BigInteger {
    var tmp: any = bigInt.zero;
    var i = str.length;
    while (i--) {
        tmp = tmp.shiftLeft(8).add(str.charCodeAt(i));
    }
    return tmp;
}
const dic: { [key: number]: number } = {};
dic[0x41] = 0; dic[0x42] = 1; dic[0x43] = 2; dic[0x44] = 3; dic[0x45] = 4; dic[0x46] = 5; dic[0x47] = 6; dic[0x48] = 7; dic[0x49] = 8; dic[0x4a] = 9; dic[0x4b] = 10; dic[0x4c] = 11; dic[0x4d] = 12; dic[0x4e] = 13; dic[0x4f] = 14; dic[0x50] = 15;
dic[0x51] = 16; dic[0x52] = 17; dic[0x53] = 18; dic[0x54] = 19; dic[0x55] = 20; dic[0x56] = 21; dic[0x57] = 22; dic[0x58] = 23; dic[0x59] = 24; dic[0x5a] = 25; dic[0x61] = 26; dic[0x62] = 27; dic[0x63] = 28; dic[0x64] = 29; dic[0x65] = 30; dic[0x66] = 31;
dic[0x67] = 32; dic[0x68] = 33; dic[0x69] = 34; dic[0x6a] = 35; dic[0x6b] = 36; dic[0x6c] = 37; dic[0x6d] = 38; dic[0x6e] = 39; dic[0x6f] = 40; dic[0x70] = 41; dic[0x71] = 42; dic[0x72] = 43; dic[0x73] = 44; dic[0x74] = 45; dic[0x75] = 46; dic[0x76] = 47;
dic[0x77] = 48; dic[0x78] = 49; dic[0x79] = 50; dic[0x7a] = 51; dic[0x30] = 52; dic[0x31] = 53; dic[0x32] = 54; dic[0x33] = 55; dic[0x34] = 56; dic[0x35] = 57; dic[0x36] = 58; dic[0x37] = 59; dic[0x38] = 60; dic[0x39] = 61; dic[0x2b] = 62; dic[0x2f] = 63;
function fromB(str: string): BigInteger {
    var bin: any = bigInt.zero;
    var i = str.length;
    while (i--) {
        bin = bin.shiftLeft(6).add(dic[str.charCodeAt(i)]);
    }
    return bin;
}
function md5(s: string) {
    return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

/**
 * 検証
 * m 生文字列
 */
export function varify(m: string, sign: string, pubkey: string): boolean {
    return fromS(md5(m)).equals((<any>fromB(sign)).modPow(65537, fromB(pubkey)));
}