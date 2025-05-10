
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PlusIcon, User, Settings } from 'lucide-react';

const Header = () => {
  const [username] = useState('Demo User');
  const [projects] = useState([
    { id: 1, name: 'Hover Controller' },
    { id: 2, name: 'Path Following' },
    { id: 3, name: 'Landing Sequence' }
  ]);

  const navigateToNewExperiment = () => {
    // Navigate to new experiment page
    window.location.href = '/new-experiment';
  };
  
  return (
    <header className="bg-secondary border-b border-border h-16 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center">
        <h1 className="text-xl font-bold text-primary">DroneWhisperer</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button onClick={navigateToNewExperiment} className="bg-primary hover:bg-primary/90">
          <PlusIcon className="mr-2 h-4 w-4" /> New Experiment
        </Button>
      </div>
    </header>
  );
};

export default Header;
