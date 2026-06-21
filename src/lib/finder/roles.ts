export const FINDER_ROLES = [
  "admin",
  "sdr",
  "bdr",
  "closer",
  "ops",
  "viewer",
] as const

export type FinderRole = (typeof FINDER_ROLES)[number]

export type FinderPermission =
  | "users.manage"
  | "leads.read"
  | "leads.write"
  | "leads.delete"
  | "leads.convert"
  | "searches.run"

export type FinderRoleMeta = {
  label: string
  description: string
}

export const FINDER_ROLE_META: Record<FinderRole, FinderRoleMeta> = {
  admin: {
    label: "Administrador",
    description:
      "Gerencia equipe, exclui leads e converte assinantes. Acesso total ao Finder.",
  },
  sdr: {
    label: "SDR",
    description:
      "Prospecção ativa: busca leads, qualifica, move no pipeline e faz primeiro contato.",
  },
  bdr: {
    label: "BDR",
    description:
      "Desenvolvimento comercial: qualifica oportunidades e alimenta o funil (sem converter assinante).",
  },
  closer: {
    label: "Closer",
    description:
      "Fechamento: negocia e converte leads em assinantes Azulli (trial/plano).",
  },
  ops: {
    label: "Operações",
    description:
      "Apoio ao pipeline: atualiza leads e busca dados, sem converter assinante.",
  },
  viewer: {
    label: "Somente leitura",
    description:
      "Acompanha dashboard, leads e histórico sem alterar dados nem buscar novos leads.",
  },
}

const ROLE_PERMISSIONS: Record<FinderRole, readonly FinderPermission[]> = {
  admin: [
    "users.manage",
    "leads.read",
    "leads.write",
    "leads.delete",
    "leads.convert",
    "searches.run",
  ],
  closer: [
    "leads.read",
    "leads.write",
    "leads.convert",
    "searches.run",
  ],
  sdr: ["leads.read", "leads.write", "searches.run"],
  bdr: ["leads.read", "leads.write", "searches.run"],
  ops: ["leads.read", "leads.write", "searches.run"],
  viewer: ["leads.read"],
}

function isFinderRole(role: string): role is FinderRole {
  return (FINDER_ROLES as readonly string[]).includes(role)
}

export function hasFinderPermission(
  role: string | null | undefined,
  permission: FinderPermission
): boolean {
  if (!role || !isFinderRole(role)) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function getFinderRoleLabel(role: string): string {
  if (isFinderRole(role)) return FINDER_ROLE_META[role].label
  return role
}

export function getFinderPermissions(role: string | null | undefined) {
  return {
    canManageUsers: hasFinderPermission(role, "users.manage"),
    canReadLeads: hasFinderPermission(role, "leads.read"),
    canWriteLeads: hasFinderPermission(role, "leads.write"),
    canDeleteLeads: hasFinderPermission(role, "leads.delete"),
    canConvertLeads: hasFinderPermission(role, "leads.convert"),
    canRunSearches: hasFinderPermission(role, "searches.run"),
    isReadOnly: !hasFinderPermission(role, "leads.write"),
  }
}
