import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserFromSession } from '@/lib/auth-bridge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, MapPin, Truck, ExternalLink, Navigation } from 'lucide-react';
import Link from 'next/link';

// Server Component fetching the real active fleet
export default async function SiteMapPage() {
    const supabase = createClient();
    const user = await getCurrentUserFromSession();

    if (!user) return <div>Non autorisé</div>;

    // Fetch active machines
    const { data: machines } = await supabase
        .from('machines')
        .select('id, make, model, serial_number, current_hours, site_id')
        .is('deleted_at', null);

    const activeMachines = machines || [];

    // Group machines by hypothetical sites (simulated clustering for UX, since sites table might not be fully populated)
    const mockSites = [
        { id: 's1', name: 'Chantier ALPHA - Nord', location: 'Lyon, FR', coords: [45.7640, 4.8357] },
        { id: 's2', name: 'Carrière BETA - Sud', location: 'Marseille, FR', coords: [43.2965, 5.3698] },
        { id: 's3', name: 'Dépôt Central', location: 'Paris, FR', coords: [48.8566, 2.3522] },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cartographie des Sites</h1>
                    <p className="text-slate-500 mt-1">Localisation GPS et distribution de la flotte en temps réel.</p>
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium text-sm border border-blue-100 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {activeMachines.length} Équipements Déployés
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[600px]">
                {/* Simulated Map Visualizer */}
                <div className="lg:col-span-2 bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden relative group">
                    {/* Placeholder for real Mapbox / Google Maps */}
                    <div className="absolute inset-0 pattern-grid-lg text-slate-200/50 bg-slate-50"></div>

                    {/* Mock Map Markers logic */}
                    {mockSites.map((site, index) => (
                        <div key={site.id}
                            className="absolute flex flex-col items-center group/marker cursor-pointer transition-transform hover:scale-110 z-10"
                            style={{
                                top: `${20 + (index * 30)}%`,
                                left: `${30 + (index * 20)}%`
                            }}>
                            <div className="bg-white px-3 py-1 rounded-full shadow-lg text-xs font-bold text-slate-800 mb-1 opacity-0 translate-y-2 group-hover/marker:opacity-100 group-hover/marker:translate-y-0 transition-all pointer-events-none">
                                {site.name}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40"></div>
                                <MapPin className="h-8 w-8 text-blue-600 relative z-10 drop-shadow-md fill-blue-50" />
                            </div>
                        </div>
                    ))}

                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 max-w-sm">
                        <h4 className="font-bold flex items-center gap-2 mb-2"><Navigation className="h-4 w-4 text-blue-600" /> Télémétrie Active</h4>
                        <p className="text-sm text-slate-600">Vue satellitaire désactivée. Intégration SIG personnalisée requise pour le rendu topographique précis.</p>
                    </div>
                </div>

                {/* Directory Sidebar */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Répertoire des machines</h3>

                    {activeMachines.map(machine => (
                        <Link key={machine.id} href={`/dashboard/machines/${machine.id}`}>
                            <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base flex justify-between items-start">
                                        <span className="font-bold">{machine.make} {machine.model}</span>
                                        <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    </CardTitle>
                                    <CardDescription className="text-xs">SN: {machine.serial_number}</CardDescription>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center text-xs text-slate-500 gap-1 mt-1">
                                            <MapPin className="h-3 w-3" /> Assignation Automatique
                                        </div>
                                        <div className="text-xs font-mono font-medium bg-slate-100 px-2 py-1 rounded">
                                            {machine.current_hours} hrs
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {activeMachines.length === 0 && (
                        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                            Aucune machine n'est actuellement déployée sur le terrain.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
