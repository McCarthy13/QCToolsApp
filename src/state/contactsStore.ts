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
    }),
    {
      name: 'contacts-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
