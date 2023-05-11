import express from 'express';

import * as syncronizationController from './syncronization.controller';

const router = express.Router();

router.get('/:id', syncronizationController.findOne);
router.post('/', syncronizationController.create);
router.post('/sync', syncronizationController.syncronize);

export default router;