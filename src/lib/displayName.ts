// src/lib/displayName.ts
// Calcula el nombre a mostrar de un jugador dado el contexto de todos los jugadores
//
// Lógica:
// 1. Usar apodo si tiene, sino el primer nombre
// 2. Si ese valor se repite entre otros jugadores, agregar la primera letra del apellido
//    El apellido se extrae del campo "nombre" tomando la última palabra

type PlayerMin = {
  id: number;
  nombre: string;
  apodo: string | null;
};

// Extrae la primera letra del apellido a partir del campo nombre completo
// Ej: "Pedro Javier Amor" → "A"
// Ej: "Samiro" → "" (no hay apellido)
function primeraLetraApellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return "";
  const apellido = partes[partes.length - 1];
  return apellido[0].toUpperCase() + ".";
}

// Calcula el nombre base a mostrar (apodo o primer nombre)
function nombreBase(jugador: PlayerMin): string {
  if (jugador.apodo?.trim()) return jugador.apodo.trim();
  return jugador.nombre.trim().split(/\s+/)[0];
}

// Calcula el nombre a mostrar para UN jugador dado el contexto de todos
export function displayName(jugador: PlayerMin, todos: PlayerMin[]): string {
  const base = nombreBase(jugador);

  // Verificar si otro jugador tiene el mismo nombre base
  const hayRepeticion = todos.some(
    (otro) => otro.id !== jugador.id && nombreBase(otro) === base
  );

  if (!hayRepeticion) return base;

  // Agregar primera letra del apellido
  const inicial = primeraLetraApellido(jugador.nombre);
  return inicial ? `${base} ${inicial}` : base;
}

// Versión para usar sin contexto completo (cuando solo tenés un jugador)
// Útil en fichas individuales donde no importa la colisión
export function displayNameSingle(jugador: PlayerMin): string {
  return nombreBase(jugador);
}

// Precalcula un mapa id → displayName para usar en listas
// Más eficiente que llamar displayName() por cada jugador en un loop
export function buildDisplayNames(todos: PlayerMin[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const j of todos) {
    map.set(j.id, displayName(j, todos));
  }
  return map;
}
