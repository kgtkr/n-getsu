import { Schema, model, Document } from 'mongoose';

export interface Update extends Document {
    raw: string;
    stamp: Number;
    md5: string;
    title: string;
    filename: string;
    tags: string[];
}


export const UpdateSchema = new Schema({
    raw: { type: String, required: true },
    stamp: { type: Number, required: true, index: true },
    md5: { type: String, required: true },
    title: { type: String, required: true },
    filename: { type: String, required: true },
    tags: { type: [String], required: true }
}, { autoIndex: false });

UpdateSchema.index({ filename: 1, md5: 1 }, { unique: true });

export const UpdateModel = model<Update>("Update", UpdateSchema);