"use client";

import { ReactNode } from "react";
import KycGate from "@/components/KycGate";

export default function WithdrawalGate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <KycGate
      requirements={[
        "BVN_VERIFIED",
        "KYC_APPROVED",
      ]}
      featureName="Withdrawals"
    >
      {children}
    </KycGate>
  );
}
