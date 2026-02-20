import { useState, useCallback } from 'react';
import { Upload, Download, FileText, Check, AlertCircle, X, Users } from 'lucide-react';
import {
    exportToGEDCOM, importFromGEDCOM, previewGEDCOM,
    type GEDCOMPreview,
} from '../../lib/joseph/genealogy';

export default function GedcomImportExport({ onImported }: { onImported?: () => void }) {
    const [dragOver, setDragOver] = useState(false);
    const [preview, setPreview] = useState<GEDCOMPreview | null>(null);
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFile = useCallback((file: File) => {
        setError(null);
        setResult(null);
        if (!file.name.endsWith('.ged') && !file.name.endsWith('.gedcom')) {
            setError('Please upload a .ged or .gedcom file');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            setFileContent(content);
            try {
                setPreview(previewGEDCOM(content));
            } catch {
                setError('Failed to parse GEDCOM file');
            }
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleImport = () => {
        if (!fileContent) return;
        try {
            const r = importFromGEDCOM(fileContent);
            setResult(r);
            setPreview(null);
            setFileContent(null);
            onImported?.();
        } catch {
            setError('Import failed');
        }
    };

    const handleExport = () => {
        try {
            const gedcom = exportToGEDCOM();
            const blob = new Blob([gedcom], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `everafter_family_${new Date().toISOString().slice(0, 10)}.ged`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Export failed');
        }
    };

    return (
        <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Download className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">Export GEDCOM</h3>
                            <p className="text-xs text-slate-500">Download your family tree in standard GEDCOM 5.5.1 format</p>
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-xl transition-all border border-emerald-500/20"
                    >
                        <Download className="w-3.5 h-3.5 inline mr-1.5" />
                        Export .ged
                    </button>
                </div>
            </div>

            {/* Import Section */}
            <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center">
                        <Upload className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-white">Import GEDCOM</h3>
                        <p className="text-xs text-slate-500">Import family data from any genealogy software (Ancestry, MyHeritage, GeneWeb, etc.)</p>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${dragOver
                            ? 'border-sky-400 bg-sky-500/10'
                            : 'border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5'
                        }`}
                >
                    <input
                        type="file"
                        accept=".ged,.gedcom"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileText className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 mb-1">Drag & drop a <span className="text-sky-400 font-medium">.ged</span> file here</p>
                    <p className="text-xs text-slate-600">or click to browse</p>
                </div>

                {/* Preview */}
                {preview && (
                    <div className="bg-slate-900/60 border border-sky-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-sky-300">
                                <Users className="w-4 h-4 inline mr-1.5" />
                                Preview
                            </h4>
                            <button onClick={() => { setPreview(null); setFileContent(null); }} className="text-slate-500 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="text-lg font-bold text-white">{preview.individuals.length}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Individuals</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="text-lg font-bold text-white">{preview.families}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Families</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="text-lg font-bold text-white">{preview.sources}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Sources</div>
                            </div>
                        </div>
                        {preview.individuals.length > 0 && (
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {preview.individuals.slice(0, 20).map((indi, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-400 py-1 px-2 rounded bg-white/5">
                                        <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${indi.gender === 'male' ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                            {indi.gender === 'male' ? 'M' : 'F'}
                                        </span>
                                        <span className="text-white">{indi.name || 'Unknown'}</span>
                                        {indi.birthDate && <span className="ml-auto text-slate-600">{indi.birthDate}</span>}
                                    </div>
                                ))}
                                {preview.individuals.length > 20 && (
                                    <p className="text-xs text-slate-600 text-center py-1">
                                        +{preview.individuals.length - 20} more...
                                    </p>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleImport}
                            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-sky-500/20"
                        >
                            Import {preview.individuals.length} Individuals
                        </button>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="text-sm text-emerald-300">
                            Imported <strong>{result.imported}</strong> individuals
                            {result.skipped > 0 && <span className="text-slate-500"> ({result.skipped} duplicates skipped)</span>}
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span className="text-sm text-red-300">{error}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
