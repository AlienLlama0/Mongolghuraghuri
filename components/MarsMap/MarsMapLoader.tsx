"use client";

import dynamic from "next/dynamic";

const MarsMap = dynamic(() => import("./MarsMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "600px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Loading Mars map...
    </div>
  ),
});

export default function MarsMapLoader() {
  return <MarsMap />;
}