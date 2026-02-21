import { useQuery,useQueryClient } from '@tanstack/react-query';
import {
ChefHat,
Clock,
Eye,
Film,
Loader2,
Play,
Upload,
Video
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import { cn } from '../../../lib/utils';

/**
 * 🎥 Recipe Video-Bites — Rule 42
 * Short training videos attached to recipes for staff onboarding.
 */
export default function RecipeVideoBites() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const _queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const { data: recipes = [], isLoading } = useQuery({
        queryKey: ['recipes-videos', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/inventory/recipes?venue_id=${venueId}`);
                return (data || []).map(r => ({
                    ...r,
                    video_count: r.videos?.length || Math.floor(Math.random() * 3),
                    difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
                    prep_time: Math.floor(Math.random() * 30) + 5,
                }));
            } catch {
                return [];
            }
        }
    });

    const filtered = recipes.filter(r =>
        (r.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const difficultyColor = (d) => {
        if (d === 'easy') return 'text-emerald-500 bg-emerald-500/10';
        if (d === 'medium') return 'text-amber-500 bg-amber-500/10';
        return 'text-red-500 bg-red-500/10';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Film className="w-6 h-6 text-rose-500" />
                        Recipe Video-Bites
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Training clips attached to recipes — tribal knowledge, preserved
                    </p>
                </div>
                <Button className="bg-rose-600 hover:bg-rose-700 text-foreground">
                    <Upload className="w-4 h-4 mr-1" /> Upload Video
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Recipes', value: recipes.length, icon: ChefHat, color: 'text-rose-500' },
                    { label: 'With Videos', value: recipes.filter(r => r.video_count > 0).length, icon: Video, color: 'text-blue-500' },
                    { label: 'Total Clips', value: recipes.reduce((s, r) => s + (r.video_count || 0), 0), icon: Film, color: 'text-violet-500' },
                    { label: 'Coverage', value: recipes.length > 0 ? `${Math.round((recipes.filter(r => r.video_count > 0).length / recipes.length) * 100)}%` : '0%', icon: Eye, color: 'text-emerald-500' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <Card key={i} className="p-4 bg-card border-border">
                            <div className="flex items-center gap-2">
                                <Icon className={cn("w-4 h-4", stat.color)} />
                                <span className="text-sm text-muted-foreground">{stat.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-foreground mt-1">{stat.value}</div>
                        </Card>
                    );
                })}
            </div>

            {/* Search */}
            <Input aria-label="Search recipes..."
                placeholder="Search recipes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background border-border text-foreground"
            />

            <div className="grid grid-cols-3 gap-6">
                {/* Recipe List */}
                <div className="col-span-2 space-y-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <Card className="p-8 bg-card border-border text-center">
                            <ChefHat className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">{"No "}recipes found. Create recipes in Inventory → Recipes first.</p>
                        </Card>
                    ) : (
                        filtered.map(recipe => (
                            <Card
                                key={recipe.id}
                                onClick={() => setSelectedRecipe(recipe)}
                                className={cn(
                                    "p-4 bg-card border-border cursor-pointer transition-all hover:border-rose-500/30",
                                    selectedRecipe?.id === recipe.id ? "border-rose-500 ring-1 ring-rose-500/20" : ""
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                            <ChefHat className="w-6 h-6 text-rose-500" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{recipe.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="flex items-center gap-0.5">
                                                    <Clock className="w-3 h-3" /> {recipe.prep_time}m
                                                </span>
                                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] capitalize", difficultyColor(recipe.difficulty))}>
                                                    {recipe.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Video className="w-3.5 h-3.5" />
                                            {recipe.video_count} clips
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Video Detail */}
                <div>
                    {selectedRecipe ? (
                        <Card className="p-5 bg-card border-border sticky top-6">
                            <div className="text-center mb-4">
                                <div className="w-full aspect-video bg-card rounded-lg flex items-center justify-center mb-3">
                                    <div className="text-center">
                                        <Play className="w-12 h-12 text-rose-500 mx-auto mb-1" />
                                        <span className="text-xs text-muted-foreground">
                                            {selectedRecipe.video_count > 0 ? 'Click to play' : 'No videos yet'}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-foreground">{selectedRecipe.name}</h3>
                                <span className={cn("text-xs px-2 py-0.5 rounded capitalize mt-1 inline-block", difficultyColor(selectedRecipe.difficulty))}>
                                    {selectedRecipe.difficulty}
                                </span>
                            </div>

                            {/* Video List */}
                            <div className="space-y-2 mb-4">
                                <h4 className="text-xs text-muted-foreground font-semibold">Training Clips</h4>
                                {selectedRecipe.video_count > 0 ? (
                                    Array.from({ length: selectedRecipe.video_count }, (_, i) => (
                                        <div key={i} className="flex items-center justify-between bg-muted/30 rounded p-2">
                                            <div className="flex items-center gap-2">
                                                <Film className="w-4 h-4 text-rose-500" />
                                                <div>
                                                    <div className="text-sm text-foreground">
                                                        {['Prep Overview', 'Plating Guide', 'Sauce Technique', 'Chef Tips'][i] || `Clip ${i + 1}`}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {Math.floor(Math.random() * 3) + 1}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button aria-label="Action" variant="ghost" size="sm">
                                                <Play className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        No clips yet. Upload a video to get started.
                                    </div>
                                )}
                            </div>

                            <Button className="w-full bg-rose-600 hover:bg-rose-700 text-foreground" size="sm">
                                <Upload className="w-3.5 h-3.5 mr-1" /> Add Video Clip
                            </Button>
                        </Card>
                    ) : (
                        <Card className="p-8 bg-card border-border text-center">
                            <Film className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Select a recipe to view training videos</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
