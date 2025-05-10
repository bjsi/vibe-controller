import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  const handleStepClick = (index: number) => {
    // Convert to 1-based index for the parent component
    const stepNumber = index + 1;
    // Allow clicking on completed steps, current step, or the Experiment step (step 3)
    if ((stepNumber <= currentStep || stepNumber === 3) && onStepClick) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div 
            className="relative flex flex-col items-center cursor-pointer"
            onClick={() => handleStepClick(index)}
          >
            <div 
              className={cn(
                "h-10 w-10 rounded-full border-2 flex items-center justify-center transition-colors",
                index + 1 < currentStep 
                  ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
                  : index + 1 === currentStep
                    ? "border-primary bg-background text-primary hover:bg-accent"
                    : index + 1 === 3 // Experiment step
                      ? "border-primary bg-background text-primary hover:bg-accent"
                      : "border-border bg-background text-muted-foreground cursor-not-allowed",
                (index + 1 <= currentStep || index + 1 === 3) && "cursor-pointer"
              )}
            >
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            <span className={cn(
              "text-xs mt-2 font-medium text-center w-16 md:w-24 truncate",
              (index + 1 <= currentStep || index + 1 === 3) ? "text-foreground" : "text-muted-foreground"
            )}>
              {step}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div 
              className={cn(
                "h-0.5 w-12 md:w-24", 
                index + 1 < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
