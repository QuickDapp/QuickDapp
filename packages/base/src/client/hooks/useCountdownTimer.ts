import { useCallback, useEffect, useRef, useState } from "react"

export function useCountdownTimer(durationSeconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTimer = useCallback(
    (from: number) => {
      clearTimer()
      setSecondsLeft(from)
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearTimer()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    },
    [clearTimer],
  )

  const restart = useCallback(() => {
    startTimer(durationSeconds)
  }, [durationSeconds, startTimer])

  useEffect(() => {
    startTimer(durationSeconds)
    return clearTimer
  }, [durationSeconds, startTimer, clearTimer])

  return { secondsLeft, restart }
}
