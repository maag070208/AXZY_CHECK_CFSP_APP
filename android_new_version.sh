#!/bin/bash

# Script para generar nueva versión Release de la App
# Uso: ./bump-and-build.sh [major|minor|patch] o ./bump-and-build.sh
# Si no se especifica parámetro, aumenta el patch version automáticamente

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración de rutas
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_GRADLE="$SCRIPT_DIR/android/app/build.gradle"
PACKAGE_JSON="$SCRIPT_DIR/package.json"
APK_OUTPUT_DIR="$SCRIPT_DIR/android/app/build/outputs/apk/release"

# Funciones
print_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Verificar si estamos en el directorio correcto
verify_paths() {
    if [ ! -f "$ANDROID_GRADLE" ]; then
        print_error "No se encontró android/app/build.gradle"
        print_info "Ejecuta este script desde la raíz del proyecto"
        exit 1
    fi
    
    if [ ! -f "$PACKAGE_JSON" ]; then
        print_error "No se encontró package.json"
        exit 1
    fi
}

# Obtener versión actual
get_current_version() {
    # Obtener versión de package.json
    CURRENT_VERSION=$(grep -o '"version": "[^"]*"' "$PACKAGE_JSON" | cut -d '"' -f 4)
    echo "$CURRENT_VERSION"
}

# Obtener versionCode actual
get_current_version_code() {
    VERSION_CODE=$(grep -o 'versionCode [0-9]*' "$ANDROID_GRADLE" | head -1 | awk '{print $2}')
    echo "$VERSION_CODE"
}

# Incrementar versión
increment_version() {
    local version=$1
    local type=$2
    
    IFS='.' read -r -a version_parts <<< "$version"
    local major=${version_parts[0]}
    local minor=${version_parts[1]}
    local patch=${version_parts[2]}
    
    case $type in
        major)
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        minor)
            minor=$((minor + 1))
            patch=0
            ;;
        patch|"")
            patch=$((patch + 1))
            ;;
        *)
            print_error "Tipo de incremento inválido. Usa: major, minor, patch"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Actualizar versiones en archivos
update_versions() {
    local new_version=$1
    local new_version_code=$2
    
    print_info "Actualizando package.json a versión $new_version"
    # Actualizar package.json
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"
    rm -f "$PACKAGE_JSON.bak"
    
    print_info "Actualizando build.gradle (versionCode: $new_version_code, versionName: $new_version)"
    # Actualizar versionCode en build.gradle
    sed -i.bak "s/versionCode [0-9]*/versionCode $new_version_code/" "$ANDROID_GRADLE"
    # Actualizar versionName en build.gradle
    sed -i.bak "s/versionName \"[^\"]*\"/versionName \"$new_version\"/" "$ANDROID_GRADLE"
    rm -f "$ANDROID_GRADLE.bak"
}

# Construir APK
build_apk() {
    print_info "Limpiando build anterior..."
    cd "$SCRIPT_DIR/android"
    ./gradlew clean
    
    print_info "Construyendo Release APK..."
    if ./gradlew assembleRelease; then
        print_success "APK construido exitosamente"
        cd "$SCRIPT_DIR"
        return 0
    else
        print_error "Error al construir el APK"
        cd "$SCRIPT_DIR"
        return 1
    fi
}

# Abrir Finder/Explorer
open_output_folder() {
    if [ -d "$APK_OUTPUT_DIR" ]; then
        print_success "APK generado en: $APK_OUTPUT_DIR"
        
        # Abrir según el sistema operativo
        case "$(uname -s)" in
            Darwin)
                open "$APK_OUTPUT_DIR"
                print_info "Finder abierto en la carpeta release"
                ;;
            Linux)
                if command -v nautilus &> /dev/null; then
                    nautilus "$APK_OUTPUT_DIR" &
                elif command -v dolphin &> /dev/null; then
                    dolphin "$APK_OUTPUT_DIR" &
                else
                    print_info "No se pudo abrir automáticamente, la carpeta está en: $APK_OUTPUT_DIR"
                fi
                ;;
            MINGW*|CYGWIN*|MSYS*)
                start "$APK_OUTPUT_DIR"
                ;;
            *)
                print_info "Carpeta de salida: $APK_OUTPUT_DIR"
                ;;
        esac
    else
        print_error "No se encontró la carpeta de salida del APK"
    fi
}

# Mostrar resumen
show_summary() {
    local old_version=$1
    local new_version=$2
    local old_code=$3
    local new_code=$4
    
    echo ""
    echo "========================================="
    print_success "📱 NUEVA VERSIÓN GENERADA"
    echo "========================================="
    echo -e "${BLUE}Versión anterior:${NC} $old_version (Code: $old_code)"
    echo -e "${GREEN}Nueva versión:${NC} $new_version (Code: $new_code)"
    echo "========================================="
    echo ""
}

# Función principal
main() {
    echo "========================================="
    echo "🚀 GENERADOR DE RELEASE APK"
    echo "========================================="
    echo ""
    
    # Verificar rutas
    verify_paths
    
    # Obtener versiones actuales
    CURRENT_VERSION=$(get_current_version)
    CURRENT_VERSION_CODE=$(get_current_version_code)
    
    print_info "Versión actual: $CURRENT_VERSION (Code: $CURRENT_VERSION_CODE)"
    echo ""
    
    # Determinar tipo de incremento
    INCREMENT_TYPE=${1:-patch}
    
    # Calcular nueva versión
    NEW_VERSION=$(increment_version "$CURRENT_VERSION" "$INCREMENT_TYPE")
    NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))
    
    print_info "Nueva versión: $NEW_VERSION (Code: $NEW_VERSION_CODE)"
    echo ""
    
    # Confirmar con el usuario
    read -p "¿Deseas continuar con la nueva versión? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_warning "Operación cancelada"
        exit 0
    fi
    
    # Actualizar versiones
    update_versions "$NEW_VERSION" "$NEW_VERSION_CODE"
    print_success "Versiones actualizadas"
    
    # Construir APK
    if build_apk; then
        show_summary "$CURRENT_VERSION" "$NEW_VERSION" "$CURRENT_VERSION_CODE" "$NEW_VERSION_CODE"
        open_output_folder
    else
        print_error "❌ Falló la construcción del APK"
        exit 1
    fi
}

# Ejecutar script
main "$@"