import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InspectionNote, InspectionNoteType, QualityLogEntry } from '../types/quality-log';

interface InspectionNotesCellProps {
  entry: QualityLogEntry;
  width: number;
  onUpdateNotes: (entryId: string, notes: InspectionNote[]) => Promise<void>;
  currentUserEmail?: string;
}

const NOTE_TYPE_OPTIONS: InspectionNoteType[] = ['Eng', 'WIP', 'Note', 'Yard Cut'];

// Background colors for note types (used for note text display)
const NOTE_TYPE_COLORS: Record<InspectionNoteType, { bg: string; text: string; border: string }> = {
  'Eng': { bg: '#FF9933', text: '#000000', border: '#E68A2E' },
  'WIP': { bg: '#FFFF00', text: '#000000', border: '#E6E600' },
  'Note': { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  'Yard Cut': { bg: '#00CCFF', text: '#000000', border: '#00B8E6' },
};

export default function InspectionNotesCell({
  entry,
  width,
  onUpdateNotes,
  currentUserEmail,
}: InspectionNotesCellProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedType, setSelectedType] = useState<InspectionNoteType | null>(null);
  const [editingNote, setEditingNote] = useState<InspectionNote | null>(null);

  const notes = entry.inspectionNotes || [];

  const handleAddNote = async () => {
    if (!selectedType) {
      if (Platform.OS === 'web') {
        window.alert('Please select a note type');
      } else {
        Alert.alert('Error', 'Please select a note type');
      }
      return;
    }

    // Auto-fill "Yard cut" for Yard Cut type if empty
    const finalNote = selectedType === 'Yard Cut' && !noteText.trim()
      ? 'Yard cut'
      : noteText.trim();

    if (!finalNote && selectedType !== 'Yard Cut') {
      if (Platform.OS === 'web') {
        window.alert('Please enter a note');
      } else {
        Alert.alert('Error', 'Please enter a note');
      }
      return;
    }

    const newNote: InspectionNote = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedType,
      note: finalNote,
      createdAt: Date.now(),
      createdBy: currentUserEmail,
    };

    const updatedNotes = [...notes, newNote];
    await onUpdateNotes(entry.id, updatedNotes);

    setNoteText('');
    setSelectedType(null);
    setShowAddModal(false);
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !selectedType) return;

    const finalNote = selectedType === 'Yard Cut' && !noteText.trim()
      ? 'Yard cut'
      : noteText.trim();

    if (!finalNote && selectedType !== 'Yard Cut') {
      if (Platform.OS === 'web') {
        window.alert('Please enter a note');
      } else {
        Alert.alert('Error', 'Please enter a note');
      }
      return;
    }

    const updatedNotes = notes.map(n =>
      n.id === editingNote.id
        ? { ...n, type: selectedType, note: finalNote }
        : n
    );
    await onUpdateNotes(entry.id, updatedNotes);

    setEditingNote(null);
    setNoteText('');
    setSelectedType(null);
    setShowAddModal(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    const confirmDelete = () => {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      onUpdateNotes(entry.id, updatedNotes);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete this ${noteToDelete.type} note?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Note',
        `Delete this ${noteToDelete.type} note?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const openEditModal = (note: InspectionNote) => {
    setEditingNote(note);
    setNoteText(note.note);
    setSelectedType(note.type);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingNote(null);
    setNoteText('');
    setSelectedType(null);
  };

  // Handle Yard Cut selection - auto-fill note
  const handleTypeSelect = (type: InspectionNoteType) => {
    setSelectedType(type);
    if (type === 'Yard Cut' && !noteText.trim()) {
      setNoteText('Yard cut');
    }
  };

  // Render colored notes for table view (inline wrapping bubbles)
  const renderColoredNotes = () => {
    if (notes.length === 0) return null;

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
        {notes.map((note) => {
          const colors = NOTE_TYPE_COLORS[note.type];
          return (
            <View
              key={note.id}
              style={{
                backgroundColor: colors.bg,
                borderRadius: 4,
                paddingHorizontal: 4,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{ fontSize: 10, color: colors.text, fontWeight: '500' }}
              >
                {note.note}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => notes.length > 0 ? setShowViewModal(true) : setShowAddModal(true)}
        style={{
          width,
          paddingHorizontal: 6,
          paddingVertical: 8,
          justifyContent: 'center',
          borderRightWidth: 1,
          borderRightColor: 'rgba(209, 213, 219, 0.5)',
          minHeight: 44,
        }}
      >
        {notes.length === 0 ? (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#E5E7EB',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={18} color="#6B7280" />
            </View>
          </View>
        ) : (
          <View>
            {renderColoredNotes()}
          </View>
        )}
      </Pressable>

      {/* View Notes Modal */}
      <Modal visible={showViewModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowViewModal(false)} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                  Inspection Notes
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  {entry.jobNumber} - {entry.markNumber}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowViewModal(false);
                  setShowAddModal(true);
                }}
                style={{
                  backgroundColor: '#2563EB',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text style={{ color: 'white', fontWeight: '600', marginLeft: 4 }}>Add</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {notes.map((note) => {
                const colors = NOTE_TYPE_COLORS[note.type];
                return (
                  <View
                    key={note.id}
                    style={{
                      backgroundColor: colors.bg,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View
                        style={{
                          backgroundColor: 'white',
                          borderRadius: 4,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          {note.type}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => {
                            setShowViewModal(false);
                            openEditModal(note);
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="pencil" size={16} color={colors.text} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteNote(note.id)}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: '#374151' }}>{note.note}</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 8 }}>
                      {new Date(note.createdAt).toLocaleString()}
                      {note.createdBy && ` by ${note.createdBy.split('@')[0]}`}
                    </Text>
                  </View>
                );
              })}

              {notes.length === 0 && (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', marginTop: 8 }}>No inspection notes yet</Text>
                </View>
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowViewModal(false)}
              style={{
                paddingVertical: 12,
                marginTop: 16,
                backgroundColor: '#E5E7EB',
                borderRadius: 8,
              }}
            >
              <Text style={{ textAlign: 'center', fontSize: 16, color: '#374151' }}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Note Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={closeAddModal} />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center', marginBottom: 16 }}>
              {editingNote ? 'Edit Note' : 'Add Inspection Note'}
            </Text>

            {/* Note Type Selection */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
              Note Type *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {NOTE_TYPE_OPTIONS.map((type) => {
                const colors = NOTE_TYPE_COLORS[type];
                const isSelected = selectedType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => handleTypeSelect(type)}
                    style={{
                      backgroundColor: isSelected ? colors.text : colors.bg,
                      borderRadius: 8,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.text : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: isSelected ? 'white' : colors.text,
                      }}
                    >
                      {type}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Note Text */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
              Note {selectedType !== 'Yard Cut' && '*'}
              {selectedType === 'Yard Cut' && (
                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '400' }}>
                  {' '}(optional - defaults to "Yard cut")
                </Text>
              )}
            </Text>
            <TextInput
              value={noteText}
              onChangeText={setNoteText}
              placeholder={selectedType === 'Yard Cut' ? 'Yard cut' : 'Enter inspection note...'}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: '#D1D5DB',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: '#111827',
                minHeight: 100,
                textAlignVertical: 'top',
              }}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <Pressable
                onPress={closeAddModal}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 8,
                }}
              >
                <Text style={{ textAlign: 'center', fontSize: 16, color: '#374151' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={editingNote ? handleUpdateNote : handleAddNote}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  backgroundColor: '#2563EB',
                  borderRadius: 8,
                  opacity: !selectedType ? 0.5 : 1,
                }}
                disabled={!selectedType}
              >
                <Text style={{ textAlign: 'center', fontSize: 16, color: 'white', fontWeight: '600' }}>
                  {editingNote ? 'Update' : 'Add Note'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
