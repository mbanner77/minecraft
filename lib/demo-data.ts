// Demo-Daten für die Helferlein App

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
};

export type Helper = {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  distance: string;
  bio: string;
  skills: string[];
  hourlyRate: number;
  completedJobs: number;
  memberSince: string;
  responseTime: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  location: string;
  distance: string;
  budget: number;
  budgetType: 'fixed' | 'hourly';
  postedBy: {
    name: string;
    avatar: string;
    rating: number;
  };
  postedAt: string;
  urgency: 'flexible' | 'soon' | 'urgent';
  status: 'open' | 'assigned' | 'completed';
};

export type Booking = {
  id: string;
  task: Task;
  helper: Helper;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  agreedPrice: number;
};

export const categories: Category[] = [
  {
    id: 'garden',
    name: 'Garten',
    icon: '🌿',
    color: 'bg-green-100 text-green-700',
    description: 'Rasenmähen, Hecke schneiden, Unkraut jäten'
  },
  {
    id: 'household',
    name: 'Haushalt',
    icon: '🏠',
    color: 'bg-blue-100 text-blue-700',
    description: 'Putzen, Aufräumen, kleine Reparaturen'
  },
  {
    id: 'pets',
    name: 'Tiere',
    icon: '🐕',
    color: 'bg-amber-100 text-amber-700',
    description: 'Gassi gehen, Tiersitting, Füttern'
  },
  {
    id: 'shopping',
    name: 'Einkauf',
    icon: '🛒',
    color: 'bg-pink-100 text-pink-700',
    description: 'Einkaufen, Botengänge, Lieferungen'
  },
  {
    id: 'car',
    name: 'Auto',
    icon: '🚗',
    color: 'bg-slate-100 text-slate-700',
    description: 'Waschen, Innenreinigung, kleine Pflege'
  },
  {
    id: 'other',
    name: 'Sonstiges',
    icon: '✨',
    color: 'bg-purple-100 text-purple-700',
    description: 'Umzugshilfe, Technik, Diverses'
  }
];

export const helpers: Helper[] = [
  {
    id: '1',
    name: 'Max Müller',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    rating: 4.9,
    reviewCount: 47,
    verified: true,
    distance: '0.3 km',
    bio: 'Student, 22 Jahre. Helfe gerne bei Gartenarbeit und Einkäufen. Zuverlässig und pünktlich!',
    skills: ['Garten', 'Einkauf', 'Umzugshilfe'],
    hourlyRate: 15,
    completedJobs: 52,
    memberSince: 'März 2024',
    responseTime: 'Antwortet in ~15 Min'
  },
  {
    id: '2',
    name: 'Lisa Schmidt',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    rating: 5.0,
    reviewCount: 89,
    verified: true,
    distance: '0.5 km',
    bio: 'Tierliebhaberin und erfahrene Hundesitterin. Habe selbst zwei Hunde und einen Garten.',
    skills: ['Tiere', 'Garten', 'Haushalt'],
    hourlyRate: 18,
    completedJobs: 94,
    memberSince: 'Januar 2024',
    responseTime: 'Antwortet in ~5 Min'
  },
  {
    id: '3',
    name: 'Tom Weber',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    rating: 4.7,
    reviewCount: 31,
    verified: true,
    distance: '0.8 km',
    bio: 'Handwerklich begabt, helfe bei kleinen Reparaturen, Autowaschen und allem was anfällt.',
    skills: ['Auto', 'Haushalt', 'Sonstiges'],
    hourlyRate: 20,
    completedJobs: 35,
    memberSince: 'Mai 2024',
    responseTime: 'Antwortet in ~30 Min'
  },
  {
    id: '4',
    name: 'Emma Bauer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    rating: 4.8,
    reviewCount: 63,
    verified: true,
    distance: '1.2 km',
    bio: 'Rentnerin mit viel Zeit und Energie. Liebe es, anderen zu helfen und neue Menschen kennenzulernen.',
    skills: ['Einkauf', 'Tiere', 'Haushalt'],
    hourlyRate: 12,
    completedJobs: 71,
    memberSince: 'Februar 2024',
    responseTime: 'Antwortet in ~1 Std'
  },
  {
    id: '5',
    name: 'Finn Hoffmann',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
    rating: 4.6,
    reviewCount: 18,
    verified: false,
    distance: '1.5 km',
    bio: 'Schüler, 17 Jahre. Verdiene mir etwas Taschengeld mit Gartenarbeit und Einkaufshilfe.',
    skills: ['Garten', 'Einkauf'],
    hourlyRate: 10,
    completedJobs: 19,
    memberSince: 'August 2024',
    responseTime: 'Antwortet in ~2 Std'
  }
];

