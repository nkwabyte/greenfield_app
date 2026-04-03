'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ─── Editable Number Cell ─────────────────────────────────────────────────────
interface EditableNumberCellProps {
    value: number;
    onSave: (newValue: number) => void;
    className?: string;
    min?: number;
    step?: number;
    prefix?: string;
    formatDisplay?: (value: number) => string;
    disabled?: boolean;
}

export function EditableNumberCell({
    value,
    onSave,
    className,
    min = 0,
    step = 1,
    prefix = '',
    formatDisplay,
    disabled = false,
}: EditableNumberCellProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(value.toString());
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        const parsed = parseFloat(editValue);
        if (!isNaN(parsed) && parsed !== value) {
            onSave(parsed);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(value.toString());
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                min={min}
                step={step}
                className={cn('h-8 w-24 text-sm', className)}
            />
        );
    }

    const displayValue = formatDisplay
        ? formatDisplay(value)
        : `${prefix}${value.toLocaleString()}`;

    return (
        <button
            type="button"
            onClick={() => {
                if (disabled) return;
                setEditValue(value.toString());
                setIsEditing(true);
            }}
            disabled={disabled}
            className={cn(
                'rounded px-2 py-1 text-sm border border-transparent min-w-15 text-left',
                disabled
                    ? 'cursor-default text-muted-foreground'
                    : 'cursor-pointer hover:bg-muted/50 transition-colors hover:border-border',
                className
            )}
            title={disabled ? 'Locked: payment has been recorded' : 'Click to edit'}
        >
            {displayValue}
        </button>
    );
}

// ─── Editable Text Cell ───────────────────────────────────────────────────────
interface EditableTextCellProps {
    value: string;
    onSave: (newValue: string) => void;
    className?: string;
    placeholder?: string;
}

export function EditableTextCell({
    value,
    onSave,
    className,
    placeholder = 'Enter value...',
}: EditableTextCellProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editValue.trim() !== value.trim()) {
            onSave(editValue.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={cn('h-8 text-sm', className)}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={() => {
                setEditValue(value);
                setIsEditing(true);
            }}
            className={cn(
                'cursor-pointer rounded px-2 py-1 text-sm hover:bg-muted/50 transition-colors border border-transparent hover:border-border min-w-15 text-left',
                className
            )}
            title="Click to edit"
        >
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
        </button>
    );
}

// ─── Editable Select Cell ─────────────────────────────────────────────────────
interface EditableSelectCellProps {
    value: string;
    options: { label: string; value: string }[];
    onSave: (newValue: string) => void;
    className?: string;
    placeholder?: string;
}

export function EditableSelectCell({
    value,
    options,
    onSave,
    className,
    placeholder = 'Select...',
}: EditableSelectCellProps) {
    const handleChange = (newValue: string) => {
        if (newValue !== value) {
            onSave(newValue);
        }
    };

    return (
        <Select value={value} onValueChange={handleChange}>
            <SelectTrigger className={cn('h-8 text-sm w-auto min-w-25', className)}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
