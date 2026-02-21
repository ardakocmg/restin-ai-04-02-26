import { Apple,ChefHat,DollarSign,GitBranch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card,CardContent } from '../../../components/ui/card';
import PageContainer from '../../../layouts/PageContainer';

const MODULES = [
  { title: 'Recipe List', desc: 'Engineered recipes', icon: ChefHat, path: '/manager/recipe-engineering/list' },
  { title: 'Cost Analysis', desc: 'Profitability insights', icon: DollarSign, path: '/manager/recipe-engineering/cost' },
  { title: 'Nutrition Tracking', desc: 'Allergens & nutrition', icon: Apple, path: '/manager/recipe-engineering/nutrition' },
  { title: 'Version Control', desc: 'Recipe history', icon: GitBranch, path: '/manager/recipe-engineering/versions' }
];

export default function RecipeEngineeringHub() {
  const navigate = useNavigate();
  return (
    <PageContainer title="Recipe Engineering" description="Cost, nutrition & versioning">
      <Card><CardContent className="p-6"><div className="grid gap-4 md:grid-cols-2">{MODULES.map(m => { const Icon = m.icon; return (<button key={m.title} onClick={() => navigate(m.path)} className="flex items-start gap-4 p-4 rounded-lg border border-slate-700 hover:border-green-500 bg-slate-800"><Icon className="h-6 w-6 text-green-400" /><div><p className="font-semibold text-slate-50">{m.title}</p><p className="text-sm text-slate-400">{m.desc}</p></div></button>); })}</div></CardContent></Card>
    </PageContainer>
  );
}
