'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MaskedPhoneProps {
  phoneNumber: string;
  className?: string;
}

export function MaskedPhone({ phoneNumber, className = '' }: MaskedPhoneProps) {
  const [revealed, setRevealed] = useState(false);

  // Format: +62-812-3456-7890 -> +62-812-****-****
  // Or: 081234567890 -> ***-***-****
  const maskPhone = (p: string) => {
    if (revealed) return p;
    
    // Remove all non-digit characters except leading +
    const cleaned = p.replace(/[^\d+]/g, '');
    
    // If it starts with +, keep it
    const hasPlus = cleaned.startsWith('+');
    const digits = cleaned.replace('+', '');
    
    if (digits.length <= 4) {
      return hasPlus ? '+' + digits : digits;
    }
    
    const prefix = hasPlus ? '+' : '';
    const lastFour = digits.slice(-4);
    
    // For Indonesian numbers (10-12 digits)
    if (digits.length >= 10) {
      return `${prefix}${'***'}-${'***'}-${lastFour}`;
    }
    
    // Generic mask for other lengths
    return `${prefix}${digits.slice(0, -4).replace(/\d/g, '*')}${lastFour}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-mono text-sm">{maskPhone(phoneNumber)}</span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="text-slate-400 hover:text-slate-600 focus:outline-none"
        title={revealed ? 'Hide phone number' : 'Reveal phone number'}
      >
        {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}