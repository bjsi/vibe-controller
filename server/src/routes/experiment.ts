import { Router } from 'express';
import { z } from 'zod';
import { ensureExperimentDir, saveExperiment, loadExperiment } from '../filesystem.js';
import { startAgent } from '../agent/agent.js';
import { agentStateManager } from '../agent/state.js';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

const startExperimentSchema = z.object({
  id: z.string(),
  instructions: z.string()
});

const droneTestDataSchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number()
  }),
  controls: z.object({
    throttle: z.number(),
    pitch: z.number(),
    roll: z.number()
  }),
  timestamp: z.string()
});

router.post('/start_experiment', async (req, res) => {
  try {
    const { id, instructions } = startExperimentSchema.parse(req.body);
    
    const experimentData = {
      id,
      instructions,
      status: 'started',
      startTime: new Date().toISOString(),
      testData: [] // Initialize empty array for test data
    };
    
    await saveExperiment(id, experimentData);
    const experimentsDir = ensureExperimentDir(id);

    // Add instructions about copying and modifying drone.py
    const enhancedInstructions = `${instructions}

IMPORTANT: At the end of this experiment, you must:
1. Copy the drone.py file from the drone-challenge/src/drone_challenge directory to this experiment directory
2. Create a new controller class that implements your solution
3. Modify the control_drone() method to use your controller
4. Save the modified file as 'drone_controller_${id}.py' in this experiment directory
5. Include a comment at the top of the file explaining your implementation approach
6. **Copy the entire 'generated' directory (containing protobuf compiled files like \`drone_pb2.py\`) from '${path.resolve(process.cwd(), "drone-challenge/src/generated")}' to this experiment directory (e.g., so you have \'./generated/drone_pb2.py\'). This is crucial for resolving Python imports.**

IMPORTANT CONSTRAINTS:
- DO NOT modify the DroneClient class structure or its methods
- DO NOT change the control_drone() method signature
- DO NOT modify the gRPC communication code
- DO NOT change the main execution loop
- Only modify the control logic inside control_drone()
- Keep all your controller logic in a separate class
- Ensure your controller can be instantiated with the experiment's parameters

The original drone.py file is located at: ${path.resolve(process.cwd(), 'drone-challenge/src/drone_challenge/drone.py')}

Example of safe modification:
\`\`\`python
# This is an example of how your custom controller should be structured and used.
# Your actual implementation will replace MyController and its logic.

class MyController:
    def __init__(self, experiment_params):
        # Initialize your controller.
        # If using a pre-trained model file (e.g., .pkl, .h5, .onnx), load it here.
        # Example: self.model = load_your_model_from_file('path/to/model.pkl', experiment_params)
        # Store any necessary parameters from experiment_params.
        self.params = experiment_params
        print(f"MyController initialized with params: {self.params}")

    def compute_control(self, current_position, goal_region):
        # Implement your control logic here.
        # This method MUST return three numerical values: throttle, pitch, and roll.
        # These values should respect the control ranges (e.g., throttle 0-100, pitch/roll -45 to 45).
        
        # Example: if using a loaded model:
        # model_input = self.prepare_input_for_model(current_position, goal_region)
        # raw_output = self.model.predict(model_input) # Assuming self.model is your loaded model
        # throttle, pitch, roll = self.process_model_output_to_controls(raw_output)

        # Placeholder logic (replace with your actual control strategy):
        print(f"MyController.compute_control called. Position: {current_position}, Goal: {goal_region}")
        throttle = 50.0 # Example: 0.0-100.0
        pitch = 0.0     # Example: -45.0 to 45.0 degrees
        roll = 0.0      # Example: -45.0 to 45.0 degrees
        
        # It's good practice to ensure outputs are within expected limits before returning
        # throttle = max(0.0, min(100.0, throttle))
        # pitch = max(-45.0, min(45.0, pitch))
        # roll = max(-45.0, min(45.0, roll))

        return throttle, pitch, roll

# --- How this controller is used within DroneClient class ---
# (You will modify the provided drone.py file, specifically the DroneClient class)

# In DroneClient.__init__(self, host, port, token, experiment_params): # Modify __init__ to accept params
#     # ... existing grpc setup, send_queue etc. ...
#
#     # Add this line to initialize your controller:
#     # experiment_params should contain any data your controller needs,
#     # e.g., path to model files, PID gains, etc.
#     # These params would originate from your experiment configuration.
#     self.my_controller_instance = MyController(experiment_params)
#     print("DroneClient: MyController instance created.")
#
#     # ... rest of __init__ ...

# In DroneClient.control_drone(self):
#     # ... (any existing prints or pre-calculation if needed) ...
#
#     # 1. Get control values from your controller:
#     # (Ensure self.my_controller_instance is initialized in __init__)
#     throttle, pitch, roll = self.my_controller_instance.compute_control(self.position, self.goal_region)
#
#     # (Optional but good practice) Print the determined control values:
#     print(f"Computed controls - Throttle: {throttle}, Pitch: {pitch}, Roll: {roll}")
#
#     # 2. Create the control message (DO NOT CHANGE THIS PART OF THE LOGIC):
#     # This uses the 'pb2' import (e.g., generated.drone_pb2 as pb2)
#     control_message = pb2.DroneClientMsg(
#         throttle=throttle,
#         pitch=pitch,
#         roll=roll
#     )
#
#     # 3. Send the control message to the drone (DO NOT CHANGE THIS PART OF THE LOGIC):
#     self.send_queue.put(control_message)
#     print("Control message sent to drone.")
#
#     # ... (any existing prints post-sending) ...

# --- IMPORTANT: Modifying the main execution block (if __name__ == "__main__") ---
# In the main execution block (\`if __name__ == "__main__":\`) of your 'drone_controller_${id}.py' script, you MUST:
# 1. Define a dictionary or object named 'experiment_params'. This should contain all
#    parameters your 'MyController' class (and its __init__ method) requires.
#    These parameters should be derived from the specific instructions for THIS experiment.
# 2. Modify the instantiation of 'DroneClient' to pass these 'experiment_params'.
#    Your 'DroneClient.__init__' method must also be updated to accept 'experiment_params'.
#
# Example of the modified main block in 'drone_controller_${id}.py':
#
# if __name__ == "__main__":
#     host = "172.237.101.153"  # Default host
#     port = 10301              # Default port
#     token = "leeroy.jenkins"    # Ensure this token is valid for your simulation environment
#
#     # === AGENT: DEFINE EXPERIMENT-SPECIFIC PARAMETERS HERE ===
#     # This 'experiment_params' dictionary will be passed to DroneClient
#     # and then to your MyController's __init__ method.
#     # Populate it based on the unique requirements of experiment: ${id}
#     #
#     # Example for a model-based controller:
#     # experiment_params = {
#     #     "model_file_path": "model_for_experiment_\\${id}.pkl", # Path relative to experiment dir
#     #     "pid_gains": {"kp": 1.0, "ki": 0.1, "kd": 0.05}, # If combining with PID
#     #     "some_other_setting": "value_specific_to_this_experiment_\\${id}"
#     # }
#     # !!! Replace the placeholder below with actual parameter definitions for the current experiment \\${id} !!!
#     experiment_params = {
#         "info": "Parameters for experiment \\${id} go here",
#         # Add actual key-value pairs your controller needs (e.g., model paths, hyperparameters)
#     }
#     print(f"MAIN (drone_controller_\\${id}.py): Initializing with experiment_params: {experiment_params}")
#     # === END AGENT PARAMETER DEFINITION ===
#
#     # The original drone.py uses a 'while True:' loop to restart the DroneClient.
#     # Adapt this section as needed. The crucial part is that DroneClient is now instantiated
#     # with the 'experiment_params' defined above.
#     # Your DroneClient.__init__ signature must be updated to accept these params,
#     # e.g., def __init__(self, host, port, token, experiment_params):
#
#     while True: # This loop structure is from the original drone.py
#         print(f"MAIN: Creating DroneClient for experiment \\${id} with unique params.")
#         # Note: Ensure DroneClient's __init__ can accept experiment_params
#         dc = DroneClient(host, port, token, experiment_params)
#         dc.start() # This method typically blocks until the simulation for one run is over
#         print(f"MAIN: Simulation run ended for experiment \\${id}. Restarting after delay (if applicable).")
#         # The sleep is from the original drone.py, causing a periodic restart.
#         # Adjust if a single run per script execution is intended.
#         sleep(20.0)
#
#     # If, for example, a single execution run is desired (not continuous restarts):
#     # print(f"MAIN: Creating DroneClient for experiment \\${id} with unique params.")
#     # dc = DroneClient(host, port, token, experiment_params)
#     # dc.start()
#     # print(f"MAIN: Simulation run completed for experiment \\${id}.")
\`\`\``;
    
    await startAgent({ id, instructions: enhancedInstructions, directory: experimentsDir });
    
    res.json({
      status: 'success',
      message: 'Experiment started',
      data: experimentData
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

router.post('/store_test_data', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const testData = droneTestDataSchema.parse(req.body);
    const experiment = await loadExperiment(id);
    
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Add new test data point
    experiment.testData = experiment.testData || [];
    experiment.testData.push(testData);
    
    await saveExperiment(id, experiment);
    
    res.json({
      status: 'success',
      message: 'Test data stored',
      data: testData
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid test data format',
        errors: error.errors
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.get('/get_test_data', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const experiment = await loadExperiment(id);
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({
      status: 'success',
      data: experiment.testData || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getExperimentState(id: string) {
  if (!id) {
    throw new Error('Experiment ID is required');
  }

  const state = agentStateManager.getState(id);
  if (!state) {
    throw new Error(`No state found for experiment ID: ${id}`);
  }

  return state;
}

router.get('/get_experiment_state', async (req, res) => {
  try {
    const { id } = req.query;
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid experiment ID' });
    }

    const state = await getExperimentState(id);
    res.json(state);
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;