
import { Request, Response } from 'express'; 

import Feature from './feature.schema'; 

export async function create(req: Request, res: Response) {
    const { name, type } = req.body;
    const feature = await Feature.create({
        name,
        type
    });

    res.status(200).json(feature);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const feature = await Feature.findById(id);

    res.status(200).json(feature);
}