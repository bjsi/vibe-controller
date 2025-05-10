interface AgentMessage {
  timestamp: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

interface AgentState {
  id: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  startTime: string;
  lastUpdate: string;
  error?: string;
  messages: AgentMessage[];
}

class AgentStateManager {
  private static instance: AgentStateManager;
  private states: Map<string, AgentState>;
  private instanceId: string; // Unique ID for the instance

  private constructor() {
    this.states = new Map();
    this.instanceId = Math.random().toString(36).substring(2, 9);
    console.log(`[AgentStateManager] New instance created with ID: ${this.instanceId}`);
  }

  static getInstance(): AgentStateManager {
    if (!AgentStateManager.instance) {
      AgentStateManager.instance = new AgentStateManager();
    }
    return AgentStateManager.instance;
  }

  createState(id: string): AgentState {
    console.log(`[AgentStateManager instance ${this.instanceId}] createState called for id: ${id}`);
    const state: AgentState = {
      id,
      status: 'pending',
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      messages: []
    };
    this.states.set(id, state);
    return state;
  }

  addMessage(id: string, content: string, type: AgentMessage['type'] = 'info'): AgentState | null {
    console.log(`[AgentStateManager instance ${this.instanceId}] addMessage called for id: ${id}, type: ${type}`);
    const state = this.states.get(id);
    if (!state) {
      console.warn(`[AgentStateManager instance ${this.instanceId}] No state found for id: ${id} in addMessage`);
      return null;
    }

    const message: AgentMessage = {
      timestamp: new Date().toISOString(),
      content,
      type
    };

    // Update state based on message type
    let newStatus = state.status;
    if (type === 'error' && state.status !== 'error') {
      newStatus = 'error';
    } else if (state.status === 'pending' && type === 'info') {
      newStatus = 'running';
    }

    const updatedState = {
      ...state,
      status: newStatus,
      messages: [...state.messages, message],
      lastUpdate: new Date().toISOString()
    };
    this.states.set(id, updatedState);
    return updatedState;
  }

  updateState(id: string, update: Partial<Omit<AgentState, 'messages'>>): AgentState | null {
    console.log(`[AgentStateManager instance ${this.instanceId}] updateState called for id: ${id}`);
    const state = this.states.get(id);
    if (!state) {
      console.warn(`[AgentStateManager instance ${this.instanceId}] No state found for id: ${id} in updateState`);
      return null;
    }

    const updatedState = {
      ...state,
      ...update,
      lastUpdate: new Date().toISOString()
    };
    this.states.set(id, updatedState);
    return updatedState;
  }

  getState(id: string): AgentState | null {
    console.log(`[AgentStateManager instance ${this.instanceId}] getState called for id: ${id}`);
    const stateResult = this.states.get(id) || null;
    if (!stateResult) {
        console.warn(`[AgentStateManager instance ${this.instanceId}] No state found for id: ${id} in getState`);
    }
    return stateResult;
  }

  deleteState(id: string): boolean {
    console.log(`[AgentStateManager instance ${this.instanceId}] deleteState called for id: ${id}`);
    return this.states.delete(id);
  }

  getAllStates(): AgentState[] {
    console.log(`[AgentStateManager instance ${this.instanceId}] getAllStates called`);
    return Array.from(this.states.values());
  }
}

export const agentStateManager = AgentStateManager.getInstance(); 