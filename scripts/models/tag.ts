import { Schema, model, Document } from 'mongoose';

export interface Tag extends Document {
    filename: string;
    tag: string;
    user: boolean;
}


export const TagSchema = new Schema({
    filename: { type: String, required: true },
    tag: { type: String, required: true },
    user: { type: Boolean, required: true }
}, { autoIndex: true, minimize: false });

TagSchema.index({ filename: 1, tag: 1, user: 1 }, { unique: true });

export const TagModel = model<Tag>("Tag", TagSchema);