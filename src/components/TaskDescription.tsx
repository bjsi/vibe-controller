
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface TaskDescriptionProps {
  onSubmit: (description: string) => void;
}

const TaskDescription = ({ onSubmit }: TaskDescriptionProps) => {
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const handleSubmit = () => {
    if (description.trim()) {
      onSubmit(description);
    }
  };
  
  const handleUpload = () => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => setIsUploading(false), 1500);
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle className="text-2xl">Step 1: Describe Your Task</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className="text-sm font-medium mb-2 block">
              Describe what you want your controller to do
            </label>
            <Textarea
              id="description"
              className="min-h-32 text-base"
              placeholder="For example: Design a drone controller that can hover steadily at 5 meters height even in the presence of wind gusts."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          className="bg-primary hover:bg-primary/90"
          disabled={!description.trim()}
        >
          Submit
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskDescription;
