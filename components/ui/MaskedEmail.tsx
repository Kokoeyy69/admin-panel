'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MaskedEmailProps {
  email: string;
  className?: string;
}

export function MaskedEmail({ email, className = '' }: MaskedEmailProps) {
  const [revealed, setRevealed] = useState(false);

  // Format: user@example.com -> u***@example.com
  const maskEmail = (e: string) => {
    if (revealed) return e;
    
    const parts = e.split('@');
    if (parts.length !== 2) return e;
    
    const [local, domain] = parts;
    if (local.length === 0) return e;
    
    // Mask all but first and last character of local part
    const first = local[0];
    const last = local.length > 1 ? local[local.length - 1] : '';
    const middle = local.length > 2 ? '*'.repeat(local.length - 2) : '';
    
    return `${first}${middle}${last}@${domain}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm">{maskEmail(email)}</span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="text-slate-400 hover:text-slate-600 focus:outline-none"
        title={revealed ? 'Hide email' : 'Reveal email'}
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}