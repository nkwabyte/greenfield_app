import Image from "next/image"

export const Logo = (
  props: React.SVGProps<SVGSVGElement>
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22c-5 0-9-4.5-9-10 0-5.5 4-10 9-10s9 4.5 9 10c0 5.5-4 10-9 10Z" />
    <path d="M12 2a7.5 7.5 0 0 1 0 15v5" />
    <path d="M12 2a7.5 7.5 0 0 0 0 15v5" />
  </svg>
);
