import { Pool } from 'pg';

import { ISyncronizationModel } from './syncronization.schema';

const tableColumnsQuery = (tableName: string) => `
    SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}';
`;

const tableDataQuery = (tableName: string, requestedColumns: string[]) => {
    const requestedColumnsString = requestedColumns.join(', ');
    return `
        SELECT ${requestedColumnsString} FROM ${tableName};
    `;
}

export async function getTableColumns(sync: ISyncronizationModel) {
    try {
        const config = sync.connection.database.config;
        const table = sync.connection.database.table;

        const pool = new Pool(config);

        await checkConnection(pool);
        const columns = await queryTableColumns(pool, table.name);

        pool.end();
        return columns;
    } catch (error) {
        throw error;
    }
}

export async function getTableData(sync: ISyncronizationModel) {
    try {
        const config = sync.connection.database.config;
        const table = sync.connection.database.table;

        const requestedColumns = sync.syncFields.map(({ source }) => source);
        if (!requestedColumns.includes(table.idColumn)) {
            requestedColumns.push(table.idColumn);
        }

        const pool = new Pool(config);

        await checkConnection(pool);
        const datasets = await queryTableData(
            pool,
            table.name,
            requestedColumns
        );

        pool.end();
        return datasets;
    } catch (error) {
        throw error;
    }
}

async function checkConnection(pool: Pool) {
    return await new Promise((resolve, reject) => {
        pool.connect((error) => {
            if (error) {
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

async function queryTableColumns(pool: Pool, tableName: string) {
    return await new Promise((resolve, reject) =>
        pool.query(tableColumnsQuery(tableName), (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.rows);
            }
        }));
}

    
async function queryTableData(pool: Pool, tableName: string, requestedColumns: string[]) {
    return await new Promise((resolve, reject) =>
        pool.query(tableDataQuery(tableName, requestedColumns), (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.rows);
            }
        }));
}
