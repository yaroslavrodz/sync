
import { Request, Response } from 'express'; 

import * as postgresConnectHelper from '../connection/postgres-connect.helper';
import Syncronization, { IField, ISyncronizationModel } from './syncronization.schema'; 
import Connection  from '../connection/connection.shema';
import Record, { IRecord } from '../record/record.schema';
import Dataset from '../dataset/dataset.schema';

export async function create(req: Request, res: Response) {
    const { unitId, connection, fields } = req.body;
    const createdConnection = await Connection.create(connection);

    const syncronization = await Syncronization.create({
        unit: unitId,
        connection: createdConnection._id,
        fields
    });

    res.status(200).json(syncronization);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const syncronization = await Syncronization.findById(id)
        .populate('unit')
        .populate('connection');

    res.status(200).json(syncronization);
}

export async function syncronize(req: Request, res: Response) {
    const { id } = req.body;
    const syncronization = await Syncronization.findById(id)
        .populate('connection');

    await Dataset.deleteMany({ connection: syncronization.connection._id });

    const requestedColumns = syncronization.fields
        .map(({ source }) => source);

    const sourceDatasets = await postgresConnectHelper.getTableData(
        syncronization.connection,
        requestedColumns
    ) as Object[];

    const localDatasets = createLocalDatasets(sourceDatasets, syncronization.fields);

    const createdDatasets = await insertDatasets(
        localDatasets,
        syncronization,
    );

    res.status(200).json(createdDatasets);
}

function createLocalDatasets(sourceDatasets: Object[], fields: IField[]) {
    const localDatasets: IRecord[][] = [];
    for (let i = 0; i < sourceDatasets.length; i++) {
        let sourceData = sourceDatasets[i];
        let records = [];

        for (let j = 0; j < fields.length; j++) {
            let field = fields[j];
            let feature = field.feature;
            let source = field.source;
            let value = sourceData[source];

            if (value) {
                records.push({ feature, value });
            }
        }
        localDatasets.push(records);
    }

    return localDatasets;
}

async function insertDatasets(
    localDatasets: IRecord[][],
    syncronization: ISyncronizationModel,
) {
    const datasets = [];
    for (let i = 0; i < localDatasets.length; i++) {
        const records = localDatasets[i];
        
        const createdRecords = await Record.insertMany(records);
        const createdRecordsIds = createdRecords.map(({ _id }) => _id);

        const dataset = await Dataset.create({
            records: createdRecordsIds,
            unit: syncronization.unit._id,
            connection: syncronization.connection._id,
        });

        datasets.push(dataset);
    }    
    return datasets;
}


