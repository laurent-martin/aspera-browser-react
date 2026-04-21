import { Breadcrumb, BreadcrumbItem } from '@carbon/react';
import { Home } from '@carbon/icons-react';
import type { BreadcrumbItem as BreadcrumbItemType } from '../../types';

interface BreadcrumbNavProps {
  items: BreadcrumbItemType[];
  onNavigate: (path: string) => void;
}

export function BreadcrumbNav({ items, onNavigate }: BreadcrumbNavProps) {
  const isRoot = items.length === 0;
  
  return (
    <Breadcrumb noTrailingSlash>
      <BreadcrumbItem
        onClick={() => onNavigate('/')}
        isCurrentPage={isRoot}
      >
        <Home size={16} />
      </BreadcrumbItem>
      {items.map((item, index) => (
        <BreadcrumbItem
          key={item.path}
          onClick={() => onNavigate(item.path)}
          isCurrentPage={index === items.length - 1}
        >
          {item.dirname}
        </BreadcrumbItem>
      ))}
    </Breadcrumb>
  );
}
