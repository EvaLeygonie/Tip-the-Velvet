import { useState } from 'react'

// "Show more" paging for image-heavy lists: only the first `pageSize` items are rendered (and so
// only their images fetched) until the visitor asks for more. Every image costs Cloudinary
// bandwidth on the free plan. Call reset() when the list changes (e.g. a filter is picked).
export const useShowMore = <T>(items: T[], pageSize: number) => {
  const [visibleCount, setVisibleCount] = useState(pageSize)

  return {
    visible: items.slice(0, visibleCount),
    remaining: Math.max(items.length - visibleCount, 0),
    showMore: () => setVisibleCount((n) => n + pageSize),
    reset: () => setVisibleCount(pageSize),
  }
}
