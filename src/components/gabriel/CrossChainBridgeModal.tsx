import React, { useState } from 'react';
import { X, ArrowRight, Share2, AlertCircle } from 'lucide-react';

interface BridgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    token: string;
}

export default function CrossChainBridgeModal({ isOpen, onClose, currentBalance, token }: BridgeModalProps) {
    const [destinationChain, setDestinationChain] = useState<'Arbitrum' | 'Polygon' | 'Base'>('Arbitrum');
    const [amount, setAmount] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [status, setStatus] = useState<'idle' | 'estimating' | 'bridging' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [txHash, setTxHash] = useState('');

    if (!isOpen) return null;

    const handleBridge = async () => {
        const bridgeAmount = parseFloat(amount);
        if (isNaN(bridgeAmount) || bridgeAmount <= 0) {
            setErrorMessage("Please enter a valid amount.");
            setStatus('error');
            return;
        }
        if (bridgeAmount > currentBalance) {
            setErrorMessage("Insufficient WGOLD balance.");
            setStatus('error');
            return;
        }
        if (!address.startsWith('0x') || address.length !== 42) {
            setErrorMessage("Please enter a valid EVM address (0x...).");
            setStatus('error');
            return;
        }

        setStatus('bridging');
        setErrorMessage('');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002'}/api/v1/finance/wisegold/bridge/ccip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    destination_chain: destinationChain,
                    destination_address: address,
                    amount: bridgeAmount
                })
            });

            const data = await res.json();

            if (res.ok && data.status === 'success') {
                setTxHash(data.message_id);
                setStatus('success');
            } else {
                throw new Error(data.detail || "Bridge request failed");
            }

        } catch (err: any) {
            console.error("Bridging error:", err);
            setErrorMessage(err.message || "An unexpected error occurred.");
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-400" />
                        Bridge WGOLD (CCIP)
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Status Modals */}
                    {status === 'success' ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <ArrowRight className="w-8 h-8" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Bridge Initiated</h4>
                            <p className="text-sm text-slate-300 mb-4">
                                Your WGOLD is being transferred to <strong>{destinationChain}</strong> via Chainlink CCIP.
                            </p>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 break-all mb-6">
                                Message ID: {txHash}
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Input Form */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Destination Network</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500"
                                    value={destinationChain}
                                    onChange={(e) => setDestinationChain(e.target.value as any)}
                                    disabled={status === 'bridging'}
                                >
                                    <option value="Arbitrum">Arbitrum (EVM)</option>
                                    <option value="Polygon">Polygon (EVM)</option>
                                    <option value="Base">Base (EVM)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Receiver Address</label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500 font-mono text-sm"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    disabled={status === 'bridging'}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-medium text-slate-400">Amount (WGOLD)</label>
                                    <span className="text-xs text-slate-500">Max: {currentBalance.toFixed(2)}</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5 pr-16 outline-none focus:border-indigo-500 font-mono"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        disabled={status === 'bridging'}
                                    />
                                    <button
                                        className="absolute right-2 top-1.5 bottom-1.5 px-2 bg-slate-800 text-xs text-slate-300 rounded hover:bg-slate-700"
                                        onClick={() => setAmount(currentBalance.toString())}
                                        disabled={status === 'bridging'}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {status === 'error' && (
                                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            {/* CCIP Info Box */}
                            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-indigo-300">Powered by</span>
                                    <span className="font-bold text-indigo-400">Chainlink CCIP</span>
                                </div>
                                <div className="flex justify-between text-xs mt-2 text-slate-400 border-t border-indigo-500/20 pt-2">
                                    <span>Est. CCIP Fee:</span>
                                    <span>~0.005 LINK</span>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleBridge}
                                disabled={status === 'bridging' || !amount || !address}
                                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${status === 'bridging' || !amount || !address
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    }`}
                            >
                                {status === 'bridging' ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                                        Initiating Transfer...
                                    </>
                                ) : (
                                    <>
                                        Review Transfer
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
