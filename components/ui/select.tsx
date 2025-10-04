import React, { useState, useRef, useEffect } from 'react';

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

export const Select = ({ children, value, onValueChange, ...props }: any) => {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value || '');
  
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const contextValue = {
    value: internalValue,
    onValueChange: (val: string) => {
      setInternalValue(val);
      onValueChange?.(val);
      setOpen(false);
    },
    open,
    setOpen,
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="relative" {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
};

export const SelectTrigger = ({ children, className, ...props }: any) => {
  const { open, setOpen } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={`flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      {...props}
    >
      {children}
      <svg
        className="h-4 w-4 opacity-50"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
};

export const SelectValue = ({ placeholder }: any) => {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
};

export const SelectContent = ({ children, className }: any) => {
  const { open, setOpen } = React.useContext(SelectContext);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={dropdownRef}
      className={`absolute z-50 w-full mt-1 rounded-md shadow-lg border py-1 ${className || ''}`}
    >
      {children}
    </div>
  );
};

export const SelectItem = ({ children, value, onClick, className }: any) => {
  const { onValueChange } = React.useContext(SelectContext);
  
  return (
    <button
      type="button"
      className={`flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${className || ''}`}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
};
