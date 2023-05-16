import { Pool, PoolConfig } from 'pg';

export async function getTableColumns(
    config: PoolConfig,
    tableName: string,
) {
    try {
        const pool = new Pool(config);

        await checkConnection(pool);
        const columns = await queryTableColumns(pool, tableName);

        await pool.end();
        return columns;
    } catch (error) {
        throw error;
    }
}

export async function getTableData(
    config: PoolConfig,
    tableName: string,
    requestedColumns: string[],
    limit?: number,
    offset?: number
) {
    try {
        const pool = new Pool(config);

        await checkConnection(pool);
        const datasets = await queryTableData(
            pool,
            tableName,
            requestedColumns,
            limit,
            offset
        ) as Object[];

        pool.end();
        return datasets;
    } catch (error) {
        throw error;
    }
}

export async function getTableDataCount(
    config: PoolConfig,
    tableName: string,
) {
    try {
        const pool = new Pool(config);

        await checkConnection(pool);
        const count = await queryTableDataCount(pool, tableName) as number;

        pool.end();
        return count;
    } catch (error) {
        throw error;
    }
}

async function checkConnection(pool: Pool) {
    return await new Promise((resolve, reject) => {
        pool.connect((error) => {
            if (error) {
                console.error(error);
                reject(new Error('Error while connecting to database'));
            } else {
                resolve(true);
            }
        });
    });
}

async function queryTableColumns(pool: Pool, tableName: string) {
    return await new Promise((resolve, reject) => {
        pool.query(buildTableColumnsQuery(tableName), (error, result) => {
            if (error) {
                console.error(error);
                reject(new Error('Error while quering columns'));
            } else {
                console.log(result.rows);
                resolve(result.rows);
            }
        })
    });
}
    
async function queryTableData(
    pool: Pool,
    tableName: string,
    requestedColumns: string[],
    limit?: number,
    offset?: number
) {
    return await new Promise((resolve, reject) => {
        pool.query(buildTableDataQuery(
            tableName,
            requestedColumns,
            limit,
            offset
        ), (error, result) => {
            if (error) {
                console.error(error);
                reject(new Error('Error while quering data'));
            } else {
                resolve(result.rows);
            }
        })
    });
}

async function queryTableDataCount(
    pool: Pool,
    tableName: string,
) {
    return await new Promise((resolve, reject) => {
        pool.query(buildTableDataCountQuery(tableName), (error, result) => {
            if (error) {
                console.error(error);
                reject(new Error('Error while quering data count'));
            } else {
                resolve(result.rows[0].count);
            }
        })
    });
}

function buildTableColumnsQuery(tableName: string) {
    return `
        SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '${tableName}';
    `;
} 

function buildTableDataQuery(
    tableName: string,
    requestedColumns: string[],
    limit?: number,
    offset?: number
) {
    if (limit !== undefined && offset !== undefined) {
        return `
            SELECT ${requestedColumns.join(', ')}
                FROM ${tableName}
                LIMIT ${limit}
                OFFSET ${offset};
    `;
    }
    return `
        SELECT ${requestedColumns.join(', ')}
            FROM ${tableName}
    `;
}

function buildTableDataCountQuery(tableName: string) {
    return `SELECT COUNT(*) FROM ${tableName}`;
} 

