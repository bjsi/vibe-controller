import { GoogleGenerativeAI } from '@google/generative-ai';
import { Schema, SchemaType } from '@google/generative-ai';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// System prompt for the specification builder
const SYSTEM_PROMPT = `You are an expert control systems engineer helping to create specifications for drone controllers.
Your task is to:
1. Analyze the initial task description
2. Ask relevant clarifying questions
3. Generate a structured specification in JSON format

The specification should include:
- plant: The type of system being controlled (e.g. 'quadcopter3D', 'drone3D')
- controls: Array of control inputs (e.g. ['roll', 'pitch', 'throttle'])
- objective: The control objective including position and duration
- constraints: Environmental and system constraints

Your questions are suggestions to prompt the user. Ask them concisely and expect concise answers. If responses are incomplete, proceed with educated guesses.`;

// Interface for the conversation state
export interface ConversationState {
  messages: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  spec: any;
  questionsAnswered: boolean;
}

// Interface for controller recommendations
export interface ControllerRecommendation {
  id: string;
  name: string;
  description: string;
  successProbability: number;
  timeEstimate: string;
  requiresGPU: boolean;
  parameters?: {
    [key: string]: any;
  };
}

// Default specification structure
export const DEFAULT_SPEC = {
  plant: 'drone3D',
  controls: ['roll', 'pitch', 'throttle'],
  controlRanges: {
    roll: { min: -45, max: 45, unit: 'degrees' },
    pitch: { min: -45, max: 45, unit: 'degrees' },
    throttle: { min: 0, max: 100, unit: 'percent' }
  },
  objective: {
    hold_position: [0, 0, 5],
    duration: 30
  },
  constraints: {
    wind_gust: '±2m/s',
    sample_time: 0.02
  },
  simulation: 'real-time 3D',
  dataSource: ''
};

// Initialize a new conversation
export const initializeConversation = (taskDescription: string): ConversationState => {
  return {
    messages: [
      {
        role: 'model' as const,
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: 'user' as const,
        parts: [{ text: taskDescription }]
      }
    ],
    spec: DEFAULT_SPEC,
    questionsAnswered: false
  };
};

// Send a message and get the model's response
export const sendMessage = async (state: ConversationState, userMessage: string): Promise<ConversationState> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Add user message to conversation
    const updatedMessages = [
      ...state.messages,
      {
        role: 'user' as const,
        parts: [{ text: userMessage }]
      }
    ];

    // Generate response
    const result = await model.generateContent({
      contents: updatedMessages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const response = result.response;
    const responseText = response.text();

    // Check if the response contains a JSON specification
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const spec = JSON.parse(jsonMatch[1]);
        return {
          messages: [
            ...updatedMessages,
            {
              role: 'model' as const,
              parts: [{ text: responseText }]
            }
          ],
          spec: { ...DEFAULT_SPEC, ...spec }, // Merge with default spec
          questionsAnswered: true
        };
      } catch (e) {
        console.error('Failed to parse JSON specification:', e);
      }
    }

    // If no JSON found, continue the conversation
    return {
      messages: [
        ...updatedMessages,
        {
          role: 'model' as const,
          parts: [{ text: responseText }]
        }
      ],
      spec: state.spec,
      questionsAnswered: false
    };
  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

// Generate the final specification
export const generateSpecification = async (state: ConversationState): Promise<any> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Based on the following task description, generate a complete specification for a control system design.

Task Description: ${state.messages[0].parts[0].text}

