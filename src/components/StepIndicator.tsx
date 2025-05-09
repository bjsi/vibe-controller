
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center w-full mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className="relative flex flex-col items-center">
            <div 
              className={cn(
                "h-10 w-10 rounded-full border-2 flex items-center justify-center",
                index < currentStep 
                  ? "bg-primary border-primary text-primary-foreground"
                  : index === currentStep
                    ? "border-primary bg-background text-primary"
                    : "border-border bg-background text-muted-foreground"
              )}
            >
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            <span className="text-xs mt-2 font-medium text-center w-16 md:w-24 truncate">
              {step}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div 
              className={cn(
                "h-0.5 w-12 md:w-24", 
                index < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
