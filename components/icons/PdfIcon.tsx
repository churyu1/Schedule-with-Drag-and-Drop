import React from 'react';

const PdfIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15v-4" />
      <path d="M12 15v-4" />
      <path d="M15 15v-4" />
      <path d="M9 11h2" />
      <path d="M12 11h2" />
      <path d="M15 11h2" />
    </svg>
  );
};

export default PdfIcon;
