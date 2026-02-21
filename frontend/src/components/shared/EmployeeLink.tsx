/**
 * EmployeeLink — Reusable clickable employee name component
 * Renders employee name as a styled link that navigates to EmployeeDetailPage
 * 
 * Usage:
 *   <EmployeeLink code="EMP001" name="John Doe" />
 *   <EmployeeLink code={row.employee_code} name={`${row.first_name} ${row.last_name}`} subtitle="Waiter" />
 */
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeLink({ code, name, subtitle, showIcon = false, className = '' }) {
    const navigate = useNavigate();

    if (!code || !name) {
        return <span className="text-muted-foreground text-sm">{name || 'Unknown'}</span>;
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                navigate(`/manager/hr/people/${code}`);
            }}
            className={`group text-left inline-flex items-center gap-1.5 hover:underline decoration-blue-500/40 underline-offset-2 transition-colors ${className}`}
        >
            {showIcon && (
                <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors shrink-0">
                    <User className="h-3 w-3 text-blue-400" />
                </div>
            )}
            <div className="flex flex-col">
                <span className="text-sm font-bold text-secondary-foreground group-hover:text-blue-400 transition-colors">
                    {name}
                </span>
                {subtitle && (
                    <span className="text-[10px] text-muted-foreground">{subtitle}</span>
                )}
            </div>
        </button>
    );
}
