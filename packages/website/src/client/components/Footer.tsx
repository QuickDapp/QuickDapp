import { TAGLINE } from "../constants"
import { DocsLink, GithubLink, LicenseLink } from "./Links"

export const Footer = () => {
  return (
    <footer className="flex container flex-col-reverse justify-start items-start p-8 sm:flex-row sm:justify-between sm:items-start sm:p-4 text-[75%]">
      <div className="mt-12 sm:mt-0 sm:mr-24">
        <p className="font-heading mb-4">QuickDapp</p>
        <p className="mb-4">
          {TAGLINE}
          <br />
          ©️ 2026.
        </p>
        <p className="">
          Built with <a href="https://quickdapp.xyz">QuickDapp</a>
        </p>
      </div>
      <ul className="list-none">
        <li className="mb-1">
          <DocsLink>Docs</DocsLink>
        </li>
        <li className="mb-1">
          <LicenseLink>License</LicenseLink>
        </li>
        <li className="mb-1">
          <GithubLink />
        </li>
      </ul>
    </footer>
  )
}
