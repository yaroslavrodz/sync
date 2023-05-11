import mongoose, { Schema, Document } from "mongoose";

import { IFeatureModel } from "../feature/feature.schema";

export interface IRecord { 
    value: any;
    feature: IFeatureModel;
}

export interface IRecordModel extends IRecord, Document { }

const Record = new Schema({
    value: { type: Schema.Types.Mixed, required: true },
    feature: { type: Schema.Types.ObjectId, ref: 'Feature', required: true }
});

export default mongoose.model<IRecord>('Record', Record);