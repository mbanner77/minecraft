'use client';

import { ArrowLeft, MapPin, Clock, Star, MessageCircle, Share2, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tasks, categories, helpers } from '@/lib/demo-data';
import Image from 'next/image';
import { useState } from 'react';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

interface TaskDetailViewProps {
  taskId: string;
  onBack: () => void;
  onNavigate: (view: View) => void;
}

export function TaskDetailView({ taskId, onBack }: TaskDetailViewProps) {
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  const task = tasks.find(t => t.id === taskId);
  if (!task) return null;

  const category = categories.find(c => c.id === task.categoryId);
  const suggestedHelpers = helpers.filter(h => 
    h.skills.includes(task.category)
  ).slice(0, 3);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSaved(!saved)}
          >
            <Heart className={saved ? "h-5 w-5 fill-destructive text-destructive" : "h-5 w-5"} />
          </Button>
        </div>
      </div>

      {/* Task Info */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="secondary" className={category?.color}>
              {category?.icon} {task.category}
            </Badge>
            {task.urgency === 'urgent' && (
              <Badge variant="destructive">Dringend</Badge>
            )}
            {task.urgency === 'soon' && (
              <Badge className="bg-accent text-accent-foreground">Bald</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold text-primary">{task.budget}€</span>
              <p className="text-sm text-muted-foreground">
                {task.budgetType === 'fixed' ? 'Festpreis' : 'Pro Stunde'}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1 justify-end">
                <MapPin className="h-4 w-4" />
                <span>{task.distance} entfernt</span>
              </div>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Clock className="h-4 w-4" />
                <span>{task.postedAt}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Description */}
        <div>
          <h2 className="font-semibold text-lg mb-2">Beschreibung</h2>
          <p className="text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* Location */}
        <div>
          <h2 className="font-semibold text-lg mb-2">Standort</h2>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{task.location}</p>
                <p className="text-sm text-muted-foreground">{task.distance} von dir entfernt</p>
              </div>
            </div>
            {/* Map Placeholder */}
            <div className="mt-3 h-32 bg-muted rounded-lg flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Kartenansicht</span>
            </div>
          </Card>
        </div>

        {/* Posted By */}
        <div>
          <h2 className="font-semibold text-lg mb-2">Auftraggeber</h2>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Image
                src={task.postedBy.avatar}
                alt={task.postedBy.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{task.postedBy.name}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <span className="text-sm">{task.postedBy.rating}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1">
                <MessageCircle className="h-4 w-4" />
                Nachricht
              </Button>
            </div>
          </Card>
        </div>

        {/* Suggested Helpers */}
        {suggestedHelpers.length > 0 && (
          <div>
            <h2 className="font-semibold text-lg mb-2">Passende Helfer</h2>
            <div className="space-y-2">
              {suggestedHelpers.map((helper) => (
                <Card key={helper.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={helper.avatar}
                      alt={helper.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{helper.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-accent text-accent" />
                          {helper.rating}
                        </span>
                        <span>·</span>
                        <span>{helper.distance}</span>
                        <span>·</span>
                        <span>{helper.hourlyRate}€/h</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Anfragen</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-lg mx-auto">
          <Button 
            className="w-full h-12 text-lg font-semibold"
            onClick={() => setApplied(!applied)}
            variant={applied ? "secondary" : "default"}
          >
            {applied ? '✓ Bewerbung gesendet' : 'Jetzt bewerben'}
          </Button>
        </div>
      </div>
    </div>
  );
}
