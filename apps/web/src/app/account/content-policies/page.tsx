'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';
import { Card } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '../../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../components/ui/command';
import { ChevronsUpDown, Check as CheckIcon, Ban, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Image from 'next/image';

type ContentSource = 'website' | 'youtube' | 'spotify' | 'anki' | 'manual';
type PolicyItem = {
    _id: Id<'userContentLabelPolicies'>;
    _creationTime: number;
    policyKind: 'allow' | 'block';
    contentKey: string;
    contentSource: ContentSource;
    contentUrl?: string;
    label?: string;
    note?: string;
};

export default function ContentPoliciesPage() {
    return (
        <div className="pt-4">
            <div className="mx-auto max-w-3xl">
                <Card className="p-6">
                    <div className="flex items-center gap-6 pb-4">
                        <Ban className="size-12 mt-1" />
                        <div>
                            <h1 className="font-display text-3xl font-black text-main-foreground">
                                Content policies
                            </h1>
                            <p className="text-sm text-main-foreground/70 mt-1">Configured automatic tracking behavior for specific contentKeys.Manage &apos;allow&apos; (auto-start) and &apos;block&apos; (never track) policies.</p>
                        </div>
                    </div>
                    <PoliciesManager />
                </Card>
            </div>
        </div>
    );
}

function PoliciesManager() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [source, setSource] = useState<ContentSource | undefined>(undefined);
    const [policyKind, setPolicyKind] = useState<'allow' | 'block' | undefined>(undefined);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [items, setItems] = useState<Array<PolicyItem>>([]);
    const [autoLoading, setAutoLoading] = useState(false);
    const [lastAutoCursor, setLastAutoCursor] = useState<string | undefined>(undefined);
    const [refreshFlip, setRefreshFlip] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Debounce search to avoid spamming backend
    // Update the actual query param 300ms after the user stops typing
    React.useEffect(() => {
        const handle = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(handle);
    }, [searchInput]);

    const data = useQuery(api.contentLabelPolicyFunctions.listUserContentLabelPolicies, {
        search: search || undefined,
        source: source || undefined,
        policyKind: policyKind || undefined,
        // Toggle sort to force refetch without changing result ordering
        sort: refreshFlip ? 'newest' : undefined,
        cursor: cursor ?? undefined,
        limit: 6,
    });
    const del = useMutation(api.contentLabelPolicyFunctions.deleteUserContentLabelPolicy);

    // Reset pagination and accumulated items when filters change
    React.useEffect(() => {
        setCursor(undefined);
        setItems([]);
    }, [search, source, policyKind]);

    // Replace items when new data arrives (no accumulation across pages)
    React.useEffect(() => {
        if (!data) return;
        setItems(data.items);
        if (autoLoading) {
            if (data.items.length > 0) {
                setAutoLoading(false);
            } else if (data.continueCursor && data.continueCursor !== cursor && data.continueCursor !== lastAutoCursor) {
                setLastAutoCursor(data.continueCursor);
                setCursor(data.continueCursor);
            } else {
                setAutoLoading(false);
            }
        }
        if (isRefreshing) {
            setIsRefreshing(false);
        }
    }, [data, autoLoading, isRefreshing, cursor, lastAutoCursor]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2 p-4 bg-secondary-background shadow-shadow rounded-base border-2 border-border my-4 items-end">
                <div className="flex-1 min-w-48 ">
                    <Label className="font-heading text-sm">Search</Label>
                    <Input
                        placeholder="Search by key, label, or URL"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                </div>
                <div className="min-w-48">
                    <Label className="font-heading text-sm">Source</Label>
                    <SourceCombobox value={source} onChange={(v) => setSource(v)} />
                </div>
                <div className="min-w-48">
                    <Label className="font-heading text-sm">Policy</Label>
                    <PolicyCombobox value={policyKind} onChange={(v) => setPolicyKind(v)} />
                </div>
            </div>

            {(!data || isRefreshing) && (
                <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                        <Image
                            src="/cat-on-tree.png"
                            alt="loading"
                            className="mx-auto opacity-80"
                            width={140}
                            height={140}
                        />
                        <div className="mt-2 text-sm text-muted-foreground">
                            Fetching your policies…
                        </div>
                    </div>
                </div>
            )}

            {data && items.length === 0 && (
                <div className="flex items-center justify-center h-[300px]">
                    <div className="text-center">
                        <Image
                            src="/cat-on-tree.png"
                            alt="empty"
                            className="mx-auto opacity-80"
                            width={140}
                            height={140}
                        />
                        <div className="mt-2 text-sm text-muted-foreground">
                            No policies yet.
                        </div>
                    </div>
                </div>
            )}

            {data && items.length > 0 && (
                <div className="space-y-2 divide-y divide-border/30">
                    {items.map(item => {
                        const key = item.contentKey;
                        const itemSource = item.contentSource;
                        const title = item.label || item.contentUrl || key;
                        const SOURCE_ICON: Partial<Record<ContentSource, string>> = {
                            youtube: '/brands/youtube.svg',
                            spotify: '/brands/spotify.svg',
                            anki: '/brands/anki.svg',
                            website: '/brands/browser-extension.svg',
                        };
                        return (
                            <div
                                key={item._id}
                                className="group flex items-center justify-between gap-3 p-3 transition-all "
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {SOURCE_ICON[itemSource] ? (
                                        <Image
                                            src={SOURCE_ICON[itemSource]!}
                                            alt={itemSource}
                                            width={24}
                                            height={24}
                                            className="inline-block"
                                        />
                                    ) : (
                                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--source-misc)]" />
                                    )}

                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold flex items-center gap-1 min-w-0">
                                            {item.contentUrl ? (
                                                <>
                                                    <a
                                                        href={item.contentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="underline decoration-main min-w-0"
                                                    >
                                                        <span className="truncate block min-w-0">{title}</span>
                                                    </a>
                                                    <a
                                                        href={item.contentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        aria-label="Open link"
                                                        className="text-main-foreground/80 hover:text-main-foreground flex-shrink-0"
                                                    >
                                                        <ExternalLink className="!size-4" />
                                                    </a>
                                                </>
                                            ) : (
                                                <span className="truncate block min-w-0 flex-1">{title}</span>
                                            )}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground flex gap-1">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-secondary-background">
                                                {itemSource}
                                            </span>
                                            {item.policyKind === 'allow' ? (
                                                <Badge variant="white" className=" gap-1">
                                                    <CheckIcon className="size-3" />
                                                    Allow
                                                </Badge>
                                            ) : (
                                                <Badge variant="dark" className="gap-1">
                                                    <Ban className="size-3" />
                                                    Block
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            size={'icon'}
                                            variant="neutral"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Delete this item?</DialogTitle>
                                            <DialogDescription>
                                                This action cannot be undone. The policy will be removed.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="neutral">Cancel</Button>
                                            </DialogClose>
                                            <Button
                                                variant="destructive"
                                                onClick={async () => {
                                                    await del({ id: item._id });
                                                    // Refresh query: reset pagination and clear current items
                                                    setItems([]);
                                                    setLastAutoCursor(undefined);
                                                    setAutoLoading(false);
                                                    setCursor(undefined);
                                                    setRefreshFlip(prev => !prev);
                                                    setIsRefreshing(true);
                                                }}
                                            >
                                                Confirm delete
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="flex items-center justify-between">
                <Button
                    variant="neutral"
                    disabled={!cursor}
                    onClick={() => setCursor(undefined)}
                >
                    Reset
                </Button>
                <Button
                    onClick={() => {
                        if (!data?.continueCursor) return;
                        setLastAutoCursor(undefined);
                        setAutoLoading(true);
                        if (data.continueCursor !== cursor) {
                            setLastAutoCursor(data.continueCursor);
                            setCursor(data.continueCursor);
                        } else {
                            // Prevent stuck loading if cursor wouldn't change
                            setAutoLoading(false);
                        }
                    }}
                    disabled={!data?.continueCursor || autoLoading}
                >
                    {autoLoading ? 'Loading…' : 'Load more'}
                </Button>
            </div>
        </div>
    );
}

function SourceCombobox({
    value,
    onChange,
}: {
    value: ContentSource | undefined;
    onChange: (v: ContentSource | undefined) => void;
}) {
    const [open, setOpen] = useState(false);

    const items: Array<{ value: '' | ContentSource; label: string; }> = [
        { value: '', label: 'All' },
        { value: 'website', label: 'Website' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'spotify', label: 'Spotify' },
        { value: 'anki', label: 'Anki' },
        { value: 'manual', label: 'Manual' },
    ];
    const current = items.find(i => i.value === (value ?? ''));

    const isContentSource = (val: string): val is ContentSource =>
        ['website', 'youtube', 'spotify', 'anki', 'manual'].includes(val as ContentSource);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="neutral"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full bg-white justify-between md:max-w-[220px]"
                >
                    {current?.label ?? 'All'}
                    <ChevronsUpDown />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) border-0 p-0">
                <Command className="**:data-[slot=command-input-wrapper]:h-11">
                    <CommandInput placeholder="Filter source..." />
                    <CommandList className="p-1">
                        <CommandEmpty>No source found.</CommandEmpty>
                        <CommandGroup>
                            {items.map(item => (
                                <CommandItem
                                    key={item.value}
                                    value={item.value}
                                    onSelect={currentValue => {
                                        const v = currentValue || '';
                                        if (v === '') {
                                            onChange(undefined);
                                        } else if (isContentSource(v)) {
                                            onChange(v);
                                        } else {
                                            onChange(undefined);
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    {item.label}
                                    <CheckIcon
                                        className={cn(
                                            'ml-auto',
                                            (value ?? '') === item.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function PolicyCombobox({
    value,
    onChange,
}: {
    value: 'allow' | 'block' | undefined;
    onChange: (v: 'allow' | 'block' | undefined) => void;
}) {
    const [open, setOpen] = useState(false);

    const items: Array<{ value: '' | 'allow' | 'block'; label: string; }> = [
        { value: '', label: 'All' },
        { value: 'allow', label: 'Allow (auto-start)' },
        { value: 'block', label: 'Block (never track)' },
    ];
    const current = items.find(i => i.value === (value ?? ''));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="neutral"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full bg-white justify-between md:max-w-[220px]"
                >
                    {current?.label ?? 'All'}
                    <ChevronsUpDown />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) border-0 p-0">
                <Command className="**:data-[slot=command-input-wrapper]:h-11">
                    <CommandInput placeholder="Filter policy..." />
                    <CommandList className="p-1">
                        <CommandEmpty>No policy found.</CommandEmpty>
                        <CommandGroup>
                            {items.map(item => (
                                <CommandItem
                                    key={item.value}
                                    value={item.value}
                                    onSelect={currentValue => {
                                        const v = currentValue || '';
                                        if (v === '') {
                                            onChange(undefined);
                                        } else if (v === 'allow' || v === 'block') {
                                            onChange(v);
                                        } else {
                                            onChange(undefined);
                                        }
                                        setOpen(false);
                                    }}
                                >
                                    {item.label}
                                    <CheckIcon
                                        className={cn(
                                            'ml-auto',
                                            (value ?? '') === item.value ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}


