'use client';

import { useState } from 'react';
import { Calendar, Clock, MapPin, Star, MessageCircle, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { myBookings } from '@/lib/demo-data';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function BookingsView() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const activeBookings = myBookings.filter(b => 
    ['pending', 'confirmed', 'in_progress'].includes(b.status)
  );
  const completedBookings = myBookings.filter(b => 
    ['completed', 'cancelled'].includes(b.status)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Ausstehend</Badge>;
      case 'confirmed':
        return <Badge className="bg-primary/10 text-primary">Bestätigt</Badge>;
      case 'in_progress':
        return <Badge className="bg-accent text-accent-foreground">In Arbeit</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Abgeschlossen</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Storniert</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const bookings = activeTab === 'active' ? activeBookings : completedBookings;

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-foreground">Meine Buchungen</h1>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setActiveTab('active')}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            activeTab === 'active'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Aktiv ({activeBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
            activeTab === 'completed'
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Abgeschlossen ({completedBookings.length})
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Image
                  src={booking.helper.avatar}
                  alt={booking.helper.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-foreground">{booking.helper.name}</p>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    <span>{booking.helper.rating}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 mb-3">
              <h3 className="font-medium text-foreground mb-1">{booking.task.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(booking.scheduledDate)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.scheduledTime} Uhr
                </span>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {booking.task.location}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold text-primary">{booking.agreedPrice}€</span>
                <span className="text-sm text-muted-foreground ml-1">
                  {booking.task.budgetType === 'hourly' ? '/Stunde' : 'Festpreis'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>
                {booking.status === 'in_progress' && (
                  <Button variant="outline" size="sm" className="gap-1">
                    <Phone className="h-4 w-4" />
                    Anrufen
                  </Button>
                )}
              </div>
            </div>

            {booking.status === 'in_progress' && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Helfer ist unterwegs...</span>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="font-medium text-foreground">Keine Buchungen</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'active' 
              ? 'Du hast noch keine aktiven Buchungen'
              : 'Du hast noch keine abgeschlossenen Buchungen'}
          </p>
        </div>
      )}
    </div>
  );
}
