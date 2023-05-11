import mongoose, { Schema, Document } from "mongoose";

export interface IFeature { 
    name: string;
    type: string;
}

export interface IFeatureModel extends IFeature, Document {}

const Feature = new Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
});

export default mongoose.model<IFeature>('Feature', Feature);