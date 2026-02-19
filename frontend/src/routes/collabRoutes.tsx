/**
 * Collaboration Route Module
 * Hive Chat, Inbox, Tasks, Profile
 */
import React from 'react';
import { Route } from 'react-router-dom';

// ─── Lazy Imports ───────────────────────────────────────────────────────────────
const HiveDashboard = React.lazy(() => import('../pages/collab/HiveDashboard'));
const Inbox = React.lazy(() => import('../pages/collab/Inbox'));
const TasksKanban = React.lazy(() => import('../pages/collab/TasksKanban'));
const UserProfileSettings = React.lazy(() => import('../pages/UserProfileSettings'));

export const collabRoutes = (
    <>
        <Route path="collab/hive" element={<HiveDashboard />} />
        <Route path="collab/inbox" element={<Inbox />} />
        <Route path="collab/tasks" element={<TasksKanban />} />
        <Route path="profile" element={<UserProfileSettings />} />
    </>
);
