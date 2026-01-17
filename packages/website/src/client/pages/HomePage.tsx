import { Button } from "../components/Button"
import { FaqBlock } from "../components/FaqBlock"
import { Footer } from "../components/Footer"
import { LastCommitTime, LatestGitTag } from "../components/GithubStats"
import {
  CalendarCheck,
  DatabaseZap,
  Layers,
  Network,
  Rocket,
  Webhook,
} from "../components/Icons"
import { DemoLink, DocsLink, LicenseLink } from "../components/Links"

export const HomePage = () => {
  return (
    <div>
      <div
        className="gradient-block-1 p-after_header h-screen"
        style={{ minHeight: "auto" }}
      >
        <div className="py-4 px-8 h-full flex flex-col justify-center items-center text-center">
          <h1 className="font-heading text-4xl sm:text-5xl leading-snug sm:w-10/12">
            Build and deploy web apps quickly
          </h1>
          <sub className="font-body text-xl mt-4">
            The ultimate web app starter template (with Web3 support!)
          </sub>
          <div className="mt-20 flex sm:flex-row sm:justify-center flex-col justify-start items-center">
            <DocsLink className="no-anchor-hover-styles">
              <Button size="xl" className="w-72">
                Get started
              </Button>
            </DocsLink>
            <DemoLink className="no-anchor-hover-styles">
              <Button
                variant="outline"
                size="xl"
                className="mt-4 sm:mt-0 sm:ml-4"
              >
                Live demo
              </Button>
            </DemoLink>
          </div>
          <div className="mt-12 font-body text-sm italic">
            Latest version: <LatestGitTag />
          </div>
        </div>
      </div>

      <div className="gradient-block-2 p-4 sm:h-screen sm:min-h-[800px]">
        <div className="flex flex-col justify-start items-center h-full container">
          <h2 className="text-4xl mb-20 text-center">
            All the best tools already integrated
          </h2>
          <div className="flex-1 flex flex-col justify-center items-center mb-20">
            <img
              src="/tools.png"
              alt="Tools"
              width={800}
              height={400}
              className="hidden sm:inline-block"
            />
            <img
              src="/tools_mobile.png"
              alt="Tools"
              width={600}
              height={852}
              className="inline-block sm:hidden"
            />
          </div>
        </div>
      </div>

      <div className="gradient-block-1 p-4 sm:h-screen sm:min-h-[800px]">
        <div className="flex flex-col justify-start items-center h-full container">
          <h2 className="text-4xl mb-20 text-center">
            Saving you{" "}
            <mark className="bg-anchor text-black px-1">37+ hours</mark> of dev
            time
          </h2>
          <div className="flex-1 flex flex-col justify-center items-center mb-20">
            <ul className="list-none flex flex-col justify-start items-center my-0 mx-auto sm:flex-row sm:flex-wrap sm:justify-around sm:items-start md:w-9/12">
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <Layers strokeWidth={0.4} className="w-full flex-1" />
                    <span className="mt-2 text-sm text-emphasis">4+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">ElysiaJS + React</h3>
                    <p className="text-sm">Elysia.js base</p>
                    <p className="text-sm">Layout hierarchy</p>
                    <p className="text-sm">@shadcn/ui</p>
                    <p className="text-sm">TailwindCSS styling</p>
                  </div>
                </div>
              </li>
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <Webhook strokeWidth={0.4} className="w-full flex-1" />
                    <span className="mt-2 text-sm text-emphasis">4+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">GraphQL API</h3>
                    <p className="text-sm">Built-in queries</p>
                    <p className="text-sm">Schema processors</p>
                    <p className="text-sm">Custom directives</p>
                    <p className="text-sm">React hooks</p>
                  </div>
                </div>
              </li>
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <Network strokeWidth={0.4} className="w-full flex-1" />
                    <span className="mt-2 text-sm text-emphasis">5+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">Web3 layer</h3>
                    <p className="text-sm">Wallet auth</p>
                    <p className="text-sm">React components</p>
                    <p className="text-sm">Contract hooks</p>
                    <p className="text-sm">Event watcher</p>
                  </div>
                </div>
              </li>
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <DatabaseZap strokeWidth={0.4} className="w-full flex-1" />
                    <span className="mt-2 text-sm text-emphasis">5+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">PostgreSQL</h3>
                    <p className="text-sm">Drizzle ORM</p>
                    <p className="text-sm">Basic tables</p>
                    <p className="text-sm">Dev migration</p>
                    <p className="text-sm">Prod deployment</p>
                  </div>
                </div>
              </li>
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <CalendarCheck
                      strokeWidth={0.4}
                      className="w-full flex-1"
                    />
                    <span className="mt-2 text-sm text-emphasis">8+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">Task scheduler</h3>
                    <p className="text-sm">Worker process</p>
                    <p className="text-sm">Multicore support</p>
                    <p className="text-sm">Cron scheduling</p>
                  </div>
                </div>
              </li>
              <li className="mb-12">
                <div className="flex flex-row justify-start items-start">
                  <div className="w-24 px-2 flex flex-col justify-start items-center mr-2">
                    <Rocket strokeWidth={0.4} className="w-full flex-1" />
                    <span className="mt-2 text-sm text-emphasis">10+ hrs</span>
                  </div>
                  <div className="w-40">
                    <h3 className="text-lg font-bold">Deployments</h3>
                    <p className="text-sm">Dockerfile</p>
                    <p className="text-sm">Build optimization</p>
                    <p className="text-sm">Cloud integration</p>
                    <p className="text-sm">Production config</p>
                  </div>
                </div>
              </li>
              <li>
                <div className="italic text-lg text-center mt-4 w-8/12 mx-auto sm:w-full">
                  ...plus push notifications, sending emails, and much more!
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="gradient-block-2 p-4 sm:h-screen sm:min-h-[800px]">
        <div className="flex flex-col justify-start items-center h-full container">
          <h2 className="text-4xl mb-20 text-center">FAQ</h2>
          <div className="flex-1 flex flex-col justify-center items-center mb-20">
            <div className="w-full flex flex-col justify-start items-center sm:flex-row sm:justify-center sm:items-start">
              <div className="flex flex-col justify-start items-start w-full md:w-[300px] sm:mr-20">
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="Why should I use this?"
                    answer="QuickDapp aims to be a comprehensive all-in-one solution for deploying production-grade dapps. It comes with all the boilerplate you need and goes well beyond simply prototyping."
                  />
                </div>
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="What language/framework is this?"
                    answer={
                      <span>
                        QuickDapp is built on{" "}
                        <a href="https://elysiajs.com/">ElysiaJS</a>, and uses{" "}
                        <a href="https://www.typescriptlang.org/">Typescript</a>{" "}
                        throughout.
                      </span>
                    }
                  />
                </div>
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="What blockchains are supported?"
                    answer="By default the Web3 integration is built for Ethereum Virtual Machine (EVM) chains such as Ethereum, Polygon, Base, etc."
                  />
                </div>
              </div>
              <div className="flex flex-col justify-start items-start w-full md:w-[300px]">
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="How often is this updated?"
                    answer={
                      <span>
                        Very often! I use it to build my own projects so am
                        constantly improving it. Last commit -{" "}
                        <LastCommitTime className="text-emphasis italic" />.
                      </span>
                    }
                  />
                </div>
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="Is it free as in beer?"
                    answer="Yes, it's free as in beer! And free as in free software."
                  />
                </div>
                <div className="mb-8 w-full">
                  <FaqBlock
                    question="Can I use this for commercial projects?"
                    answer={
                      <span>
                        Absolutely! See our <LicenseLink /> for licensing
                        information.
                      </span>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="gradient-block-1" style={{ minHeight: "auto" }}>
        <Footer />
      </div>
    </div>
  )
}
