
import { Request, Response } from 'express'; 

import * as postgresConnectHelper from './postgres-connect.helper';
import Connection from './connection.shema';

export async function getColumns(req: Request, res: Response) {
    const connectionId = req.body;

    const connection = await Connection.findById(connectionId);
    const columns = await postgresConnectHelper.getTableColumns(connection); 
    
    res.status(200).json(columns);
}