
import { Request, Response } from 'express'; 

import * as syncronizationService from './syncronization.service';
import Syncronization from './syncronization.schema'; 
import SyncronizationProcess from '../syncronizationProcess/syncronizationProcess.shema';
import { SyncronizationProcessStatus } from '../syncronizationProcess/interaces/syncronizationProcessStatus.enum';

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
        const columns = await syncronizationService.getColumns(id);

        res.status(200).json(columns);
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
}

export async function syncronize(req: Request, res: Response) {
    try {
        const { id, processId } = req.body;
        if (processId !== undefined) {
            await SyncronizationProcess.updateOne(
                { _id: processId },
                { attempts: 1 },
                { status: SyncronizationProcessStatus.PENDING },
            )
        }
        await syncronizationService.syncronize(id, processId);
        
        res.status(200).json('Syncronization finished');
    } catch (error) {
        res.status(500).json(error.message);
    }
}
