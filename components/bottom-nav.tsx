'use client';

import { Home, Search, PlusCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const navItems = [
    { id: 'home' as View, icon: Home, label: 'Start' },
    { id: 'tasks' as View, icon: Search, label: 'Suchen' },
    { id: 'create-task' as View, icon: PlusCircle, label: 'Erstellen', special: true },
    { id: 'bookings' as View, icon: Calendar, label: 'Buchungen' },
    { id: 'profile' as View, icon: User, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="max-w-lg mx-auto px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          if (item.special) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center gap-0.5 -mt-5"
              >
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "fill-primary/20")} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
