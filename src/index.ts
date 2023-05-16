import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import UnitRouter from './modules/unit/unit.router';
import FeatureRouter from './modules/feature/feature.router';
import DatasetRouter from './modules/dataset/dataset.router';
import SyncronizationRouter from './modules/syncronization/syncronization.router';

const app = express();
app.use(express.json());

app.use('/unit', UnitRouter);
app.use('/feature', FeatureRouter);
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