import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ExperimentConfig {
  spec: any;
  selectedControllers: Record<string, boolean>;
  customControllerDescription?: string;
  controllerTypes: any[];
}

export interface ExperimentResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    id: string;
    instructions: string;
    status: string;
    startTime: string;
  };
  errors?: any[];
}

export const startExperiment = async (config: ExperimentConfig): Promise<ExperimentResponse> => {
  try {
    const experimentId = uuidv4();
    
    // Format the instructions as a detailed text description
    const instructions = formatExperimentInstructions(config);
    
    const response = await fetch(`${API_BASE_URL}/experiment/start_experiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: experimentId,
        instructions,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start experiment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error starting experiment:', error);
    throw error;
  }
};

const formatExperimentInstructions = (config: ExperimentConfig): string => {
  const { spec, selectedControllers, customControllerDescription, controllerTypes } = config;
  
  const selectedControllerDetails = controllerTypes
    .filter(controller => selectedControllers[controller.id])
    .map(controller => ({
      name: controller.name,
      description: controller.description,
      parameters: controller.parameters,
    }));

  return `Experiment Configuration:

System Specification:
- Plant Type: ${spec.plant}
- Control Inputs: ${spec.controls.join(', ')}
- Control Ranges: ${JSON.stringify(spec.controlRanges, null, 2)}
- Objective: Hold position at [${spec.objective.hold_position.join(', ')}m] for ${spec.objective.duration}s
- Constraints: Wind gust ${spec.constraints.wind_gust}, Sample time ${spec.constraints.sample_time}s
- Visualization: ${spec.simulation}

Selected Controllers:
${selectedControllerDetails.map(controller => `
${controller.name}:
- Description: ${controller.description}
- Parameters: ${JSON.stringify(controller.parameters, null, 2)}
`).join('\n')}

${customControllerDescription ? `
Custom Controller:
${customControllerDescription}
` : ''}

Please implement and evaluate these controllers according to the specification.`;
}; 