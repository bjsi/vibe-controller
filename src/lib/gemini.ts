import { GoogleGenerativeAI } from '@google/generative-ai';

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
- controls: Array of control inputs (e.g. ['roll', 'pitch', 'yaw'])
- objective: The control objective including position and duration
- constraints: Environmental and system constraints
- simulation: The type of simulation to use
- dataSource: Any data source or API endpoint information

Provide only clarifying questions with no other flavor text. Be concise.`;

// Interface for the conversation state
export interface ConversationState {
  messages: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  spec: any;
  questionsAnswered: boolean;
}

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
    spec: null,
    questionsAnswered: false
  };
};

// Send a message and get the model's response
export const sendMessage = async (state: ConversationState, userMessage: string): Promise<ConversationState> => {
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
        spec,
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
};

// Generate the final specification
export const generateSpecification = async (state: ConversationState): Promise<any> => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Based on our conversation, please generate a complete specification in JSON format. Include all necessary details for the control system design.

The specification should follow this structure:
{
  "plant": string,
  "controls": string[],
  "objective": {
    "hold_position": number[],
    "duration": number
  },
  "constraints": {
    "wind_gust": string,
    "sample_time": number
  },
  "simulation": string,
  "dataSource": string
}

Please provide the specification in a JSON code block.`;

  const result = await model.generateContent({
    contents: [
      ...state.messages,
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
    },
  });

  const response = result.response;
  const responseText = response.text();

  // Extract JSON from the response
  const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.error('Failed to parse JSON specification:', e);
      throw new Error('Failed to generate valid specification');
    }
  }

  throw new Error('No valid specification found in response');
}; 