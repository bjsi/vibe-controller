import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X } from "lucide-react";
import { initializeConversation, sendMessage, generateSpecification, type ConversationState } from '@/lib/gemini';

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
  const [dataSourceText, setDataSourceText] = useState('');
  const [responseStructureText, setResponseStructureText] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);
  
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

  // When task description is submitted, switch to clarify tab and initialize conversation
  const handleTaskSubmit = async () => {
    if (!taskDescription.trim()) return;
    
    setActiveTab('clarify');
    setIsLoading(true);
    
    try {
      // Initialize conversation with Gemini
      const initialState = initializeConversation(taskDescription);
      setConversationState(initialState);
      
      // Get initial response
      const updatedState = await sendMessage(initialState, taskDescription);
      setConversationState(updatedState);
      
      // Update UI messages
      setMessages([
        { role: 'assistant', content: updatedState.messages[updatedState.messages.length - 1].parts[0].text }
      ]);
      
      // Update spec if provided
      if (updatedState.spec) {
        setSpec(updatedState.spec);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setMessages([
        { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !conversationState) return;
    
    // Add user message to UI
    const newMessage: Message = { role: 'user', content: userInput };
    setMessages(prev => [...prev, newMessage]);
    setUserInput('');
    setIsLoading(true);
    
    try {
      // Send message to Gemini
      const updatedState = await sendMessage(conversationState, userInput);
      setConversationState(updatedState);
      
      // Update UI messages
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: updatedState.messages[updatedState.messages.length - 1].parts[0].text }
      ]);
      
      // Update spec if provided
      if (updatedState.spec) {
        setSpec(updatedState.spec);
      }
      
      // If all questions are answered, move to summary tab
      if (updatedState.questionsAnswered) {
        setActiveTab('summary');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'I apologize, but I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target && typeof event.target.result === 'string') {
              setPastedImage(event.target.result);
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    }
  };
  
  const handleRemovePastedImage = () => {
    setPastedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Handle data file
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setDataSourceText(event.target.result);
        }
      };
      reader.readAsText(file);
    }
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
                  value={taskDescription || "Design a drone controller that can hover steadily at 5 meters height even in the presence of wind gusts."}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
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
                    {pastedImage && (
                      <div className="mb-2 relative inline-block">
                        <img 
                          src={pastedImage} 
                          alt="Pasted content" 
                          className="max-h-20 rounded-md border border-border" 
                        />
                        <Button 
                          variant="destructive" 
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                          onClick={handleRemovePastedImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <textarea
                        className="flex h-10 w-full rounded-md border-0 bg-secondary px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        placeholder="Type your response or paste an image..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        onPaste={handlePaste}
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
                      <Label>Data Source</Label>
                      <Textarea 
                        placeholder="Paste documentation and request examples about your data source or API here..."
                        value={dataSourceText}
                        onChange={(e) => setDataSourceText(e.target.value)}
                        className="min-h-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Sample Response Structure</Label>
                      <Textarea 
                        placeholder="Paste a sample response from the API here..."
                        value={responseStructureText}
                        onChange={(e) => setResponseStructureText(e.target.value)}
                        className="min-h-24"
                      />
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
