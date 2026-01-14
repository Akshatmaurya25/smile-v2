import React from 'react';
import { SvgXml } from 'react-native-svg';

// White logo without background - for use within the app on dark backgrounds
const logoWhiteSvg = `<svg width="100" height="100" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="314" cy="328" r="93" fill="#FFFCFC"/>
<path d="M203 590C321.736 794.349 630.361 853.15 774 590" stroke="#FFFCFC" stroke-width="90" stroke-linecap="round"/>
<g clip-path="url(#clip0_8_11)">
<circle cx="659.39" cy="373.007" r="89" transform="rotate(12.6607 659.39 373.007)" stroke="white" stroke-width="53"/>
</g>
<defs>
<clipPath id="clip0_8_11">
<rect width="231" height="105" fill="white" transform="translate(572.014 235) rotate(12.6607)"/>
</clipPath>
</defs>
</svg>`;

// Logo with dark background - for login screen or light backgrounds
const logoWithBgSvg = `<svg width="100" height="100" viewBox="0 0 1000 1000" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="1000" height="1000" rx="200" fill="#1E1E1E"/>
<circle cx="314" cy="328" r="93" fill="#FFFCFC"/>
<path d="M203 590C321.736 794.349 630.361 853.15 774 590" stroke="#FFFCFC" stroke-width="90" stroke-linecap="round"/>
<g clip-path="url(#clip0_1_2)">
<circle cx="659.39" cy="373.007" r="89" transform="rotate(12.6607 659.39 373.007)" stroke="white" stroke-width="53"/>
</g>
<defs>
<clipPath id="clip0_1_2">
<rect width="231" height="105" fill="white" transform="translate(572.014 235) rotate(12.6607)"/>
</clipPath>
</defs>
</svg>`;

interface LogoProps {
  size?: number;
  variant?: 'white' | 'withBackground';
}

export const Logo: React.FC<LogoProps> = ({ size = 48, variant = 'white' }) => {
  const svg = variant === 'white' ? logoWhiteSvg : logoWithBgSvg;
  return <SvgXml xml={svg} width={size} height={size} />;
};

export default Logo;
