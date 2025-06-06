// UserManagement.js - Dedicated user management component
import React, { useState, useEffect } from 'react';
import AuthService, { USER_ROLES } from '../services/AuthService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // New user form state
  const [newUser, setNewUser] = useState({
    email: '',
    role: USER_ROLES.JUDGE,
    name: ''
  });

  // Bulk import state
  const [bulkImport, setBulkImport] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  
  // Manual instruction state - Removed as component is deleted
  // const [showInstructions, setShowInstructions] = useState(false);
  // const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-clear success messages after 3 seconds
  useEffect(() => {
    if (message && !message.includes('Failed')) {
      const timer = setTimeout(() => {
        setMessage('');
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await AuthService.getAllUsers();
      setUsers(usersData);
    } catch (error) {
      setMessage(`Failed to load users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();

    // --- Validation Start ---
    // 1. Check for Display Name
    if (!newUser.name.trim()) {
      setMessage('Failed to add user: Display Name is required.');
      return;
    }

    // 2. Check for unique email
    if (users.some(user => user.email.toLowerCase() === newUser.email.toLowerCase())) {
      setMessage(`Failed to add user: Email "${newUser.email}" already exists.`);
      return;
    }
    // --- Validation End ---

    setLoading(true);
    try {
      await AuthService.addUser(newUser.email, newUser.role, newUser.name);
      setMessage('User added successfully!');
      setNewUser({
        email: '',
        role: USER_ROLES.JUDGE,
        name: ''
      });
      await loadUsers();
    } catch (error) {
      console.log('Error caught:', error.message);
      
      // Check if this is a permission error
      if (error.message.includes('Permission denied') || error.message.includes('403')) {
        // setPendingUser({ ...newUser });
        // setShowInstructions(true);
        // setMessage('');
        setMessage(`Permission Denied: Please add the user's email directly to the "User Roles" sheet in your Google Sheet and grant them "Editor" access.`);
      } else {
        setMessage(`Failed to add user: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    setLoading(true);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Parse bulk import text (format: email,role,name per line)
      const lines = bulkImport.trim().split('\n');
      const users = lines.map(line => {
        const [email, role, name] = line.split(',').map(item => item.trim());
        return { email, role: role || USER_ROLES.JUDGE, name: name || '' };
      });

      // Add each user
      for (const user of users) {
        if (user.email) {
          try {
            await AuthService.addUser(user.email, user.role, user.name);
            successCount++;
          } catch (userError) {
            errorCount++;
            if (userError.message.includes('Permission denied') || userError.message.includes('403')) {
              errors.push(`${user.email}: Permission denied - please add manually to Google Sheet`);
            } else {
              errors.push(`${user.email}: ${userError.message}`);
            }
          }
        }
      }

      if (errorCount > 0) {
        setMessage(`Bulk import completed: ${successCount} successful, ${errorCount} failed${errors.length > 0 ? '\nErrors:\n' + errors.join('\n') : ''}`);
      } else {
        setMessage(`Successfully imported ${successCount} users!`);
      }
      
      setBulkImport('');
      setShowBulkImport(false);
      await loadUsers();
    } catch (error) {
      setMessage(`Failed to import users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case USER_ROLES.EVENT_ADMIN:
        return 'bg-blue-100 text-blue-800';
      case USER_ROLES.JUDGE:
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case USER_ROLES.EVENT_ADMIN:
        return 'Event Admin';
      case USER_ROLES.JUDGE:
        return 'Judge';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-md ${message.includes('Failed') || message.includes('Denied') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          <p className="whitespace-pre-wrap">{message}</p>
        </div>
      )}

      {/* Add Single User */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New User</h2>
          <button
            onClick={() => setShowBulkImport(!showBulkImport)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {showBulkImport ? 'Single User' : 'Bulk Import'}
          </button>
        </div>

        {!showBulkImport ? (
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Role *
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={USER_ROLES.JUDGE}>Judge</option>
                  <option value={USER_ROLES.EVENT_ADMIN}>Event Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="Enter a display name"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bulk Import Users
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Enter one user per line in format: email,role,name (role: event_admin or judge)
              </p>
              <textarea
                value={bulkImport}
                onChange={(e) => setBulkImport(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="judge1@example.com,judge,John Smith&#10;judge2@example.com,judge,Jane Doe&#10;admin@example.com,event_admin,Admin User"
              />
            </div>
            <button
              onClick={handleBulkImport}
              disabled={loading || !bulkImport.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Users'}
            </button>
          </div>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Current Users</h2>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.addedDate ? new Date(user.addedDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Instructions</h3>
        <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
          <li><strong>Event Admin:</strong> Can create/manage events, assign judges, and view all scores</li>
          <li><strong>Judge:</strong> Can only score assigned matches</li>
          <li>Users will be automatically assigned the Judge role if not found in the system</li>
          <li>Make sure the Google Sheet has a "User Roles" worksheet with columns: Email, Role, Name, Added Date</li>
        </ul>
      </div>
    </div>
  );
};

export default UserManagement; 