import { create } from 'zustand';

export type ContactStatus = 'lead' | 'active' | 'inactive' | 'converted';

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ContactStatus;
  source: string;
  createdAt: string;
  lastContact: string;
  notes: string[];
}

export interface Call {
  id: string;
  contactId: string;
  duration: number;
  status: 'completed' | 'missed' | 'voicemail';
  timestamp: string;
  recording_url?: string;
  transcript?: string;
}

export type ActivityType = 'lead' | 'call' | 'appointment' | 'note';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  contactName: string;
  timestamp: string;
}

export interface Filters {
  search: string;
  status: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

interface CrmState {
  contacts: Contact[];
  calls: Call[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  filters: Filters;

  setContacts: (data: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, data: Partial<Contact>) => void;
  deleteContact: (id: string) => void;

  setCalls: (data: Call[]) => void;
  addCall: (call: Call) => void;

  setActivities: (data: Activity[]) => void;
  addActivity: (activity: Activity) => void;

  setFilters: (filters: Partial<Filters>) => void;

  filteredContacts: Contact[];
  paginatedContacts: Contact[];
  getContactById: (id: string) => Contact | undefined;

  loadMockData: () => void;
}

const mockContacts: Contact[] = [
  {
    id: 'c1',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+31 6 1234 5678',
    company: 'Doe Plumbing',
    status: 'lead',
    source: 'Website',
    createdAt: '2026-03-28T10:00:00Z',
    lastContact: '2026-04-01T14:30:00Z',
    notes: ['Interested in HVAC package'],
  },
  {
    id: 'c2',
    name: 'Sarah K.',
    email: 'sarah.k@example.com',
    phone: '+31 6 2345 6789',
    company: 'K Dental Clinic',
    status: 'active',
    source: 'Referral',
    createdAt: '2026-03-25T08:00:00Z',
    lastContact: '2026-04-01T12:00:00Z',
    notes: ['Booked appointment for April 5'],
  },
  {
    id: 'c3',
    name: 'Mike R.',
    email: 'mike.r@example.com',
    phone: '+31 6 3456 7890',
    company: 'RoofFix BV',
    status: 'active',
    source: 'Google Ads',
    createdAt: '2026-03-20T09:00:00Z',
    lastContact: '2026-03-31T16:00:00Z',
    notes: ['Follow-up scheduled'],
  },
  {
    id: 'c4',
    name: 'Emma L.',
    email: 'emma.l@example.com',
    phone: '+31 6 4567 8901',
    company: 'L Electro',
    status: 'lead',
    source: 'Website',
    createdAt: '2026-03-30T11:00:00Z',
    lastContact: '2026-03-30T11:00:00Z',
    notes: [],
  },
  {
    id: 'c5',
    name: 'Tom B.',
    email: 'tom.b@example.com',
    phone: '+31 6 5678 9012',
    company: 'B Construction',
    status: 'converted',
    source: 'LinkedIn',
    createdAt: '2026-03-15T07:00:00Z',
    lastContact: '2026-03-29T10:00:00Z',
    notes: ['Signed annual contract'],
  },
  {
    id: 'c6',
    name: 'Lisa M.',
    email: 'lisa.m@example.com',
    phone: '+31 6 6789 0123',
    company: 'M Auto Repair',
    status: 'inactive',
    source: 'Cold Call',
    createdAt: '2026-03-10T13:00:00Z',
    lastContact: '2026-03-20T09:00:00Z',
    notes: ['Not interested at this time'],
  },
  {
    id: 'c7',
    name: 'Peter V.',
    email: 'peter.v@example.com',
    phone: '+31 6 7890 1234',
    company: 'V Landscaping',
    status: 'lead',
    source: 'Facebook',
    createdAt: '2026-04-01T08:00:00Z',
    lastContact: '2026-04-01T08:00:00Z',
    notes: ['Requested callback'],
  },
  {
    id: 'c8',
    name: 'Anna W.',
    email: 'anna.w@example.com',
    phone: '+31 6 8901 2345',
    company: 'W Cleaning Services',
    status: 'active',
    source: 'Referral',
    createdAt: '2026-03-22T15:00:00Z',
    lastContact: '2026-03-31T11:00:00Z',
    notes: ['Monthly plan subscriber'],
  },
  {
    id: 'c9',
    name: 'David H.',
    email: 'david.h@example.com',
    phone: '+31 6 9012 3456',
    company: 'H Security',
    status: 'lead',
    source: 'Website',
    createdAt: '2026-04-01T16:00:00Z',
    lastContact: '2026-04-01T16:00:00Z',
    notes: [],
  },
  {
    id: 'c10',
    name: 'Sophie D.',
    email: 'sophie.d@example.com',
    phone: '+31 6 0123 4567',
    company: 'D Accounting',
    status: 'converted',
    source: 'Google Ads',
    createdAt: '2026-03-18T10:00:00Z',
    lastContact: '2026-03-30T14:00:00Z',
    notes: ['Upgraded to premium plan'],
  },
];

const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'lead',
    description: 'New lead submitted via contact form',
    contactName: 'John Doe',
    timestamp: '2026-04-01T14:30:00Z',
  },
  {
    id: 'a2',
    type: 'call',
    description: 'Incoming call - 3 min 24 sec',
    contactName: 'Sarah K.',
    timestamp: '2026-04-01T14:15:00Z',
  },
  {
    id: 'a3',
    type: 'appointment',
    description: 'Appointment booked for April 5',
    contactName: 'Sarah K.',
    timestamp: '2026-04-01T13:00:00Z',
  },
  {
    id: 'a4',
    type: 'note',
    description: 'Follow-up required after demo call',
    contactName: 'Mike R.',
    timestamp: '2026-04-01T12:00:00Z',
  },
  {
    id: 'a5',
    type: 'lead',
    description: 'New lead from Facebook ad',
    contactName: 'Peter V.',
    timestamp: '2026-04-01T08:00:00Z',
  },
  {
    id: 'a6',
    type: 'call',
    description: 'Missed call - no voicemail',
    contactName: 'Unknown',
    timestamp: '2026-04-01T07:45:00Z',
  },
  {
    id: 'a7',
    type: 'appointment',
    description: 'Appointment confirmed for April 3',
    contactName: 'Emma L.',
    timestamp: '2026-03-31T16:00:00Z',
  },
  {
    id: 'a8',
    type: 'note',
    description: 'Contract renewal discussion',
    contactName: 'Tom B.',
    timestamp: '2026-03-31T14:00:00Z',
  },
];

