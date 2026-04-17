'use client';

import { useState } from 'react';
import { Search, MapPin, Clock, SlidersHorizontal, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { categories, tasks } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

interface TasksViewProps {
  onSelectTask: (id: string) => void;
}

export function TasksView({ onSelectTask }: TasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || task.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 pb-4">
      {/* Search & Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Aufgabe suchen..."
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filter
          </Button>
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Alle
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="whitespace-nowrap"
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Filter</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Entfernung</label>
              <div className="flex gap-2">
                {['0.5 km', '1 km', '2 km', '5 km'].map((dist) => (
                  <Button key={dist} variant="outline" size="sm">
                    {dist}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Dringlichkeit</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Alle</Button>
                <Button variant="outline" size="sm">Dringend</Button>
                <Button variant="outline" size="sm">Bald</Button>
                <Button variant="outline" size="sm">Flexibel</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        {filteredTasks.length} Aufgabe{filteredTasks.length !== 1 ? 'n' : ''} gefunden
      </p>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <Card
            key={task.id}
            className="p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
            onClick={() => onSelectTask(task.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="secondary" className={cn("text-xs", 
                    categories.find(c => c.id === task.categoryId)?.color
                  )}>
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
                <h3 className="font-medium text-foreground">{task.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
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
              <div className="text-right flex-shrink-0">
                <span className="text-xl font-bold text-primary">{task.budget}€</span>
                <p className="text-xs text-muted-foreground">
                  {task.budgetType === 'fixed' ? 'Festpreis' : '/Stunde'}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-medium text-foreground">Keine Aufgaben gefunden</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Versuche es mit anderen Suchbegriffen oder Filtern
          </p>
        </div>
      )}
    </div>
  );
}
