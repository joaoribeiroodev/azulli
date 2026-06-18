import { useEffect, useRef } from "react"

/**
 * Executa o effect quando `deps` mudam, mas não na montagem inicial.
 * Útil quando o servidor já entregou dados iniciais e o cliente só refetch ao mudar filtro.
 */
export function useUpdateOnChange(effect: () => void, deps: unknown[]) {
  const isMount = useRef(true)

  useEffect(() => {
    if (isMount.current) {
      isMount.current = false
      return
    }
    effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps array is intentional
  }, deps)
}
