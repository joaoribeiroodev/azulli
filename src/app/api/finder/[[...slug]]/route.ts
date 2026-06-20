import { handleFinderApi } from "@/lib/finder/http-bridge"

export const runtime = "nodejs"
export const maxDuration = 120

type Context = { params: Promise<{ slug?: string[] }> }

async function route(request: Request, context: Context) {
  const { slug = [] } = await context.params
  return handleFinderApi(request, slug)
}

export const GET = route
export const POST = route
export const PATCH = route
export const DELETE = route
