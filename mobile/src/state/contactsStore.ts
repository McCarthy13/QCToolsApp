import { create } from 'zustand';
import { FirebaseSync } from '../services/firebaseSync';
import { ContactItem } from '../types/contacts';

interface ContactsState {
  contacts: Record<string, ContactItem>;
  loading: boolean;
  initialized: boolean;

  // CRUD operations
  addContact: (contact: ContactItem) => Promise<void>;
  updateContact: (id: string, updates: Partial<ContactItem>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  getContact: (id: string) => ContactItem | undefined;

  // Utility functions
  getAllContacts: () => ContactItem[];
  searchContacts: (query: string) => ContactItem[];
  isContactComplete: (id: string) => boolean;

  // Favorites & Recently Used
  toggleFavorite: (id: string) => Promise<void>;
  getFavorites: () => ContactItem[];
  trackAccess: (id: string) => Promise<void>;
  getRecentlyUsed: (limit?: number) => ContactItem[];

  // Duplicate
  duplicateContact: (id: string) => Promise<ContactItem | undefined>;

  // Initialize
  initialize: () => Promise<void>;
}

// Helper function to check if contact has all required fields
const checkContactComplete = (contact: ContactItem): boolean => {
  return !!(
    contact.name &&
    contact.phone &&
    contact.email
  );
};

const firebaseSync = new FirebaseSync<ContactItem>('contacts');

export const useContactsStore = create<ContactsState>()((set, get) => ({
  contacts: {},
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    set({ loading: true });

    try {
      const items = await firebaseSync.fetchAll();
      const contacts = items.reduce((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, ContactItem>);

      set({ contacts, loading: false, initialized: true });

      firebaseSync.subscribe((updatedItems) => {
        const updatedContacts = updatedItems.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {} as Record<string, ContactItem>);
        set({ contacts: updatedContacts });
      });
    } catch (error) {
      console.error('Failed to initialize contacts:', error);
      set({ loading: false, initialized: true });
    }
  },

  addContact: async (contact) => {
    const newContact = {
      ...contact,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    set((state) => ({
      contacts: {
        ...state.contacts,
        [contact.id]: newContact,
      },
    }));

    try {
      await firebaseSync.set(contact.id, newContact);
    } catch (error) {
      set((state) => {
        const { [contact.id]: deleted, ...remaining } = state.contacts;
        return { contacts: remaining };
      });
      throw error;
    }
  },

  updateContact: async (id, updates) => {
    const existing = get().contacts[id];
    if (!existing) return;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => ({
      contacts: {
        ...state.contacts,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      set((state) => ({
        contacts: {
          ...state.contacts,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  deleteContact: async (id) => {
    const existing = get().contacts[id];

    set((state) => {
      const { [id]: deleted, ...remaining } = state.contacts;
      return { contacts: remaining };
    });

    try {
      await firebaseSync.delete(id);
    } catch (error) {
      if (existing) {
        set((state) => ({
          contacts: {
            ...state.contacts,
            [id]: existing,
          },
        }));
      }
      throw error;
    }
  },

  getContact: (id) => get().contacts[id],

  getAllContacts: () => {
    const contacts = get().contacts;
    return Object.values(contacts).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  },

  searchContacts: (query) => {
    const allContacts = get().getAllContacts();
    const lowerQuery = query.toLowerCase();

    return allContacts.filter(contact =>
      contact.name.toLowerCase().includes(lowerQuery) ||
      contact.company?.toLowerCase().includes(lowerQuery) ||
      contact.role?.toLowerCase().includes(lowerQuery) ||
      contact.email?.toLowerCase().includes(lowerQuery)
    );
  },

  isContactComplete: (id) => {
    const contact = get().contacts[id];
    if (!contact) return false;
    return checkContactComplete(contact);
  },

  toggleFavorite: async (id) => {
    const existing = get().contacts[id];
    if (!existing) return;

    const updated = {
      ...existing,
      isFavorite: !existing.isFavorite,
      updatedAt: Date.now(),
    };

    set((state) => ({
      contacts: {
        ...state.contacts,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      set((state) => ({
        contacts: {
          ...state.contacts,
          [id]: existing,
        },
      }));
      throw error;
    }
  },

  getFavorites: () => {
    const allContacts = get().getAllContacts();
    return allContacts.filter(contact => contact.isFavorite);
  },

  trackAccess: async (id) => {
    const existing = get().contacts[id];
    if (!existing) return;

    const updated = {
      ...existing,
      lastAccessedAt: Date.now(),
    };

    set((state) => ({
      contacts: {
        ...state.contacts,
        [id]: updated,
      },
    }));

    try {
      await firebaseSync.set(id, updated);
    } catch (error) {
      console.error('Failed to track access:', error);
    }
  },

  getRecentlyUsed: (limit = 5) => {
    const allContacts = get().getAllContacts();
    return allContacts
      .filter(contact => contact.lastAccessedAt)
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, limit);
  },

  duplicateContact: async (id) => {
    const existing = get().contacts[id];
    if (!existing) return undefined;

    const newContact: ContactItem = {
      ...existing,
      id: Date.now().toString(),
      name: `${existing.name} (Copy)`,
      isFavorite: false,
      lastAccessedAt: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await get().addContact(newContact);
    return newContact;
  },
}));
