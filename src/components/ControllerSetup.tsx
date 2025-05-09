
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface ControllerSetupProps {
  spec: any;
  onLaunch: (config: any) => void;
}

interface ControllerType {
  id: string;
  name: string;
  description: string;
  successProbability: number;
  timeEstimate: string;
  requiresGPU: boolean;
}

const ControllerSetup = ({ spec, onLaunch }: ControllerSetupProps) => {
  const [selectedControllers, setSelectedControllers] = useState({
    pid: true,
    lqr: true,
    mpc: false,
    rl: false,
    custom: false
  });
  
  const [tuningStrategy, setTuningStrategy] = useState('llm');
  const [iterations, setIterations] = useState(5);
  const [trials, setTrials] = useState(8);
  const [workers, setWorkers] = useState(4);
  const [customControllerDesc, setCustomControllerDesc] = useState('');
  
  // Simulated controller types with probabilities and estimates
  const controllerTypes: ControllerType[] = [
    {
      id: 'pid',
      name: 'PID Controller',
      description: 'Classic feedback control with proportional, integral, and derivative terms. Simple to implement with good performance for many systems.',
      successProbability: 0.87,
      timeEstimate: '5-10 minutes',
      requiresGPU: false
    },
    {
      id: 'lqr',
      name: 'LQR Controller',
      description: 'Linear Quadratic Regulator optimizes a cost function balancing performance and control effort.',
      successProbability: 0.78,
      timeEstimate: '8-12 minutes',
      requiresGPU: false
    },
    {
      id: 'mpc',
      name: 'MPC Controller',
      description: 'Model Predictive Control uses a model to predict future states and optimize control actions over a finite horizon.',
      successProbability: 0.65,
      timeEstimate: '15-20 minutes',
      requiresGPU: true
    },
    {
      id: 'rl',
      name: 'RL Controller',
      description: 'Reinforcement Learning controller learns optimal policy through interaction with the environment. Requires more compute time.',
      successProbability: 0.52,
      timeEstimate: '30-45 minutes',
      requiresGPU: true
    }
  ];
  
  // Sort controllers by success probability
  const rankedControllers = [...controllerTypes].sort((a, b) => 
    b.successProbability - a.successProbability
  );
  
  const handleControllerChange = (name: keyof typeof selectedControllers) => {
    setSelectedControllers(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };
  
  const handleLaunch = () => {
    const config = {
      selectedControllers,
      tuningStrategy,
      iterations,
      trials,
      workers,
      customControllerDescription: customControllerDesc
    };
    
    onLaunch(config);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">Controller Setup</CardTitle>
        <CardDescription>Configure the controller types and tuning strategy</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tuning">Tuning Strategy</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6 pt-4">
            <div className="space-y-2">
              <h3 className="font-medium">Specification Summary</h3>
              <div className="bg-secondary p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Plant:</div>
                  <div>{spec.plant}</div>
                  
                  <div className="font-medium">Objective:</div>
                  <div>Hold position at [{spec.objective.hold_position.join(', ')}m]</div>
                  
                  <div className="font-medium">Duration:</div>
                  <div>{spec.objective.duration}s</div>
                  
                  <div className="font-medium">Wind Gust:</div>
                  <div>{spec.constraints.wind_gust}</div>
                  
                  {spec.dataSource && (
                    <>
                      <div className="font-medium">Data Source:</div>
                      <div className="truncate">{spec.dataSource}</div>
                    </>
                  )}
                  
                  <div className="font-medium">Visualization:</div>
                  <div>{spec.simulation}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Recommended Controllers</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Select the controllers you want to evaluate. Controllers are ranked by likelihood of success for your specific use case.
              </p>
              
              <div className="space-y-4">
                {rankedControllers.map((controller) => (
                  <div key={controller.id} className="border border-border rounded-lg p-4 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{controller.name}</h4>
                          <div className="text-xs px-2 py-1 rounded-full bg-secondary">
                            {Math.round(controller.successProbability * 100)}% match
                          </div>
                          {controller.requiresGPU && (
                            <div className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-600">
                              Requires GPU
                            </div>
                          )}
                        </div>
                        <Progress 
                          value={controller.successProbability * 100} 
                          className="h-1.5 mt-2 mb-3" 
                        />
                        <p className="text-sm text-muted-foreground mb-2">
                          {controller.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <span className="inline-block mr-4">⏱️ Est. time: {controller.timeEstimate}</span>
                        </div>
                      </div>
                      
                      <Checkbox 
                        id={controller.id} 
                        checked={selectedControllers[controller.id as keyof typeof selectedControllers]}
                        onCheckedChange={() => handleControllerChange(controller.id as keyof typeof selectedControllers)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
                
                {/* Custom Controller Option */}
                <div className="border border-border rounded-lg p-4 relative">
                  <div className="flex justify-between items-start">
                    <div className="w-full pr-8">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">Custom Controller</h4>
                      </div>
                      
                      <div className="mt-2">
                        {selectedControllers.custom ? (
                          <div className="space-y-2 w-full">
                            <Label htmlFor="custom-controller">Describe your controller in natural language</Label>
                            <Textarea
                              id="custom-controller"
                              placeholder="E.g., A nonlinear controller that uses gain scheduling based on altitude..."
                              value={customControllerDesc}
                              onChange={(e) => setCustomControllerDesc(e.target.value)}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              ⏱️ Est. time: Varies based on complexity
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Define your own custom controller using natural language
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <Checkbox 
                      id="custom" 
                      checked={selectedControllers.custom}
                      onCheckedChange={() => handleControllerChange('custom')}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="tuning" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="font-medium">Tuning Approach</h3>
              
              <RadioGroup 
                value={tuningStrategy} 
                onValueChange={setTuningStrategy}
                className="space-y-4"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="llm" id="llm" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="llm" className="font-medium">LLM-guided tuning loop</Label>
                    <p className="text-sm text-muted-foreground">
                      Sequential optimization guided by AI analysis of controller performance.
                      Best for interpretable results and learning about controller behavior.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="sweep" id="sweep" className="mt-1" />
                  <div className="grid gap-1.5">
                    <Label htmlFor="sweep" className="font-medium">Hyperparameter sweep</Label>
                    <p className="text-sm text-muted-foreground">
                      Parallel trials across parameter space to find optimal configuration.
                      Faster but less interpretable.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            {/* LLM settings */}
            {tuningStrategy === 'llm' && (
              <div className="space-y-4">
                <h3 className="font-medium">LLM Tuning Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="iterations">Max Iterations</Label>
                      <span className="text-sm">{iterations}</span>
                    </div>
                    <Slider
                      id="iterations"
                      min={1}
                      max={10}
                      step={1}
                      value={[iterations]}
                      onValueChange={(value) => setIterations(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      More iterations may yield better results but take longer to complete
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Sweep settings */}
            {tuningStrategy === 'sweep' && (
              <div className="space-y-4">
                <h3 className="font-medium">Sweep Settings</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="trials">Number of Trials</Label>
                      <span className="text-sm">{trials}</span>
                    </div>
                    <Slider
                      id="trials"
                      min={4}
                      max={32}
                      step={4}
                      value={[trials]}
                      onValueChange={(value) => setTrials(value[0])}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="workers">Parallel Workers</Label>
                      <span className="text-sm">{workers}</span>
                    </div>
                    <Slider
                      id="workers"
                      min={1}
                      max={8}
                      step={1}
                      value={[workers]}
                      onValueChange={(value) => setWorkers(value[0])}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-end border-t border-border pt-4">
        <Button
          onClick={handleLaunch}
          disabled={!Object.values(selectedControllers).some(Boolean) || 
                   (selectedControllers.custom && !customControllerDesc.trim())}
          className="bg-primary hover:bg-primary/90"
        >
          Start Experiments
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ControllerSetup;
