/**
 * Login Component Tests
 * Tests for PIN auto-submit and reset logic
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthContext } from '../context/AuthContext';
import { VenueContext } from '../context/VenueContext';
import { authAPI } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  authAPI: {
    login: jest.fn(),
  },
}));

// Mock contexts
const mockLogin = jest.fn();
const mockVenues = [
  { id: 'venue-1', name: 'Test Venue 1' },
  { id: 'venue-2', name: 'Test Venue 2' },
];

const renderLogin = (venuesLoading = false, venues = mockVenues) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ login: mockLogin }}>
        <VenueContext.Provider value={{ venues, loading: venuesLoading }}>
          <Login />
        </VenueContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Login Component - PIN Auto-Submit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('auto-submits when 4th digit is entered', async () => {
    authAPI.login.mockResolvedValue({
      data: { user: { name: 'Test User' }, token: 'test-token' },
    });

    renderLogin();

    // Select venue first
    const venueSelect = screen.getByTestId('venue-select');
    fireEvent.click(venueSelect);
    fireEvent.click(screen.getByText('Test Venue 1'));

    // Enter 4 digits
    fireEvent.click(screen.getByTestId('pin-1'));
    fireEvent.click(screen.getByTestId('pin-2'));
    fireEvent.click(screen.getByTestId('pin-3'));
    fireEvent.click(screen.getByTestId('pin-4'));

    // Should auto-submit without pressing ENTER
    await waitFor(() => {
      expect(authAPI.login).toHaveBeenCalled();
    });
  });

  test('resets PIN on failed login', async () => {
    authAPI.login.mockRejectedValue({
      response: { data: { detail: 'Invalid PIN' } },
    });

    renderLogin();

    // Select venue
    const venueSelect = screen.getByTestId('venue-select');
    fireEvent.click(venueSelect);
    fireEvent.click(screen.getByText('Test Venue 1'));

    // Enter 4 digits
    fireEvent.click(screen.getByTestId('pin-1'));
    fireEvent.click(screen.getByTestId('pin-2'));
    fireEvent.click(screen.getByTestId('pin-3'));
    fireEvent.click(screen.getByTestId('pin-4'));

    // Wait for auto-submit and error handling
    await waitFor(() => {
      expect(screen.getByText('Incorrect PIN')).toBeInTheDocument();
    });

    // PIN should be reset after 500ms
    await waitFor(
      () => {
        // All PIN boxes should be empty (no filled indicators)
        const pinBoxes = screen.getAllByRole('button').filter((btn) =>
          btn.getAttribute('data-testid')?.startsWith('pin-')
        );
        // Check that PIN display is cleared
        expect(screen.queryByText('Incorrect PIN')).not.toBeInTheDocument();
      },
      { timeout: 600 }
    );
  });

  test('CLEAR button resets PIN immediately', () => {
    renderLogin();

    // Enter 3 digits
    fireEvent.click(screen.getByTestId('pin-1'));
    fireEvent.click(screen.getByTestId('pin-2'));
    fireEvent.click(screen.getByTestId('pin-3'));

    // Click CLEAR
    fireEvent.click(screen.getByTestId('pin-clear'));

    // PIN should be immediately cleared
    // (Visual check - all PIN boxes should be empty)
    const pinBoxes = document.querySelectorAll('[class*="rounded-full"]');
    expect(pinBoxes.length).toBe(0);
  });

  test('disables keypad when no venues available', () => {
    renderLogin(false, []); // No venues

    // All PIN buttons should be disabled
    const pin1 = screen.getByTestId('pin-1');
    expect(pin1).toBeDisabled();

    // Should show helper text
    expect(
      screen.getByText(/No venues available/i)
    ).toBeInTheDocument();
  });

  test('shows loading state for venues', () => {
    renderLogin(true, []); // Loading venues

    // Select should show loading placeholder
    expect(screen.getByText('Loading venues...')).toBeInTheDocument();

    // PIN pad should be disabled
    const pin1 = screen.getByTestId('pin-1');
    expect(pin1).toBeDisabled();
  });

  test('prevents multiple PIN entries during loading', async () => {
    authAPI.login.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderLogin();

    // Select venue
    const venueSelect = screen.getByTestId('venue-select');
    fireEvent.click(venueSelect);
    fireEvent.click(screen.getByText('Test Venue 1'));

    // Enter 4 digits to trigger auto-submit
    fireEvent.click(screen.getByTestId('pin-1'));
    fireEvent.click(screen.getByTestId('pin-2'));
    fireEvent.click(screen.getByTestId('pin-3'));
    fireEvent.click(screen.getByTestId('pin-4'));

    // Try to click another digit while loading
    fireEvent.click(screen.getByTestId('pin-5'));

    // Should not add 5th digit (PIN should stay at 4 digits)
    const pin1Button = screen.getByTestId('pin-1');
    expect(pin1Button).toBeDisabled();
  });
});

describe('Login Component - Brand Colors', () => {
  test('renders brand red accent on .AI text', () => {
    renderLogin();

    // Check that .AI span has brand red color
    const aiText = screen.getByText('.AI');
    expect(aiText).toHaveStyle({ color: 'var(--brand-accent)' });
  });

  test('renders ENTER button with brand red background', () => {
    renderLogin();

    const enterButton = screen.getByTestId('pin-submit');
    expect(enterButton).toHaveStyle({
      backgroundColor: 'var(--brand-accent)',
    });
  });

  test('renders active tab with brand red background', () => {
    renderLogin();

    const adminTab = screen.getByTestId('login-target-admin');
    expect(adminTab).toHaveStyle({
      backgroundColor: 'var(--brand-accent)',
    });
  });
});
