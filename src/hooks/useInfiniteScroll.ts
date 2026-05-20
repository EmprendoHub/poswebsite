import { useEffect, useState, useCallback } from "react";

interface UseInfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export const useInfiniteScroll = ({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 0.1,
  rootMargin = "100px",
}: UseInfiniteScrollProps) => {
  const [targetRef, setTargetRef] = useState<HTMLElement | null>(null);

  const targetRefCallback = useCallback((node: HTMLElement | null) => {
    setTargetRef(node);
  }, []);

  useEffect(() => {
    if (!targetRef || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(targetRef);

    return () => {
      observer.unobserve(targetRef);
    };
  }, [targetRef, hasMore, isLoading, onLoadMore, threshold, rootMargin]);

  return targetRefCallback;
};
