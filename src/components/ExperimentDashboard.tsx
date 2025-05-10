import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Controller {
  id: string;
  type: string;
  iteration: number | string;
  metrics: {
    riseTime: number;
    overshoot: number;
    steadyStateError: number;
    energy: number;
  };
  selected: boolean;
}

interface CLIMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: 'info' | 'warning' | 'error' | 'success';
}

interface ExperimentDashboardProps {
  config: {
    id?: string;
    selectedControllers?: {
      pid?: boolean;
      lqr?: boolean;
    };
  } | null;
  onSelectBest: (controller: Controller) => void;
}

interface ExperimentState {
  status: 'running' | 'completed' | 'error' | 'ended';
  log: Array<{
    type: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
}

const ExperimentDashboard = ({ config, onSelectBest }: ExperimentDashboardProps) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [cliMessages, setCliMessages] = useState<CLIMessage[]>([]);
  const [selectedController, setSelectedController] = useState<Controller | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [agentState, setAgentState] = useState<ExperimentState>({ status: 'running', log: [] });
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!config) {
      setIsLoading(true);
      setCliMessages([
        {
          type: 'assistant',
          content: 'Waiting for experiment configuration...',
          timestamp: new Date().toISOString()
        }
      ]);
      return;
    }

    setIsLoading(false);
    const initialControllers = [];
    if (config.selectedControllers?.pid) {
      initialControllers.push({
        id: 'pid-1',
        type: 'PID',
        iteration: 1,
        metrics: { riseTime: 1.2, overshoot: 12.5, steadyStateError: 0.08, energy: 18.2 },
        selected: false
      });
    }
    if (config.selectedControllers?.lqr) {
      initialControllers.push({
        id: 'lqr-1',
        type: 'LQR',
        iteration: 1,
        metrics: { riseTime: 0.9, overshoot: 8.2, steadyStateError: 0.05, energy: 22.1 },
        selected: false
      });
    }
    setControllers(initialControllers);

    setCliMessages([
      {
        type: 'assistant',
        content: `Starting experiment ${config.id || 'process'}... Waiting for agent outputs.`,
        timestamp: new Date().toISOString()
      }
    ]);

    const controllerUpdateInterval = setInterval(() => {
      setControllers(prevControllers => {
        return prevControllers.map(controller => {
          if (controller.type === 'PID' && controller.iteration === 5) return controller;
          if (controller.type === 'LQR' && controller.iteration === 5) return controller;
          const iterationNum = typeof controller.iteration === 'number' ? controller.iteration : 1;
          const newIteration = iterationNum + 1;
          const multiplier = controller.type === 'PID' ? 0.85 : 0.9;
          return {
            ...controller,
            iteration: newIteration,
            metrics: {
              riseTime: Math.max(0.3, controller.metrics.riseTime * (1 - 0.1 * Math.random())),
              overshoot: Math.max(1.2, controller.metrics.overshoot * multiplier),
              steadyStateError: Math.max(0.01, controller.metrics.steadyStateError * multiplier),
              energy: controller.metrics.energy * (1 - 0.03 * Math.random())
            }
          };
        });
      });
    }, 3000);

    const overallSimulationTimeout = setTimeout(() => {
      setSimulationRunning(false);
      setCliMessages(prevMessages => [
        ...prevMessages,
        {
          type: 'assistant',
          content: 'Experiment run concluded by dashboard timer. Check agent state for final status.',
          timestamp: new Date().toISOString()
        } as CLIMessage
      ].slice(-20));
    }, 30000);

    return () => {
      clearInterval(controllerUpdateInterval);
      clearTimeout(overallSimulationTimeout);
    };
  }, [config]);

  useEffect(() => {
    if (!config?.id) {
      return;
    }

    const experimentId = config.id;
    let isMounted = true;

    const fetchAgentState = async () => {
      try {
        console.log('[ExperimentDashboard] Fetching state for experiment', experimentId);
        const response = await fetch(`http://localhost:3000/api/get_experiment_state?id=${experimentId}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        console.log('[ExperimentDashboard] Response status:', response.status);
        console.log('[ExperimentDashboard] Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('[ExperimentDashboard] Raw response:', responseText.substring(0, 200) + '...');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
        }
        
        let stateData;
        try {
          stateData = JSON.parse(responseText);
        } catch (e) {
          console.error('[ExperimentDashboard] Failed to parse JSON:', e);
          throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}...`);
        }
        
        console.log('[ExperimentDashboard] Received state data:', stateData);
        
        if (stateData.status === 'completed' || stateData.status === 'error') {
          setPolling(false);
        }
        
        setAgentState(stateData);
      } catch (error) {
        console.error('[ExperimentDashboard] Failed to fetch or process agent state:', error);
        setAgentState(prev => ({
          ...prev,
          log: [
            ...prev.log,
            {
              type: 'assistant',
              content: `Error fetching state: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date().toISOString(),
              status: 'error'
            }
          ]
        }));
      }
    };

    if (simulationRunning) {
      fetchAgentState();
    }

    return () => {
      isMounted = false;
    };
  }, [config?.id, simulationRunning]);

  const handleSelectController = (controller: Controller) => {
    setControllers(prev => 
      prev.map(c => ({
        ...c,
        selected: c.id === controller.id
      }))
    );
    
    setSelectedController(controller);
  };
  
  const handleFinalize = () => {
    if (selectedController) {
      onSelectBest(selectedController);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto animate-fade-in">
        <Card className="lg:col-span-3">
          <CardContent className="flex items-center justify-center h-[500px]">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 border-t-2 border-primary rounded-full animate-spin-slow mb-3"></div>
              <p className="text-lg">Loading experiment configuration...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto animate-fade-in">
      {/* Left: Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Multi-Sim Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid-background h-[500px] rounded-lg flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {simulationRunning ? (
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 border-t-2 border-primary rounded-full animate-spin-slow mb-3"></div>
                  <p className="text-sm">Simulation Running...</p>
                </div>
              ) : (
                <p className="text-lg font-medium">Simulation Complete</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 h-full w-full p-4">
              {controllers.map(controller => (
                <div 
                  key={controller.id}
                  className={`bg-secondary/50 rounded-lg p-4 flex flex-col relative ${
                    controller.selected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectController(controller)}
                >
                  <h3 className="font-medium mb-2">{controller.type} Controller #{controller.iteration}</h3>
                  
                  <div className="flex-grow relative">
                    {/* Simplified visualization of drone trajectory */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-32 bg-secondary/80 relative">
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full" />
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className="text-muted-foreground">Rise Time:</div>
                    <div className="text-right">{controller.metrics.riseTime.toFixed(2)}s</div>
                    
                    <div className="text-muted-foreground">Overshoot:</div>
                    <div className="text-right">{controller.metrics.overshoot.toFixed(1)}%</div>
                    
                    <div className="text-muted-foreground">Error:</div>
                    <div className="text-right">{controller.metrics.steadyStateError.toFixed(3)}m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Right: CLI Interface */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Experiment Log</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <div className="bg-black text-green-400 font-mono text-sm p-4 rounded-md h-[500px] overflow-y-auto flex flex-col">
            {cliMessages.map((message, index) => (
              <div key={index} className="mb-2">
                <div className="flex items-start gap-2">
                  <span className="text-gray-400">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`${
                    message.status === 'error' ? 'text-red-400' :
                    message.status === 'warning' ? 'text-yellow-400' :
                    message.status === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }`}>
                    {message.type === 'assistant' ? 'Claude:' : 'User:'}
                  </span>
                </div>
                <div className={`ml-8 whitespace-pre-wrap ${
                  message.status === 'error' ? 'text-red-400' :
                  message.status === 'warning' ? 'text-yellow-400' :
                  message.status === 'success' ? 'text-green-400' :
                  'text-gray-300'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {simulationRunning && (
              <div className="animate-pulse text-green-400">_</div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={handleFinalize}
              disabled={!selectedController || simulationRunning}
            >
              {simulationRunning ? 'Running...' : 'Select Best Controller'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExperimentDashboard;
