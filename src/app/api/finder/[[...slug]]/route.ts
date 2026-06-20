import { after } from "next/server"

import { handleFinderApi } from "@/lib/finder/http-bridge"
import { beginAfterScope, endAfterScope } from "@/lib/finder/after-scope"

export const runtime = "nodejs"
export const maxDuration = 120

type Context = { params: Promise<{ slug?: string[] }> }

async function route(request: Request, context: Context) {
  const scope = beginAfterScope()
  try {
    const { slug = [] } = await context.params
    return await handleFinderApi(request, slug)
  } finally {
    for (const task of scope.tasks) {
      after(task)
    }
    endAfterScope()
  }
}

export const GET = route
export const POST = route
export const PATCH = route
export const DELETE = route
