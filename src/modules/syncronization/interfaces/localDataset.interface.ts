import { ILocalRecord } from "./localRecord.interface";

export interface ILocalDataset {
    unit: string;
    syncronization: string;
    sourceDatasetId: string;
    records: ILocalRecord[];
}