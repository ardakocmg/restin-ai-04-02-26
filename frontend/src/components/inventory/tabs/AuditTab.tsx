import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AuditTab({ entries = [] }: { entries?: any[] }) {
  return (
    <div className="space-y-3">
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No audit entries
          </CardContent>
        </Card>
      ) : (
        entries.map((entry, idx) => (
          <Card key={idx}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-2">{entry.action}</Badge>
                  <p className="text-sm text-slate-700">
                    User: {entry.user_id?.substring(0, 8)}
                  </p>
                  {entry.payload && Object.keys(entry.payload).length > 0 && (
                    <pre className="text-xs text-muted-foreground mt-2 bg-background p-2 rounded">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(entry.ts).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
