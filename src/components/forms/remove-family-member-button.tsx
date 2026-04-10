"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeFamilyMember } from "@/actions/families";
import { Button } from "@/components/ui/button";

interface RemoveFamilyMemberButtonProps {
  memberId: string;
  memberName: string;
}

export function RemoveFamilyMemberButton({
  memberId,
  memberName,
}: RemoveFamilyMemberButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    if (!window.confirm(`Retirer ${memberName} de cette famille ?`)) {
      return;
    }

    setLoading(true);
    const result = await removeFamilyMember(formData);

    if (!result.success) {
      window.alert(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="memberId" value={memberId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={loading}
        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {loading ? "Retrait..." : "Retirer"}
      </Button>
    </form>
  );
}
