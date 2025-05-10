import { useState } from 'react';
import Header from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";
import SpecificationBuilder from "@/components/SpecificationBuilder";
import ControllerSetup from "@/components/ControllerSetup";
import ExperimentDashboard from "@/components/ExperimentDashboard";
import FinalizeExport from "@/components/FinalizeExport";

const steps = [
  "Specification",
  "Controller Setup",
  "Experiment",
  "Finalize"
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
    // Ensure config has an id
    const experimentConfig = {
      ...config,
      id: `exp-${Date.now()}` // Generate a unique ID for the experiment
    };
    setControllerConfig(experimentConfig);
    setCurrentStep(3);
    // Log experiment start
    console.log('Starting experiment with config:', experimentConfig);
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
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        <StepIndicator steps={steps} currentStep={currentStep} />
        
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
          
          {currentStep === 4 && selectedController && (
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
