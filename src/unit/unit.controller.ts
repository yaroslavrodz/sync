
import { Request, Response } from 'express'; 

import Unit from './unit.schema'; 

export async function create(req: Request, res: Response) {
    const { name, features } = req.body;
    const unit = await Unit.create({
        name,
        features
    });

    res.status(200).json(unit);
}

export async function findOne(req: Request, res: Response) {
    const id = req.params.id;
    const unit = await Unit.findById(id)
        .populate('features');

    res.status(200).json(unit);
}