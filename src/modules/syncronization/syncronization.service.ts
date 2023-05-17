import * as postgresService from '../../services/postgres/postgres.service';
import Syncronization, { ISyncField, ISyncronizationModel } from './syncronization.schema'; 
import SyncronizationProcess, { ISyncronizationProcessModel } from '../syncronizationProcess/syncronizationProcess.shema';
import { SyncronizationProcessStatus } from '../syncronizationProcess/interaces/syncronizationProcessStatus.enum';
import { IFeatureModel } from '../feature/feature.schema';
import Dataset from '../dataset/dataset.schema';
import Record from '../record/record.schema';
import { ILocalDataset } from './interfaces/localDataset.interface';
import { ILocalRecord } from './interfaces/localRecord.interface';
import { FeatureType } from '../feature/interfaces/featureType.enum';

const LIMIT = 100;
const MAX_ATTEMPTS = 5;
const ATTEMPT_DELAY = 5000;

export async function getColumns(id: string) {
    try {
        const sync = await Syncronization.findById(id);
        
        const config = sync.connection.database.config;
        const tableName = sync.connection.database.table.name;

        const columns = await postgresService.getTableColumns(
            config,
            tableName
        ); 
        return columns;
    } catch (error) {
        throw error;
    }
}

export async function syncronize(
    syncronizationId?: string,
    processId?: string,
) {
    const { sync, syncProcess } = await getSyncronizationAndProcess(
        syncronizationId,
        processId
    );
    try {
        const databaseConfig = sync.connection.database.config;
        const tableName = sync.connection.database.table.name;
        const tableIdColumn = sync.connection.database.table.idColumn;
        const syncFields = sync.syncFields;

        const requestedColumns = createRequestedColumns(syncFields, tableIdColumn);
        const datasetsCount = await postgresService.getTableDataCount(
            databaseConfig,
            tableName
        );
        await syncProcess.updateOne({ datasetsCount });

        let offset = syncProcess.processedDatasetsCount;
        for (; offset < datasetsCount; offset += LIMIT) {
            await tranferDatasets(
                sync,
                syncProcess,
                requestedColumns,
                LIMIT,
                offset,
            );
        }

        await syncProcess.updateOne({
            status: SyncronizationProcessStatus.COMPLETED,
            errorMessage: null
        });
    } catch (error) {
        await catchError(error, syncProcess);
    }
}

async function getSyncronizationAndProcess(syncronizationId?: string, processsId?: string) {
    if (processsId) {
        const syncProcess = await SyncronizationProcess.findById(processsId);
        const sync = await Syncronization
            .findById(syncProcess.syncronization)
            .populate({ path: "syncFields.feature"});
        return { sync, syncProcess }
    } else {
        const sync = await Syncronization
            .findById(syncronizationId)
            .populate({ path: "syncFields.feature"});
        const syncProcess = await SyncronizationProcess.create({
            syncronization: sync._id
        });
        return { sync, syncProcess }
    }
}

function createRequestedColumns(syncFields: ISyncField[], tableIdColumn: string) {
    const requestedColumns = syncFields.map(({ source }) => source);
    if (!requestedColumns.includes(tableIdColumn)) {
        requestedColumns.push(tableIdColumn);
    }
    return requestedColumns;
}

async function tranferDatasets(
    sync: ISyncronizationModel,
    syncProcess: ISyncronizationProcessModel,
    requestedColumns: string[],
    limit: number,
    offset: number,
) {
    const sourceDatasets = await getSourceDatasets(
        sync,
        requestedColumns,
        limit,
        offset
    );

    const localDatasets = await createLocalDatasets(
        sync,
        syncProcess,
        sourceDatasets,
    );

    await insertDatasets(localDatasets);
    
    await syncProcess.updateOne({
        attempts: 0,
        $inc: {
            processedDatasetsCount: sourceDatasets.length,
            transferedDatasetsCount: localDatasets.length
        }
    });
}

