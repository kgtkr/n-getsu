import { Schema, model, Document } from 'mongoose';

export interface SearchNode extends Document {
    node: string;
    filename: string;
}

export const SearchNodeSchema = new Schema({
    node: { type: String, required: true },
    filename: { type: String, required: true }
}, { autoIndex: true,minimize:false });

SearchNodeSchema.index({ node: 1, filename: 1 }, { unique: true });

export const SearchNodeModel = model<SearchNode>("SearchNode", SearchNodeSchema);