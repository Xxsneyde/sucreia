# GitHub del equipo

Destino elegido: repositorio **público** `Xxsneyde/sucreia`. No se requieren cuentas de colaboradores para construir la base; sí para invitarlos.

## Publicar el repositorio local

Desde un terminal con internet:

```bash
cd /home/esneyder/Proyectos/sucreia
gh auth login -h github.com
gh repo create Xxsneyde/sucreia --public --source=. --remote=origin --push
```

No ejecutar `repo create` si el repositorio ya existe. En ese caso inspecciona su contenido primero. Si está vacío y es el destino correcto:

```bash
git remote add origin https://github.com/Xxsneyde/sucreia.git
git push -u origin main
```

Si ya existe `origin`, inspeccionar `git remote -v` antes de modificarlo. No sobreescribir historia remota ni usar `--force`.

## Incorporar compañeros

En GitHub: repositorio → Settings → Collaborators → Add people. Invita sus usuarios con el nivel mínimo necesario para trabajar. Ser público permite leer el código; para subir ramas necesitan permiso de escritura o contribuir mediante fork.

Cada compañero ejecuta:

```bash
git clone https://github.com/Xxsneyde/sucreia.git
cd sucreia
npm ci
git switch -c feature/numero-nombre
npm run dev
```

## Proteger main

Crear un ruleset para `main` que exija pull request, una aprobación, resolución de conversaciones y el check `quality`. Impedir eliminación de la rama y force-push. Activar la regla después de que CI haya corrido al menos una vez para seleccionar el check correcto.

`CODEOWNERS` no se ha incluido porque faltan los usuarios responsables. Añadirlos después con permisos de escritura; no usar nombres inventados.

## Estado y ramas

`main` es estable. Cada tarea usa `feature/...`, `fix/...` o `docs/...`. No hace falta una rama permanente por persona: una tarea pequeña por rama hace más fácil revisar e integrar. Crear un Project con columnas Pendiente, En curso, En revisión y Terminado cuando el equipo comience a asignar issues.
