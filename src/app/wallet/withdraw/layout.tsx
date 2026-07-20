import { ReactNode } from "react";
import WithdrawalGate from "@/components/WithdrawalGate";

export default function WithdrawLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WithdrawalGate>
      {children}
    </WithdrawalGate>
  );
}
