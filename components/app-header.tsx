'use client';

import { Bell, Menu, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

interface AppHeaderProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function AppHeader({ currentView, onNavigate }: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'home' as View, label: 'Start' },
    { id: 'tasks' as View, label: 'Aufgaben' },
    { id: 'helpers' as View, label: 'Helfer' },
    { id: 'bookings' as View, label: 'Buchungen' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        <button 
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">H</span>
          </div>
          <span className="font-semibold text-lg text-foreground">Helferlein</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => onNavigate('messages')}
          >
            <MessageCircle className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              2
            </Badge>
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {menuOpen && (
        <nav className="absolute top-full left-0 right-0 bg-card border-b border-border shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMenuOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-colors",
                  currentView === item.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => {
                onNavigate('profile');
                setMenuOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg transition-colors",
                currentView === 'profile'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Mein Profil
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
