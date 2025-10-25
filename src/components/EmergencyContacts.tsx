import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Phone, Mail, MapPin, AlertCircle, Star, Edit2, Trash2 } from 'lucide-react';

interface EmergencyContact {
  id: string;
  contact_name: string;
  relationship: string;
  phone_number: string;
  email: string;
  address: string;
  is_primary: boolean;
  medical_notes: string;
}

export default function EmergencyContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [formData, setFormData] = useState({
    contact_name: '',
    relationship: '',
    phone_number: '',
    email: '',
    address: '',
    is_primary: false,
    medical_notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('contact_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContact = async () => {
    if (!formData.contact_name || !formData.phone_number) {
      alert('Please fill in name and phone number');
      return;
    }

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('emergency_contacts')
          .update(formData)
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('emergency_contacts')
          .insert([{ user_id: user?.id, ...formData }]);

        if (error) throw error;
      }

      closeModal();
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const setPrimaryContact = async (id: string) => {
    try {
      await supabase
        .from('emergency_contacts')
        .update({ is_primary: false })
        .neq('id', id);

      const { error } = await supabase
        .from('emergency_contacts')
        .update({ is_primary: true })
        .eq('id', id);

      if (error) throw error;
      fetchContacts();
    } catch (error) {
      console.error('Error setting primary contact:', error);
    }
  };

  const openEditModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setFormData({
      contact_name: contact.contact_name,
      relationship: contact.relationship,
      phone_number: contact.phone_number,
      email: contact.email || '',
      address: contact.address || '',
      is_primary: contact.is_primary,
      medical_notes: contact.medical_notes || ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    setFormData({
      contact_name: '',
      relationship: '',
      phone_number: '',
      email: '',
      address: '',
      is_primary: false,
      medical_notes: ''
    });
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading emergency contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Emergency Contacts</h2>
            <p className="text-purple-300 text-sm">Manage your emergency contact information</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">No emergency contacts yet.</p>
            <p className="text-gray-500 text-sm">Add trusted contacts who can be reached in case of an emergency.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className={`bg-white/5 rounded-xl p-5 border transition-all ${
                  contact.is_primary
                    ? 'border-yellow-500/50 bg-yellow-500/10'
                    : 'border-white/10 hover:border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {contact.is_primary && (
                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                      )}
                      <h3 className="text-white font-semibold text-lg">{contact.contact_name}</h3>
                      <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs">
                        {contact.relationship}
                      </span>
                    </div>
                    {contact.is_primary && (
                      <p className="text-yellow-400 text-sm mb-2">Primary Emergency Contact</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!contact.is_primary && (
                      <button
                        onClick={() => setPrimaryContact(contact.id)}
                        className="p-2 hover:bg-yellow-500/20 rounded-lg transition-all"
                        title="Set as primary"
                      >
                        <Star className="w-4 h-4 text-gray-400 hover:text-yellow-400" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-2 hover:bg-blue-500/20 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                    </button>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-purple-300">
                    <Phone className="w-4 h-4" />
                    <span>{contact.phone_number}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-purple-300">
                      <Mail className="w-4 h-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.address && (
                    <div className="flex items-center gap-2 text-purple-300 md:col-span-2">
                      <MapPin className="w-4 h-4" />
                      <span>{contact.address}</span>
                    </div>
                  )}
                </div>

                {contact.medical_notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
                      <div>
                        <p className="text-orange-400 text-xs font-medium mb-1">Medical Notes</p>
                        <p className="text-gray-400 text-xs">{contact.medical_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-light text-white mb-6">
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Relationship *</label>
                  <input
                    type="text"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    placeholder="Spouse, Parent, etc."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Medical Notes</label>
                <textarea
                  value={formData.medical_notes}
                  onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                  placeholder="Any important medical information..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                  className="w-4 h-4 bg-gray-800 border-gray-700 rounded text-red-600 focus:ring-red-500/50"
                />
                <label htmlFor="is_primary" className="text-sm text-gray-300">
                  Set as primary emergency contact
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveContact}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all"
              >
                {editingContact ? 'Update' : 'Add'} Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
