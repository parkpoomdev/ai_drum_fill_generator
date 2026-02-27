/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    safelist: [
        'bg-amber-600', 'border-amber-400',
        'bg-indigo-600', 'border-indigo-400',
        'bg-sky-600', 'border-sky-400',
        'bg-red-600', 'border-red-400',
        'bg-purple-600', 'border-purple-400',
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
