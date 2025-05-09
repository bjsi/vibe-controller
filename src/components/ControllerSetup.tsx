
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

interface ControllerSetupProps {
  spec: any;
  onLaunch: (config: any) => void;
}

const ControllerSetup = ({ spec, onLaunch }: ControllerSetupProps) => {
  const [selectedControllers, setSelectedControllers] = useState({
    pid: true,
    lqr: true,
    mpc: false,
    rl: false
  });
  
  const [tuningStrategy, setTuningStrategy] = useState('llm');
  const [iterations, setIterations] = useState(5);
  const [trials, setTrials] = useState(8);
  const [workers, setWorkers] = useState(4);
  
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
      workers
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
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-medium">Controller Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PID Controller */}
                <div className="border border-border rounded-lg p-4 relative">
                  <div className="absolute right-4 top-4">
                    <Checkbox 
                      id="pid" 
                      checked={selectedControllers.pid}
                      onCheckedChange={() => handleControllerChange('pid')}
                    />
                  </div>
                  <h4 className="font-medium mb-2">PID Controller</h4>
                  <p className="text-sm text-muted-foreground">
                    Classic feedback control with proportional, integral, and derivative terms.
                    Simple to implement with good performance for many systems.
                  </p>
                </div>
                
                {/* LQR Controller */}
                <div className="border border-border rounded-lg p-4 relative">
                  <div className="absolute right-4 top-4">
                    <Checkbox 
                      id="lqr" 
                      checked={selectedControllers.lqr}
                      onCheckedChange={() => handleControllerChange('lqr')}
                    />
                  </div>
                  <h4 className="font-medium mb-2">LQR Controller</h4>
                  <p className="text-sm text-muted-foreground">
                    Linear Quadratic Regulator optimizes a cost function balancing 
                    performance and control effort.
                  </p>
                </div>
                
                {/* MPC Controller */}
                <div className="border border-border rounded-lg p-4 relative">
                  <div className="absolute right-4 top-4">
                    <Checkbox 
                      id="mpc" 
                      checked={selectedControllers.mpc}
                      onCheckedChange={() => handleControllerChange('mpc')}
                    />
                  </div>
                  <h4 className="font-medium mb-2">MPC Controller</h4>
                  <p className="text-sm text-muted-foreground">
                    Model Predictive Control uses a model to predict future states and
                    optimize control actions over a finite horizon.
                  </p>
                </div>
                
                {/* RL Controller */}
                <div className="border border-border rounded-lg p-4 relative">
                  <div className="absolute right-4 top-4">
                    <Checkbox 
                      id="rl" 
                      checked={selectedControllers.rl}
                      onCheckedChange={() => handleControllerChange('rl')}
                    />
                  </div>
                  <h4 className="font-medium mb-2">RL Controller</h4>
                  <p className="text-sm text-muted-foreground">
                    Reinforcement Learning controller learns optimal policy through
                    interaction with the environment. Requires more compute time.
                  </p>
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
          disabled={!Object.values(selectedControllers).some(Boolean)}
          className="bg-primary hover:bg-primary/90"
        >
          Start Experiments
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ControllerSetup;
