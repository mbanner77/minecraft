'use client';

import { useState } from 'react';
import { Search, ArrowLeft, Send, Phone, MoreVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messages, helpers } from '@/lib/demo-data';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function MessagesView() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const chatMessages = [
    { id: '1', fromMe: false, text: 'Hallo! Ich würde mich freuen, Buddy jeden Vormittag Gassi zu führen. Ich habe selbst zwei Hunde und viel Erfahrung.', time: '10:15' },
    { id: '2', fromMe: true, text: 'Das klingt super! Wann könnten Sie anfangen?', time: '10:18' },
    { id: '3', fromMe: false, text: 'Ich könnte schon morgen starten! Passt Ihnen 10 Uhr?', time: '10:20' },
    { id: '4', fromMe: true, text: 'Perfekt, das passt mir gut. Ich schicke Ihnen noch meine Adresse.', time: '10:22' },
    { id: '5', fromMe: false, text: 'Super, ich freue mich! 🐕', time: '10:25' },
  ];

  if (selectedChat) {
    const selectedHelper = helpers.find(h => h.id === selectedChat);
    if (!selectedHelper) return null;

    return (
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Image
            src={selectedHelper.avatar}
            alt={selectedHelper.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-semibold text-foreground">{selectedHelper.name}</p>
            <p className="text-xs text-green-600">Online</p>
          </div>
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <div className="text-center">
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
              Heute
            </span>
          </div>
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.fromMe ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-2.5 rounded-2xl",
                  msg.fromMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                )}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={cn(
                  "text-xs mt-1",
                  msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t border-border pt-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nachricht schreiben..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newMessage.trim()) {
                  setNewMessage('');
                }
              }}
            />
            <Button 
              size="icon"
              disabled={!newMessage.trim()}
              onClick={() => setNewMessage('')}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-foreground">Nachrichten</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Gespräch suchen..."
          className="pl-9"
        />
      </div>

      {/* Message List */}
      <div className="space-y-2">
        {messages.map((msg) => (
          <Card
            key={msg.id}
            className={cn(
              "p-4 cursor-pointer transition-colors hover:bg-muted/50",
              msg.unread && "bg-primary/5"
            )}
            onClick={() => setSelectedChat(msg.from.id)}
          >
            <div className="flex gap-3">
              <div className="relative">
                <Image
                  src={msg.from.avatar}
                  alt={msg.from.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {msg.unread && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={cn(
                    "font-medium text-foreground",
                    msg.unread && "font-semibold"
                  )}>
                    {msg.from.name}
                  </p>
                  <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                </div>
                <p className={cn(
                  "text-sm truncate mt-0.5",
                  msg.unread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {msg.preview}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {messages.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💬</div>
          <h3 className="font-medium text-foreground">Keine Nachrichten</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Starte eine Unterhaltung mit einem Helfer
          </p>
        </div>
      )}
    </div>
  );
}
