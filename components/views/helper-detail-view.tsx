'use client';

import { ArrowLeft, MapPin, Star, MessageCircle, Share2, CheckCircle, Clock, Briefcase, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { helpers, categories } from '@/lib/demo-data';
import Image from 'next/image';
import { useState } from 'react';

interface HelperDetailViewProps {
  helperId: string;
  onBack: () => void;
}

export function HelperDetailView({ helperId, onBack }: HelperDetailViewProps) {
  const [showBooking, setShowBooking] = useState(false);

  const helper = helpers.find(h => h.id === helperId);
  if (!helper) return null;

  const reviews = [
    {
      id: '1',
      author: 'Maria S.',
      rating: 5,
      text: 'Super zuverlässig und freundlich! Hat meinen Garten top in Schuss gebracht.',
      date: 'Vor 2 Wochen'
    },
    {
      id: '2',
      author: 'Thomas K.',
      rating: 5,
      text: 'Sehr pünktlich und gründlich. Gerne wieder!',
      date: 'Vor 1 Monat'
    },
    {
      id: '3',
      author: 'Sandra M.',
      rating: 4,
      text: 'Hat sich gut um unseren Hund gekümmert. Empfehlenswert.',
      date: 'Vor 1 Monat'
    }
  ];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <Image
            src={helper.avatar}
            alt={helper.name}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-card"
          />
          {helper.verified && (
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
              <CheckCircle className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground mt-3">{helper.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="flex items-center gap-1">
            <Star className="h-5 w-5 fill-accent text-accent" />
            <span className="font-semibold">{helper.rating}</span>
            <span className="text-muted-foreground">({helper.reviewCount} Bewertungen)</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mt-1 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{helper.distance} entfernt</span>
        </div>
        {helper.verified && (
          <Badge className="mt-2 bg-primary/10 text-primary hover:bg-primary/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verifiziert
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center">
          <Briefcase className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-foreground">{helper.completedJobs}</p>
          <p className="text-xs text-muted-foreground">Jobs erledigt</p>
        </Card>
        <Card className="p-3 text-center">
          <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-foreground">{helper.hourlyRate}€</p>
          <p className="text-xs text-muted-foreground">Pro Stunde</p>
        </Card>
        <Card className="p-3 text-center">
          <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-bold text-lg text-foreground truncate">{helper.memberSince.split(' ')[0]}</p>
          <p className="text-xs text-muted-foreground">Mitglied seit</p>
        </Card>
      </div>

      {/* About */}
      <div className="mb-6">
        <h2 className="font-semibold text-lg mb-2">Über mich</h2>
        <p className="text-muted-foreground leading-relaxed">{helper.bio}</p>
      </div>

      {/* Skills */}
      <div className="mb-6">
        <h2 className="font-semibold text-lg mb-2">Fähigkeiten</h2>
        <div className="flex flex-wrap gap-2">
          {helper.skills.map((skill) => {
            const cat = categories.find(c => c.name === skill);
            return (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="px-3 py-1.5 text-sm"
              >
                {cat && <span className="mr-1">{cat.icon}</span>}
                {skill}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Response Time */}
      <Card className="p-4 mb-6 bg-secondary border-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{helper.responseTime}</p>
            <p className="text-sm text-muted-foreground">Durchschnittliche Antwortzeit</p>
          </div>
        </div>
      </Card>

      {/* Reviews */}
      <div className="mb-6">
        <h2 className="font-semibold text-lg mb-3">Bewertungen</h2>
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{review.text}</p>
            </Card>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-2">
          Alle {helper.reviewCount} Bewertungen anzeigen
        </Button>
      </div>

      {/* Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end">
          <Card className="w-full rounded-t-3xl p-6 animate-in slide-in-from-bottom">
            <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Anfrage senden</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Was benötigst du?</label>
                <textarea 
                  className="w-full p-3 rounded-lg border border-input bg-background resize-none h-24"
                  placeholder="Beschreibe kurz, wobei du Hilfe brauchst..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Wunschtermin</label>
                <input 
                  type="date" 
                  className="w-full p-3 rounded-lg border border-input bg-background"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBooking(false)}>
                  Abbrechen
                </Button>
                <Button className="flex-1" onClick={() => setShowBooking(false)}>
                  Anfrage senden
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button variant="outline" className="flex-1 h-12 gap-2">
            <MessageCircle className="h-5 w-5" />
            Nachricht
          </Button>
          <Button 
            className="flex-1 h-12 text-lg font-semibold"
            onClick={() => setShowBooking(true)}
          >
            Buchen
          </Button>
        </div>
      </div>
    </div>
  );
}
