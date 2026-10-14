import { useEffect, useState } from "react";
import { formatCountdown, remainingSeconds } from "../utils/countdown";
export default function BatchCountdown({ deadline }) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(deadline));
  useEffect(() => {
    setSeconds(remainingSeconds(deadline));
    const timer = setInterval(
      () => setSeconds(remainingSeconds(deadline)),
      1000,
    );
    return () => clearInterval(timer);
  }, [deadline]);
  if (!deadline) return null;
  return (
    <span className="eta">
      {seconds === 0
        ? "Due now"
        : `Estimated time remaining: ${formatCountdown(seconds)}`}
    </span>
  );
}
