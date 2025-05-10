interface AgentMessage {
  timestamp: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface AgentState {
  id: string;
  status: 'running' | 'completed' | 'error';
  startTime: string;
  lastUpdate: string;
  error?: string;
  messages: AgentMessage[];
}

class AgentStateManager {
  private static instance: AgentStateManager;
  private states: Map<string, AgentState>;

  private constructor() {
    this.states = new Map();
  }

  static getInstance(): AgentStateManager {
    if (!AgentStateManager.instance) {
      AgentStateManager.instance = new AgentStateManager();
    }
    return AgentStateManager.instance;
  }

  createState(id: string): AgentState {
    const state: AgentState = {
      id,
      status: 'running',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      messages: []
    };
    this.states.set(id, state);
    return state;
  }

  addMessage(id: string, content: string, type: AgentMessage['type'] = 'info'): AgentState | null {
    const state = this.states.get(id);
    if (!state) return null;

    const message: AgentMessage = {
      timestamp: new Date().toISOString(),
      content,
      type
    };

    const updatedState = {
      ...state,
      messages: [...state.messages, message],
      lastUpdate: new Date().toISOString()
    };
    this.states.set(id, updatedState);
    return updatedState;
  }

  updateState(id: string, update: Partial<Omit<AgentState, 'messages'>>): AgentState | null {
    const state = this.states.get(id);
    if (!state) return null;

    const updatedState = {
      ...state,
      ...update,
      lastUpdate: new Date().toISOString()
    };
    this.states.set(id, updatedState);
    return updatedState;
  }

  getState(id: string): AgentState | null {
    return this.states.get(id) || null;
  }

  deleteState(id: string): boolean {
    return this.states.delete(id);
  }

  getAllStates(): AgentState[] {
    return Array.from(this.states.values());
  }
}

export const agentStateManager = AgentStateManager.getInstance(); 