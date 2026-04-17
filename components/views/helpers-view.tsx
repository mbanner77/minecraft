'use client';

import { useState } from 'react';
import { Search, Star, MapPin, CheckCircle, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { helpers, categories } from '@/lib/demo-data';
import Image from 'next/image';

interface HelpersViewProps {
  onSelectHelper: (id: string) => void;
}

export function HelpersView({ onSelectHelper }: HelpersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const filteredHelpers = helpers.filter((helper) => {
    const matchesSearch = helper.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      helper.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      helper.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSkill = !selectedSkill || helper.skills.includes(selectedSkill);
    return matchesSearch && matchesSkill;
  });

  const skillFilters = [...new Set(helpers.flatMap(h => h.skills))];

  return (
    <div className="space-y-4 pb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Helfer suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Skill Filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <Button
          variant={selectedSkill === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSkill(null)}
        >
          Alle
        </Button>
        {skillFilters.map((skill) => {
          const cat = categories.find(c => c.name === skill);
          return (
            <Button
              key={skill}
              variant={selectedSkill === skill ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSkill(skill)}
              className="whitespace-nowrap"
            >
              {cat && <span className="mr-1">{cat.icon}</span>}
              {skill}
            </Button>
          );
        })}
      </div>

      {/* Results */}
      <p className="text-sm text-muted-foreground">
        {filteredHelpers.length} Helfer gefunden
      </p>

      {/* Helper List */}
      <div className="space-y-3">
        {filteredHelpers.map((helper) => (
          <Card
            key={helper.id}
            className="p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            onClick={() => onSelectHelper(helper.id)}
          >
            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                <Image
                  src={helper.avatar}
                  alt={helper.name}
                  width={72}
                  height={72}
                  className="w-18 h-18 rounded-xl object-cover"
                />
                {helper.verified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{helper.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-accent text-accent" />
                        <span className="font-medium text-sm">{helper.rating}</span>
                        <span className="text-muted-foreground text-sm">
                          ({helper.reviewCount})
                        </span>
                      </div>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {helper.distance}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">{helper.hourlyRate}€</span>
                    <p className="text-xs text-muted-foreground">/Stunde</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {helper.bio}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {helper.skills.map((skill) => {
                    const cat = categories.find(c => c.name === skill);
                    return (
                      <Badge 
                        key={skill} 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {cat && <span className="mr-0.5">{cat.icon}</span>}
                        {skill}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredHelpers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <h3 className="font-medium text-foreground">Keine Helfer gefunden</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Versuche es mit anderen Suchbegriffen
          </p>
        </div>
      )}
    </div>
  );
}
