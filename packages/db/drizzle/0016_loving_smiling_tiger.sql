CREATE TABLE IF NOT EXISTS "library_book_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"copy_number" integer DEFAULT 1 NOT NULL,
	"barcode" varchar(100) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"condition" varchar(20) DEFAULT 'good' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_book_copies_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"author" varchar(255) NOT NULL,
	"publisher" varchar(255),
	"isbn" varchar(50),
	"edition" varchar(50),
	"category_id" uuid,
	"shelf_location" varchar(100),
	"subject" varchar(100),
	"description" text,
	"cover_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"copy_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"borrower_type" varchar(20) DEFAULT 'student' NOT NULL,
	"issued_by_id" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"returned_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"fine_amount" double precision DEFAULT 0 NOT NULL,
	"fine_paid" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"reserver_id" uuid NOT NULL,
	"reserver_type" varchar(20) DEFAULT 'student' NOT NULL,
	"reserved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"fulfilled_copy_id" uuid,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"max_books_per_student" integer DEFAULT 3 NOT NULL,
	"max_books_per_staff" integer DEFAULT 5 NOT NULL,
	"borrowing_period_days" integer DEFAULT 14 NOT NULL,
	"fine_per_day" double precision DEFAULT 50 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_settings_school_id_unique" UNIQUE("school_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_book_copies" ADD CONSTRAINT "library_book_copies_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_book_copies" ADD CONSTRAINT "library_book_copies_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_books" ADD CONSTRAINT "library_books_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_books" ADD CONSTRAINT "library_books_category_id_library_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."library_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_categories" ADD CONSTRAINT "library_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_copy_id_library_book_copies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."library_book_copies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_loans" ADD CONSTRAINT "library_loans_issued_by_id_users_id_fk" FOREIGN KEY ("issued_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_reservations" ADD CONSTRAINT "library_reservations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_reservations" ADD CONSTRAINT "library_reservations_book_id_library_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."library_books"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_reservations" ADD CONSTRAINT "library_reservations_fulfilled_copy_id_library_book_copies_id_fk" FOREIGN KEY ("fulfilled_copy_id") REFERENCES "public"."library_book_copies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_settings" ADD CONSTRAINT "library_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lib_copy_school_book_idx" ON "library_book_copies" USING btree ("school_id","book_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lib_book_school_idx" ON "library_books" USING btree ("school_id","title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lib_cat_school_idx" ON "library_categories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lib_loan_school_borrower_idx" ON "library_loans" USING btree ("school_id","borrower_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "lib_res_school_book_idx" ON "library_reservations" USING btree ("school_id","book_id","status");