import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowDown, ArrowUp } from "lucide-react";

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

interface ExperimentDashboardProps {
  config: any;
  onSelectBest: (controller: Controller) => void;
}

const ExperimentDashboard = ({ config, onSelectBest }: ExperimentDashboardProps) => {
  const [controllers, setControllers] = useState<Controller[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Controller['metrics']>('steadyStateError');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
    
    // Initial log
    setLogs(['Starting controller tuning process...', 'Evaluating initial controller parameters...']);
    
    // Simulate progress updates
    const updateInterval = setInterval(() => {
      setControllers(prevControllers => {
        // Clone the previous controllers
        const newControllers = [...prevControllers];
        
        // Improve metrics for each controller
        return newControllers.map(controller => {
          // Don't update if already at max iteration
          if (controller.type === 'PID' && controller.iteration === 5) return controller;
          if (controller.type === 'LQR' && controller.iteration === 5) return controller;
          
          const iterationNum = typeof controller.iteration === 'number' ? controller.iteration : 1;
          const newIteration = iterationNum + 1;
          
          // Improve metrics based on controller type and iteration
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
      
      // Add new logs
      setLogs(prevLogs => {
        const newLogs = [...prevLogs];
        
        // Random log messages
        const logMessages = [
          'Analyzing controller response to step input...',
          'Adjusting PID gains to reduce overshoot...',
          'Testing controller stability under wind disturbance...',
          'Optimizing LQR cost matrix for better energy efficiency...',
          'Evaluating transient response characteristics...',
          'Recalculating controller parameters based on simulation results...',
          'Reducing steady-state position error...',
          'Testing performance with varying wind conditions...'
        ];
        
        newLogs.push(logMessages[Math.floor(Math.random() * logMessages.length)]);
        
        // Keep only the last 10 logs
        return newLogs.slice(-10);
      });
      
    }, 3000);
    
    // Stop the simulation after some time
    setTimeout(() => {
      clearInterval(updateInterval);
      setSimulationRunning(false);
      
      setLogs(prevLogs => [...prevLogs, 'Controller tuning process complete. Ready for final selection.']);
    }, 20000);
    
    return () => clearInterval(updateInterval);
  }, [config]);

  const handleSort = (field: keyof Controller['metrics']) => {
    setSortField(field);
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  const sortedControllers = [...controllers].sort((a, b) => {
    const valueA = a.metrics[sortField];
    const valueB = b.metrics[sortField];
    
    if (sortDirection === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });
  
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
      
      {/* Right: Metrics Table & Log */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <div className="rounded-md overflow-x-auto mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Controller</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('riseTime')}
                  >
                    <div className="flex items-center">
                      Rise Time
                      {sortField === 'riseTime' && (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('overshoot')}
                  >
                    <div className="flex items-center">
                      Overshoot
                      {sortField === 'overshoot' && (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('steadyStateError')}
                  >
                    <div className="flex items-center">
                      Error
                      {sortField === 'steadyStateError' && (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('energy')}
                  >
                    <div className="flex items-center">
                      Energy
                      {sortField === 'energy' && (
                        sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedControllers.map(controller => (
                  <TableRow 
                    key={controller.id} 
                    className={controller.selected ? 'bg-primary/10' : ''}
                    onClick={() => handleSelectController(controller)}
                  >
                    <TableCell className="font-medium">
                      {controller.type} #{controller.iteration}
                    </TableCell>
                    <TableCell>{controller.metrics.riseTime.toFixed(2)}s</TableCell>
                    <TableCell>{controller.metrics.overshoot.toFixed(1)}%</TableCell>
                    <TableCell 
                      className={
                        sortField === 'steadyStateError' && 
                        controller.metrics.steadyStateError === Math.min(
                          ...controllers.map(c => c.metrics.steadyStateError)
                        )
                          ? 'text-primary font-medium'
                          : ''
                      }
                    >
                      {controller.metrics.steadyStateError.toFixed(3)}m
                    </TableCell>
                    <TableCell>{controller.metrics.energy.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex-grow">
            <h3 className="font-medium text-sm mb-2">Tuning Log</h3>
            <div className="bg-secondary p-3 rounded-md h-32 overflow-y-auto text-sm space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-primary text-[10px]">AI</AvatarFallback>
                  </Avatar>
                  <p>{log}</p>
                </div>
              ))}
            </div>
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
