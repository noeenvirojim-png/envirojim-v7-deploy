import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Lock, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export async function PhotosTab({ machineId }: { machineId: string }) {
    // machine_photos table does not yet exist in the current schema.
    // Tab is kept visible for feature continuity — shows empty state until the table is created.
    const photos: any[] = [];

    return (
        <div className="space-y-6">
            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Camera className="text-slate-500" size={20} />
                            Visual Asset Log
                        </CardTitle>
                        <CardDescription>Condition documentation and historical photos.</CardDescription>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1 bg-white">
                        <Lock size={12} />
                        READ-ONLY ACCESS
                    </Badge>
                </CardHeader>
                <CardContent className="pt-6">
                    {photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.map((photo: any) => (
                                <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                    <img
                                        src={photo.file_url}
                                        alt="Machine Condition"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-[10px] text-white font-bold opacity-80 uppercase tracking-tighter">
                                            Recorded: {new Date(photo.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center border-2 border-dashed rounded-xl border-slate-100 bg-slate-50/30">
                            <Camera size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="font-bold text-slate-400">No photos available for this asset.</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto italic">
                                Visual state is recorded during machine registration and internal inspection.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex items-center gap-2 p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 text-blue-700">
                <Info size={16} className="shrink-0" />
                <p className="text-xs font-medium">
                    This gallery is strictly read-only for security and integrity. External users cannot modify or add visual records.
                </p>
            </div>
        </div>
    );
}
