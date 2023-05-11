import { Pool } from 'pg';
import { IConnection } from './connection.shema';

const tableColumnsQuery = (tableName: string) => `
SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${tableName}';
`;

const tableDataQuery = (tableName: string, requestedFields: string[]) => 
    `SELECT ${requestedFields.join(', ')} FROM ${tableName} LIMIT 10;`;

export async function getTableColumns(connection: IConnection) {
    try {
        const pool = new Pool(connection.database.config);

        await checkConnection(pool);
        const columns = await queryTableColumns(pool, connection.database.table);

        pool.end();
        return columns;
    } catch (error) {
        console.error(error);
    }
}

export async function getTableData(connection: IConnection, requestedFields: string[]) {
    try {
        const pool = new Pool(connection.database.config);

        await checkConnection(pool);
        const datasets = await queryTableData(pool,
            connection.database.table,
            requestedFields
        );

        pool.end();
        return datasets;
    } catch (error) {
        console.error(error);
    }
}

async function checkConnection(pool: Pool) {
    return await new Promise((resolve, reject) =>
        pool.connect((error) => {
            if (error) {
                reject(error);
            }
            resolve(true);
        }));
}

async function queryTableColumns(pool: Pool, tableName: string) {
    return await new Promise((resolve, reject) =>
        pool.query(tableColumnsQuery(tableName), (error, result) => {
        if (error) {
            reject(error);
        }
        resolve(result.rows);
    }));
}

    
async function queryTableData(pool: Pool, tableName: string, requestedFields: string[]) {
    return await new Promise((resolve, reject) =>
        pool.query(tableDataQuery(tableName, requestedFields), (error, result) => {
        if (error) {
            reject(error);
        }
        resolve(result.rows);
    }));
}
