import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Experiment {
  id: string;
  status: string;
  startTime: string;
  instructions: string;
}

interface ExperimentListProps {
  onSelectExperiment: (experiment: Experiment) => void;
}

const ExperimentList = ({ onSelectExperiment }: ExperimentListProps) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/list_experiments');
      if (!response.ok) throw new Error('Failed to fetch experiments');
      
      const data = await response.json();
      if (data.status === 'success') {
        setExperiments(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch experiments');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch experiments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
    const intervalId = setInterval(fetchExperiments, 5000); // Refresh every 5 seconds
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 border-t-2 border-primary rounded-full animate-spin-slow mb-2"></div>
            <p className="text-sm">Loading experiments...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[200px]">
          <div className="text-red-500">
            <p className="font-medium">Error loading experiments</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Previous Experiments</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {experiments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No experiments found
            </div>
          ) : (
            <div className="space-y-4">
              {experiments.map(experiment => (
                <Card key={experiment.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">Experiment {experiment.id}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(experiment.startTime).toLocaleString()}
                      </p>
                      <p className="text-sm mt-2 line-clamp-2">
                        {experiment.instructions}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        experiment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        experiment.status === 'error' ? 'bg-red-100 text-red-800' :
                        experiment.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {experiment.status}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSelectExperiment(experiment)}
                      >
                        Run
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ExperimentList; 