"use client"

import { useFinderContext } from "@/components/finder/finder-context"
import { getFinderPermissions } from "@/lib/finder/roles"

export function useFinderPermissions() {
  const { user } = useFinderContext()
  return getFinderPermissions(user?.role)
}
