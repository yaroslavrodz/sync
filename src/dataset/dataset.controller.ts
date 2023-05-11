
import { Request, Response } from 'express'; 

import Dataset from './dataset.schema'; 
import Record from '../record/record.schema'; 

export async function create(req: Request, res: Response) {
    const { unitId, records } = req.body;
        
    const createdRecords = await Record.insertMany(records);
    const createdRecordsIds = createdRecords.map(({ _id }) => _id);

    const dataset = await Dataset.create({
        unit: unitId,
        records: createdRecordsIds
    });

    res.status(200).json(dataset);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const dataset = await Dataset.findById(id)
        .populate('records');

    res.status(200).json(dataset);
}