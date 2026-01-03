
import { JSX, SVGProps } from "react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-gray-300 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center space-x-4">
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
            className="h-8 w-8 text-white"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-xl font-bold text-white">RuVercel</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-400 hover:text-white">
            <BellIcon className="h-6 w-6" />
          </button>
          <img
            src="https://avatar.vercel.sh/robert"
            alt="User Avatar"
            className="h-8 w-8 rounded-full"
          />
        </div>
      </header>

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Projects</h2>
          <button className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-200 transition-colors">
            Import Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ProjectCard
            projectName="E-commerce Store"
            domain="ecommerce-store.ruvercel.app"
            framework="Next.js"
            status="Production"
            lastDeployed="2h ago"
          />
          <ProjectCard
            projectName="Portfolio Website"
            domain="portfolio.ruvercel.app"
            framework="React"
            status="Production"
            lastDeployed="1d ago"
          />
          <ProjectCard
            projectName="Blog Platform"
            domain="blog-platform.ruvercel.app"
            framework="Gatsby"
            status="Error"
            lastDeployed="3d ago"
          />
        </div>
      </main>
    </div>
  );
}

function ProjectCard({
  projectName,
  domain,
  framework,
  status,
  lastDeployed,
}: {
  projectName: string;
  domain: string;
  framework: string;
  status: "Production" | "Error";
  lastDeployed: string;
}) {
  return (
    <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 hover:shadow-cyan-500/50 transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">{projectName}</h3>
        <div className="flex items-center space-x-2">
          {framework === "Next.js" && <NextjsIcon className="h-6 w-6" />}
          {framework === "React" && <ReactIcon className="h-6 w-6" />}
          {framework === "Gatsby" && <GatsbyIcon className="h-6 w-6" />}
        </div>
      </div>
      <p className="text-gray-400 mb-4">{domain}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`h-3 w-3 rounded-full ${
              status === "Production" ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <span className="text-sm">{status}</span>
        </div>
        <p className="text-sm text-gray-500">{lastDeployed}</p>
      </div>
    </div>
  );
}

function BellIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function NextjsIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 128 128">
      <path
        fill="#000"
        d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0zm31.2 110.3c-2.4 0-4.7-.4-6.9-1.3l-35.6-15.3c-3.3-1.4-5.5-4.6-5.5-8.2V41.3c0-3.8 2.4-7.2 6-8.5l35.6-15.3c5.2-2.2 11.2.9 11.2 6.5v80c0 4.4-3.6 8-8 8z"
      />
      <path
        fill="#fff"
        d="M93.3 35.8L61.7 49.3c-1.2.5-2 1.6-2 2.9v42.9c0 1.3.8 2.4 2 2.9l31.5 13.5c2.1.9 4.5-.3 4.5-2.6V38.4c0-2.3-2.4-3.5-4.4-2.6z"
      />
    </svg>
  );
}

function ReactIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="2" fill="#61DAFB" />
      <g>
        <ellipse
          cx="12"
          cy="12"
          rx="11"
          ry="4.2"
          stroke="#61DAFB"
          strokeWidth="1"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="11"
          ry="4.2"
          stroke="#61DAFB"
          strokeWidth="1"
          transform="rotate(60 12 12)"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="11"
          ry="4.2"
          stroke="#61DAFB"
          strokeWidth="1"
          transform="rotate(120 12 12)"
        />
      </g>
    </svg>
  );
}

function GatsbyIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#663399"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
      <path d="M12 2v20" />
      <path d="M12 12l-6-3" />
      <path d="M12 12l6-3" />
      <path d="M12 12l-6 3" />
      <path d="M12 12l6 3" />
    </svg>
  );
}

