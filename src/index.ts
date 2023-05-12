import express from 'express';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

import FeatureRouter from './feature/feature.router';
import UnitRouter from './unit/unit.router';
import DatasetRouter from './dataset/dataset.router';
import SyncronizationRouter from './syncronization/syncronization.router';

const app = express();
app.use(express.json());

app.use('/feature', FeatureRouter);
app.use('/unit', UnitRouter);
app.use('/dataset', DatasetRouter);
app.use('/syncronization', SyncronizationRouter);

dotenv.config();
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;

async function start() {
    try {
        await mongoose.connect(MONGO_URL);
        app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
    } catch (error) {
        console.error(error);
    }   
}

start();