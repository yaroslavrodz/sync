
import { Request, Response } from 'express'; 

import Dataset from './dataset.schema'; 
import Record from '../record/record.schema'; 

export async function create(req: Request, res: Response) {
    const { unitId, records } = req.body;

    const dataset = await Dataset.create({ unit: unitId });
        
    const recordsToCreate = records.map(record => {
        return {
            dataset: dataset._id,
            ...record
        }
    });

    await Record.insertMany(recordsToCreate);

    res.status(200).json(dataset);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const dataset = await Dataset.findById(id);

    res.status(200).json(dataset);
}