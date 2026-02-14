import React, { useState } from 'react';
import { Plus, Search, Upload, Download, MoreVertical, Mail } from 'lucide-react';

export const Contacts:React.FC = () => {
  const [selectedList, setSelectedList] = useState('all');

  const contacts = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', lastOpened: '2024-02-13', lists: ['Customers'] },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', lastOpened: '2024-02-12', lists: ['Leads'] },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'unsubscribed', lastOpened: '2024-01-30', lists: ['Newsletter'] },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', lastOpened: '2024-02-13', lists: ['Customers', 'VIP'] },
  ];

  const lists = [
    { name: 'All Contacts', count: 12345 },
    { name: 'Customers', count: 8234 },
    { name: 'Leads', count: 4111 },
    { name: 'Newsletter', count: 6789 },
    { name: 'VIP', count: 567 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <div className="flex space-x-3">
          <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex items-center space-x-2 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Lists Sidebar */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Lists</h3>
          <div className="space-y-2">
            {lists.map((list) => (
              <button
                key={list.name}
                onClick={() => setSelectedList(list.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  selectedList === list.name
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{list.name}</span>
                <span className="text-xs text-gray-400">{list.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contacts Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Lists</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Last Opened</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contact.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        contact.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {contact.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.lists.map((list) => (
                          <span key={list} className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">
                            {list}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contact.lastOpened}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Showing 1-4 of 12,345 contacts</p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">1</button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">3</button>
              <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};