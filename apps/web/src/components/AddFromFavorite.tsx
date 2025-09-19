"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import Image from "next/image";
import { ExternalLink, History, PlusCircle, Star, Clock, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function AddFromFavorite({ children }: { children: React.ReactNode; }) {
    const favorites = useQuery(api.favoritedLanguageActivityFunctions.listFavorites, {});
    const [cursor, setCursor] = React.useState<number | undefined>(undefined);
    const recentManuals = useQuery(api.favoritedLanguageActivityFunctions.listManualActivitiesWithFavoriteMatch, { limit: 12, cursorOccurredAt: cursor });
    const quickCreate = useMutation(api.favoritedLanguageActivityFunctions.quickCreateFromFavorite);
    const setFavorite = useMutation(api.favoritedLanguageActivityFunctions.addFavoriteFromActivity);
    const updateFavorite = useMutation(api.favoritedLanguageActivityFunctions.updateFavorite);
    const deleteFavorite = useMutation(api.favoritedLanguageActivityFunctions.deleteFavorite);

    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [historyCursorStack, setHistoryCursorStack] = React.useState<Array<number | undefined>>([]);

    return (
        <Popover>
            <PopoverTrigger asChild>{children}</PopoverTrigger>
            <PopoverContent side="bottom" sideOffset={10} align="start" className="w-[min(92vw,48rem)] p-4 ">
                <div className="max-w-3xl">
                    <div className="">
                        <div className="pb-4 flex items-start justify-between gap-2">
                            <div>
                                <div className="flex items-center mb-1 text-lg font-semibold text-background"><Star className="mr-2 !size-6 fill-yellow-300 stroke-border" /> Add From Favorite</div>
                            </div>
                            <Button variant="neutral" size="sm" onClick={() => { setCursor(undefined); setHistoryCursorStack([]); setHistoryOpen(true); }}>
                                <History className="mr-1" /> Manual Records
                            </Button>
                        </div>

                        <div>
                            <ScrollArea className="max-h-[60vh] h-full">
                                <div>
                                    {!favorites && (
                                        <div className="flex items-center justify-center h-[300px]">
                                            <div className="text-center">
                                                <Image src="/cat-on-tree.png" alt="loading" className="mx-auto opacity-80" width={140} height={140} />
                                                <div className="mt-2 text-sm text-background/80">Fetching your favorites…</div>
                                            </div>
                                        </div>
                                    )}
                                    {favorites && favorites.length === 0 && (
                                        <div className="flex items-center justify-center h-[300px]">
                                            <div className="text-center">
                                                <Image src="/cat-on-tree.png" alt="empty" className="mx-auto opacity-80" width={140} height={140} />
                                                <div className="mt-2 text-sm text-background/80">No favorites yet. Use previous manual records to add favorites.</div>
                                            </div>
                                        </div>
                                    )}
                                    {favorites && favorites.length > 0 && (
                                        <ul className="space-y-2">
                                            {favorites.map((f: any) => (
                                                <FavoriteRow key={(f as any)._id} favorite={f} onQuickAdd={() => quickCreate({ favoriteId: (f as any)._id })} onUpdate={updateFavorite} onDelete={deleteFavorite} />
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </ScrollArea>
                            {/* History button moved to header */}
                        </div>
                    </div>

                    {/* Previous Manual Records Dialog */}
                    <Dialog
                        open={historyOpen}
                        onOpenChange={(o) => {
                            setHistoryOpen(o);
                            if (o) {
                                setCursor(undefined);
                                setHistoryCursorStack([]);
                            }
                        }}
                    >
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Previous Manual Records</DialogTitle>
                                <DialogDescription>Review and reuse your recent manual activity records.</DialogDescription>
                            </DialogHeader>
                            <div className="p-0">
                                <ScrollArea className="h-[420px]">
                                    <div className="p-4">
                                        {!recentManuals && (
                                            <div className="flex items-center justify-center h-[300px]">
                                                <div className="text-center">
                                                    <Image src="/cat-on-tree.png" alt="loading" className="mx-auto opacity-80" width={140} height={140} />
                                                    <div className="mt-2 text-sm text-muted-foreground">Loading your recent manual records…</div>
                                                </div>
                                            </div>
                                        )}
                                        {recentManuals && (recentManuals as any).page?.length === 0 && (
                                            <div className="flex items-center justify-center h-[300px]">
                                                <div className="text-center">
                                                    <Image src="/cat-on-tree.png" alt="empty" className="mx-auto opacity-80" width={140} height={140} />
                                                    <div className="mt-2 text-sm text-muted-foreground">No manual records yet. Start by tracking your first activity!</div>
                                                </div>
                                            </div>
                                        )}
                                        {recentManuals && (recentManuals as any).page?.length > 0 && (
                                            <ul className="space-y-2">
                                                {(recentManuals as any).page.map((r: any) => (
                                                    <li key={(r as any)._id} className="flex items-center justify-between gap-3 p-2 rounded-base border-2 border-border bg-secondary-background">
                                                        <div className="min-w-0 flex-1">
                                                            {r.externalUrl ? (
                                                                <span className="inline-flex items-center gap-1 max-w-full">
                                                                    <a href={r.externalUrl} target="_blank" rel="noreferrer" className="font-bold truncate underline decoration-main hover:text-main-foreground/80">{(r as any).title ?? "(untitled)"}</a>
                                                                    <a href={r.externalUrl} target="_blank" rel="noreferrer" aria-label="Open link" className="text-main-foreground/80 hover:text-main-foreground flex-shrink-0"><ExternalLink className="!size-4" /></a>
                                                                </span>
                                                            ) : (
                                                                <div className="font-bold truncate">{(r as any).title ?? "(untitled)"}</div>
                                                            )}
                                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                                <span>{Math.max(0, Math.round((((r as any).durationInMs ?? 0) / 60000)))}m</span>
                                                                {r.occurredAt && <span>• {new Date(r.occurredAt).toLocaleString()}</span>}
                                                                {r.description && <span className="truncate max-w-[240px]">• {r.description}</span>}
                                                            </div>
                                                        </div>
                                                        <Button variant="neutral" size="sm" onClick={() => setFavorite({ activityId: (r as any)._id, isFavorite: true })}>Add Favorite</Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {(recentManuals && ((recentManuals as any).continueCursor || (historyCursorStack.length > 0))) && (
                                            <div className="flex items-center justify-between mt-3">
                                                <Button variant="neutral" onClick={() => {
                                                    setHistoryCursorStack((stack) => {
                                                        if (stack.length === 0) return stack;
                                                        const next = [...stack];
                                                        const prev = next.pop();
                                                        setCursor(prev);
                                                        return next;
                                                    });
                                                }} disabled={historyCursorStack.length === 0}>Back</Button>
                                                <Button variant="neutral" onClick={() => {
                                                    setHistoryCursorStack((stack) => [...stack, cursor]);
                                                    setCursor((recentManuals as any).continueCursor);
                                                }} disabled={Boolean(recentManuals) && Boolean((recentManuals as any).isDone)}>Load more</Button>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function FavoriteRow({ favorite, onQuickAdd, onUpdate, onDelete }: { favorite: any; onQuickAdd: () => void; onUpdate: any; onDelete: any; }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);
    const [title, setTitle] = React.useState((favorite as any).title ?? "");
    const [minutes, setMinutes] = React.useState<number>(Math.max(0, Math.round(((favorite as any).defaultDurationInMinutes ?? 10))));
    const [desc, setDesc] = React.useState<string>((favorite as any).description ?? "");
    const [url, setUrl] = React.useState<string>((favorite as any).externalUrl ?? "");

    return (
        <li className="p-2 rounded-base border-2 border-border bg-secondary-background">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                    {(favorite as any).externalUrl ? (
                        <span className="inline-flex items-center gap-1 max-w-full min-w-0">
                            <a href={(favorite as any).externalUrl} target="_blank" rel="noreferrer" className="block font-bold truncate underline decoration-main text-background hover:text-background/80 max-w-[58vw] sm:max-w-[420px]">{title || "(untitled)"}</a>
                            <a href={(favorite as any).externalUrl} target="_blank" rel="noreferrer" aria-label="Open link" className="hidden sm:inline-flex text-background/80 hover:text-background flex-shrink-0"><ExternalLink className="!size-4" /></a>
                        </span>
                    ) : (
                        <div className="block font-bold truncate text-background max-w-[58vw] sm:max-w-[420px]">{title || "(untitled)"}</div>
                    )}
                    <div className="text-xs text-background/80 flex items-center gap-2">
                        <Clock className="!size-3" /> Default {minutes}m
                    </div>
                    {(favorite as any).description && (<div className="hidden sm:block text-xs text-background/70 truncate max-w-[420px]">{(favorite as any).description}</div>)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button onClick={() => setConfirmOpen(true)} size="sm" className="bg-accent bold flex items-center h-8 px-2 sm:h-9 sm:px-3 whitespace-nowrap">Track <PlusCircle className=" !size-5 !stroke-2.5" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="neutral" size="icon" className="h-8 w-8 sm:h-9 sm:w-9"><MoreHorizontal /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsOpen(true)}>Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete({ favoriteId: (favorite as any)._id })}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Edit favorite */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit Favorite</DialogTitle></DialogHeader>
                    <div className="grid gap-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                    <div className="grid gap-2 mt-2"><Label>Default minutes</Label><Input type="number" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))} /></div>
                    <div className="grid gap-2 mt-2"><Label>URL (optional)</Label><Input placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
                    <div className="grid gap-2 mt-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
                    <DialogFooter>
                        <Button variant="neutral" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button onClick={async () => { await onUpdate({ favoriteId: (favorite as any)._id, title, description: desc, defaultDurationInMinutes: minutes }); setIsOpen(false); }}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm add from favorite */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add this record?</DialogTitle></DialogHeader>
                    <DialogFooter>
                        <Button variant="neutral" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={() => { setConfirmOpen(false); onQuickAdd(); }}>Add Record</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </li>
    );
}


