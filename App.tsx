
import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import ReceivedGoods from './components/ReceivedGoods';
import WorkInProgress from './components/WorkInProgress';
import FinishedGoods from './components/FinishedGoods';
import Testing from './components/Testing';
import Reports from './components/Reports';
import Auth from './components/Auth';
import ViewLog from './components/ViewLog';
import UserManagement from './components/UserManagement';
import MasterData from './components/MasterData';
import CompanyProfiles from './components/CompanyProfiles';
import InvoiceModule from './components/invoices/InvoiceModule'; 
import AiChatPanel from './components/invoices/AiChatPanel';
import StorageManager from './components/RackSearch'; 
import PublicStorageViewer from './components/PublicStorageViewer'; // New Import
import Footer from './components/Footer';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSupabase } from './hooks/useSupabase';
import type { ReceivedGood, Recipe, WIPItem, FinishedGood, RepairItem, User, LogEntry, TestResult, CompanyProfile, ExtractedInvoice, View, StorageRoom, StorageUnit, StorageItem } from './types';
import { DUMMY_RECEIVED_GOODS, DUMMY_RECIPES, DUMMY_WIP_ITEMS, DUMMY_FINISHED_GOODS, DUMMY_COMPANY_PROFILES } from './dummyData';

const App: React.FC = () => {
  // Check for public QR code scan or Iframe Mode
  const searchParams = new URLSearchParams(window.location.search);
  const publicUnitId = searchParams.get('public_storage');
  const mode = searchParams.get('mode');

  const [view, setView] = useState<View>('received'); 
  
  // Auth state
  const [users, setUsers] = useSupabase<User>('app_users', [], 'username');
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('currentUser', null);

  // App data state - synchronized with Supabase
  const [receivedGoods, setReceivedGoods] = useSupabase<ReceivedGood>('received_goods', DUMMY_RECEIVED_GOODS);
  const [recipes, setRecipes] = useSupabase<Recipe>('recipes', DUMMY_RECIPES);
  const [wipItems, setWipItems] = useSupabase<WIPItem>('wip_items', DUMMY_WIP_ITEMS);
  const [finishedGoods, setFinishedGoods] = useSupabase<FinishedGood>('finished_goods', DUMMY_FINISHED_GOODS);
  const [repairItems, setRepairItems] = useSupabase<RepairItem>('repair_items', []);
  const [testResults, setTestResults] = useSupabase<TestResult>('test_results', []);
  const [logs, setLogs] = useSupabase<LogEntry>('logs', []);
  const [companyProfiles, setCompanyProfiles] = useSupabase<CompanyProfile>('company_profiles', DUMMY_COMPANY_PROFILES);
  
  // Storage Management State (New)
  const [rooms, setRooms] = useSupabase<StorageRoom>('storage_rooms', []);
  const [storageUnits, setStorageUnits] = useSupabase<StorageUnit>('storage_units', []);
  const [storageItems, setStorageItems] = useSupabase<StorageItem>('storage_items', []);

  // State for transferring data from Reports to Invoice Maker
  const [invoiceDraft, setInvoiceDraft] = useState<ExtractedInvoice | null>(null);

  // State for transferring data from Testing to WIP (Start Production)
  const [productionDraft, setProductionDraft] = useState<{ receivedGoodId: string; serials: string[] } | null>(null);

  useEffect(() => {
    if (users.length === 0) {
        // Wait for sync
    }

    setUsers(prevUsers => {
        const adminUser: User = {
            username: 'datlioncnergy@gmail.com',
            password: 'thisisbusiness',
            role: 'admin',
        };

        const existingUsers = [...prevUsers];
        const adminIndex = existingUsers.findIndex(u => u.username === adminUser.username);

        if (adminIndex !== -1) {
            if (JSON.stringify(existingUsers[adminIndex]) !== JSON.stringify({ ...existingUsers[adminIndex], ...adminUser })) {
                 existingUsers[adminIndex] = { ...existingUsers[adminIndex], ...adminUser };
                 return existingUsers;
            }
            return prevUsers;
        } else {
            existingUsers.push(adminUser);
            return existingUsers;
        }
    });
  }, [setUsers, users]); 

  const addLogEntry = useCallback((action: string, details: string) => {
    if (!currentUser) return;
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      username: currentUser.username,
      action,
      details,
    };
    setLogs(prev => [newLog, ...prev]);
  }, [setLogs, currentUser]);

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    const user = users.find(u => u.username === username);
    if (user && user.password === password) {
      setCurrentUser(user);
      addLogEntry('User Logged In', `User '${username}' logged in.`);
      return null;
    }
    return 'Invalid username or password.';
  };

  const handleLogout = () => {
    if(currentUser) {
      addLogEntry('User Logged Out', `User '${currentUser.username}' logged out.`);
    }
    setCurrentUser(null);
  };
  
  const handleAddUser = (username: string, password: string): string | null => {
    if (currentUser?.role !== 'admin') {
        return 'Permission denied.';
    }
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        return 'A user with this email already exists.';
    }
    const newUser: User = { username, password, role: 'user' };
    setUsers(prev => [...prev, newUser]);
    addLogEntry('User Created', `Admin '${currentUser.username}' created new user '${username}'.`);
    return null;
  };

  const handleDeleteUser = (usernameToDelete: string): string | null => {
    if (currentUser?.role !== 'admin') {
        return 'Permission denied.';
    }
    if (usernameToDelete === 'datlioncnergy@gmail.com') {
        return 'The default admin account cannot be deleted.';
    }
    if (usernameToDelete === currentUser.username) {
        return "You cannot delete your own account.";
    }
    setUsers(prev => prev.filter(user => user.username !== usernameToDelete));
    addLogEntry('User Deleted', `Admin '${currentUser.username}' deleted user '${usernameToDelete}'.`);
    return null;
  }


  const renderView = useCallback(() => {
    // Handle Finance Sub-routes
    if (view.startsWith('finance_')) {
        const tab = view.replace('finance_', '') as any;
        return <InvoiceModule 
            currentUser={currentUser} 
            companyProfiles={companyProfiles}
            invoiceDraft={invoiceDraft}
            setInvoiceDraft={setInvoiceDraft}
            setView={setView}
            activeTab={tab}
        />;
    }

    switch (view) {
      case 'received':
        return (
          <ReceivedGoods 
            receivedGoods={receivedGoods} 
            setReceivedGoods={setReceivedGoods} 
            recipes={recipes}
            setRecipes={setRecipes}
            addLogEntry={addLogEntry} 
            wipItems={wipItems}
            setWipItems={setWipItems}
            finishedGoods={finishedGoods}
            setFinishedGoods={setFinishedGoods}
            companyProfiles={companyProfiles}
            testResults={testResults}
            setTestResults={setTestResults}
            currentUser={currentUser}
            setView={setView}
            setInvoiceDraft={setInvoiceDraft}
          />
        );
      case 'testing':
        return <Testing 
          receivedGoods={receivedGoods} 
          setReceivedGoods={setReceivedGoods}
          testResults={testResults} 
          setTestResults={setTestResults} 
          addLogEntry={addLogEntry} 
          currentUser={currentUser}
          onSendToProduction={(data) => {
              setProductionDraft(data);
              setView('wip');
          }}
        />;
      case 'wip':
        return <WorkInProgress
          wipItems={wipItems}
          setWipItems={setWipItems}
          receivedGoods={receivedGoods}
          setReceivedGoods={setReceivedGoods}
          recipes={recipes}
          setRecipes={setRecipes}
          setFinishedGoods={setFinishedGoods}
          repairItems={repairItems}
          setRepairItems={setRepairItems}
          finishedGoods={finishedGoods}
          addLogEntry={addLogEntry}
          testResults={testResults}
          companyProfiles={companyProfiles}
          productionDraft={productionDraft}
          setProductionDraft={setProductionDraft}
        />;
      case 'finished':
        return <FinishedGoods 
          finishedGoods={finishedGoods} 
          setFinishedGoods={setFinishedGoods}
          recipes={recipes} 
          receivedGoods={receivedGoods} 
          setReceivedGoods={setReceivedGoods}
          setRepairItems={setRepairItems}
          addLogEntry={addLogEntry}
          companyProfiles={companyProfiles}
          setView={setView}
          setInvoiceDraft={setInvoiceDraft}
        />;
      case 'storage':
        return <StorageManager 
            rooms={rooms}
            setRooms={setRooms}
            units={storageUnits}
            setUnits={setStorageUnits}
            items={storageItems}
            setItems={setStorageItems}
            receivedGoods={receivedGoods}
            addLogEntry={addLogEntry}
        />;
      case 'reports':
        return <Reports 
          receivedGoods={receivedGoods} 
          finishedGoods={finishedGoods} 
          recipes={recipes} 
          wipItems={wipItems} 
          logs={logs} 
          setView={setView}
          setInvoiceDraft={setInvoiceDraft}
        />;
      case 'master':
        return <MasterData 
          receivedGoods={receivedGoods}
          wipItems={wipItems}
          finishedGoods={finishedGoods}
          recipes={recipes}
          repairItems={repairItems}
          testResults={testResults}
          rooms={rooms}
          storageUnits={storageUnits}
          storageItems={storageItems}
        />;
      case 'log':
        return <ViewLog logs={logs} />;
      case 'companies':
        return <CompanyProfiles 
          companyProfiles={companyProfiles}
          setCompanyProfiles={setCompanyProfiles}
          addLogEntry={addLogEntry}
        />;
      case 'users':
        return currentUser && currentUser.role === 'admin' ? (
          <UserManagement 
            users={users} 
            onAddUser={handleAddUser} 
            onDeleteUser={handleDeleteUser} 
            currentUser={currentUser} 
          />
        ) : <div className="text-center p-8 text-red-600 font-semibold">Access Denied</div>;
      
      case 'ai_assistant':
        return <AiChatPanel 
            currentUser={currentUser} 
            receivedGoods={receivedGoods}
            finishedGoods={finishedGoods}
            wipItems={wipItems}
        />;

      default:
        return null;
    }
  }, [view, receivedGoods, recipes, wipItems, finishedGoods, repairItems, logs, users, currentUser, addLogEntry, setReceivedGoods, setWipItems, setFinishedGoods, setRepairItems, setRecipes, testResults, setTestResults, companyProfiles, setCompanyProfiles, invoiceDraft, productionDraft, rooms, storageUnits, storageItems, setRooms, setStorageUnits, setStorageItems]);

  // --- MASTER SEARCH IFRAME ROUTE ---
  if (mode === 'master_search') {
      return (
        <div className="min-h-screen bg-gray-50 p-4">
           <MasterData 
              receivedGoods={receivedGoods}
              wipItems={wipItems}
              finishedGoods={finishedGoods}
              recipes={recipes}
              repairItems={repairItems}
              testResults={testResults}
              rooms={rooms}
              storageUnits={storageUnits}
              storageItems={storageItems}
           />
        </div>
      );
  }

  // --- PUBLIC ACCESS ROUTE ---
  if (publicUnitId) {
      return <PublicStorageViewer unitId={publicUnitId} />;
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">
      <Header 
        currentView={view} 
        setView={setView} 
        username={currentUser.username} 
        userRole={currentUser.role}
        onLogout={handleLogout} 
      />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderView()}
      </main>
      
      <Footer 
        receivedGoods={receivedGoods} 
        finishedGoods={finishedGoods} 
      />
    </div>
  );
};

export default App;
