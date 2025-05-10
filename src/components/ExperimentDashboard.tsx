import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface Experiment {
  id: string;
  status: string;
  startTime: string;
  instructions: string;
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
  onRunExperiment?: (experimentId: string) => void;
}

interface ExperimentState {
  status: 'running' | 'completed' | 'error' | 'ended';
  log: Array<{
    type: 'assistant' | 'user';
    content: string;
    timestamp: string;
  }>;
}

const ExperimentDashboard = ({ config, onSelectBest, onRunExperiment }: ExperimentDashboardProps) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [cliMessages, setCliMessages] = useState<CLIMessage[]>([]);
  const [selectedController, setSelectedController] = useState<Controller | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [activeTab, setActiveTab] = useState<'log' | 'experiments'>('experiments');

  console.log("config", config);
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
      console.log('[ExperimentDashboard] No config provided, waiting...');
      return;
    }

    console.log('[ExperimentDashboard] Received config:', config);
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
    
    return () => {
      clearInterval(controllerUpdateInterval);
    };
  }, [config]);

  // Load experiments on mount
  useEffect(() => {
    const fetchExperiments = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/list_experiments');
        if (!response.ok) throw new Error('Failed to fetch experiments');
        
        const data = await response.json();
        if (data.status === 'success') {
          setExperiments(data.data);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching experiments:', error);
        setCliMessages(prev => [
          ...prev,
          {
            type: 'assistant' as const,
            content: `Error fetching experiments: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date().toISOString(),
            status: 'error' as const
          }
        ].slice(-20));
        setIsLoading(false);
      }
    };

    fetchExperiments();
    const intervalId = setInterval(fetchExperiments, 5000);
    return () => clearInterval(intervalId);
  }, []);

  // Handle experiment selection
  const handleSelectExperiment = (experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setActiveTab('log');
    
    // Initialize controllers based on experiment
    const initialControllers = [];
    if (experiment.instructions.includes('PID')) {
      initialControllers.push({
        id: 'pid-1',
        type: 'PID',
        iteration: 1,
        metrics: { riseTime: 1.2, overshoot: 12.5, steadyStateError: 0.08, energy: 18.2 },
        selected: false
      });
    }
    if (experiment.instructions.includes('LQR')) {
      initialControllers.push({
        id: 'lqr-1',
        type: 'LQR',
        iteration: 1,
        metrics: { riseTime: 0.9, overshoot: 8.2, steadyStateError: 0.05, energy: 22.1 },
        selected: false
      });
    }
    setControllers(initialControllers);
    
    // Add initial message
    setCliMessages([
      {
        type: 'assistant' as const,
        content: `Selected experiment ${experiment.id}. Ready to execute drone.`,
        timestamp: new Date().toISOString(),
        status: 'info' as const
      }
    ]);
  };

  const executeDrone = async () => {
    if (!selectedExperiment?.id) {
      setCliMessages(prev => [
        ...prev,
        {
          type: 'assistant' as const,
          content: 'No experiment selected. Please select an experiment first.',
          timestamp: new Date().toISOString(),
          status: 'error' as const
        }
      ].slice(-20));
      return;
    }

    try {
      setSimulationRunning(true);
      const response = await fetch('http://localhost:3000/api/execute_drone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedExperiment.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute drone');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setCliMessages(prev => [
          ...prev,
          {
            type: 'assistant' as const,
            content: 'Drone execution started successfully',
            timestamp: new Date().toISOString(),
            status: 'success' as const
          }
        ].slice(-20));
      } else {
        throw new Error(data.message || 'Failed to execute drone');
      }
    } catch (error) {
      console.error('Error executing drone:', error);
      setCliMessages(prev => [
        ...prev,
        {
          type: 'assistant' as const,
          content: `Error executing drone: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
          status: 'error' as const
        }
      ].slice(-20));
    } finally {
      setSimulationRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto animate-fade-in">
        <Card className="lg:col-span-3">
          <CardContent className="flex items-center justify-center h-[500px]">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 border-t-2 border-primary rounded-full animate-spin-slow mb-3"></div>
              <p className="text-lg">Loading experiments...</p>
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
            <iframe 
              src="http://172.237.101.153:8080" 
              className="w-full h-full border-0"
              title="Drone Simulation"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Right: CLI Interface and Experiments */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Experiment Log</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'log' | 'experiments')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="log">Log</TabsTrigger>
              <TabsTrigger value="experiments">Experiments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="log" className="mt-4">
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
            </TabsContent>
            
            <TabsContent value="experiments" className="mt-4">
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {experiments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No experiments found
                  </div>
                ) : (
                  experiments.map(experiment => (
                    <Card key={experiment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">Experiment {experiment.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(experiment.startTime).toLocaleString()}
                          </p>
                          <p className="text-sm mt-2 line-clamp-2">
                            {experiment.instructions}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            experiment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            experiment.status === 'error' ? 'bg-red-100 text-red-800' :
                            experiment.status === 'running' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {experiment.status}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectExperiment(experiment)}
                            disabled={experiment.status === 'running'}
                          >
                            Select
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 flex justify-between">
            <Button 
              onClick={executeDrone}
              variant="outline"
              className="mr-2"
              disabled={!selectedExperiment || simulationRunning}
            >
              Execute Drone
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExperimentDashboard;
