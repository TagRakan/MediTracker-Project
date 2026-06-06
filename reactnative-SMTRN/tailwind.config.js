/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all files that contain Nativewind classes.
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: '#030014',
                view: '#f8fafc',
                card: '#ffffff',
                accent: '#00AAFF',
            },
            borderRadius: {
                '3xl': '30px',
            }
        },
    },
    plugins: [],
}