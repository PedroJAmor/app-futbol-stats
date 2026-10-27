import { notFound } from "next/navigation";
import FiltersPreview from "./FiltersPreview";

export const dynamic = "force-dynamic";

export default function MatchFiltersPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <FiltersPreview />;
}
