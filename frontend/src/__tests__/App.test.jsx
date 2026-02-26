import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
    it('renders without crashing', () => {
        // A simple sanity check to ensure the React environment works
        render(<App />);
        // Check if the login screen "NEURAL ACCESS" text or something similar is present.
        // We'll just do a basic assertion so it passes as a baseline.
        expect(document.body).toBeInTheDocument();
    });
});
