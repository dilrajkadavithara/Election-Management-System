import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import UserManagement from '../components/admin/UserManagement';
import LocationManager from '../components/admin/LocationManager';
import PartyManager from '../components/admin/PartyManager';

const AdminControl = () => {
    const { allUsers, allLocations, userRole } = useAppContext();
    const [activeTab, setActiveTab] = useState('users');

    const unassignedBooths = (() => {
        const allBoothIds = allLocations.flatMap(c => c.local_bodies.flatMap(lb => lb.booths.map(b => b.id)));
        const assignedIds = allUsers.flatMap(u => u.booth_ids || []);
        return allBoothIds.filter(id => !assignedIds.includes(id)).length;
    })();

    return (
        <div className="min-h-screen lux-mesh-bg p-6 sm:p-8 pl-6 lg:pl-[420px] pr-6 lg:pr-10 pb-24 pt-24 lg:pt-8 lux-animate-in text-white">

            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-white/8 pb-8 mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight lux-text-gradient">User Settings</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage staff accounts, locations, and party branding</p>
                </div>
                <div className="flex gap-4">
                    <div className="lux-glass border-rose-500/20 px-6 py-4 rounded-2xl text-center">
                        <p className="text-xs text-rose-400 font-semibold mb-1">Unassigned Booths</p>
                        <p className="text-2xl font-black">{unassignedBooths}</p>
                    </div>
                    <div className="lux-glass border-indigo-500/20 px-6 py-4 rounded-2xl text-center">
                        <p className="text-xs text-indigo-400 font-semibold mb-1">Total Staff</p>
                        <p className="text-2xl font-black">{allUsers.length}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-black/30 p-1.5 rounded-2xl w-fit border border-white/5">
                {[
                    { key: 'users', label: '👤 Staff Accounts' },
                    ...(['SUPERUSER', 'MANAGER'].includes(userRole) ? [
                        { key: 'locations', label: '📍 Locations' },
                        { key: 'parties', label: '🏳️ Party Branding' },
                    ] : [])
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'locations' && ['SUPERUSER', 'MANAGER'].includes(userRole) && <LocationManager />}
            {activeTab === 'parties' && ['SUPERUSER', 'MANAGER'].includes(userRole) && <PartyManager />}
        </div>
    );
};

export default AdminControl;
