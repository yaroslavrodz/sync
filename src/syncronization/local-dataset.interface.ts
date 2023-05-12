import { IRecord } from "../record/record.schema";

export interface ILocalDataset {
    unit: string;
    sync: string;
    sourceDatasetId: string;
    records: IRecord[];
}   