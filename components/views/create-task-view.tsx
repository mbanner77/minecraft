'use client';

import { useState } from 'react';
import { ArrowLeft, MapPin, Euro, Clock, Calendar, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categories } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

type View = 'home' | 'tasks' | 'helpers' | 'messages' | 'profile' | 'bookings' | 'task-detail' | 'helper-detail' | 'create-task';

interface CreateTaskViewProps {
  onNavigate: (view: View) => void;
}

export function CreateTaskView({ onNavigate }: CreateTaskViewProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    budget: '',
    budgetType: 'fixed' as 'fixed' | 'hourly',
    urgency: 'flexible' as 'flexible' | 'soon' | 'urgent',
    date: '',
    time: ''
  });

  const handleSubmit = () => {
    // In a real app, this would submit to the backend
    onNavigate('tasks');
  };

  const isStep1Valid = selectedCategory !== null;
  const isStep2Valid = formData.title.trim() !== '' && formData.description.trim() !== '';
  const isStep3Valid = formData.location.trim() !== '' && formData.budget.trim() !== '';

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => step > 1 ? setStep(step - 1) : onNavigate('home')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Aufgabe erstellen</h1>
          <p className="text-sm text-muted-foreground">Schritt {step} von 3</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step 1: Category */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-1">Wähle eine Kategorie</h2>
            <p className="text-sm text-muted-foreground">
              In welchem Bereich brauchst du Hilfe?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  selectedCategory === category.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-3xl mb-2 block">{category.icon}</span>
                <p className="font-medium text-foreground">{category.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
              </button>
            ))}
          </div>

          <Button 
            className="w-full mt-4"
            disabled={!isStep1Valid}
            onClick={() => setStep(2)}
          >
            Weiter
          </Button>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-1">Beschreibe deine Aufgabe</h2>
            <p className="text-sm text-muted-foreground">
              Je genauer, desto besser finden Helfer dich
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Titel *</label>
              <Input
                placeholder="z.B. Rasen mähen im Vorgarten"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Beschreibung *</label>
              <textarea
                className="w-full p-3 rounded-lg border border-input bg-background resize-none h-32"
                placeholder="Beschreibe genau, was erledigt werden soll..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Dringlichkeit</label>
              <div className="flex gap-2">
                {[
                  { id: 'flexible', label: 'Flexibel', desc: 'Kein Zeitdruck' },
                  { id: 'soon', label: 'Bald', desc: 'Diese Woche' },
                  { id: 'urgent', label: 'Dringend', desc: 'Heute/Morgen' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setFormData({ ...formData, urgency: option.id as 'flexible' | 'soon' | 'urgent' })}
                    className={cn(
                      "flex-1 p-3 rounded-lg border-2 transition-all",
                      formData.urgency === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <p className="font-medium text-sm text-foreground">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button 
              className="flex-1"
              disabled={!isStep2Valid}
              onClick={() => setStep(3)}
            >
              Weiter
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Location & Budget */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-lg mb-1">Ort & Budget</h2>
            <p className="text-sm text-muted-foreground">
              Wo soll die Aufgabe erledigt werden?
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Adresse *
              </label>
              <Input
                placeholder="Straße, Hausnummer, PLZ Ort"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preismodell</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, budgetType: 'fixed' })}
                  className={cn(
                    "flex-1 p-3 rounded-lg border-2 transition-all",
                    formData.budgetType === 'fixed'
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <p className="font-medium text-foreground">Festpreis</p>
                  <p className="text-xs text-muted-foreground">Für die gesamte Aufgabe</p>
                </button>
                <button
                  onClick={() => setFormData({ ...formData, budgetType: 'hourly' })}
                  className={cn(
                    "flex-1 p-3 rounded-lg border-2 transition-all",
                    formData.budgetType === 'hourly'
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <p className="font-medium text-foreground">Stundensatz</p>
                  <p className="text-xs text-muted-foreground">Pro Stunde Arbeit</p>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                <Euro className="h-4 w-4" />
                Budget *
              </label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {formData.budgetType === 'fixed' ? '€' : '€/h'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Empfohlen: 15-25€ für diese Kategorie
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Datum (optional)
                </label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Uhrzeit (optional)
                </label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <Card className="p-4 bg-secondary border-none">
            <h3 className="font-medium mb-2 text-foreground">Vorschau</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kategorie</span>
                <Badge variant="secondary">
                  {categories.find(c => c.id === selectedCategory)?.icon}{' '}
                  {categories.find(c => c.id === selectedCategory)?.name}
                </Badge>
              </div>
              {formData.title && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titel</span>
                  <span className="text-foreground font-medium">{formData.title}</span>
                </div>
              )}
              {formData.budget && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="text-primary font-bold">
                    {formData.budget}€ {formData.budgetType === 'hourly' && '/h'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
              Zurück
            </Button>
            <Button 
              className="flex-1"
              disabled={!isStep3Valid}
              onClick={handleSubmit}
            >
              Aufgabe erstellen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
