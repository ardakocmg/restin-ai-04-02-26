import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';
import { Plus, Trash2, Loader2 } from 'lucide-react';

/**
 * Button component from Shadcn/ui — core interactive element for Restin.AI.
 * Supports variants, sizes, icons, and loading states.
 */
const meta: Meta<typeof Button> = {
    title: 'UI/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
        },
        size: {
            control: 'select',
            options: ['default', 'sm', 'lg', 'icon'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
    args: {
        children: 'Save Changes',
        variant: 'default',
    },
};

export const Destructive: Story = {
    args: {
        children: 'Delete Order',
        variant: 'destructive',
    },
};

export const WithIcon: Story = {
    render: () => (
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Menu Item
        </Button>
    ),
};

export const Loading: Story = {
    render: () => (
        <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
        </Button>
    ),
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};

export const AllSizes: Story = {
    render: () => (
        <div className="flex items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><Plus className="h-4 w-4" /></Button>
        </div>
    ),
};
