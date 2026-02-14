import React from 'react';
import { Plus, Copy, Trash2, Edit, Eye } from 'lucide-react';

export const Templates = () => {
  const templates = [
    {
      id: 1,
      name: 'Welcome Email',
      category: 'Onboarding',
      lastUsed: '2024-02-10',
      usageCount: 45
    },
    {
      id: 2,
      name: 'Monthly Newsletter',
      category: 'Newsletter',
      lastUsed: '2024-02-05',
      usageCount: 23
    },
    {
      id: 3,
      name: 'Product Announcement',
      category: 'Marketing',
      lastUsed: '2024-02-01',
      usageCount: 67
    },
    {
      id: 4,
      name: 'Password Reset',
      category: 'Transactional',
      lastUsed: '2024-02-12',
      usageCount: 234
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Create Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-lg font-medium">{template.category}</span>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Used {template.usageCount} times</span>
                <span>Last: {template.lastUsed}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};