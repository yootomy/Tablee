"use client";

import { useTransition } from "react";
import { openBillingPortal, startPremiumCheckout } from "@/actions/billing";
import { Button } from "@/components/ui/button";

type BillingActionButtonProps = {
  actionType: "checkout" | "portal";
  label: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
};

export function BillingActionButton({
  actionType,
  label,
  variant = "default",
  className,
}: BillingActionButtonProps) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result =
        actionType === "checkout"
          ? await startPremiumCheckout()
          : await openBillingPortal();

      if (!result.success) {
        window.alert(result.error);
        return;
      }

      window.location.assign(result.url);
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={pending}
      onClick={handleClick}
    >
      {pending
        ? actionType === "checkout"
          ? "Ouverture..."
          : "Chargement..."
        : label}
    </Button>
  );
}

