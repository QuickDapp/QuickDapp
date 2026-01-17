import { ChevronDown, ChevronRight } from "lucide-react"
import { type FC, type ReactNode, useCallback, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./Collapsible"

interface Props {
  className?: string
  question: string
  answer: string | ReactNode
}

export const FaqBlock: FC<Props> = ({ className, question, answer }) => {
  const [open, setOpen] = useState(false)

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
  }, [])

  return (
    <Collapsible className={className} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="font-heading">
        <div className="flex flex-row justify-start items-center text-left">
          {open ? <ChevronDown /> : <ChevronRight />}
          <span className="ml-2">{question}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4 bg-gradcol3 rounded-md p-4">
        {answer}
      </CollapsibleContent>
    </Collapsible>
  )
}
