import { Schema, model, Document } from 'mongoose';
import * as util from '../util';
import * as cryptojs from 'crypto-js';
import * as ent from 'ent';
import * as rsa from '../rsa';

export interface Res extends Document {
  text: string;
  filename: string;
  stamp: number;
  md5: string;
  active: boolean;
  //md5の先頭8文字
  md5Short: string;
  signature?: {
    pubkey: string;
    sign: string;
    target: string[];
  };
  del?: {
    stamp: number;
    md5: string;
  };
  thread: {
    name?: string;
    body?: {
      text: string,
      replys: string[]
    };
    mail?: string;
    file?: {
      ex: string;
      data: Buffer;
    };
  };
}

export const ResSchema = new Schema({
  text: { type: String, required: true },
  filename: { type: Boolean, required: true },
  stamp: { type: Number, required: true },
  md5: { type: String, required: true },
  active: { type: String, required: true },
  md5Short: { type: String, required: true },
  signature: new Schema({
    pubkey: { type: String, required: true },
    sign: { type: String, required: true },
    target: { type: [String], required: true },
  }),
  del: new Schema({
    stamp: { type: Number, required: true },
    md5: { type: String, required: true },
  }),
  thread: {
    type: new Schema({
      name: String,
      body: new Schema({
        text: { type: String, required: true },
        replys: { type: [String], required: true, index: true }
      }),
      mail: String,
      file: new Schema({
        ex: { type: String, required: true },
        data: { type: Buffer, required: true },
      }),
    }), required: true
  },
}, { autoIndex: true, minimize: false });

ResSchema.index({ filename: 1, md5: 1, stamp: 1 }, { unique: true });

export const ResModel = model<Res>("Res", ResSchema);

export function fromRecord(filename: string, record: string): Res {
  //「タイムスタンプ<>識別子<>本文」に分割
  let recordArr = util.strsplit(record, '<>', 3);

  //長さチェック
  if (recordArr.length !== 3) {
    throw new Error();
  }
  let [stampStr, md5, text] = recordArr;

  //タイムスタンプの検証
  if (!/^[0-9]+$/.test(stampStr)) {
    throw new Error();
  }
  let stamp = +stampStr;

  //md5の検証
  if (cryptojs.MD5(text) !== md5) {
    throw new Error();
  }

  //res作成
  let res = new ResModel({
    text,
    filename,
    stamp,
    md5,
    active: true,
    //md5の先頭8文字
    md5Short: md5.substr(0, 8),
    thread: {}
  });

  //名前付きフィールド
  let namedField = parseNamedField(text);

  //TODO:署名チェック
  {
    let pubkey = namedField.get('pubkey');
    let sign = namedField.get('sign');
    let target = namedField.get('target');
    if (pubkey !== undefined && sign !== undefined && target !== undefined) {
      if (!/^[a-zA-Z0-9+/]{86}$/.test(pubkey) || !/^[a-zA-Z0-9+/]{86}$/.test(sign)) {
        throw new Error();
      }

      let targetArr = target.split(',');
      if (!targetArr.every(x => /^[a-zA-Z0-9]+$/.test(x))) {
        throw new Error();
      }

      let m = targetArr.map(x => {
        let val = namedField.get(x);
        if (val === undefined) {
          throw new Error();
        }
        return val;
      }).join('<>');

      if (!rsa.varify(m, sign, pubkey)) {
        throw new Error();
      }

      res.signature = {
        sign,
        pubkey,
        target: targetArr
      };
    }
  }

  //削除通知
  {
    let removeStamp = namedField.get('remove_stamp');
    let removeId = namedField.get('remove_id');
    if (removeStamp !== undefined && removeId !== undefined) {
      if (!/^[0-9]+$/.test(removeStamp) || !/^[a-z0-9]{32}$/.test(removeId)) {
        throw new Error();
      }
      res.del = {
        stamp: +removeStamp,
        md5: removeId
      }
    }
  }

  //掲示板
  {
    //名前
    {
      let name = namedField.get('name');
      if (name !== undefined) {
        res.thread.name = ent.decode(name);
      }
    }

    //本文
    {
      let body = namedField.get('body');
      if (body !== undefined) {
        let decodeBody = ent.decode(body.replace('<br>', '\n'));
        let replys = decodeBody.match(/>>([a-z0-9]{8})/g);

        res.thread.body = {
          text: decodeBody,
          replys: replys !== null ? Array.from(new Set(replys)) : []
        }
      }
    }

    //ファイル
    {
      let attach = namedField.get('attach');
      let suffix = namedField.get('suffix');
      if (attach !== undefined && suffix !== undefined) {
        if (!/^[a-z0-9]+$/.test(suffix)) {
          throw new Error();
        }

        res.thread.file = {
          data: new Buffer(attach, 'base64'),
          ex: suffix
        };
      }
    }

    //メール
    {
      let mail = namedField.get('mail');
      if (mail !== undefined) {
        res.thread.mail = ent.decode(mail);
      }
    }

    //名前
    {
      let name = namedField.get('name');
      if (name !== undefined) {
        res.thread.name = ent.decode(name);
      }
    }


    return res;
  }
}

export function parseNamedField(text: string): Map<string, string> {
  let result = new Map<string, string>();

  let arr = text.split('<>');
  arr.forEach(x => {
    let reg = x.match(/^([a-zA-Z0-9_]+):(.+)$/);
    if (!reg) {
      throw new Error();
    }
    result.set(reg[1], reg[2]);
  });

  return result;
}

export module convertRes {
  export function toRecord(res: Res): string {
    return `${res.stamp}<>${res.md5}<>${res.text}`;
  }

  export function toRecent(res: Res): string {
    return `${res.stamp}<>${res.md5}<>${res.filename}`;
  }

  export function toHead(res: Res): string {
    return `${res.stamp}<>${res.md5}`;
  }
}