export const useCrmStore = create<CrmState>((set, get) => ({
  contacts: [],
  calls: [],
  activities: [],
  isLoading: false,
  error: null,
  filters: {
    search: '',
    status: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    pageSize: 10,
  },

  setContacts: (data) => set({ contacts: data }),
  addContact: (contact) => set((s) => ({ contacts: [contact, ...s.contacts] })),
  updateContact: (id, data) =>
    set((s) => ({
      contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
  deleteContact: (id) =>
    set((s) => ({
      contacts: s.contacts.filter((c) => c.id !== id),
    })),

  setCalls: (data) => set({ calls: data }),
  addCall: (call) => set((s) => ({ calls: [call, ...s.calls] })),

  setActivities: (data) => set({ activities: data }),
  addActivity: (activity) =>
    set((s) => ({ activities: [activity, ...s.activities] })),

  setFilters: (filters) =>
    set((s) => ({
      filters: { ...s.filters, ...filters },
    })),

  get filteredContacts() {
    const { contacts, filters } = get();
    let result = [...contacts];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.phone.includes(q),
      );
    }

    if (filters.status) {
      result = result.filter((c) => c.status === filters.status);
    }

    result.sort((a, b) => {
      const aVal =
        (a as unknown as Record<string, unknown>)[filters.sortBy] ?? '';
      const bVal =
        (b as unknown as Record<string, unknown>)[filters.sortBy] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return filters.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  },

  get paginatedContacts() {
    const { filteredContacts, filters } = get();
    const start = (filters.page - 1) * filters.pageSize;
    return filteredContacts.slice(start, start + filters.pageSize);
  },

  getContactById: (id) => {
    return get().contacts.find((c) => c.id === id);
  },

  loadMockData: () => {
    set({
      contacts: mockContacts,
      activities: mockActivities,
      calls: [
        {
          id: 'cl1',
          contactId: 'c1',
          duration: 204,
          status: 'completed',
          timestamp: '2026-04-01T14:15:00Z',
        },
        {
          id: 'cl2',
          contactId: 'c2',
          duration: 180,
          status: 'completed',
          timestamp: '2026-04-01T13:00:00Z',
        },
        {
          id: 'cl3',
          contactId: 'c3',
          duration: 0,
          status: 'missed',
          timestamp: '2026-04-01T12:30:00Z',
        },
        {
          id: 'cl4',
          contactId: 'c4',
          duration: 95,
          status: 'voicemail',
          timestamp: '2026-04-01T11:00:00Z',
        },
        {
          id: 'cl5',
          contactId: 'c5',
          duration: 320,
          status: 'completed',
          timestamp: '2026-04-01T10:00:00Z',
        },
        {
          id: 'cl6',
          contactId: 'c7',
          duration: 0,
          status: 'missed',
          timestamp: '2026-04-01T09:00:00Z',
        },
        {
          id: 'cl7',
          contactId: 'c8',
          duration: 150,
          status: 'completed',
          timestamp: '2026-04-01T08:00:00Z',
        },
        {
          id: 'cl8',
          contactId: 'c9',
          duration: 60,
          status: 'voicemail',
          timestamp: '2026-04-01T07:45:00Z',
        },
      ],
    });
  },
}));
