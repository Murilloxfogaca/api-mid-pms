import { Router } from 'express';
import { exampleController } from '../controllers';

const router = Router();

// Define your routes here
router.get('/example', exampleController.handleExample);

export default router;