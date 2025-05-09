-- CreateTable
CREATE TABLE "inventory_service"."Producto" (
    "id_producto" TEXT NOT NULL,
    "id_categoria" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "codigo_barras" VARCHAR(50) NOT NULL,
    "precio_unitario" DECIMAL(65,30) NOT NULL,
    "peso_kg" DECIMAL(65,30) NOT NULL,
    "dimensiones" VARCHAR(50) NOT NULL,
    "es_fragil" BOOLEAN NOT NULL,
    "requiere_refrigeracion" BOOLEAN NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id_producto")
);

-- CreateTable
CREATE TABLE "inventory_service"."Categoria" (
    "id_categoria" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "inventory_service"."Proveedor" (
    "id_proveedor" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "telefono" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id_proveedor")
);

-- CreateTable
CREATE TABLE "inventory_service"."ProductoProveedor" (
    "id" TEXT NOT NULL,
    "id_producto" TEXT NOT NULL,
    "id_proveedor" TEXT NOT NULL,

    CONSTRAINT "ProductoProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_service"."Almacen" (
    "id_almacen" TEXT NOT NULL,
    "id_cuidad" TEXT NOT NULL,
    "id_gerente" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "ciudad" VARCHAR(100) NOT NULL,
    "departamento" VARCHAR(100) NOT NULL,
    "codigo_postal" VARCHAR(10) NOT NULL,
    "latitud" DECIMAL(65,30) NOT NULL,
    "longitud" DECIMAL(65,30) NOT NULL,
    "capacidad_m2" DECIMAL(65,30) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,

    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("id_almacen")
);

-- CreateTable
CREATE TABLE "inventory_service"."ProductoAlmacen" (
    "id" TEXT NOT NULL,
    "id_producto" TEXT NOT NULL,
    "id_almacen" TEXT NOT NULL,
    "cantidad_stock" INTEGER NOT NULL,
    "nivel_reorden" INTEGER NOT NULL,
    "ultima_reposicion" TIMESTAMP(3) NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,

    CONSTRAINT "ProductoAlmacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_service"."Cuidad" (
    "id" TEXT NOT NULL,
    "id_departamento" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "Cuidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_service"."Departamento" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "inventory_service"."Producto" ADD CONSTRAINT "Producto_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "inventory_service"."Categoria"("id_categoria") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "inventory_service"."Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "inventory_service"."Proveedor"("id_proveedor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."Almacen" ADD CONSTRAINT "Almacen_id_cuidad_fkey" FOREIGN KEY ("id_cuidad") REFERENCES "inventory_service"."Cuidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."ProductoAlmacen" ADD CONSTRAINT "ProductoAlmacen_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "inventory_service"."Producto"("id_producto") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."ProductoAlmacen" ADD CONSTRAINT "ProductoAlmacen_id_almacen_fkey" FOREIGN KEY ("id_almacen") REFERENCES "inventory_service"."Almacen"("id_almacen") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_service"."Cuidad" ADD CONSTRAINT "Cuidad_id_departamento_fkey" FOREIGN KEY ("id_departamento") REFERENCES "inventory_service"."Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
