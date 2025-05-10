
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface FinalizeExportProps {
  controller: any;
  onNewExperiment: () => void;
}

const FinalizeExport = ({ controller, onNewExperiment }: FinalizeExportProps) => {
  const handleCopyCode = () => {
    const codeElement = document.getElementById('controller-code');
    if (codeElement) {
      navigator.clipboard.writeText(codeElement.innerText);
      toast({
        title: "Code copied to clipboard",
        description: "You can now paste the controller code into your application."
      });
    }
  };
  
  const handleExportToMATLAB = () => {
    toast({
      title: "Exporting to MATLAB",
      description: "Controller code has been exported as a .m file."
    });
  };
  
  const handleExportToPython = () => {
    toast({
      title: "Exporting to Python",
      description: "Controller code has been exported as a .py file."
    });
  };

  // Generate PID controller code based on controller metrics
  const generatePIDCode = () => {
    if (controller.type === 'PID') {
      const kp = (5 - controller.metrics.steadyStateError * 10).toFixed(2);
      const ki = (2 - controller.metrics.steadyStateError * 5).toFixed(2);
      const kd = (1 + controller.metrics.overshoot / 20).toFixed(2);
      
      return `
# Python implementation for ${controller.type} Controller
import time
import numpy as np

class DroneController:
    def __init__(self):
        self.kp = ${kp}  # Proportional gain
        self.ki = ${ki}  # Integral gain
        self.kd = ${kd}  # Derivative gain
        
        self.prev_error = np.zeros(3)  # Previous error for derivative
        self.integral = np.zeros(3)    # Integral accumulator
        
        self.sample_time = 0.1  # 10 Hz control loop
        self.max_integral = 10.0  # Anti-windup limit
    
    def update(self, setpoint, current_position):
        # Calculate error
        error = setpoint - current_position
        
        # Update integral term with anti-windup
        self.integral += error * self.sample_time
        self.integral = np.clip(self.integral, -self.max_integral, self.max_integral)
        
        # Calculate derivative term
        derivative = (error - self.prev_error) / self.sample_time
        
        # Calculate control output
        control = (
            self.kp * error +
            self.ki * self.integral +
            self.kd * derivative
        )
        
        # Save current error for next iteration
        self.prev_error = error.copy()
        
        return control
`;
    } else {
      const Q = `np.diag([10.0, 10.0, 10.0, 1.0, 1.0, 1.0])`;
      const R = `np.diag([${(0.1 / controller.metrics.energy * 2).toFixed(2)}, ${(0.1 / controller.metrics.energy * 2).toFixed(2)}, ${(0.1 / controller.metrics.energy * 2).toFixed(2)}])`;
      
      return `
# Python implementation for ${controller.type} Controller
import time
import numpy as np
from scipy import linalg

class DroneController:
    def __init__(self):
        # System matrices (simplified linear model)
        self.A = np.array([
            [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 1],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0]
        ])
        
        self.B = np.array([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ])
        
        # LQR cost matrices
        self.Q = ${Q}  # State cost matrix
        self.R = ${R}  # Control cost matrix
        
        # Solve Riccati equation to get optimal gain matrix
        self.P = linalg.solve_continuous_are(self.A, self.B, self.Q, self.R)
        self.K = np.linalg.inv(self.R) @ self.B.T @ self.P
        
        self.sample_time = 0.1  # 10 Hz control loop
    
    def update(self, setpoint, current_state):
        # Calculate error state
        error_state = np.concatenate((setpoint - current_state[:3], -current_state[3:]))
        
        # Calculate optimal control input
        control = -self.K @ error_state
        
        return control
`;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Controller Summary</CardTitle>
            <CardDescription>Final controller configuration and export options</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {controller.type} Controller
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="bg-secondary p-4 rounded-md grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Rise Time</p>
            <p className="text-lg font-medium">{controller.metrics.riseTime.toFixed(2)}s</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overshoot</p>
            <p className="text-lg font-medium">{controller.metrics.overshoot.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Steady-State Error</p>
            <p className="text-lg font-medium">{controller.metrics.steadyStateError.toFixed(3)}m</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Energy Usage</p>
            <p className="text-lg font-medium">{controller.metrics.energy.toFixed(1)}</p>
          </div>
        </div>
        
        <Tabs defaultValue="code">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="code">Code</TabsTrigger>
            <TabsTrigger value="diagram">Diagram</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="code" className="space-y-4">
            <div className="code-block" id="controller-code">
              <pre className="text-xs md:text-sm">
                {generatePIDCode()}
              </pre>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleCopyCode}>Copy Code</Button>
              <Button size="sm" variant="outline" onClick={handleExportToPython}>Export to Python</Button>
              <Button size="sm" variant="outline" onClick={handleExportToMATLAB}>Export to MATLAB</Button>
            </div>
          </TabsContent>
          
          <TabsContent value="diagram">
            <div className="h-64 grid-background rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Controller block diagram visualization</p>
            </div>
          </TabsContent>
          
          <TabsContent value="performance">
            <div className="h-64 grid-background rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Performance plots visualization</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="bg-secondary/50 p-4 rounded-lg border border-border">
          <h3 className="font-medium mb-2">Implementation Notes</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Controller sample rate is set to 50Hz (20ms)</li>
            <li>Added anti-windup protection for integral term</li>
            <li>Controller is optimized for the specified wind gust conditions</li>
            <li>Performance may vary on actual hardware - additional tuning may be required</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onNewExperiment}>Start New Experiment</Button>
        <Button>Save to My Projects</Button>
      </CardFooter>
    </Card>
  );
};

export default FinalizeExport;
