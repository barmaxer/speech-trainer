/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  safelist: [
    'bg-blue-50','text-blue-500',
    'bg-purple-50','text-purple-500',
    'bg-green-50','text-green-500',
    'bg-pink-50','text-pink-500',
    'bg-orange-50','text-orange-500',
  ],
  theme: { extend: {} },
  plugins: [],
}
