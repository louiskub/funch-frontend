import { useEffect, useState } from "react";

export function useResponsiveBatchSize(itemHeight: number, reservedHeight: number, maxItems: number) {
  const [size, setSize] = useState(6);

  useEffect(() => {
    const update = () => {
      const columns = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
      const rows = Math.max(1, Math.ceil((window.innerHeight - reservedHeight) / itemHeight));
      setSize(Math.min(maxItems, columns * rows));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [itemHeight, maxItems, reservedHeight]);

  return size;
}