async function getSourceDatasets(
    sync: ISyncronizationModel,
    requestedColumns: string[],
    limit: number,
    offset: number
) {
    const databaseConfig = sync.connection.database.config;
    const tableName = sync.connection.database.table.name;

    let processedDatasets = 0;
    let datasetsToProcess = limit;
    let remainingLimit = limit;
    const validDatasets: Object[] = [];

    while (processedDatasets < datasetsToProcess) {
        try {
            const rows = await postgresService.getTableData(
                databaseConfig,
                tableName,
                requestedColumns,
                remainingLimit,
                offset
            );
            
            if (rows.length < remainingLimit) {
                validDatasets.push(...rows);
                break;
            } else {
                validDatasets.push(...rows);
                processedDatasets += rows.length;
                remainingLimit = datasetsToProcess - processedDatasets;
                offset += rows.length;
            }
        } catch (error) {
            if (remainingLimit === 1) {
                //We found an invalid dataset
                processedDatasets++;
                remainingLimit = datasetsToProcess - processedDatasets;
                offset++;
            } else {
                remainingLimit = Math.floor(remainingLimit / 2);
            }
        }
    }

    return validDatasets;
}

async function createLocalDatasets(
    sync: ISyncronizationModel,
    syncProcess: ISyncronizationProcessModel,
    sourceDatasets: Object[],
) {
    const syncId = sync._id;
    const unitId = sync.unit._id;
    const syncFields = sync.syncFields;
    const tableIdColumn = sync.connection.database.table.idColumn;

    const localDatasets: ILocalDataset[] = [];
    sourceDatasets.forEach(async (sourceDataset) => {
        try {
            const sourceDatasetId = sourceDataset[tableIdColumn];
            if (sourceDatasetId === null) {

                throw new Error('Null value inside id column');
            }

            const records = createLocalRecords(syncFields, sourceDataset);
            
            localDatasets.push({
                unit: unitId,
                syncronization: syncId,
                sourceDatasetId,
                records
            });
        } catch (error) {
            await syncProcess.updateOne({
                $push: {
                    log: `Cannot parse dataset: '${JSON.stringify(sourceDataset)}', Error: '${error}'`
                }
            });
        }
    });

    return localDatasets;
}

function createLocalRecords(syncFields: ISyncField[], sourceDataset: Object) {
    try {
        const localRecords: ILocalRecord[] = [];
        syncFields.forEach(({ feature, source, required }) => {
            const value = sourceDataset[source];

            if (required && value === null) {
                throw new Error('Missing required value for record')
            } else if (!required && value === null) {
                return;
            } else {
                const parsedValue = parseValue(feature, value);
                localRecords.push({
                    value: parsedValue,
                    feature: feature._id
                });
            }
        });

        return localRecords;
    } catch (error) {
        throw error;
    }
}

function parseValue(feature: IFeatureModel, value: any) {
    try {
        let parsedValue;
        switch(feature.type) {
            case FeatureType.STRING:
                parsedValue = String(value);
                break;
            case FeatureType.NUMBER:
                parsedValue = Number(value);
                break;
            case FeatureType.DATE:
                parsedValue = new Date(value);
                break;
            default:
                break;
        }
        return parsedValue;
    } catch (error) {
        throw new Error('Cannot parse value for record');
    }
}

async function insertDatasets(localDatasets: ILocalDataset[]) {
    try {
        await Promise.all(localDatasets.map(async (localDataset) => {
            const records = localDataset.records;

            const dataset = await Dataset.findOne({
                sourceDatasetId: localDataset.sourceDatasetId
            });

            if (!dataset) {
                const newDataset = await Dataset.create(localDataset);
                await insertRecords(records, newDataset._id.toString());
            } else {
                await archiveRecords(dataset._id.toString());
                await insertRecords(records, dataset._id.toString());
            }
        }));
    } catch (error) {
        console.error(error);
        throw new Error('Error while insert');
    }
}

async function archiveRecords(datasetId: string) {
    await Record.updateMany(
        { dataset: datasetId },
        { archived: true }
    );
}
  
async function insertRecords(records: ILocalRecord[], datasetId: string) {
    const recordsToCreate = records.map(record => {
        return {
            ...record,
            dataset: datasetId
        }
    });
    
    await Record.insertMany(recordsToCreate);
}

async function catchError(
    error: Error,
    syncProcess: ISyncronizationProcessModel
) {
    if (syncProcess.attempts !== MAX_ATTEMPTS) {
        await syncProcess.updateOne({ $inc: { attempts: 1 } });
        await sleep();
        return await syncronize(
            null,
            syncProcess._id.toString()
        );
    }
    else {
        await syncProcess.updateOne({
            status: SyncronizationProcessStatus.FAILED,
            errorMessage: error.message,
        });
        throw error;
    }
}

async function sleep() {
    return await new Promise(resolve => {
        setTimeout(() => resolve(null), ATTEMPT_DELAY)
    });
}