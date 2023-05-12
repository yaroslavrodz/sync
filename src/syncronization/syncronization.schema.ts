import mongoose, { Schema, Document } from "mongoose";

import { IFeatureModel } from "../feature/feature.schema";
import { IUnitModel } from "../unit/unit.schema";

export interface ISyncField {
    feature: IFeatureModel,
    source: string
}

export interface ISyncronization { 
    unit: IUnitModel;
    connection: any;
    syncFields: ISyncField[];
}

export interface ISyncronizationModel extends ISyncronization, Document { }

// connection for postgres
// {
//     type: "Postgres";
//     database: {
//         config: {
//             host: string;
//             port: string;
//             user: string;
//             password: string;
//             database: string;
//         },
//         table: {
//             name: string;
//             idColumn: string
//         };
//     };
// }


const Syncronization = new Schema({
    unit: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    connection: { type: Schema.Types.Mixed, required: true },
    syncFields: [{  
        feature: { type: Schema.Types.ObjectId, ref: 'Feature', required: true },
        source: { type: String, required: true }
    }]
});

export default mongoose.model<ISyncronization>('Syncronization', Syncronization);