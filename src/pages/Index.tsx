
import { useState } from 'react';
import Header from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";
import TaskDescription from "@/components/TaskDescription";
import ClarificationDialog from "@/components/ClarificationDialog";
import ControllerSetup from "@/components/ControllerSetup";
import ExperimentDashboard from "@/components/ExperimentDashboard";
import FinalizeExport from "@/components/FinalizeExport";

const steps = [
  "Describe Task",
  "Clarify & Confirm",
  "Controller Setup",
  "Experiment",
  "Finalize"
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [taskDescription, setTaskDescription] = useState('');
  const [specConfig, setSpecConfig] = useState<any>(null);
  const [controllerConfig, setControllerConfig] = useState<any>(null);
  const [selectedController, setSelectedController] = useState<any>(null);
  
  const handleTaskSubmit = (description: string) => {
    setTaskDescription(description);
    setCurrentStep(2);
  };
  
  const handleSpecConfirm = (spec: any) => {
    setSpecConfig(spec);
    setCurrentStep(3);
  };
  
  const handleLaunchExperiment = (config: any) => {
    setControllerConfig(config);
    setCurrentStep(4);
  };
  
  const handleSelectBest = (controller: any) => {
    setSelectedController(controller);
    setCurrentStep(5);
  };
  
  const handleNewExperiment = () => {
    // Reset state and go to first step
    setTaskDescription('');
    setSpecConfig(null);
    setControllerConfig(null);
    setSelectedController(null);
    setCurrentStep(1);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <StepIndicator steps={steps} currentStep={currentStep} />
        
        <div className="mt-8">
          {currentStep === 1 && (
            <TaskDescription onSubmit={handleTaskSubmit} />
          )}
          
          {currentStep === 2 && taskDescription && (
            <ClarificationDialog 
              initialPrompt={taskDescription}
              onConfirm={handleSpecConfirm}
            />
          )}
          
          {currentStep === 3 && specConfig && (
            <ControllerSetup 
              spec={specConfig}
              onLaunch={handleLaunchExperiment}
            />
          )}
          
          {currentStep === 4 && controllerConfig && (
            <ExperimentDashboard 
              config={controllerConfig}
              onSelectBest={handleSelectBest}
            />
          )}
          
          {currentStep === 5 && selectedController && (
            <FinalizeExport 
              controller={selectedController}
              onNewExperiment={handleNewExperiment}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
