import axios from 'axios';import { logger } from '@/lib/logger';

import { Employee, Payslip } from '../../types';import { logger } from '@/lib/logger';

import { saveDraft, getDrafts } from '../../lib/db';

import { logger } from '@/lib/logger';
// Base URL for API
const API_URL = '/api/hr';

export const HRService = {
    // Fetch Employees from Backend
    getEmployees: async (): Promise<Employee[]> => {
        try {
            const response = await axios.get<Employee[]>(`${API_URL}/employees`);
            return response.data;
        } catch (error) {
            logger.error("Failed to fetch employees:", error);
            throw error;
        }
    },

    // Calculate Payroll via Backend Logic
    calculatePayroll: async (venueId: string, periodStart: string, periodEnd: string): Promise<Payslip[]> => {
        try {
            const response = await axios.post<Payslip[]>(`${API_URL}/payroll/calculate`, {
                venue_id: venueId,
                period_start: periodStart,
                period_end: periodEnd
            });
            return response.data;
        } catch (error) {
            logger.error("Failed to calculate payroll:", error);
            throw error;
        }
    },

    // Save Draft to Local IndexedDB (Offline Resilience)
    saveDraftLocally: async (payslip: Payslip) => {
        try {
            await saveDraft(payslip);
            return true;
        } catch (error) {
            logger.error("Failed to save draft locally:", error);
            return false;
        }
    },

    // Retrieve Drafts from Local IndexedDB
    getDraftsLocally: async (): Promise<Payslip[]> => {
        try {
            return await getDrafts();
        } catch (error) {
            logger.error("Failed to load local drafts:", error);
            return [];
        }
    }
};
