import mongoose, { Schema, Document } from "mongoose";

import { IConnectionModel } from "../connection/connection.shema";
import { IFeatureModel } from "../feature/feature.schema";
import { IUnitModel } from "../unit/unit.schema";

export interface IField {
    feature: IFeatureModel,
    source: string
}

export interface ISyncronization { 
    unit: IUnitModel;
    connection: IConnectionModel;
    fields: IField[];
}

export interface ISyncronizationModel extends ISyncronization, Document { }

const Syncronization = new Schema({
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    connection: { type: Schema.Types.ObjectId, ref: 'Connection', required: true },
    fields: [{  
        feature: { type: Schema.Types.ObjectId, ref: 'Feature', required: true },
        source: { type: String, required: true }
    }]
});

export default mongoose.model<ISyncronization>('Syncronization', Syncronization);