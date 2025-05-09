
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SpecificationBuilderProps {
  onConfirm: (spec: any) => void;
}

const SpecificationBuilder = ({ onConfirm }: SpecificationBuilderProps) => {
  const [activeTab, setActiveTab] = useState('description');
  const [taskDescription, setTaskDescription] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [apiEndpoint, setApiEndpoint] = useState('');
  
  // Spec state
  const [spec, setSpec] = useState({
    plant: 'drone3D',
    controls: ['roll', 'pitch', 'yaw'],
    objective: {
      hold_position: [0, 0, 5],
      duration: 30
    },
    constraints: {
      wind_gust: '±2m/s',
      sample_time: 0.02
    },
    simulation: 'real-time 3D',
    dataSource: ''
  });

  // When task description is submitted, switch to clarify tab
  const handleTaskSubmit = () => {
    if (!taskDescription.trim()) return;
    
    setActiveTab('clarify');
    // Simulate initial assistant message
    simulateAssistantMessage(
      `I'll help you create a controller based on your description: "${taskDescription}". Let me ask a few questions to clarify the requirements.\n\nFirst, could you confirm if you're working with a quadcopter drone or another type of aerial vehicle?`
    );
  };

  const simulateAssistantMessage = (content: string) => {
    setIsLoading(true);
    
    // Simulate typing delay
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant' as const, content }]);
      setIsLoading(false);
    }, 1000);
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;
    
    // Add user message
    const newMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newMessage]);
    setUserInput('');
    
    // Simulate assistant response based on user input
    setIsLoading(true);
    
    setTimeout(() => {
      let response = '';
      
      // Simple response logic based on keywords
      if (userInput.toLowerCase().includes('quadcopter') || userInput.toLowerCase().includes('yes')) {
        response = "Great! For a quadcopter, I'll need to know about your desired performance specifications. How quickly should the drone respond to position commands? Would you prefer a controller that prioritizes stability or agility?";
        
        // Update spec based on response
        setSpec(prev => ({
          ...prev,
          plant: 'quadcopter3D'
        }));
      }
      else if (userInput.toLowerCase().includes('data') || userInput.toLowerCase().includes('dataset')) {
        response = "Do you have flight data from the drone that we could use for system identification? This would help create a more accurate model of your specific drone.";
      }
      else if (userInput.toLowerCase().includes('api') || userInput.toLowerCase().includes('endpoint')) {
        response = "Thanks for mentioning the API. Could you provide more details about the endpoint structure and what kind of data it returns?";
        
        // Update spec with the API endpoint if provided
        if (apiEndpoint) {
          setSpec(prev => ({
            ...prev,
            dataSource: apiEndpoint
          }));
        }
      }
      else if (userInput.toLowerCase().includes('wind') || userInput.toLowerCase().includes('disturbance')) {
        response = "I've noted the wind disturbance requirements. What other environmental factors should the controller be robust against?";
        
        // Update spec constraints
        setSpec(prev => ({
          ...prev,
          constraints: {
            ...prev.constraints,
            wind_gust: '±3m/s'  // Updated based on the conversation
          }
        }));
      }
      else {
        response = "Thanks for the information. Based on your requirements, I'm configuring a control system for your drone. Would you like to specify any other constraints or performance metrics for the controller?";
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => setIsUploading(false), 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Specification Builder</CardTitle>
          <CardDescription>
            Describe your control problem and we'll help you create a specification
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Task Description</TabsTrigger>
              <TabsTrigger value="clarify">Clarify & Build</TabsTrigger>
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
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </div>
              
              <div className="border border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Optionally upload an image (block diagram or photo of your system)
                </p>
                <Button 
                  variant="outline" 
                  className="bg-secondary/50"
                  onClick={handleUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
              
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleTaskSubmit}
                  disabled={!taskDescription.trim()}
                >
                  Continue
                </Button>
              </div>
            </TabsContent>
            
            {/* Clarify & Build Tab */}
            <TabsContent value="clarify" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Chat Dialog */}
                <div className="bg-card rounded-lg border border-border p-4 h-[400px] flex flex-col">
                  <h3 className="font-medium mb-2">Clarification Dialog</h3>
                  
                  <div className="flex-grow overflow-y-auto mb-4 flex flex-col gap-4 pr-2">
                    {messages.map((message, index) => (
                      <div 
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`flex gap-3 max-w-[80%] ${
                            message.role === 'user' ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={message.role === 'user' ? 'bg-primary' : 'bg-secondary'}>
                              {message.role === 'user' ? 'U' : 'AI'}
                            </AvatarFallback>
                          </Avatar>
                          <div 
                            className={`rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-secondary-foreground'
                            }`}
                          >
                            {message.content.split('\n').map((line, i) => (
                              <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary">AI</AvatarFallback>
                          </Avatar>
                          <div className="flex items-center space-x-2 bg-secondary rounded-lg p-4">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-0"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center space-x-2">
                      <textarea
                        className="flex h-10 w-full rounded-md border-0 bg-secondary px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        placeholder="Type your response..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isLoading}
                        rows={1}
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!userInput.trim() || isLoading}
                        size="sm"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Right: Additional Settings */}
                <div className="bg-card rounded-lg border border-border p-4 h-[400px] overflow-y-auto">
                  <h3 className="font-medium mb-4">Additional Configuration</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-endpoint">Data Source API Endpoint (Optional)</Label>
                      <Input 
                        id="api-endpoint" 
                        placeholder="https://api.example.com/drone-data"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter an API endpoint that provides telemetry or training data
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Simulation Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          variant={spec.simulation === 'real-time 3D' ? 'default' : 'outline'}
                          onClick={() => setSpec({...spec, simulation: 'real-time 3D'})}
                          className="justify-start"
                        >
                          Real-time 3D
                        </Button>
                        <Button 
                          variant={spec.simulation === '2D plots' ? 'default' : 'outline'}
                          onClick={() => setSpec({...spec, simulation: '2D plots'})}
                          className="justify-start"
                        >
                          2D Plots
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setActiveTab('description')}
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setActiveTab('summary')}
                >
                  Continue
                </Button>
              </div>
            </TabsContent>
            
            {/* Specification Summary Tab */}
            <TabsContent value="summary" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Specification Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">Plant Type</h3>
                    <p className="text-base">{spec.plant}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">Control Inputs</h3>
                    <div className="flex flex-wrap gap-2">
                      {spec.controls.map(control => (
                        <span key={control} className="px-2 py-1 bg-secondary rounded-md text-sm">
                          {control}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">Objective</h3>
                    <p className="text-sm">Hold position at [{spec.objective.hold_position.join(', ')}m]</p>
                    <p className="text-sm">Duration: {spec.objective.duration}s</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground mb-1">Constraints</h3>
                    <p className="text-sm">Wind gust: {spec.constraints.wind_gust}</p>
                    <p className="text-sm">Sample time: {spec.constraints.sample_time}s</p>
                  </div>
                  
                  {spec.dataSource && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground mb-1">Data Source</h3>
                      <p className="text-sm break-all">{spec.dataSource}</p>
                    </div>
                  )}
                </div>
                
                {/* Right: Visualization Preview */}
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Visualization Preview</h3>
                  <div className="aspect-video bg-secondary/20 rounded-lg border border-border flex items-center justify-center">
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
                  onClick={() => setActiveTab('clarify')}
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
