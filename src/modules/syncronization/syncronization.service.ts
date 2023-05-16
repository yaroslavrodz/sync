import * as postgresService from '../../services/postgres/postgres.service';
import Syncronization, { ISyncField, ISyncronizationModel } from './syncronization.schema'; 
import SyncronizationProcess, { ISyncronizationProcessModel } from '../syncronizationProcess/syncronizationProcess.shema';
import { SyncronizationProcessStatus } from '../syncronizationProcess/interaces/syncronizationProcessStatus.enum';
import Dataset from '../dataset/dataset.schema';
import Record, { IRecord } from '../record/record.schema';
import { ILocalDataset } from './interfaces/localDataset.interface';

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
        const syncFields = sync.syncFields;
        const databaseConfig = sync.connection.database.config;
        const tableName = sync.connection.database.table.name;
        const tableIdColumn = sync.connection.database.table.idColumn;

        const requestedColumns = createRequestedColumns(syncFields, tableIdColumn);

        const datasetsCount = await postgresService
            .getTableDataCount(databaseConfig, tableName);
        
        await syncProcess.updateOne({ datasetsCount })

        let offset = syncProcess.transferedDatasetsCount;
        for (; offset < datasetsCount; offset += LIMIT) {
            await tranferDatasets(
                sync,
                syncProcess,
                requestedColumns,
                LIMIT,
                offset,
            );
        }
    } catch (error) {
        await catchError(error, syncProcess);
    }
}

async function getSyncronizationAndProcess(syncronizationId?: string, processsId?: string) {
    if (processsId) {
        const syncProcess = await SyncronizationProcess.findById(processsId);
        const sync = await Syncronization.findById(syncProcess.syncronization);
        return { sync, syncProcess }
    } else {
        const sync = await Syncronization.findById(syncronizationId);
        const syncProcess = await SyncronizationProcess.create({ syncronization: sync._id })
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
    )

    const datasetsToCreate = createLocalDatasets(
        sync,
        sourceDatasets,
    );

    await insertDatasets(datasetsToCreate);
    
    await syncProcess.updateOne({
        attempts: 0,
        $inc: { transferedDatasetsCount: datasetsToCreate.length }
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
            validDatasets.push(...rows);
            if (rows.length < remainingLimit) {
                break;
            }

            processedDatasets += rows.length;
            remainingLimit = datasetsToProcess - processedDatasets;
            offset += rows.length;
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

function createLocalDatasets(
    sync: ISyncronizationModel,
    sourceDatasets: Object[],
) {
    try {
        const syncId = sync._id;
        const unitId = sync.unit._id;
        const syncFields = sync.syncFields;
        const tableIdColumn = sync.connection.database.table.idColumn;

        const localDatasets = sourceDatasets.map((sourceDataset) => {
            const records = createLocalRecords(syncFields, sourceDataset);
            const sourceDatasetId = sourceDataset[tableIdColumn];
        
            return {
                unit: unitId,
                syncronization: syncId,
                sourceDatasetId,
                records
            };
        }) as ILocalDataset[];

        return localDatasets;
    } catch (error) {
        console.error(error);
        throw new Error('Error while parsing');
    }
}

function createLocalRecords(syncFields: ISyncField[], sourceDataset: Object) {
    return syncFields.map(({ feature, source }) => {
      const value = sourceDataset[source];
      return { value, feature };
    });
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
  
async function insertRecords(records: IRecord[], datasetId: string) {
    const recordsToCreate = [];

    const recordsLength = records.length;
    for (let i = 0; i < recordsLength; i++) {
        recordsToCreate.push({
            ...records[i],
            dataset: datasetId
        });
    }
    
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