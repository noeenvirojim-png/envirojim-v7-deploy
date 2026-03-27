'use client'

import { useState } from 'react';
import { User, UserRole } from '@/types/schema';
import { updateUserRoleAction } from '@/domain/identity/actions/users';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';

interface UserTableProps {
    users: (User & { organization?: any })[];
}

const ROLES: UserRole[] = [
    'SUPER_ADMIN',
    'ENVIROJIM_ADMIN',
    'DEALER_ADMIN',
    'SERVICE_PROVIDER_ADMIN',
    'CLIENT_ADMIN',
    'TECHNICIAN',
    'OPERATOR'
];

export function UserTable({ users: initialUsers }: UserTableProps) {
    const [users, setUsers] = useState(initialUsers);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        setLoadingId(userId);
        try {
            const result = await updateUserRoleAction(userId, newRole);
            if (result.success) {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                toast.success('Rôle mis à jour avec succès');
            } else {
                toast.error(result.error || 'Erreur lors de la mise à jour');
            }
        } catch (error) {
            toast.error('Erreur réseau');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm bg-white">
            <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 font-bold text-slate-900">Utilisateur</th>
                        <th className="px-6 py-4 font-bold text-slate-900">Email</th>
                        <th className="px-6 py-4 font-bold text-slate-900">Organisation</th>
                        <th className="px-6 py-4 font-bold text-slate-900">Rôle</th>
                        <th className="px-6 py-4 font-bold text-slate-900">Statut</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900">{user.fullName}</td>
                            <td className="px-6 py-4 text-slate-500">{user.email}</td>
                            <td className="px-6 py-4">
                                <span className="text-xs px-2 py-1 bg-slate-100 rounded-full font-medium text-slate-600">
                                    {user.organization?.name || 'Indépendant'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <Select 
                                    defaultValue={user.role} 
                                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                                    disabled={loadingId === user.id}
                                >
                                    <SelectTrigger className="w-40 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map(role => (
                                            <SelectItem key={role} value={role} className="text-xs">
                                                {role.replace('_', ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </td>
                            <td className="px-6 py-4">
                                <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    Actif
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
