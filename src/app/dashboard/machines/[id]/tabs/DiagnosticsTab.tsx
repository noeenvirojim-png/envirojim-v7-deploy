import React from 'react';
import { DiagnosticCopilot } from './DiagnosticCopilot.client';
import { CanonicalDiagnosticWrapper } from './CanonicalDiagnosticWrapper.client';

export async function DiagnosticsTab({ machineId }: { machineId: string }) {
    return (
        <div className="animate-fade-in space-y-8">
            <CanonicalDiagnosticWrapper machineId={machineId} />
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                <DiagnosticCopilot machineId={machineId} />
            </div>
        </div>
    );
}
