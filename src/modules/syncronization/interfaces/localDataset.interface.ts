import { IRecord } from "../../record/record.schema";

export interface ILocalDataset {
    unit: string;
    syncronization: string;
    sourceDatasetId: string;
    records: IRecord[];
}   