import { create } from 'zustand';

export type ContactStatus = 'lead' | 'active' | 'inactive' | 'converted';
export type CallStatus = 'completed' | 'missed' | 'voicemail';
export type ActivityType = 'lead' | 'call' | 'appointment' | 'note';

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
  status: CallStatus;
  timestamp: string;
  recording_url?: string;
  transcript?: string;
}

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
  getContactById: (id: string) => Contact | undefined;
  filteredContacts: () => Contact[];
  paginatedContacts: () => Contact[];
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
    notes: ['Interested in voice receptionist'],
  },
  {
    id: 'c2',
    name: 'Sarah K.',
    email: 'sarah@dentalsmile.nl',
    phone: '+31 6 2345 6789',
    company: 'Dental Smile',
    status: 'active',
    source: 'Referral',
    createdAt: '2026-03-20T08:00:00Z',
    lastContact: '2026-04-01T09:15:00Z',
    notes: ['Booked demo for next week'],
  },
  {
    id: 'c3',
    name: 'Mike R.',
    email: 'mike@roofpro.com',
    phone: '+31 6 3456 7890',
    company: 'RoofPro',
    status: 'converted',
    source: 'Google Ads',
    createdAt: '2026-03-15T12:00:00Z',
    lastContact: '2026-03-30T16:00:00Z',
    notes: ['Signed annual plan'],
  },
  {
    id: 'c4',
    name: 'Emma V.',
    email: 'emma@hvacfix.nl',
    phone: '+31 6 4567 8901',
    company: 'HVAC Fix',
    status: 'lead',
    source: 'LinkedIn',
    createdAt: '2026-04-01T11:00:00Z',
    lastContact: '2026-04-01T11:00:00Z',
    notes: [],
  },
  {
    id: 'c5',
    name: 'Tom B.',
    email: 'tom@electricianpro.nl',
    phone: '+31 6 5678 9012',
    company: 'Electrician Pro',
    status: 'active',
    source: 'Website',
    createdAt: '2026-03-25T09:00:00Z',
    lastContact: '2026-03-31T10:00:00Z',
    notes: ['Requested custom integration'],
  },
  {
    id: 'c6',
    name: 'Lisa M.',
    email: 'lisa@cleanco.nl',
    phone: '+31 6 6789 0123',
    company: 'CleanCo',
    status: 'inactive',
    source: 'Cold outreach',
    createdAt: '2026-03-10T14:00:00Z',
    lastContact: '2026-03-20T08:00:00Z',
    notes: ['Not interested at this time'],
  },
  {
    id: 'c7',
    name: 'Peter J.',
    email: 'peter@locksmith24.nl',
    phone: '+31 6 7890 1234',
    company: 'Locksmith 24/7',
    status: 'lead',
    source: 'Website',
    createdAt: '2026-04-02T07:00:00Z',
    lastContact: '2026-04-02T07:00:00Z',
    notes: [],
  },
  {
    id: 'c8',
    name: 'Anna S.',
    email: 'anna@vetcare.nl',
    phone: '+31 6 8901 2345',
    company: 'VetCare Clinic',
    status: 'active',
    source: 'Referral',
    createdAt: '2026-03-22T10:00:00Z',
    lastContact: '2026-04-01T15:00:00Z',
    notes: ['Using for after-hours calls'],
  },
  {
    id: 'c9',
    name: 'David W.',
    email: 'david@lawfirm.nl',
    phone: '+31 6 9012 3456',
    company: 'W&L Law Firm',
    status: 'converted',
    source: 'Google Ads',
    createdAt: '2026-03-05T08:00:00Z',
    lastContact: '2026-03-28T12:00:00Z',
    notes: ['Enterprise plan'],
  },
  {
    id: 'c10',
    name: 'Sophie L.',
    email: 'sophie@salonbelle.nl',
    phone: '+31 6 0123 4567',
    company: 'Salon Belle',
    status: 'lead',
    source: 'Instagram',
    createdAt: '2026-04-01T16:00:00Z',
    lastContact: '2026-04-01T16:00:00Z',
    notes: ['Wants appointment booking feature'],
  },
];

const mockActivities: Activity[] = [
  {
    id: 'a1',
    type: 'lead',
    description: 'New lead submitted via website',
    contactName: 'John Doe',
    timestamp: '2026-04-02T09:58:00Z',
  },
  {
    id: 'a2',
    type: 'call',
    description: 'Incoming call handled by voice agent',
    contactName: '+31 6 1234 5678',
    timestamp: '2026-04-02T09:45:00Z',
  },
  {
    id: 'a3',
    type: 'appointment',
    description: 'Appointment scheduled for demo',
    contactName: 'Sarah K.',
    timestamp: '2026-04-02T09:00:00Z',
  },
  {
    id: 'a4',
    type: 'note',
    description: 'Follow-up call scheduled',
    contactName: 'Mike R.',
    timestamp: '2026-04-02T08:00:00Z',
  },
  {
    id: 'a5',
    type: 'call',
    description: 'Missed call - voicemail left',
    contactName: '+31 6 9876 5432',
    timestamp: '2026-04-02T07:00:00Z',
  },
  {
    id: 'a6',
    type: 'lead',
    description: 'New lead from Google Ads',
    contactName: 'Peter J.',
    timestamp: '2026-04-02T06:00:00Z',
  },
  {
    id: 'a7',
    type: 'appointment',
    description: 'Demo completed successfully',
    contactName: 'Emma V.',
    timestamp: '2026-04-01T16:00:00Z',
  },
  {
    id: 'a8',
    type: 'call',
    description: 'Call transferred to human agent',
    contactName: '+31 6 5555 1234',
    timestamp: '2026-04-01T15:30:00Z',
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

  addContact: (contact) =>
    set((state) => ({ contacts: [contact, ...state.contacts] })),

  updateContact: (id, data) =>
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    })),

  deleteContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== id),
    })),

  setCalls: (data) => set({ calls: data }),

  addCall: (call) => set((state) => ({ calls: [call, ...state.calls] })),

  setActivities: (data) => set({ activities: data }),

  addActivity: (activity) =>
    set((state) => ({ activities: [activity, ...state.activities] })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  getContactById: (id) => {
    return get().contacts.find((c) => c.id === id);
  },

  filteredContacts: () => {
    const { contacts, filters } = get();
    let result = [...contacts];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.company.toLowerCase().includes(q),
      );
    }

    if (filters.status) {
      result = result.filter((c) => c.status === filters.status);
    }

    result.sort((a, b) => {
      const aVal = (a as any)[filters.sortBy] || '';
      const bVal = (b as any)[filters.sortBy] || '';
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  },

  paginatedContacts: () => {
    const { filteredContacts, filters } = get();
    const filtered = filteredContacts();
    const start = (filters.page - 1) * filters.pageSize;
    return filtered.slice(start, start + filters.pageSize);
  },

  loadMockData: () => {
    set({
      contacts: mockContacts,
      activities: mockActivities,
      calls: [],
    });
  },
}));
