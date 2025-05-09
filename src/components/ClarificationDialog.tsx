
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ClarificationDialogProps {
  initialPrompt: string;
  onConfirm: (spec: any) => void;
}

const ClarificationDialog = ({ initialPrompt, onConfirm }: ClarificationDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
    simulation: 'real-time 3D'
  });

  useEffect(() => {
    // Simulate initial assistant message
    simulateAssistantMessage(
      `I'll help you create a controller based on your description: "${initialPrompt}". Let me ask a few questions to clarify the requirements.\n\nFirst, could you confirm if you're working with a quadcopter drone or another type of aerial vehicle?`
    );
  }, [initialPrompt]);

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
        response = "Thanks for the information. Based on your requirements, I'm configuring a PID controller for your drone. Would you like to specify any other constraints or performance metrics for the controller?";
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl mx-auto animate-fade-in">
      {/* Left: Chat Dialog */}
      <Card className="lg:min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Clarification Dialog</CardTitle>
          <CardDescription>
            Answer the questions to refine your controller specification
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto flex flex-col gap-4">
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
        </CardContent>
        
        <CardFooter className="border-t border-border">
          <div className="flex w-full items-center space-x-2">
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
            >
              Send
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Right: Spec Summary */}
      <Card className="lg:min-h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Specification Summary</CardTitle>
          <CardDescription>Live-updating spec based on our conversation</CardDescription>
        </CardHeader>
        
        <CardContent className="flex-grow">
          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
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
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Visualization Preview</h3>
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
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-end border-t border-border pt-4">
          <Button onClick={() => onConfirm(spec)}>Confirm Specification</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClarificationDialog;
