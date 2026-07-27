CREATE INDEX IF NOT EXISTS "class_attendance_idx" ON "student_attendance" USING btree ("school_id","class_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_scores_idx" ON "student_scores" USING btree ("school_id","class_id","term_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "class_students_idx" ON "students" USING btree ("school_id","class_id");