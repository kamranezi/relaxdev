
import { SVGProps } from 'react';

export function EnFlag(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 60 30"
      {...props}
    >
      <clipPath id="a">
        <path d="M0 0v30h60V0z" />
      </clipPath>
      <clipPath id="b">
        <path d="M30 15h30v15H30v-15zm0-15h30v15H30V0zM0 15h30v15H0v-15zm0-15h30v15H0V0z" />
      </clipPath>
      <g clipPath="url(#a)">
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path
          d="M0 0l60 30m0-30L0 30"
          stroke="#fff"
          strokeWidth="6"
          clipPath="url(#b)"
        />
        <path
          d="M0 0l60 30m0-30L0 30"
          stroke="#C8102E"
          strokeWidth="4"
          clipPath="url(#b)"
        />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
