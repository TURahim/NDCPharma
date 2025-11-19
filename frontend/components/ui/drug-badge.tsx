/**
 * Drug Badge Component
 * Displays status badges for drug search results
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { DrugBadge } from '@/lib/search-client';
import { getBadgeColorClass } from '@/lib/search-client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DrugBadgeProps {
  badge: DrugBadge;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Get tooltip content for badge type
 */
function getBadgeTooltip(type: DrugBadge['type']): string {
  switch (type) {
    case 'ACTIVE':
      return 'This medication has active NDC packages available';
    case 'COMMON':
      return 'Commonly prescribed medication (high usage score)';
    case 'PEDIATRIC':
      return 'Suitable for pediatric use (liquid form or low dose)';
    case 'GENERIC':
      return 'Generic medication (not a brand name)';
    case 'BRAND':
      return 'Brand name medication';
    default:
      return '';
  }
}

export function DrugBadgeComponent({
  badge,
  className,
  showTooltip = true,
}: DrugBadgeProps) {
  const badgeContent = (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        getBadgeColorClass(badge.variant),
        className
      )}
    >
      {badge.label}
    </span>
  );

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{getBadgeTooltip(badge.type)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

interface DrugBadgesProps {
  badges: DrugBadge[];
  className?: string;
  maxVisible?: number;
  showTooltips?: boolean;
}

/**
 * Display multiple drug badges
 */
export function DrugBadges({
  badges,
  className,
  maxVisible = 5,
  showTooltips = true,
}: DrugBadgesProps) {
  const visibleBadges = badges.slice(0, maxVisible);
  const hiddenCount = badges.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visibleBadges.map((badge, index) => (
        <DrugBadgeComponent
          key={`${badge.type}-${index}`}
          badge={badge}
          showTooltip={showTooltips}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+{hiddenCount} more</span>
      )}
    </div>
  );
}


