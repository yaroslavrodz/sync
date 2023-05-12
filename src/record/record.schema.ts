import mongoose, { Schema, Document } from "mongoose";

import { IFeatureModel } from "../feature/feature.schema";
import { IDataset } from "../dataset/dataset.schema";

export interface IRecord { 
    value: any;
    archived: boolean;
    feature: IFeatureModel;
    dataset: IDataset;
}

export interface IRecordModel extends IRecord, Document { }

const Record = new Schema({
    value: { type: Schema.Types.Mixed, required: true },
    archived: { type: Boolean, default: false, index: true },
    feature: { type: Schema.Types.ObjectId, ref: 'Feature', required: true },
    dataset: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
});

export default mongoose.model<IRecord>('Record', Record);