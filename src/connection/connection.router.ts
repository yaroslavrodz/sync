import express from 'express';
import * as connectionController from './connection.controller';

const router = express.Router();
router.post('/', connectionController.getColumns);

export default router;