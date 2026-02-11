/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f5f7ff',
                    100: '#ebf0ff',
                    500: '#667eea',
                    600: '#5568d3',
                    700: '#4451bc',
                },
                secondary: {
                    500: '#764ba2',
                    600: '#653a8e',
                },
            },
            animation: {
                'float': 'float 20s ease-in-out infinite',
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '33%': { transform: 'translate(100px, -100px) scale(1.1)' },
                    '66%': { transform: 'translate(-100px, 100px) scale(0.9)' },
                },
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
        },
    },
    plugins: [],
}
