import CandidateDetailClient from "./CandidateDetailClient";

export function generateStaticParams() {
  return Array.from({ length: 15 }, (_, i) => ({
    id: `c-${String(i).padStart(2, "0")}`,
  }));
}

export default function CandidateDetailPage() {
  return <CandidateDetailClient />;
}
