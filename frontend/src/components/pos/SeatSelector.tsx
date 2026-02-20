/**
 * SeatSelector — Seat picker for Pro POS Layout
 * 
 * Renders seat number buttons based on table's seat count.
 * Used by POSLayoutPro to assign seats to order items.
 * 
 * Props:
 *   value: number (current seat, 1-based)
 *   onChange: (seat: number) => void
 *   maxSeats: number (from table.seats)
 */

export default function SeatSelector({ value = 1, onChange, maxSeats = 4 }) {
    const seats = Array.from({ length: maxSeats }, (_, i) => i + 1);

    return (
        <div className="flex gap-1 flex-wrap">
            {seats.map((seat) => {
                const isActive = value === seat;

                return (
                    <button
                        key={seat}
                        onClick={() => onChange(seat)}
                        className={`
              min-w-8 h-7 rounded-md text-xs font-bold px-1.5
              transition-all duration-150 border
              ${isActive
                                ? 'bg-foreground text-background border-transparent shadow-md'
                                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                            }
            `}
                    >
                        S{seat}
                    </button>
                );
            })}
        </div>
    );
}
