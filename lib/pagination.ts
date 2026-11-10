export interface PaginationItem {
  type: "page" | "ellipsis";
  page?: number;
  key: string;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
  startIndex: number;
  endIndex: number;
  items: PaginationItem[];
}

/**
 * คำนวณโครงสร้างข้อมูล Pagination แบบ Sliding Window (O(1) Memory & Time Complexity)
 */
export function buildPaginationData(
  currentPage: number,
  totalCount: number,
  pageSize: number = 9,
  siblingCount: number = 1
): PaginationData {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const hasPrevPage = safeCurrentPage > 1;
  const hasNextPage = safeCurrentPage < totalPages;
  const prevPage = hasPrevPage ? safeCurrentPage - 1 : null;
  const nextPage = hasNextPage ? safeCurrentPage + 1 : null;

  const startIndex = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalCount);

  // Sliding window pagination algorithm
  const leftSibling = Math.max(safeCurrentPage - siblingCount, 1);
  const rightSibling = Math.min(safeCurrentPage + siblingCount, totalPages);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < totalPages - 1;

  const items: PaginationItem[] = [];

  const createRange = (start: number, end: number) => {
    const res: number[] = [];
    for (let i = start; i <= end; i++) res.push(i);
    return res;
  };

  if (!showLeftDots && showRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = createRange(1, Math.min(leftItemCount, totalPages));
    leftRange.forEach((p) => items.push({ type: "page", page: p, key: `page-${p}` }));
    if (totalPages > leftItemCount) {
      items.push({ type: "ellipsis", key: "dots-right" });
      items.push({ type: "page", page: totalPages, key: `page-${totalPages}` });
    }
  } else if (showLeftDots && !showRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    items.push({ type: "page", page: 1, key: "page-1" });
    items.push({ type: "ellipsis", key: "dots-left" });
    const rightRange = createRange(Math.max(1, totalPages - rightItemCount + 1), totalPages);
    rightRange.forEach((p) => items.push({ type: "page", page: p, key: `page-${p}` }));
  } else if (showLeftDots && showRightDots) {
    items.push({ type: "page", page: 1, key: "page-1" });
    items.push({ type: "ellipsis", key: "dots-left" });
    const middleRange = createRange(leftSibling, rightSibling);
    middleRange.forEach((p) => items.push({ type: "page", page: p, key: `page-${p}` }));
    items.push({ type: "ellipsis", key: "dots-right" });
    items.push({ type: "page", page: totalPages, key: `page-${totalPages}` });
  } else {
    const allRange = createRange(1, totalPages);
    allRange.forEach((p) => items.push({ type: "page", page: p, key: `page-${p}` }));
  }

  return {
    currentPage: safeCurrentPage,
    totalPages,
    pageSize,
    totalCount,
    hasPrevPage,
    hasNextPage,
    prevPage,
    nextPage,
    startIndex,
    endIndex,
    items,
  };
}
