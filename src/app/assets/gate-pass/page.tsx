import GatePassClient from "./GatePassClient";

export const metadata = {
  title: "Gate Pass Registry — ADIOS Platform",
  description: "Track and authorize asset movements in and out of premises",
};

export default function GatePassPage() {
  return <GatePassClient />;
}
