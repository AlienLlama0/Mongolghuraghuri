"use client"

import MissionPlanner from "@/components/MissionPlanner/MissionPlanner";
import { ErrorToastProvider } from "@/components/ErrorMessage";

export default function Home() {
  return (
    <ErrorToastProvider>
      <MissionPlanner />
    </ErrorToastProvider>
  );
}
