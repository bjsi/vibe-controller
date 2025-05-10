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
}

interface ExperimentDashboardProps {
  config: any;
  onSelectBest: (controller: Controller) => void;
}

const ExperimentDashboard = ({ config, onSelectBest }: ExperimentDashboardProps) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [cliMessages, setCliMessages] = useState<CLIMessage[]>([]);
  const [selectedController, setSelectedController] = useState<Controller | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(true);

  useEffect(() => {
    // Simulate controllers being generated and tuned
    const initialControllers = [];
    
    if (config.selectedControllers.pid) {
      initialControllers.push({
        id: 'pid-1',
        type: 'PID',
        iteration: 1,
        metrics: {
          riseTime: 1.2,
          overshoot: 12.5,
          steadyStateError: 0.08,
          energy: 18.2
        },
        selected: false
      });
    }
    
    if (config.selectedControllers.lqr) {
      initialControllers.push({
        id: 'lqr-1',
        type: 'LQR',
        iteration: 1,
        metrics: {
          riseTime: 0.9,
          overshoot: 8.2,
          steadyStateError: 0.05,
          energy: 22.1
        },
        selected: false
      });
    }
    
    setControllers(initialControllers);
    
    // Initial CLI messages
    setCliMessages([
      {
        type: 'assistant',
        content: 'Starting controller tuning process...',
        timestamp: new Date().toISOString()
      },
      {
        type: 'assistant',
        content: 'Initializing PID and LQR controllers with default parameters...',
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Simulate progress updates
    const updateInterval = setInterval(() => {
      setControllers(prevControllers => {
        const newControllers = [...prevControllers];
        return newControllers.map(controller => {
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
      
      // Add new CLI messages
      setCliMessages(prevMessages => {
        const newMessages = [...prevMessages];
        
        const cliResponses = [
          'Analyzing controller response to step input...',
          'Adjusting PID gains to reduce overshoot...',
          'Testing controller stability under wind disturbance...',
          'Optimizing LQR cost matrix for better energy efficiency...',
          'Evaluating transient response characteristics...',
          'Recalculating controller parameters based on simulation results...',
          'Reducing steady-state position error...',
          'Testing performance with varying wind conditions...'
        ];
        
        newMessages.push({
          type: 'assistant',
          content: cliResponses[Math.floor(Math.random() * cliResponses.length)],
          timestamp: new Date().toISOString()
        });
        
        // Keep only the last 20 messages
        return newMessages.slice(-20);
      });
      
    }, 3000);
    
    // Stop the simulation after some time
    setTimeout(() => {
      clearInterval(updateInterval);
      setSimulationRunning(false);
      
      setCliMessages(prevMessages => [
        ...prevMessages,
        {
          type: 'assistant',
          content: 'Controller tuning process complete. Ready for final selection.',
          timestamp: new Date().toISOString()
        }
      ]);
    }, 20000);
    
    return () => clearInterval(updateInterval);
  }, [config]);

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
                  <span className="text-yellow-400">
                    {message.type === 'assistant' ? 'Claude:' : 'User:'}
                  </span>
                </div>
                <div className="ml-8 whitespace-pre-wrap">
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
