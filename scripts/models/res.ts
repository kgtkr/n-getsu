import { Schema, model, Document } from 'mongoose';

export interface Res extends Document {
    raw: string;
    filename: string;
    title: string;
    stamp: number;
    md5: string;
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
    thread?: {
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
    raw: { type: String, required: true },
    filename: { type: String, required: true },
    title: { type: String, required: true },
    stamp: { type: Number, required: true, index: true },
    md5: { type: String, required: true },
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
    thread: new Schema({
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
    }),
}, { autoIndex: false });

ResSchema.index({ filename: 1, md5: 1 }, { unique: true });

export const ResModel = model<Res>("Res", ResSchema);