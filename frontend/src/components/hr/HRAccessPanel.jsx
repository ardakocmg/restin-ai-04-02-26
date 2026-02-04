import { Card, CardContent } from '../ui/card';

export default function HRAccessPanel({ message = 'Access restricted for your role.' }) {
  return (
    <Card className="border border-indigo-500/20 bg-slate-950/60" data-testid="hr-access-panel">
      <CardContent className="p-6 text-sm text-indigo-100">
        {message}
      </CardContent>
    </Card>
  );
}
