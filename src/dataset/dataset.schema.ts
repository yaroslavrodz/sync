import mongoose, { Schema, Document } from "mongoose";

import { IUnitModel } from "../unit/unit.schema";
import Record, { IRecordModel } from "../record/record.schema";
import { IConnectionModel } from "../connection/connection.shema";

export interface IDataset { 
    records: IRecordModel[];
    unit: IUnitModel;
    connection?: IConnectionModel;
}

export interface IDatasetModel extends IDataset, Document { }

const Dataset = new Schema({
    records: [{ type: Schema.Types.ObjectId, ref: 'Record' }],
    unit: { type: Schema.Types.ObjectId, ref: 'Unit' },
    connection: { type: Schema.Types.ObjectId, ref: 'Unit', required: false },
});

Dataset.pre('deleteMany', async function() {
    const currentRows = await this.model.find(this.getFilter());
    for (let row of currentRows) {
        await Record.deleteMany({ _id: { $in: row.records } })
    }
})
export default mongoose.model<IDataset>('Dataset', Dataset);