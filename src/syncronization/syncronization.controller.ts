
import { Request, Response } from 'express'; 

import * as postgresConnectHelper from './postgres-connect.helper';
import Syncronization, { ISyncronizationModel } from './syncronization.schema'; 
import Dataset from '../dataset/dataset.schema';
import Record from '../record/record.schema';
import { ILocalDataset } from './local-dataset.interface';

export async function create(req: Request, res: Response) {
    const { unitId, connection, syncFields } = req.body;

    const sync = await Syncronization.create({
        unit: unitId,
        connection,
        syncFields
    });

    res.status(200).json(sync);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const sync = await Syncronization.findById(id);

    res.status(200).json(sync);
}

export async function getColumns(req: Request, res: Response) {
    try {
        const id = req.params.id;
        const sync = await Syncronization.findById(id);
        const columns = await postgresConnectHelper.getTableColumns(sync); 
    
        res.status(200).json(columns);
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
}

export async function syncronize(req: Request, res: Response) {
    try {
        const { id } = req.body;
        const sync = await Syncronization.findById(id);

        const sourceDatasets = await postgresConnectHelper
            .getTableData(sync) as Object[];

        const localDatasets = createLocalDatasets(sourceDatasets, sync);

        const createdDatasets = await insertDatasets(localDatasets);

        res.status(200).json(createdDatasets);
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
}

function createLocalDatasets(
    sourceDatasets: Object[],
    sync: ISyncronizationModel
) {
    const localDatasets: ILocalDataset[] = [];
    const syncFields = sync.syncFields;
    const idColumn = sync.connection.database.table.idColumn;
    const unitId = sync.unit._id;
    const syncId = sync._id;

    const sourceDatasetsLength = sourceDatasets.length;
    const syncFieldsLength = syncFields.length;

    for (let i = 0; i < sourceDatasetsLength; i++) {
        const sourceDataset = sourceDatasets[i];
        const records = [];

        for (let j = 0; j < syncFieldsLength; j++) {
            const syncField = syncFields[j];
            const feature = syncField.feature;
            const source = syncField.source;
            const value = sourceDataset[source];

            if (value) {
                records.push({ value, feature });
            }
        }

        localDatasets.push({
            unit: unitId,
            sync: syncId,
            sourceDatasetId: sourceDataset[idColumn],
            records
        });
    }

    return localDatasets;
}

async function insertDatasets(localDatasets: ILocalDataset[]) {
    const datasets = [];
    const localDatasetsLength = localDatasets.length;

    for (let i = 0; i < localDatasetsLength; i++) {
        const localDataset = localDatasets[i];
        const records = localDataset.records;
        const recordsLength = records.length;

        let dataset = await Dataset.findOne({
            sourceDatasetId: localDataset.sourceDatasetId
        });
        if (!dataset) {
            dataset = await Dataset.create(localDataset);
        } else {
            await Record.updateMany(
                { dataset: dataset._id },
                { archived: true },
            );
        }

        const recordsToCreate = [];
        for (let i = 0; i < recordsLength; i++) {
            recordsToCreate.push({
                ...records[i],
                dataset: dataset._id
            });
        }
        await Record.insertMany(recordsToCreate);

        datasets.push(dataset);
    }

    return datasets;
}