export const tasks: Task[] = [
  {
    id: '1',
    title: 'Rasen mähen im Vorgarten',
    description: 'Ca. 50m² Rasen muss gemäht werden. Rasenmäher ist vorhanden. Gerne auch Kanten schneiden.',
    category: 'Garten',
    categoryId: 'garden',
    location: 'Hauptstraße 15, Berlin',
    distance: '0.4 km',
    budget: 25,
    budgetType: 'fixed',
    postedBy: {
      name: 'Familie Schneider',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      rating: 4.8
    },
    postedAt: 'Vor 2 Stunden',
    urgency: 'soon',
    status: 'open'
  },
  {
    id: '2',
    title: 'Hund Gassi führen (täglich)',
    description: 'Suche jemanden der unseren Golden Retriever "Buddy" täglich für 30-45 Min ausführt. Vormittags zwischen 10-12 Uhr.',
    category: 'Tiere',
    categoryId: 'pets',
    location: 'Parkweg 8, Berlin',
    distance: '0.7 km',
    budget: 12,
    budgetType: 'hourly',
    postedBy: {
      name: 'Herr Krause',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
      rating: 5.0
    },
    postedAt: 'Vor 5 Stunden',
    urgency: 'flexible',
    status: 'open'
  },
  {
    id: '3',
    title: 'Wocheneinkauf erledigen',
    description: 'Benötige Hilfe beim Wocheneinkauf. Liste wird bereitgestellt. Supermarkt ist 5 Min entfernt.',
    category: 'Einkauf',
    categoryId: 'shopping',
    location: 'Blumenweg 22, Berlin',
    distance: '0.2 km',
    budget: 15,
    budgetType: 'fixed',
    postedBy: {
      name: 'Frau Meyer',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      rating: 4.9
    },
    postedAt: 'Vor 1 Stunde',
    urgency: 'urgent',
    status: 'open'
  },
  {
    id: '4',
    title: 'Auto waschen & saugen',
    description: 'VW Golf soll von außen gewaschen und innen gesaugt werden. Alles Material vorhanden.',
    category: 'Auto',
    categoryId: 'car',
    location: 'Waldstraße 5, Berlin',
    distance: '1.1 km',
    budget: 30,
    budgetType: 'fixed',
    postedBy: {
      name: 'Dr. Fischer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      rating: 4.7
    },
    postedAt: 'Vor 3 Stunden',
    urgency: 'flexible',
    status: 'open'
  },
  {
    id: '5',
    title: 'Hecke schneiden',
    description: 'Ca. 10m Hecke muss geschnitten werden. Heckenschere ist vorhanden. Grünabfall bitte entsorgen.',
    category: 'Garten',
    categoryId: 'garden',
    location: 'Gartenweg 12, Berlin',
    distance: '0.9 km',
    budget: 45,
    budgetType: 'fixed',
    postedBy: {
      name: 'Familie Weber',
      avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
      rating: 4.6
    },
    postedAt: 'Vor 6 Stunden',
    urgency: 'soon',
    status: 'open'
  },
  {
    id: '6',
    title: 'Hilfe beim Möbel aufbauen',
    description: 'IKEA Schrank muss aufgebaut werden. Werkzeug ist vorhanden. Dauert ca. 2-3 Stunden.',
    category: 'Sonstiges',
    categoryId: 'other',
    location: 'Neustadt 7, Berlin',
    distance: '1.8 km',
    budget: 18,
    budgetType: 'hourly',
    postedBy: {
      name: 'Julia Braun',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
      rating: 4.9
    },
    postedAt: 'Vor 4 Stunden',
    urgency: 'flexible',
    status: 'open'
  }
];

export const myBookings: Booking[] = [
  {
    id: '1',
    task: tasks[1],
    helper: helpers[1],
    status: 'confirmed',
    scheduledDate: '2026-04-18',
    scheduledTime: '10:00',
    agreedPrice: 12
  },
  {
    id: '2',
    task: tasks[0],
    helper: helpers[0],
    status: 'in_progress',
    scheduledDate: '2026-04-17',
    scheduledTime: '14:00',
    agreedPrice: 25
  }
];

export const messages = [
  {
    id: '1',
    from: helpers[1],
    preview: 'Hallo! Ich würde mich freuen, Buddy...',
    timestamp: 'Vor 10 Min',
    unread: true
  },
  {
    id: '2',
    from: helpers[0],
    preview: 'Bin gleich bei Ihnen, noch ca. 5 Min...',
    timestamp: 'Vor 25 Min',
    unread: false
  }
];
