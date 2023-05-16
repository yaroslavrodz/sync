import mongoose, { Schema, Document } from "mongoose";

import { IUnitModel } from "../unit/unit.schema";
import { ISyncronizationModel } from "../syncronization/syncronization.schema";

export interface IDataset { 
    unit: IUnitModel;
    syncronization?: ISyncronizationModel;
    sourceDatasetId?: string;
}

export interface IDatasetModel extends IDataset, Document { }

const Dataset = new Schema({
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    syncronization: { type: Schema.Types.ObjectId, ref: 'Syncronization', required: false },
    sourceDatasetId: { type: Schema.Types.String, index: true, required: false },
});

export default mongoose.model<IDataset>('Dataset', Dataset);