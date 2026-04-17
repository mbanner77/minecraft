'use client';

import { useState } from 'react';
import { Settings, ChevronRight, Star, Wallet, Shield, Bell, HelpCircle, LogOut, Edit2, Camera } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const [isHelper, setIsHelper] = useState(true);

  const user = {
    name: 'Anna Schmidt',
    email: 'anna.schmidt@email.de',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    memberSince: 'Januar 2024',
    rating: 4.9,
    reviewCount: 23,
    tasksPosted: 8,
    tasksCompleted: 15,
    earnings: 342,
    verified: true
  };

  const menuItems = [
    { icon: Wallet, label: 'Zahlungsmethoden', badge: null },
    { icon: Star, label: 'Meine Bewertungen', badge: `${user.reviewCount}` },
    { icon: Shield, label: 'Sicherheit & Verifizierung', badge: user.verified ? '✓' : null },
    { icon: Bell, label: 'Benachrichtigungen', badge: null },
    { icon: HelpCircle, label: 'Hilfe & Support', badge: null },
    { icon: Settings, label: 'Einstellungen', badge: null },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block">
          <Image
            src={user.avatar}
            alt={user.name}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover border-4 border-card"
          />
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
            <Camera className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>
        <h1 className="text-xl font-bold text-foreground mt-3">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-medium">{user.rating}</span>
          </div>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">Mitglied seit {user.memberSince}</span>
        </div>
        {user.verified && (
          <Badge className="mt-2 bg-primary/10 text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Verifiziert
          </Badge>
        )}
        <Button variant="outline" size="sm" className="mt-3 gap-1">
          <Edit2 className="h-4 w-4" />
          Profil bearbeiten
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{user.tasksPosted}</p>
          <p className="text-xs text-muted-foreground">Aufgaben erstellt</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{user.tasksCompleted}</p>
          <p className="text-xs text-muted-foreground">Jobs erledigt</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{user.earnings}€</p>
          <p className="text-xs text-muted-foreground">Verdient</p>
        </Card>
      </div>

      {/* Helper Mode Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl">🤝</span>
            </div>
            <div>
              <p className="font-medium text-foreground">Helfer-Modus</p>
              <p className="text-sm text-muted-foreground">
                {isHelper ? 'Du bist für Aufträge verfügbar' : 'Du bist nicht verfügbar'}
              </p>
            </div>
          </div>
          <Switch 
            checked={isHelper} 
            onCheckedChange={setIsHelper}
          />
        </div>
        {isHelper && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Dein Stundensatz</span>
              <span className="font-medium text-foreground">15€/Stunde</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-3">
              Helfer-Profil bearbeiten
            </Button>
          </div>
        )}
      </Card>

      {/* Menu Items */}
      <Card className="divide-y divide-border">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left font-medium text-foreground">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="mr-2">{item.badge}</Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          );
        })}
      </Card>

      {/* Logout */}
      <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
        <LogOut className="h-5 w-5" />
        Abmelden
      </Button>

      {/* App Info */}
      <p className="text-center text-xs text-muted-foreground">
        Helferlein v1.0.0 · Made with ❤️ in Berlin
      </p>
    </div>
  );
}
