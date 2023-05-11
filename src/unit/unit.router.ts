import express from 'express';

import * as unitController from './unit.controller';

const router = express.Router();

router.get('/:id', unitController.findOne);
router.post('/', unitController.create);

export default router;