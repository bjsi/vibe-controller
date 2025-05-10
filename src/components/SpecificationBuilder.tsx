import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { generateSpecification, DEFAULT_SPEC } from '@/lib/gemini';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SpecificationBuilderProps {
  onConfirm: (spec: any) => void;
}

const SpecificationBuilder = ({ onConfirm }: SpecificationBuilderProps) => {
  const [activeTab, setActiveTab] = useState('description');
  const [taskDescription, setTaskDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [assumedValues, setAssumedValues] = useState<Set<string>>(new Set());

  // When task description is submitted, generate specification and switch to summary tab
  const handleTaskSubmit = async () => {
    if (!taskDescription.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate specification directly from task description
      const generatedSpec = await generateSpecification({
        messages: [
          {
            role: 'user',
            parts: [{ text: taskDescription }]
          }
        ],
        spec: DEFAULT_SPEC,
        questionsAnswered: true
      });

      // Compare with default spec to identify assumed values
      const newAssumedValues = new Set<string>();
      Object.entries(generatedSpec).forEach(([key, value]) => {
        if (JSON.stringify(value) === JSON.stringify(DEFAULT_SPEC[key as keyof typeof DEFAULT_SPEC])) {
          newAssumedValues.add(key);
        }
      });
      setAssumedValues(newAssumedValues);
      
      setSpec(generatedSpec);
      setActiveTab('summary');
    } catch (error) {
      console.error('Error generating specification:', error);
      setError('Failed to generate specification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTaskSubmit();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Specification Builder</CardTitle>
          <CardDescription>
            Describe your control problem and we'll generate a specification
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description">Task Description</TabsTrigger>
              <TabsTrigger value="summary">Specification Summary</TabsTrigger>
            </TabsList>
            
            {/* Task Description Tab */}
            <TabsContent value="description" className="space-y-4 mt-4">
              <div>
                <label htmlFor="description" className="text-sm font-medium mb-2 block">
                  Describe what you want your controller to do
                </label>
                <Textarea
                  id="description"
                  className="min-h-32 text-base"
                  placeholder="For example: Design a drone controller that can hover steadily at 5 meters height even in the presence of wind gusts."
                  value={taskDescription || "Design a drone controller that can hover steadily at 5 meters height even in the presence of wind gusts."}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleTaskSubmit}
                  disabled={!taskDescription.trim() || isLoading}
                >
                  {isLoading ? 'Generating...' : 'Generate Specification'}
                </Button>
              </div>
            </TabsContent>
            
            {/* Specification Summary Tab */}
            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Specification Details */}
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Plant Type</h3>
                      {assumedValues.has('plant') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <Select
                      value={spec.plant}
                      onValueChange={(value) => {
                        setSpec(prev => ({ ...prev, plant: value }));
                        setAssumedValues(prev => {
                          const next = new Set(prev);
                          next.delete('plant');
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plant type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drone3D">3D Drone</SelectItem>
                        <SelectItem value="quadcopter3D">3D Quadcopter</SelectItem>
                        <SelectItem value="fixedWing3D">3D Fixed Wing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Control Inputs</h3>
                      {assumedValues.has('controls') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {spec.controls.map((control, index) => (
                        <div key={control} className="flex items-center gap-2">
                          <Input
                            value={control}
                            onChange={(e) => {
                              const newControls = [...spec.controls];
                              newControls[index] = e.target.value;
                              setSpec(prev => ({ ...prev, controls: newControls }));
                              setAssumedValues(prev => {
                                const next = new Set(prev);
                                next.delete('controls');
                                return next;
                              });
                            }}
                            className="w-24"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newControls = spec.controls.filter((_, i) => i !== index);
                              setSpec(prev => ({ ...prev, controls: newControls }));
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSpec(prev => ({
                            ...prev,
                            controls: [...prev.controls, 'new_control']
                          }));
                          setAssumedValues(prev => {
                            const next = new Set(prev);
                            next.delete('controls');
                            return next;
                          });
                        }}
                      >
                        Add Control
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Objective</h3>
                      {assumedValues.has('objective') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="w-24">Position (x,y,z):</Label>
                        <Input
                          type="number"
                          value={spec.objective.hold_position[0]}
                          onChange={(e) => {
                            const newPosition = [...spec.objective.hold_position];
                            newPosition[0] = parseFloat(e.target.value);
                            setSpec(prev => ({
                              ...prev,
                              objective: { ...prev.objective, hold_position: newPosition }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('objective');
                              return next;
                            });
                          }}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          value={spec.objective.hold_position[1]}
                          onChange={(e) => {
                            const newPosition = [...spec.objective.hold_position];
                            newPosition[1] = parseFloat(e.target.value);
                            setSpec(prev => ({
                              ...prev,
                              objective: { ...prev.objective, hold_position: newPosition }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('objective');
                              return next;
                            });
                          }}
                          className="w-20"
                        />
                        <Input
                          type="number"
                          value={spec.objective.hold_position[2]}
                          onChange={(e) => {
                            const newPosition = [...spec.objective.hold_position];
                            newPosition[2] = parseFloat(e.target.value);
                            setSpec(prev => ({
                              ...prev,
                              objective: { ...prev.objective, hold_position: newPosition }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('objective');
                              return next;
                            });
                          }}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-24">Duration (s):</Label>
                        <Input
                          type="number"
                          value={spec.objective.duration}
                          onChange={(e) => {
                            setSpec(prev => ({
                              ...prev,
                              objective: { ...prev.objective, duration: parseFloat(e.target.value) }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('objective');
                              return next;
                            });
                          }}
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Constraints</h3>
                      {assumedValues.has('constraints') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="w-24">Wind Gust:</Label>
                        <Input
                          value={spec.constraints.wind_gust}
                          onChange={(e) => {
                            setSpec(prev => ({
                              ...prev,
                              constraints: { ...prev.constraints, wind_gust: e.target.value }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('constraints');
                              return next;
                            });
                          }}
                          className="w-32"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-24">Sample Time:</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={spec.constraints.sample_time}
                          onChange={(e) => {
                            setSpec(prev => ({
                              ...prev,
                              constraints: { ...prev.constraints, sample_time: parseFloat(e.target.value) }
                            }));
                            setAssumedValues(prev => {
                              const next = new Set(prev);
                              next.delete('constraints');
                              return next;
                            });
                          }}
                          className="w-32"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Simulation Type</h3>
                      {assumedValues.has('simulation') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <Select
                      value={spec.simulation}
                      onValueChange={(value) => {
                        setSpec(prev => ({ ...prev, simulation: value }));
                        setAssumedValues(prev => {
                          const next = new Set(prev);
                          next.delete('simulation');
                          return next;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select simulation type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real-time 3D">Real-time 3D</SelectItem>
                        <SelectItem value="real-time 2D">Real-time 2D</SelectItem>
                        <SelectItem value="offline 3D">Offline 3D</SelectItem>
                        <SelectItem value="offline 2D">Offline 2D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm text-muted-foreground">Data Source</h3>
                      {assumedValues.has('dataSource') && (
                        <Badge variant="secondary">Assumed</Badge>
                      )}
                    </div>
                    <Textarea
                      value={spec.dataSource}
                      onChange={(e) => {
                        setSpec(prev => ({ ...prev, dataSource: e.target.value }));
                        setAssumedValues(prev => {
                          const next = new Set(prev);
                          next.delete('dataSource');
                          return next;
                        });
                      }}
                      placeholder="Enter data source or API endpoint information..."
                      className="min-h-24"
                    />
                  </div>
                </div>
                
                {/* Right: Visualization Preview */}
                <div className="bg-card rounded-lg border border-border p-4 h-[400px] overflow-y-auto">
                  <h3 className="font-medium mb-4">Visualization Preview</h3>
                  <div className="aspect-video bg-secondary/20 rounded-lg border border-border flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-4xl mb-2">
                        {spec.simulation === 'real-time 3D' ? '3D' : '2D'}
                      </div>
                      <p className="text-muted-foreground text-sm">{spec.simulation} visualization will be used</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('description')}
                >
                  Back
                </Button>
                <Button onClick={() => onConfirm(spec)}>
                  Confirm Specification
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecificationBuilder;
