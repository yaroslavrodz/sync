import mongoose, { Schema, Document } from "mongoose";

import { SyncronizationProcessStatus } from "./interaces/syncronizationProcessStatus.enum";
import { ISyncronizationModel } from "../syncronization/syncronization.schema";

export interface ISyncronizationProcess { 
    syncronization: ISyncronizationModel
    status: SyncronizationProcessStatus;
    datasetsCount: number,
    processedDatasetsCount: number,
    transferedDatasetsCount: number,
    log: string[];
    attempts: number;
    errorMessage: string,
}

export interface ISyncronizationProcessModel extends ISyncronizationProcess, Document { }

const SyncronizationProcess = new Schema({
    syncronization: { type: Schema.Types.ObjectId, ref: 'Syncronization', required: true },
    status: { 
        type: String,
        enum: Object.values(SyncronizationProcessStatus),
        default: SyncronizationProcessStatus.PENDING
    },
    datasetsCount: { type: Number, default: 0 },
    processedDatasetsCount: { type: Number, default: 0 },
    transferedDatasetsCount: { type: Number, default: 0 },
    log: [{ type: String }],
    attempts: { type: Number, default: 1 },
    errorMessage: { type: String, required: false },
});

export default mongoose.model<ISyncronizationProcess>('SyncronizationProcess', SyncronizationProcess);