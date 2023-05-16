import express from 'express';

import * as datasetController from './dataset.controller';

const router = express.Router();

router.get('/:id', datasetController.findOne);
router.post('/', datasetController.create);

export default router;