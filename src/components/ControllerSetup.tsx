import { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { analyzeSpecification, ControllerRecommendation } from '@/lib/gemini';
import { startExperiment } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ControllerSetupProps {
  spec: any;
  onLaunch: (config: any) => void;
}

const ControllerSetup = ({ spec, onLaunch }: ControllerSetupProps) => {
  const [selectedControllers, setSelectedControllers] = useState<Record<string, boolean>>({});
  const [controllerTypes, setControllerTypes] = useState<ControllerRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const recommendations = await analyzeSpecification(spec);
        setControllerTypes(recommendations);
        
        // Initialize selected controllers with top 2 recommendations
        const initialSelected = recommendations
          .sort((a, b) => b.successProbability - a.successProbability)
          .slice(0, 2)
          .reduce((acc, controller) => {
            acc[controller.id] = true;
            return acc;
          }, {} as Record<string, boolean>);
        
        setSelectedControllers(initialSelected);
      } catch (err) {
        console.error('Error loading controller recommendations:', err);
        setError('Failed to load controller recommendations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecommendations();
  }, [spec]);
  
  const handleControllerChange = (id: string) => {
    setSelectedControllers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const handleLaunch = async () => {
    try {
      setIsLaunching(true);
      setError(null);
      
      const response = await startExperiment({
        spec,
        selectedControllers,
        controllerTypes: controllerTypes.filter(c => selectedControllers[c.id])
      });

      if (response.status === 'success' && response.data) {
        onLaunch({
          experimentId: response.data.id,
          instructions: response.data.instructions,
          status: response.data.status,
          startTime: response.data.startTime,
          selectedControllers,
          controllerTypes: controllerTypes.filter(c => selectedControllers[c.id])
        });
      } else {
        throw new Error(response.message || 'Failed to start experiment');
      }
    } catch (err) {
      console.error('Error launching experiment:', err);
      setError(err instanceof Error ? err.message : 'Failed to launch experiment');
    } finally {
      setIsLaunching(false);
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">Controller Setup</CardTitle>
        <CardDescription>Configure the controller types</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="overview">
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
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Controller</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px] text-center">Match</TableHead>
                      <TableHead className="w-[120px]">Est. Time</TableHead>
                      <TableHead className="w-[50px]">Select</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {controllerTypes.map((controller) => (
                      <TableRow key={controller.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {controller.name}
                            {controller.requiresGPU && (
                              <div className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 whitespace-nowrap">
                                GPU
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {controller.description}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-medium">{Math.round(controller.successProbability * 100)}%</span>
                            <Progress 
                              value={controller.successProbability * 100} 
                              className="h-1.5 w-16 mt-1" 
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {controller.timeEstimate}
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox 
                            id={controller.id} 
                            checked={selectedControllers[controller.id]}
                            onCheckedChange={() => handleControllerChange(controller.id)}
                            className="mx-auto"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-end border-t border-border pt-4">
        <Button
          onClick={handleLaunch}
          disabled={isLoading || isLaunching || !Object.values(selectedControllers).some(Boolean)}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : isLaunching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            'Start Experiments'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ControllerSetup;
