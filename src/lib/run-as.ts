import { AsyncLocalStorage } from "node:async_hooks";

// Tarefas agendadas (avisos) rodam sem sessão. Com o login ligado, elas percorrem cada
// pessoa e rodam o mesmo código "como" ela: uid() devolve a pessoa e createClient()
// usa a chave de serviço. Todas as consultas filtram por user_id = uid().
const store = new AsyncLocalStorage<{ userId: string }>();

export function runAs<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return store.run({ userId }, fn);
}

export function runAsUser(): string | null {
  return store.getStore()?.userId ?? null;
}
