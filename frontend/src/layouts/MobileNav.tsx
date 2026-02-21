import { cn } from '@/lib/utils';
import { BarChart3,LayoutDashboard,Settings,ShoppingCart,Users } from 'lucide-react';
import { Link,useLocation } from 'react-router-dom';

const mobileMenuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/manager/dashboard'
  },
  {
    title: 'Operations',
    icon: ShoppingCart,
    href: '/manager/operations'
  },
  {
    title: 'People',
    icon: Users,
    href: '/manager/staff'
  },
  {
    title: 'Reports',
    icon: BarChart3,
    href: '/manager/reports'
  },
  {
    title: 'Settings',
    icon: Settings,
    href: '/manager/settings'
  }
];

export default function MobileNav() {
  const location = useLocation();

  const isActive = (href) => location.pathname === href;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-area-inset-bottom">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {mobileMenuItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all',
              isActive(item.href)
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 active:bg-gray-100'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
