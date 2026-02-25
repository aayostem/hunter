import React, { useState, useEffect, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';
import { Plus, Search, Upload, Trash2, Edit, X } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../hooks/useToast';
import useDebounce from '../utils/usedebounce';

// --- Interfaces ---
export interface Contact {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'inactive' | 'unsubscribed' | 'bounced';
  engagementScore: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

type Mapping = Record<string, string>;

interface MapperProps {
  headers: string[];
  preview: string[][];
  onCancel: () => void;
  onConfirm: (map: Mapping) => void;
}

interface ImportState {
  open: boolean;
  headers: string[];
  preview: string[][];
  file: File | null;
}

const SYSTEM_FIELDS: Record<string, string> = {
  email: 'Email (Req)',
  firstName: 'First Name',
  lastName: 'Last Name',
  company: 'Company',
  phone: 'Phone',
  tags: 'Tags'
};

// --- Sub-Component: CSV Mapper Modal ---
const MapperModal: React.FC<MapperProps> = ({ headers, preview, onCancel, onConfirm }) => {
  const [map, setMap] = useState<Mapping>({});

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">Match CSV Columns</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="pb-2 font-semibold">CSV Column</th>
                <th className="pb-2 font-semibold">Preview</th>
                <th className="pb-2 font-semibold">System Field</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {headers.map((h, i) => (
                <tr key={`${h}-${i}`}>
                  <td className="py-3 font-medium text-gray-700">{h}</td>
                  <td className="py-3 text-gray-400 truncate max-w-30">{preview[0]?.[i] || '—'}</td>
                  <td className="py-3">
                    <select 
                      className="w-full border rounded-lg p-1 text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={map[h] || ''} 
                      onChange={e => setMap({...map, [h]: e.target.value})}
                    >
                      <option value="">Skip</option>
                      {Object.entries(SYSTEM_FIELDS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-gray-50 flex justify-end gap-2 border-t">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
          <button 
            disabled={!Object.values(map).includes('email')}
            onClick={() => onConfirm(map)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Start Import
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export const Contacts: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  
  const [importState, setImportState] = useState<ImportState>({
    open: false, headers: [], preview: [], file: null
  });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Contact>>('/api/v1/contacts', { 
        params: { search: debouncedSearch } 
      });
      setContacts(res.data.data);
    } catch { 
      showToast('Error loading contacts', 'error'); 
    } finally { 
      setLoading(false); 
    }
  }, [debouncedSearch, showToast]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<string[]>(file, {
      header: false,
      preview: 5,
      skipEmptyLines: true,
      complete: (results: ParseResult<string[]>) => {
        const rows = results.data;
        if (rows.length > 0) {
          setImportState({ 
            open: true, 
            headers: rows[0], 
            preview: rows.slice(1), 
            file 
          });
        }
      }
    });
  };

  const executeImport = async (mapping: Mapping) => {
    if (!importState.file) return;
    const fd = new FormData();
    fd.append('file', importState.file);
    fd.append('mapping', JSON.stringify(mapping));
    
    try {
      setImportState(prev => ({ ...prev, open: false }));
      await api.post('/api/v1/contacts/import', fd);
      showToast('Import started in background', 'success');
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchContacts();
    } catch { 
      showToast('Import failed', 'error'); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header section remains identical visually, but type-safe */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500 text-sm">Manage your audience and segments</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700 font-medium">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search contacts..." 
              className="pl-10 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase">
            <tr>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Engagement</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-10 text-center text-gray-400">Loading contacts...</td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-gray-400">No contacts found.</td></tr>
            ) : contacts.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 group transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{c.name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{c.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 bg-gray-100 h-1.5 rounded-full">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full" 
                      style={{ width: `${Math.min(Math.max(c.engagementScore, 0), 100)}%` }} 
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded transition-colors"><Edit className="w-4 h-4 text-gray-400" /></button>
                    <button className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importState.open && (
        <MapperModal 
          headers={importState.headers} 
          preview={importState.preview}
          onCancel={() => setImportState({ ...importState, open: false, file: null })}
          onConfirm={executeImport}
        />
      )}
    </div>
  );
};