import mongoose, { Schema, Document } from "mongoose";

import { FeatureType } from "./interfaces/featureType.enum";

export interface IFeature { 
    name: string;
    type: FeatureType;
}

export interface IFeatureModel extends IFeature, Document {}

const Feature = new Schema({
    name: { type: String, required: true },
    type: {
        type: String,
        enum: Object.values(FeatureType),
        required: true
    },
});

export default mongoose.model<IFeature>('Feature', Feature);