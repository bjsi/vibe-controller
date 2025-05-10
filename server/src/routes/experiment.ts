import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const startExperimentSchema = z.object({
  id: z.string(),
  instructions: z.string()
});

router.post('/start_experiment', (req, res) => {
  try {
    const { id, instructions } = startExperimentSchema.parse(req.body);
    
    // TODO: Implement experiment logic here
    
    res.json({
      status: 'success',
      message: 'Experiment started',
      data: { id, instructions }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        errors: error.errors
      });
    } else {
      throw error;
    }
  }
});

export default router; 