"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createFamily, joinFamilyWithCode } from "@/actions/families";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OnboardingFlowProps {
  hasFamilies: boolean;
}

export function OnboardingFlow({ hasFamilies }: OnboardingFlowProps) {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";

  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  async function handleCreateFamily(formData: FormData) {
    setCreateLoading(true);
    setCreateError(null);

    const result = await createFamily(formData);

    if (result && !result.success) {
      setCreateError(result.error);
      setCreateLoading(false);
    }
  }

  async function handleJoinFamily(formData: FormData) {
    setJoinLoading(true);
    setJoinError(null);

    const result = await joinFamilyWithCode(formData);

    if (result && !result.success) {
      setJoinError(result.error);
      setJoinLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {hasFamilies ? (
        <p className="text-sm text-muted-foreground">
          Tu peux créer un nouvel espace familial ou rejoindre un autre foyer avec un code d&apos;invitation.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Créer une famille</CardTitle>
            <CardDescription>
              Configurez un nouvel espace avec son premier lieu de vie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreateFamily} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nom de la famille</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ex: Famille Dupont"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="locationName">Premier lieu</Label>
                <Input
                  id="locationName"
                  name="locationName"
                  type="text"
                  placeholder="Ex: Maison principale"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Vous pourrez ajouter ou renommer d&apos;autres lieux ensuite.
                </p>
              </div>
              {createError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={createLoading}>
                {createLoading ? "Création..." : "Créer cette famille"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Rejoindre une famille</CardTitle>
            <CardDescription>
              Collez le code reçu par un proche pour rejoindre sa famille.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleJoinFamily} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">Code d&apos;invitation</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="ABCD-EFGH-IJKL"
                  defaultValue={initialCode}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Le code peut être collé avec ou sans tirets.
                </p>
              </div>
              {joinError ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {joinError}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={joinLoading}>
                {joinLoading ? "Connexion..." : "Rejoindre cette famille"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
