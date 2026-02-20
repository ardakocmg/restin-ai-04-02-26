/**
 * CourseSelector — Course picker pills for Pro POS Layout
 * 
 * Displays C1 C2 C3 C4+ pills. Tapping sets the active course for an item.
 * Used by POSLayoutPro to assign courses to order items.
 * 
 * Props:
 *   value: number (current course, 1-based)
 *   onChange: (course: number) => void
 *   maxCourses: number (default 4)
 */

const COURSE_COLORS = {
    1: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', activeBg: 'bg-blue-500', activeText: 'text-foreground' },
    2: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', activeBg: 'bg-emerald-500', activeText: 'text-foreground' },
    3: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', activeBg: 'bg-orange-500', activeText: 'text-foreground' },
    4: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', activeBg: 'bg-purple-500', activeText: 'text-foreground' },
};

export default function CourseSelector({ value = 1, onChange, maxCourses = 4 }) {
    const courses = Array.from({ length: maxCourses }, (_, i) => i + 1);

    return (
        <div className="flex gap-1">
            {courses.map((course) => {
                const isActive = value === course;
                const colors = COURSE_COLORS[course] || COURSE_COLORS[4];
                const label = course >= 4 ? `C${course}+` : `C${course}`;

                return (
                    <button
                        key={course}
                        onClick={() => onChange(course)}
                        className={`
              min-w-9 h-7 rounded-full text-xs font-bold px-2
              transition-all duration-150 border
              ${isActive
                                ? `${colors.activeBg} ${colors.activeText} border-transparent shadow-lg shadow-${colors.activeBg}/30`
                                : `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                            }
            `}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

// Export the color map for use in order grouping
export { COURSE_COLORS };
