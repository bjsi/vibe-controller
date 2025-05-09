
import { useEffect } from 'react';
import Header from "@/components/Header";

const NewExperiment = () => {
  useEffect(() => {
    // Redirect to the home page which now has the full flow
    window.location.href = '/';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg">Redirecting to the experiment flow...</p>
      </div>
    </div>
  );
};

export default NewExperiment;
