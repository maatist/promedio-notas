#!/usr/bin/env bash
#
# Script de configuracion inicial para Promedio Notas
# Ejecuta: chmod +x scripts/setup.sh && ./scripts/setup.sh
#

set -e

echo ""
echo "=========================================="
echo "  Promedio Notas - Setup Inicial"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funcion para imprimir pasos
step() {
  echo -e "${GREEN}[+]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[!]${NC} $1"
}

error() {
  echo -e "${RED}[x]${NC} $1"
}

# 1. Verificar que Node.js esta instalado
step "Verificando Node.js..."
if ! command -v node &> /dev/null; then
  error "Node.js no encontrado. Instala Node.js 18+ desde https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Se requiere Node.js 18+. Version actual: $(node -v)"
  exit 1
fi
echo "  Node.js $(node -v) detectado"

# 2. Verificar/crear archivo .env
step "Verificando archivo .env..."
if [ -f .env ]; then
  echo "  Archivo .env encontrado"
else
  if [ -f .env.example ]; then
    cp .env.example .env
    warn "Archivo .env creado desde .env.example"
    warn "Recuerda editar .env con tus valores reales de DATABASE_URL y JWT_SECRET"
  else
    error "No se encontro .env ni .env.example"
    exit 1
  fi
fi

# 3. Instalar dependencias
step "Instalando dependencias (npm install)..."
npm install

# 4. Generar cliente Prisma
step "Generando cliente Prisma..."
npx prisma generate --schema=packages/backend/prisma/schema.prisma

# 5. Ejecutar migraciones
step "Ejecutando migraciones de base de datos..."
if npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma 2>/dev/null; then
  echo "  Migraciones aplicadas correctamente"
else
  warn "No se pudieron aplicar las migraciones."
  warn "Verifica que DATABASE_URL en .env apunte a una base de datos PostgreSQL activa."
  warn "Puedes ejecutar las migraciones manualmente despues con:"
  echo "  npx prisma migrate deploy --schema=packages/backend/prisma/schema.prisma"
fi

echo ""
echo "=========================================="
echo -e "  ${GREEN}Setup completado!${NC}"
echo "=========================================="
echo ""
echo "Proximos pasos:"
echo "  1. Edita .env con tu DATABASE_URL y JWT_SECRET"
echo "  2. Ejecuta: npm run dev"
echo "  3. Abre http://localhost:5173 en tu navegador"
echo ""
