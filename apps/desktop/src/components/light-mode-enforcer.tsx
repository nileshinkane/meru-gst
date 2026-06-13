import { useEffect } from "react";

export function LightModeEnforcer() {
  useEffect(() => {
    const removeDarkClass = () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
    const observer = new MutationObserver(removeDarkClass);

    removeDarkClass();
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
