import express from 'express';

import * as featureController from './feature.controller';

const router = express.Router();

router.get('/:id', featureController.findOne);
router.post('/', featureController.create);

export default router;