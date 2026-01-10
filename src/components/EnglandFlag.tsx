
import { SVGProps } from 'react';

export function EnglandFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 5 3"
      {...props}
    >
      <rect width="5" height="3" fill="#FFF"/>
      <path d="M2 0h1v3H2z" fill="#C8102E"/>
      <path d="M0 1h5v1H0z" fill="#C8102E"/>
    </svg>
  );
}
