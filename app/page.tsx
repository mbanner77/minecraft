'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { BottomNav } from '@/components/bottom-nav';
import { HomeView } from '@/components/views/home-view';
import { TasksView } from '@/components/views/tasks-view';
import { HelpersView } from '@/components/views/helpers-view';
import { TaskDetailView } from '@/components/views/task-detail-view';
import { HelperDetailView } from '@/components/views/helper-detail-view';
import { BookingsView } from '@/components/views/bookings-view';
import { MessagesView } from '@/components/views/messages-view';
import { ProfileView } from '@/components/views/profile-view';
import { CreateTaskView } from '@/components/views/create-task-view';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

export default function HelferleinApp() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);

  const handleSelectTask = (id: string) => {
    setSelectedTaskId(id);
    setCurrentView('task-detail');
  };

  const handleSelectHelper = (id: string) => {
    setSelectedHelperId(id);
    setCurrentView('helper-detail');
  };

  const handleBack = () => {
    if (currentView === 'task-detail') {
      setCurrentView('tasks');
      setSelectedTaskId(null);
    } else if (currentView === 'helper-detail') {
      setCurrentView('helpers');
      setSelectedHelperId(null);
    } else {
      setCurrentView('home');
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView 
            onNavigate={setCurrentView} 
            onSelectTask={handleSelectTask}
            onSelectHelper={handleSelectHelper}
          />
        );
      case 'tasks':
        return <TasksView onSelectTask={handleSelectTask} />;
      case 'helpers':
        return <HelpersView onSelectHelper={handleSelectHelper} />;
      case 'task-detail':
        return selectedTaskId ? (
          <TaskDetailView 
            taskId={selectedTaskId} 
            onBack={handleBack}
            onNavigate={setCurrentView}
          />
        ) : null;
      case 'helper-detail':
        return selectedHelperId ? (
          <HelperDetailView 
            helperId={selectedHelperId} 
            onBack={handleBack}
          />
        ) : null;
      case 'bookings':
        return <BookingsView />;
      case 'messages':
        return <MessagesView />;
      case 'profile':
        return <ProfileView />;
      case 'create-task':
        return <CreateTaskView onNavigate={setCurrentView} />;
      default:
        return <HomeView onNavigate={setCurrentView} onSelectTask={handleSelectTask} onSelectHelper={handleSelectHelper} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentView={currentView} onNavigate={setCurrentView} />
      
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {renderView()}
      </main>

      <BottomNav currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
}
