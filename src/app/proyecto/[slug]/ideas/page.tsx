import { Suspense } from "react";
import { ProjectPage } from "@/components/ProjectPage";

export default function Page({ params }: PageProps<"/proyecto/[slug]/ideas">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      {params.then(({ slug }) => (
        <ProjectPage slug={slug} tab="ideas" />
      ))}
    </Suspense>
  );
}
