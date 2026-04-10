"use client";

import { useState } from "react";
import { createFamilyInvite } from "@/actions/families";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteResult {
  code: string;
  sharePath: string;
  expiresAt: string;
}

export function InviteMemberForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setInvite(null);

    const result = await createFamilyInvite(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setInvite(result.data ?? null);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <form action={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="roleToGrant">Rôle accordé</Label>
          <select
            id="roleToGrant"
            name="roleToGrant"
            defaultValue="member"
            className="h-11 rounded-xl border border-border bg-background px-4 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 md:h-10 md:text-sm"
          >
            <option value="member">Membre</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxUses">Utilisations max</Label>
            <Input
              id="maxUses"
              name="maxUses"
              type="number"
              defaultValue="1"
              min="1"
              max="25"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expiresInDays">Expire dans</Label>
            <div className="relative">
              <Input
                id="expiresInDays"
                name="expiresInDays"
                type="number"
                defaultValue="7"
                min="1"
                max="30"
                required
                className="pr-14"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                jours
              </span>
            </div>
          </div>
        </div>

        <div>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Génération..." : "Générer un code d'invitation"}
          </Button>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {invite ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">Dernier code généré</p>
          <p className="mt-2 text-2xl font-bold tracking-[0.2em]">
            {invite.code}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Lien direct : <span className="font-mono">{invite.sharePath}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Expire le{" "}
            {new Date(invite.expiresAt).toLocaleDateString("fr-CH", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
