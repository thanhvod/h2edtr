-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" BIGINT,
    "num_pages" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_page_images" (
    "id" TEXT NOT NULL,
    "pdf_file_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "image_base64" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_page_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_shapes" (
    "id" TEXT NOT NULL,
    "pdf_file_id" TEXT NOT NULL,
    "page_number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "color" TEXT,
    "border_width" DOUBLE PRECISION,
    "radius_corner" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pdf_shapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_pins" (
    "id" TEXT NOT NULL,
    "pdf_file_id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pdf_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_groups" (
    "id" TEXT NOT NULL,
    "pdf_file_id" TEXT NOT NULL,
    "pin_id" TEXT NOT NULL,
    "pin_x" DOUBLE PRECISION NOT NULL,
    "pin_y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pdf_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_group_shapes" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "shape_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "local_x" DOUBLE PRECISION NOT NULL,
    "local_y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "color" TEXT,
    "border_width" DOUBLE PRECISION,
    "radius_corner" DOUBLE PRECISION,

    CONSTRAINT "pdf_group_shapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pdf_states" (
    "id" TEXT NOT NULL,
    "pdf_file_id" TEXT NOT NULL,
    "view_mode" TEXT NOT NULL DEFAULT 'scroll',
    "zoom" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "tool" TEXT NOT NULL DEFAULT 'select',
    "draw_shape" TEXT NOT NULL DEFAULT 'rect',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_device_id_key" ON "users"("device_id");

-- CreateIndex
CREATE INDEX "pdf_files_user_id_idx" ON "pdf_files"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_page_images_pdf_file_id_page_number_key" ON "pdf_page_images"("pdf_file_id", "page_number");

-- CreateIndex
CREATE INDEX "pdf_page_images_pdf_file_id_idx" ON "pdf_page_images"("pdf_file_id");

-- CreateIndex
CREATE INDEX "pdf_shapes_pdf_file_id_idx" ON "pdf_shapes"("pdf_file_id");

-- CreateIndex
CREATE INDEX "pdf_pins_pdf_file_id_idx" ON "pdf_pins"("pdf_file_id");

-- CreateIndex
CREATE INDEX "pdf_groups_pdf_file_id_idx" ON "pdf_groups"("pdf_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_group_shapes_group_id_shape_id_key" ON "pdf_group_shapes"("group_id", "shape_id");

-- CreateIndex
CREATE INDEX "pdf_group_shapes_group_id_idx" ON "pdf_group_shapes"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "pdf_states_pdf_file_id_key" ON "pdf_states"("pdf_file_id");

-- CreateIndex
CREATE INDEX "pdf_states_pdf_file_id_idx" ON "pdf_states"("pdf_file_id");

-- AddForeignKey
ALTER TABLE "pdf_files" ADD CONSTRAINT "pdf_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_page_images" ADD CONSTRAINT "pdf_page_images_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "pdf_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_shapes" ADD CONSTRAINT "pdf_shapes_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "pdf_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_pins" ADD CONSTRAINT "pdf_pins_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "pdf_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_groups" ADD CONSTRAINT "pdf_groups_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "pdf_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_group_shapes" ADD CONSTRAINT "pdf_group_shapes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "pdf_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_group_shapes" ADD CONSTRAINT "pdf_group_shapes_shape_id_fkey" FOREIGN KEY ("shape_id") REFERENCES "pdf_shapes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pdf_states" ADD CONSTRAINT "pdf_states_pdf_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "pdf_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
