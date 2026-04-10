"use client";

import { useState } from "react";
import { revokeFamilyInvite } from "@/actions/families";
import { Button } from "@/components/ui/button";

interface RevokeFamilyInviteButtonProps {
  inviteId: string;
}

export function RevokeFamilyInviteButton({
  inviteId,
}: RevokeFamilyInviteButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!window.confirm("Révoquer ce code d'invitation maintenant ?")) {
      return;
    }

    setLoading(true);
    const result = await revokeFamilyInvite(formData);

    if (!result.success) {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="inviteId" value={inviteId} />
      <Button type="submit" variant="outline" size="sm" disabled={loading}>
        {loading ? "Révocation..." : "Révoquer"}
      </Button>
    </form>
  );
}
