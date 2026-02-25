import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, Users, Calendar, Settings, Eye, Loader, Bold, Monitor, Smartphone, Italic,
  WifiOff, CheckCircle, Search
} from 'lucide-react';

import { useAuth, User } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { api } from '../lib/api';
import useDebounce from '../utils/usedebounce';

// --- Local Types for Type Safety ---
interface AuthContextType {
  user: User | null;
  token: string | null;
}

export type TemplateCategory = 'blank' | 'welcome' | 'newsletter' | 'promotional' | 'announcement';

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  content: string;
  thumbnail: string;
  isDefault: boolean;
}

interface ContactList {
  id: string;
  name: string;
  description: string | null;
  activeCount: number;
}

interface CampaignData {
  name: string;
  subject: string;
  content: string;
  listIds: string[];
  schedule: 'now' | 'later';
  fromName: string; // Added to use the user object
}

const STEPS = [
  { number: 1, name: 'Info', icon: Settings },
  { number: 2, name: 'Design', icon: Eye },
  { number: 3, name: 'Audience', icon: Users },
  { number: 4, name: 'Review', icon: Calendar },
];

export const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  // Fixed: Explicit type instead of 'any', and used 'user'
  const { user, token } = useAuth() as AuthContextType; 
  const { showToast } = useToast();

  // --- State ---
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    subject: '',
    content: '',
    listIds: [],
    schedule: 'now',
    fromName: user?.name || '', // Fixed: 'user' is now used
  });

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // --- Network Listener ---
  useEffect(() => {
    const toggleOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', toggleOnline);
    window.addEventListener('offline', toggleOnline);
    return () => {
      window.removeEventListener('online', toggleOnline);
      window.removeEventListener('offline', toggleOnline);
    };
  }, []);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingTemplates(true);
      const [tplRes, listRes] = await Promise.all([
        api.get<Template[]>('/templates', { params: { search: debouncedSearch } }),
        api.get<ContactList[]>('/contacts/lists')
      ]);
      setTemplates(tplRes.data);
      setLists(listRes.data);
    } catch {
      showToast('Failed to load campaign resources', 'error');
    } finally {
      setLoadingTemplates(false);
    }
  }, [token, debouncedSearch, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Handlers ---
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await api.post('/campaigns/draft', campaignData);
      showToast('Draft saved successfully', 'success');
    } catch {
      showToast('Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string }>('/campaigns', campaignData);
      showToast('Campaign launched!', 'success');
      navigate(`/campaigns/${res.data.id}`);
    } catch {
      showToast('Launch failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedCount = useMemo(() => {
    return lists
      .filter(l => campaignData.listIds.includes(l.id))
      .reduce((sum, l) => sum + l.activeCount, 0);
  }, [lists, campaignData.listIds]);

  // --- Step Views ---
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Campaign Name</label>
        <input 
          className="w-full p-2 border rounded-md" 
          placeholder="e.g., Summer Newsletter"
          value={campaignData.name}
          onChange={e => setCampaignData({...campaignData, name: e.target.value})}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Subject Line</label>
        <input 
          className="w-full p-2 border rounded-md" 
          placeholder="What will users see in their inbox?"
          value={campaignData.subject}
          onChange={e => setCampaignData({...campaignData, subject: e.target.value})}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input 
            className="pl-9 w-full p-2 border rounded-md text-sm" 
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadingTemplates ? (
        <div className="flex justify-center py-10"><Loader className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-4 overflow-y-auto max-h-40">
          {templates.map(t => (
            <div 
              key={t.id} 
              onClick={() => setCampaignData({...campaignData, content: t.content})}
              className={`cursor-pointer p-2 border rounded hover:border-blue-500 text-xs text-center ${campaignData.content === t.content ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              {t.name}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg border">
        <div className="flex gap-2 text-gray-400">
          <Bold className="w-4 h-4 cursor-not-allowed" /> <Italic className="w-4 h-4 cursor-not-allowed" />
        </div>
        <div className="flex gap-2">
          <Monitor onClick={() => setPreviewMode('desktop')} className={`w-4 h-4 cursor-pointer ${previewMode === 'desktop' ? 'text-blue-600' : 'text-gray-400'}`} />
          <Smartphone onClick={() => setPreviewMode('mobile')} className={`w-4 h-4 cursor-pointer ${previewMode === 'mobile' ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
      </div>
      <textarea 
        className="w-full h-48 p-4 border rounded-b-lg font-mono text-sm focus:ring-1 focus:ring-blue-500 outline-none"
        placeholder="Write your email content here..."
        value={campaignData.content}
        onChange={e => setCampaignData({...campaignData, content: e.target.value})}
      />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      {!isOnline && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-200">
          <WifiOff className="w-4 h-4" /> Connection lost. Changes may not be saved.
        </div>
      )}

      {/* Progress Stepper */}
      <div className="flex justify-between mb-10">
        {STEPS.map(s => (
          <div key={s.number} className={`flex flex-col items-center gap-2 ${step >= s.number ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step >= s.number ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-100">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Select Recipients</h3>
            <div className="grid gap-3">
              {lists.map(list => (
                <label key={list.id} className="flex items-center gap-3 p-4 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-blue-600"
                    checked={campaignData.listIds.includes(list.id)}
                    onChange={() => {
                      const ids = campaignData.listIds.includes(list.id) 
                        ? campaignData.listIds.filter(id => id !== list.id)
                        : [...campaignData.listIds, list.id];
                      setCampaignData({...campaignData, listIds: ids});
                    }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-900">{list.name}</div>
                    <div className="text-xs text-gray-500">{list.activeCount} active contacts</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <h4 className="font-bold text-blue-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Ready to Launch
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Your campaign will reach <strong>{estimatedCount.toLocaleString()}</strong> contacts.
              </p>
            </div>
            <div className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">From:</span> <strong>{campaignData.fromName}</strong></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subject:</span> <strong>{campaignData.subject}</strong></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button onClick={() => setStep(p => p - 1)} disabled={step === 1} className="px-6 py-2 text-gray-500 disabled:opacity-30 transition-opacity">Back</button>
        <div className="flex gap-4">
          <button onClick={handleSaveDraft} disabled={saving || !isOnline} className="px-6 py-2 text-gray-600 hover:text-black transition-colors">{saving ? 'Saving...' : 'Save Draft'}</button>
          {step < 4 ? (
            <button onClick={() => setStep(p => p + 1)} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all">Continue</button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting || !isOnline} className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold flex items-center gap-2 shadow-md hover:bg-green-700 transition-all">
              {submitting ? <Loader className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
              Launch
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;