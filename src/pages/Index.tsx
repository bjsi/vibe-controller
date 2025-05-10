import { useState } from 'react';
import Header from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";
import SpecificationBuilder from "@/components/SpecificationBuilder";
import ControllerSetup from "@/components/ControllerSetup";
import ExperimentDashboard from "@/components/ExperimentDashboard";

const steps = [
  "Specification",
  "Controller Setup",
  "Experiment"
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [specConfig, setSpecConfig] = useState<any>(null);
  const [controllerConfig, setControllerConfig] = useState<any>(null);
  const [selectedController, setSelectedController] = useState<any>(null);
  
  const handleSpecConfirm = (spec: any) => {
    setSpecConfig(spec);
    setCurrentStep(2);
  };
  
  const handleLaunchExperiment = (config: any) => {
    setControllerConfig(config);
    setCurrentStep(3);
    // Log experiment start
    console.log('Starting experiment with config:', config);
  };
  
  const handleSelectBest = (controller: any) => {
    setSelectedController(controller);
    setCurrentStep(4);
  };
  
  const handleNewExperiment = () => {
    // Reset state and go to first step
    setSpecConfig(null);
    setControllerConfig(null);
    setSelectedController(null);
    setCurrentStep(1);
  };

  const handleStepClick = (step: number) => {
    // Allow jumping to Experiment step (3) directly
    // For other steps, require previous steps to be completed
    if (step === 3 || 
        step === 1 || 
        (step === 2 && specConfig) || 
        (step === 4 && selectedController)) {
      setCurrentStep(step);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <StepIndicator 
          steps={steps} 
          currentStep={currentStep} 
          onStepClick={handleStepClick}
        />
        
        <div className="mt-8">
          {currentStep === 1 && (
            <SpecificationBuilder 
              onConfirm={handleSpecConfirm}
            />
          )}
          
          {currentStep === 2 && specConfig && (
            <ControllerSetup 
              spec={specConfig}
              onLaunch={handleLaunchExperiment}
            />
          )}
          
          {currentStep === 3 && (
            <ExperimentDashboard 
              config={controllerConfig}
              onSelectBest={handleSelectBest}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
