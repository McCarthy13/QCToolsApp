import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ContactItem } from '../types/contacts';

interface ContactsState {
  contacts: Record<string, ContactItem>;
  
  // CRUD operations
  addContact: (contact: ContactItem) => void;
  updateContact: (id: string, updates: Partial<ContactItem>) => void;
  deleteContact: (id: string) => void;
  getContact: (id: string) => ContactItem | undefined;
  
  // Utility functions
  getAllContacts: () => ContactItem[];
  searchContacts: (query: string) => ContactItem[];
  isContactComplete: (id: string) => boolean;
  
  // Favorites & Recently Used
  toggleFavorite: (id: string) => void;
  getFavorites: () => ContactItem[];
  trackAccess: (id: string) => void;
  getRecentlyUsed: (limit?: number) => ContactItem[];
  
  // Duplicate
  duplicateContact: (id: string) => ContactItem | undefined;
}

// Helper function to check if contact has all required fields
const checkContactComplete = (contact: ContactItem): boolean => {
  return !!(
    contact.name &&
    contact.phone &&
    contact.email
  );
};

export const useContactsStore = create<ContactsState>()(
  persist(
    (set, get) => ({
      contacts: {},
      
      addContact: (contact) =>
        set((state) => ({
          contacts: {
            ...state.contacts,
            [contact.id]: {
              ...contact,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        })),
      
      updateContact: (id, updates) =>
        set((state) => {
          const existing = state.contacts[id];
          if (!existing) return state;
          
          return {
            contacts: {
              ...state.contacts,
              [id]: {
                ...existing,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      
      deleteContact: (id) =>
        set((state) => {
          const { [id]: deleted, ...remaining } = state.contacts;
          return { contacts: remaining };
        }),
      
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
      
      toggleFavorite: (id) =>
        set((state) => {
          const existing = state.contacts[id];
          if (!existing) return state;
          
          return {
            contacts: {
              ...state.contacts,
              [id]: {
                ...existing,
                isFavorite: !existing.isFavorite,
                updatedAt: Date.now(),
              },
            },
          };
        }),
      
      getFavorites: () => {
        const allContacts = get().getAllContacts();
        return allContacts.filter(contact => contact.isFavorite);
      },
      
      trackAccess: (id) =>
        set((state) => {
          const existing = state.contacts[id];
          if (!existing) return state;
          
          return {
            contacts: {
              ...state.contacts,
              [id]: {
                ...existing,
                lastAccessedAt: Date.now(),
              },
            },
          };
        }),
      
      getRecentlyUsed: (limit = 5) => {
        const allContacts = get().getAllContacts();
        return allContacts
          .filter(contact => contact.lastAccessedAt)
          .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
          .slice(0, limit);
      },
      
      duplicateContact: (id) => {
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
        
        get().addContact(newContact);
        return newContact;
      },
    }),
    {
      name: 'contacts-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
