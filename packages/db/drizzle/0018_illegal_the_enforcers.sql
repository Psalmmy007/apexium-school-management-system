CREATE TABLE IF NOT EXISTS "academic_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"display_order" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"email" varchar(255),
	"occupation" varchar(100),
	"address" text,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_guardians" ALTER COLUMN "parent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "class_teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "display_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "capacity" integer;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "class_teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "display_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD COLUMN "guardian_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "admission_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "state_of_origin" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "lga" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "nationality" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "religion" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "blood_group" varchar(10);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "genotype" varchar(10);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "passport_url" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "emergency_contact_name" varchar(200);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "emergency_contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "emergency_contact_relationship" varchar(100);--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "previous_school" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "medical_conditions" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "allergies" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "hostel_room_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "hostel_bed_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "academic_sections" ADD CONSTRAINT "academic_sections_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guardians" ADD CONSTRAINT "guardians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_section_id_academic_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."academic_sections"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "classes" ADD CONSTRAINT "classes_class_teacher_id_users_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sections" ADD CONSTRAINT "sections_class_teacher_id_users_id_fk" FOREIGN KEY ("class_teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
