import React from 'react';

interface LogoProps
{
    className?: string;
    size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 32 }) =>
{
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0.5" x2="1" y2="0.5">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
            </defs>

            {/* Background shape */}
            {/* <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" fillOpacity="0.1" /> */}

            {/* Stylized R */}
            <text x="2" y="24" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="900" fill="url(#logo-gradient)">R</text>

            {/* Sound Waves */}
            <path d="M22 10 Q26 13 26 16 Q26 19 23 21" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M26 6 Q32 11 32 16 Q32 21 27 25" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
};

export default Logo;
