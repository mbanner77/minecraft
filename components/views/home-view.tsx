'use client';

import { MapPin, Star, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { categories, helpers, tasks } from '@/lib/demo-data';
import Image from 'next/image';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

interface HomeViewProps {
  onNavigate: (view: View) => void;
  onSelectTask: (id: string) => void;
  onSelectHelper: (id: string) => void;
}

export function HomeView({ onNavigate, onSelectTask, onSelectHelper }: HomeViewProps) {
  const nearbyTasks = tasks.slice(0, 3);
  const topHelpers = helpers.slice(0, 4);

  return (
    <div className="space-y-6 pb-4">
      {/* Hero Section */}
      <section className="bg-primary rounded-2xl p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">
          Hallo, Anna! 👋
        </h1>
        <p className="text-primary-foreground/80 mb-4">
          Was können wir heute für dich erledigen?
        </p>
        <div className="flex items-center gap-2 text-sm bg-primary-foreground/10 rounded-lg px-3 py-2">
          <MapPin className="h-4 w-4" />
          <span>Berlin-Mitte</span>
          <ChevronRight className="h-4 w-4 ml-auto" />
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Kategorien</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
            Alle <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onNavigate('tasks')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-sm font-medium text-foreground">{category.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Nearby Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Aufgaben in deiner Nähe
          </h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')}>
            Alle <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {nearbyTasks.map((task) => (
            <Card 
              key={task.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectTask(task.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {task.category}
                    </Badge>
                    {task.urgency === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Dringend
                      </Badge>
                    )}
                    {task.urgency === 'soon' && (
                      <Badge className="text-xs bg-accent text-accent-foreground">
                        Bald
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-medium text-foreground truncate">{task.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {task.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {task.postedAt}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">{task.budget}€</span>
                  <p className="text-xs text-muted-foreground">
                    {task.budgetType === 'fixed' ? 'Festpreis' : '/Stunde'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Top Helpers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Top Helfer in der Nähe</h2>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('helpers')}>
            Alle <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {topHelpers.map((helper) => (
            <Card 
              key={helper.id} 
              className="flex-shrink-0 w-36 p-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectHelper(helper.id)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <Image
                    src={helper.avatar}
                    alt={helper.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  {helper.verified && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-sm text-foreground truncate w-full">
                  {helper.name}
                </h3>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="font-medium">{helper.rating}</span>
                  <span className="text-muted-foreground">({helper.reviewCount})</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{helper.distance}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Action */}
      <section>
        <Card className="p-5 bg-secondary border-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl">🤝</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Werde selbst Helfer!</h3>
              <p className="text-sm text-muted-foreground">
                Verdiene Geld in deiner Nachbarschaft
              </p>
            </div>
            <Button size="sm" onClick={() => onNavigate('profile')}>
              Starten
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
