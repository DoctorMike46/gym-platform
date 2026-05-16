"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
    className?: string;
    siblingCount?: number;
};

export function Pagination({
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50, 100],
    className,
    siblingCount = 1,
}: Props) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pages = computePages(page, totalPages, siblingCount);
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    if (totalPages <= 1 && !onPageSizeChange) return null;

    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-slate-500",
                className,
            )}
        >
            <div className="flex items-center gap-3">
                <span>
                    {from}–{to} di {total}
                </span>
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                            Righe per pagina
                        </span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(v) => onPageSizeChange(Number(v))}
                        >
                            <SelectTrigger className="h-8 w-[72px] border-slate-200 shadow-none text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizeOptions.map((opt) => (
                                    <SelectItem
                                        key={opt}
                                        value={String(opt)}
                                        className="text-xs"
                                    >
                                        {opt}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <nav className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Pagina precedente"
                >
                    <ChevronLeft />
                </Button>
                {pages.map((p, i) =>
                    p === "…" ? (
                        <span
                            key={`gap-${i}`}
                            className="px-2 text-slate-400 flex items-center"
                            aria-hidden
                        >
                            <MoreHorizontal size={14} />
                        </span>
                    ) : (
                        <Button
                            key={p}
                            variant={p === page ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "min-w-8 px-2",
                                p === page && "brand-bg text-white hover:brand-bg",
                            )}
                            onClick={() => onPageChange(p)}
                            aria-current={p === page ? "page" : undefined}
                        >
                            {p}
                        </Button>
                    ),
                )}
                <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Pagina successiva"
                >
                    <ChevronRight />
                </Button>
            </nav>
        </div>
    );
}

function computePages(
    page: number,
    totalPages: number,
    siblingCount: number,
): (number | "…")[] {
    const total = siblingCount * 2 + 5;
    if (totalPages <= total) {
        return range(1, totalPages);
    }
    const leftSibling = Math.max(page - siblingCount, 1);
    const rightSibling = Math.min(page + siblingCount, totalPages);
    const showLeftDots = leftSibling > 2;
    const showRightDots = rightSibling < totalPages - 1;

    if (!showLeftDots && showRightDots) {
        const left = range(1, 3 + siblingCount * 2);
        return [...left, "…", totalPages];
    }
    if (showLeftDots && !showRightDots) {
        const right = range(totalPages - (3 + siblingCount * 2) + 1, totalPages);
        return [1, "…", ...right];
    }
    return [1, "…", ...range(leftSibling, rightSibling), "…", totalPages];
}

function range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