For any values not explicitly specified in the task description, use reasonable defaults but mark them as assumed values.`;

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        plant: {
          type: SchemaType.STRING,
          description: "The type of system being controlled (e.g. 'quadcopter3D', 'drone3D')",
          enum: ["drone3D", "quadcopter3D", "fixedWing3D"],
          format: "enum"
        },
        controls: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: "Array of control inputs (e.g. ['roll', 'pitch', 'throttle'])"
        },
        controlRanges: {
          type: SchemaType.OBJECT,
          description: "Range limits for each control input",
          properties: {
            roll: {
              type: SchemaType.OBJECT,
              properties: {
                min: {
                  type: SchemaType.NUMBER,
                  description: "Minimum value for the control input"
                },
                max: {
                  type: SchemaType.NUMBER,
                  description: "Maximum value for the control input"
                },
                unit: {
                  type: SchemaType.STRING,
                  description: "Unit of measurement (e.g. 'degrees', 'radians', 'm/s')"
                }
              },
              required: ["min", "max", "unit"]
            },
            pitch: {
              type: SchemaType.OBJECT,
              properties: {
                min: {
                  type: SchemaType.NUMBER,
                  description: "Minimum value for the control input"
                },
                max: {
                  type: SchemaType.NUMBER,
                  description: "Maximum value for the control input"
                },
                unit: {
                  type: SchemaType.STRING,
                  description: "Unit of measurement (e.g. 'degrees', 'radians', 'm/s')"
                }
              },
              required: ["min", "max", "unit"]
            },
            throttle: {
              type: SchemaType.OBJECT,
              properties: {
                min: {
                  type: SchemaType.NUMBER,
                  description: "Minimum throttle percentage"
                },
                max: {
                  type: SchemaType.NUMBER,
                  description: "Maximum throttle percentage"
                },
                unit: {
                  type: SchemaType.STRING,
                  description: "Unit of measurement (percent)"
                }
              },
              required: ["min", "max", "unit"]
            }
          }
        },
        objective: {
          type: SchemaType.OBJECT,
          properties: {
            hold_position: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.NUMBER
              },
              minItems: 3,
              maxItems: 3,
              description: "Target position [x, y, z] in meters"
            },
            duration: {
              type: SchemaType.NUMBER,
              description: "Duration in seconds"
            }
          },
          required: ["hold_position", "duration"]
        },
        constraints: {
          type: SchemaType.OBJECT,
          properties: {
            wind_gust: {
              type: SchemaType.STRING,
              description: "Wind gust specification (e.g. '±2m/s')"
            },
            sample_time: {
              type: SchemaType.NUMBER,
              description: "Sample time in seconds"
            }
          },
          required: ["wind_gust", "sample_time"]
        },
        simulation: {
          type: SchemaType.STRING,
          description: "Type of simulation",
          enum: ["real-time 3D", "real-time 2D", "offline 3D", "offline 2D"],
          format: "enum"
        },
        dataSource: {
          type: SchemaType.STRING,
          description: "Data source or API endpoint information"
        }
      },
      required: ["plant", "controls", "objective", "constraints", "simulation", "dataSource"]
    };

    const result = await model.generateContent({
      contents: [
        {
          role: 'user' as const,
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const response = result.response;
    const responseText = response.text();

    try {
      const spec = JSON.parse(responseText);
      return { ...DEFAULT_SPEC, ...spec }; // Merge with default spec
    } catch (e) {
      console.error('Failed to parse JSON specification:', e);
      throw new Error('Failed to generate valid specification');
    }
  } catch (error) {
    console.error('Error in generateSpecification:', error);
    throw error;
  }
};

// Analyze specification and recommend controllers
export const analyzeSpecification = async (spec: any): Promise<ControllerRecommendation[]> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Analyze the following control system specification and recommend appropriate controllers.
For each controller, provide:
1. A detailed description of why it's suitable
2. Success probability based on the specification
3. Estimated computation time
4. Whether it requires GPU
5. Initial parameters if applicable

Specification:
${JSON.stringify(spec, null, 2)}

Consider:
- System type (${spec.plant})
- Control objectives (${JSON.stringify(spec.objective)})
- Environmental constraints (${JSON.stringify(spec.constraints)})
- Control inputs and ranges (${JSON.stringify(spec.controlRanges)})
- Sample time (${spec.constraints.sample_time}s)

Return the recommendations as a JSON array of controller objects in the following format:
\`\`\`json
[
  {
    "id": "controller-id",
    "name": "Controller Name",
    "description": "Detailed description",
    "successProbability": 0.85,
    "timeEstimate": "5-10 minutes",
    "requiresGPU": false,
    "parameters": {
      // Optional controller-specific parameters
    }
  }
]
\`\`\`

Keep the response concise but informative.`;

    console.log('Sending prompt to Gemini:', prompt);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Increased token limit
      },
    });

    const response = result.response;
    const responseText = response.text();
    
    console.log('Raw response from Gemini:', responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      console.log('Found JSON match:', jsonMatch[1]);
      try {
        // Try to parse the JSON, even if it's incomplete
        const recommendations = JSON.parse(jsonMatch[1]);
        console.log('Parsed recommendations:', recommendations);
        
        // Validate recommendations structure
        if (!Array.isArray(recommendations)) {
          console.error('Recommendations is not an array:', recommendations);
          throw new Error('Invalid recommendations format: expected array');
        }
        
        // Validate each recommendation
        const validRecommendations = recommendations.filter((rec, index) => {
          const isValid = rec.id && rec.name && rec.description && 
                         typeof rec.successProbability === 'number' && 
                         rec.timeEstimate && 
                         typeof rec.requiresGPU === 'boolean';
          
          if (!isValid) {
            console.warn(`Skipping invalid recommendation at index ${index}:`, rec);
          }
          
          return isValid;
        });
        
        if (validRecommendations.length === 0) {
          throw new Error('No valid recommendations found after filtering');
        }
        
        return validRecommendations;
      } catch (e) {
        console.error('Failed to parse controller recommendations:', e);
        console.error('JSON content that failed to parse:', jsonMatch[1]);
        throw new Error('Failed to parse controller recommendations');
      }
    }

    console.error('No JSON block found in response. Full response:', responseText);
    throw new Error('No valid controller recommendations found in response');
  } catch (error) {
    console.error('Error in analyzeSpecification:', error);
    throw error;
  }
}; 