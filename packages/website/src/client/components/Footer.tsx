import { DemoLink, DocsLink, GithubLink, HelpLink, LicenseLink } from "./Links"

export const Footer = () => {
  return (
    <footer className="flex container flex-col-reverse justify-start items-start p-8 sm:flex-row sm:justify-between sm:items-start sm:p-4 text-[75%]">
      <div className="mt-12 sm:mt-0 sm:mr-24">
        <p className="font-heading text-white mb-4">QuickDapp</p>
        <p className="text-gray-300 mb-4">
          Production-ready boilerplate for vibe-coded and hand-coded web apps.
          <br />
          ©️ 2026.
        </p>
        <p className="text-gray-400">
          Built with <a href="https://quickdapp.xyz">QuickDapp</a>
        </p>
      </div>
      <div className="flex flex-row justify-start items-start">
        <ul className="list-none mr-8 sm:mr-12">
          <li className="mb-1">
            <DemoLink className="text-white">Demo</DemoLink>
          </li>
          <li className="mb-1">
            <DocsLink className="text-white">Docs</DocsLink>
          </li>
          <li className="mb-1">
            <HelpLink className="text-white">Help</HelpLink>
          </li>
        </ul>
        <ul className="list-none mr-8 sm:mr-12">
          <li className="mb-1">
            <LicenseLink className="text-white">License</LicenseLink>
          </li>
          <li className="mb-1">
            <GithubLink className="text-white" />
          </li>
        </ul>
      </div>
    </footer>
  )
}
