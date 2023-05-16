import mongoose, { Schema, Document } from "mongoose";

import { IFeatureModel } from "../feature/feature.schema";

export interface IUnit { 
    name: string;
    features: IFeatureModel[];
}

export interface IUnitModel extends IUnit, Document { }

const Unit = new Schema({
    name: { type: String, required: true },
    features: [{ type: Schema.Types.ObjectId, ref: 'Feature' }],
});

export default mongoose.model<IUnit>('Unit', Unit);