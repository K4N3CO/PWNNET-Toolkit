import React from 'react';
import { X } from 'lucide-react';

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear: () => void;
}

export const ClearableInput = React.forwardRef<HTMLInputElement, ClearableInputProps>(
  ({ onClear, className, ...props }, ref) => {
    return (
      <div className={`relative flex-1 ${className || ''}`}>
        <input 
          ref={ref}
          className="w-full h-full bg-transparent border-none outline-none pr-10 pl-4 py-3 sm:py-4 font-mono text-sm text-neon-green placeholder:text-neon-green/30"
          {...props} 
        />
        {props.value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neon-green/50 hover:text-red-400 transition-colors"
            title="Clear input"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);
