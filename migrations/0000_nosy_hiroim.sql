CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"user_id" integer,
	"user_name" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appraisal_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"cycle_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"status" text DEFAULT 'active',
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appraisal_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"appraisal_id" integer,
	"teacher_id" integer NOT NULL,
	"goal" text NOT NULL,
	"category" text,
	"specific" text,
	"measurable" text,
	"achievable" text,
	"relevant" text,
	"timebound" text,
	"target_date" text,
	"progress" integer DEFAULT 0,
	"status" text DEFAULT 'not_started',
	"progress_notes" text,
	"completed_at" timestamp,
	"supervisor_verified" boolean DEFAULT false,
	"supervisor_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appraisals" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"cycle_id" integer,
	"teacher_id" integer NOT NULL,
	"appraiser_id" integer NOT NULL,
	"appraisal_date" text NOT NULL,
	"performance_areas" json DEFAULT '[]'::json,
	"self_assessment_notes" text,
	"supervisor_comments" text,
	"achievements" text,
	"challenges" text,
	"support_needed" text,
	"overall_self_rating" integer,
	"overall_supervisor_rating" integer,
	"final_rating" text,
	"status" text DEFAULT 'draft',
	"acknowledged_by_teacher" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"teacher_feedback" text,
	"next_review_date" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "attendance_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"school_start_time" text DEFAULT '08:00',
	"late_threshold_minutes" integer DEFAULT 15,
	"gate_close_time" text DEFAULT '08:30',
	"school_end_time" text DEFAULT '16:30',
	"enable_face_recognition" boolean DEFAULT false,
	"enable_qr_scanning" boolean DEFAULT true,
	"require_face_for_gate" boolean DEFAULT false,
	"require_face_for_teachers" boolean DEFAULT false,
	"face_confidence_threshold" real DEFAULT 0.6,
	"enable_geofencing" boolean DEFAULT false,
	"school_latitude" real,
	"school_longitude" real,
	"geofence_radius_meters" integer DEFAULT 100,
	"periods_per_day" integer DEFAULT 8,
	"period_duration_minutes" integer DEFAULT 40,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "attendance_settings_school_id_unique" UNIQUE("school_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"entity_name" text,
	"details" json,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"room_id" integer NOT NULL,
	"bed_number" text NOT NULL,
	"bed_type" text DEFAULT 'single',
	"status" text DEFAULT 'available',
	"current_student_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "beds_room_id_bed_number_unique" UNIQUE("room_id","bed_number")
);
--> statement-breakpoint
CREATE TABLE "boarding_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"dormitory_id" integer,
	"room_id" integer,
	"bed_id" integer,
	"authorized_guardians" json DEFAULT '[]'::json,
	"dietary_restrictions" text,
	"medical_notes" text,
	"emergency_instructions" text,
	"transport_provider" text,
	"enrollment_date" text,
	"withdrawal_date" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "boarding_profiles_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "boarding_roll_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"dormitory_id" integer,
	"date" text NOT NULL,
	"session" text NOT NULL,
	"session_time" text,
	"status" text DEFAULT 'present',
	"method" text DEFAULT 'manual',
	"marked_by_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "boarding_roll_calls_student_id_date_session_unique" UNIQUE("student_id","date","session")
);
--> statement-breakpoint
CREATE TABLE "boarding_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"morning_roll_call_time" text DEFAULT '06:30',
	"evening_roll_call_time" text DEFAULT '20:00',
	"night_roll_call_time" text DEFAULT '22:00',
	"enable_morning_roll_call" boolean DEFAULT true,
	"enable_evening_roll_call" boolean DEFAULT true,
	"enable_night_roll_call" boolean DEFAULT false,
	"visiting_days" json DEFAULT '["Sunday"]'::json,
	"visiting_hours_start" text DEFAULT '14:00',
	"visiting_hours_end" text DEFAULT '17:00',
	"require_guardian_approval" boolean DEFAULT true,
	"auto_mark_absent_after_minutes" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "boarding_settings_school_id_unique" UNIQUE("school_id")
);
--> statement-breakpoint
CREATE TABLE "class_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"class_level" text NOT NULL,
	"stream" text,
	"date" text NOT NULL,
	"period" integer,
	"subject" text,
	"status" text DEFAULT 'present',
	"method" text DEFAULT 'manual',
	"marked_by_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "class_attendance_student_id_date_period_unique" UNIQUE("student_id","date","period")
);
--> statement-breakpoint
CREATE TABLE "class_timetables" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"period_id" integer NOT NULL,
	"class_level" text NOT NULL,
	"stream" text,
	"day_of_week" text NOT NULL,
	"subject" text,
	"teacher_id" integer,
	"room" text,
	"notes" text,
	"term" integer,
	"year" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"last_read_at" timestamp,
	"is_archived" boolean DEFAULT false,
	"is_muted" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now(),
	CONSTRAINT "conversation_participants_conversation_id_user_id_unique" UNIQUE("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"subject" text NOT NULL,
	"type" text DEFAULT 'direct',
	"created_by_id" integer NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"school_name" text NOT NULL,
	"student_count" text,
	"message" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY DEFAULT 'config' NOT NULL,
	"school_name" text DEFAULT 'BROADWAY NURSERY AND PRIMARY SCHOOL',
	"address_box" text DEFAULT 'P.O.BOX 10, NAAMA-MITYANA',
	"contact_phones" text DEFAULT '0772324288  0709087676  0744073812',
	"motto" text DEFAULT 'WE BUILD FOR THE FUTURE',
	"reg_number" text DEFAULT 'ME/P/10247',
	"centre_number" text DEFAULT '670135',
	"logo_base64" text,
	"current_term" integer DEFAULT 1,
	"current_year" integer DEFAULT 2025,
	"next_term_begin_boarders" text DEFAULT '',
	"next_term_begin_day" text DEFAULT '',
	"streams" json DEFAULT '{"P1":[],"P2":[],"P3":[],"P4":[],"P5":[],"P6":[],"P7":[]}'::json,
	"grading_config" json DEFAULT '{"grades":[{"grade":"D1","minScore":90,"maxScore":100,"points":1},{"grade":"D2","minScore":80,"maxScore":89,"points":2},{"grade":"C3","minScore":70,"maxScore":79,"points":3},{"grade":"C4","minScore":60,"maxScore":69,"points":4},{"grade":"C5","minScore":55,"maxScore":59,"points":5},{"grade":"C6","minScore":50,"maxScore":54,"points":6},{"grade":"P7","minScore":45,"maxScore":49,"points":7},{"grade":"P8","minScore":40,"maxScore":44,"points":8},{"grade":"F9","minScore":0,"maxScore":39,"points":9}],"divisions":[{"division":"I","minAggregate":4,"maxAggregate":12},{"division":"II","minAggregate":13,"maxAggregate":24},{"division":"III","minAggregate":25,"maxAggregate":28},{"division":"IV","minAggregate":29,"maxAggregate":32},{"division":"U","minAggregate":33,"maxAggregate":36}],"passingMark":40}'::json,
	"subjects_config" json DEFAULT '{"lowerPrimary":[{"name":"English","code":"english","isCompulsory":true},{"name":"Mathematics","code":"maths","isCompulsory":true},{"name":"Literacy 1","code":"literacy1","isCompulsory":true},{"name":"Literacy 2","code":"literacy2","isCompulsory":true}],"upperPrimary":[{"name":"English","code":"english","isCompulsory":true},{"name":"Mathematics","code":"maths","isCompulsory":true},{"name":"Science","code":"science","isCompulsory":true},{"name":"Social Studies","code":"sst","isCompulsory":true}]}'::json,
	"report_config" json DEFAULT '{"headteacherName":"","headteacherTitle":"Headteacher","showClassTeacherSignature":true,"showHeadteacherSignature":true,"showParentSignature":true,"commentTemplates":["Excellent performance. Keep it up!","Good work. Continue improving.","Fair performance. More effort needed.","Needs improvement. Work harder next term.","Poor performance. Requires special attention."],"conductOptions":["Excellent","Very Good","Good","Fair","Needs Improvement"]}'::json
);
--> statement-breakpoint
CREATE TABLE "dorm_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"dormitory_id" integer NOT NULL,
	"room_number" text NOT NULL,
	"capacity" integer DEFAULT 4,
	"current_occupancy" integer DEFAULT 0,
	"room_type" text DEFAULT 'standard',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "dorm_rooms_dormitory_id_room_number_unique" UNIQUE("dormitory_id","room_number")
);
--> statement-breakpoint
CREATE TABLE "dormitories" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"capacity" integer DEFAULT 0,
	"building" text,
	"floor" text,
	"warden_name" text,
	"warden_phone" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dormitories_school_id_name_unique" UNIQUE("school_id","name")
);
--> statement-breakpoint
CREATE TABLE "event_committees" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" text NOT NULL,
	"responsibilities" text,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "event_committees_event_id_user_id_unique" UNIQUE("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to_id" integer,
	"due_date" text,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6B7280',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "expense_categories_school_id_name_unique" UNIQUE("school_id","name")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"category_id" integer,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"vendor" text,
	"reference_number" text,
	"expense_date" text NOT NULL,
	"payment_method" text,
	"term" integer,
	"year" integer,
	"approved_by" text,
	"receipt_url" text,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "face_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"person_type" text NOT NULL,
	"person_id" integer NOT NULL,
	"embedding" text NOT NULL,
	"capture_version" integer DEFAULT 1,
	"thumbnail_base64" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "face_embeddings_school_id_person_type_person_id_unique" UNIQUE("school_id","person_type","person_id")
);
--> statement-breakpoint
CREATE TABLE "fee_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"fee_type" text NOT NULL,
	"description" text,
	"amount_due" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"payment_date" text,
	"payment_method" text,
	"receipt_number" text,
	"received_by" text,
	"status" text DEFAULT 'pending',
	"notes" text,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"class_level" text NOT NULL,
	"fee_type" text NOT NULL,
	"amount" integer NOT NULL,
	"term" integer,
	"year" integer NOT NULL,
	"boarding_status" text,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fee_structures_school_id_class_level_fee_type_term_year_boarding_status_unique" UNIQUE("school_id","class_level","fee_type","term","year","boarding_status")
);
--> statement-breakpoint
CREATE TABLE "finance_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"transaction_date" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gate_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"date" text NOT NULL,
	"check_in_time" text,
	"check_out_time" text,
	"check_in_method" text DEFAULT 'manual',
	"check_out_method" text,
	"status" text DEFAULT 'present',
	"captured_by_id" integer,
	"device_info" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "gate_attendance_student_id_date_unique" UNIQUE("student_id","date")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"occupation" text,
	"address_box" text,
	"address_physical" text,
	"work_phone" text,
	"national_id" text,
	"is_primary" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"leave_type" text NOT NULL,
	"reason" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"expected_return_time" text,
	"guardian_name" text NOT NULL,
	"guardian_phone" text NOT NULL,
	"guardian_relationship" text,
	"transport_mode" text,
	"destination" text,
	"status" text DEFAULT 'pending',
	"requested_at" timestamp DEFAULT now(),
	"requested_by_id" integer,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"approver_notes" text,
	"check_out_time" text,
	"check_out_by_id" integer,
	"check_in_time" text,
	"check_in_by_id" integer,
	"return_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marks" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"type" text NOT NULL,
	"marks" json DEFAULT '{}'::json,
	"aggregate" integer DEFAULT 0,
	"division" text DEFAULT '',
	"comment" text DEFAULT '',
	"status" text DEFAULT 'present',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "marks_student_id_term_year_type_unique" UNIQUE("student_id","term","year","type")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"message_type" text DEFAULT 'text',
	"attachment_url" text,
	"attachment_name" text,
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "observation_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"category" text NOT NULL,
	"criterion" text NOT NULL,
	"description" text,
	"max_score" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"observer_id" integer NOT NULL,
	"observation_date" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"class_level" text NOT NULL,
	"stream" text,
	"subject" text NOT NULL,
	"lesson_topic" text,
	"number_of_learners" integer,
	"scores" json DEFAULT '[]'::json,
	"total_score" integer DEFAULT 0,
	"max_possible_score" integer DEFAULT 0,
	"percentage" integer DEFAULT 0,
	"overall_rating" text,
	"strengths" text,
	"areas_for_improvement" text,
	"recommendations" text,
	"teacher_reflection" text,
	"follow_up_date" text,
	"follow_up_completed" boolean DEFAULT false,
	"follow_up_notes" text,
	"status" text DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "p7_exam_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"set_number" integer NOT NULL,
	"name" text NOT NULL,
	"stream" text,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"exam_date" text,
	"max_marks" json DEFAULT '{"english":100,"maths":100,"science":100,"sst":100}'::json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "p7_exam_sets_school_id_set_number_stream_term_year_unique" UNIQUE("school_id","set_number","stream","term","year")
);
--> statement-breakpoint
CREATE TABLE "p7_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"exam_set_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"marks" json DEFAULT '{}'::json,
	"total" integer DEFAULT 0,
	"aggregate" integer DEFAULT 0,
	"division" text DEFAULT '',
	"position" integer,
	"comment" text DEFAULT '',
	"status" text DEFAULT 'present',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "p7_scores_student_id_exam_set_id_unique" UNIQUE("student_id","exam_set_id")
);
--> statement-breakpoint
CREATE TABLE "promotion_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"from_class" text NOT NULL,
	"to_class" text NOT NULL,
	"from_stream" text,
	"to_stream" text,
	"academic_year" integer NOT NULL,
	"term" integer NOT NULL,
	"promoted_by" integer,
	"promoted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "routine_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"routine_id" integer NOT NULL,
	"activity" text NOT NULL,
	"custom_activity" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"name" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" integer NOT NULL,
	"fee_types" json DEFAULT '[]'::json,
	"description" text,
	"eligibility_criteria" text,
	"max_beneficiaries" integer,
	"valid_from" text,
	"valid_to" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"term_plan_id" integer,
	"name" text NOT NULL,
	"event_type" text NOT NULL,
	"description" text,
	"start_date" text NOT NULL,
	"end_date" text,
	"start_time" text,
	"end_time" text,
	"venue" text,
	"target_audience" text,
	"target_classes" json DEFAULT '[]'::json,
	"budget" integer,
	"status" text DEFAULT 'planned',
	"notes" text,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"coordinator_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_routines" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"applies_to" text DEFAULT 'all',
	"day_of_week" json DEFAULT '[]'::json,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"address_box" text DEFAULT '',
	"contact_phones" text DEFAULT '',
	"email" text,
	"motto" text DEFAULT '',
	"reg_number" text DEFAULT '',
	"centre_number" text DEFAULT '',
	"logo_base64" text,
	"primary_color" text DEFAULT '#7B1113',
	"secondary_color" text DEFAULT '#1E3A5F',
	"current_term" integer DEFAULT 1,
	"current_year" integer DEFAULT 2025,
	"next_term_begin_boarders" text DEFAULT '',
	"next_term_begin_day" text DEFAULT '',
	"streams" json DEFAULT '{"P1":[],"P2":[],"P3":[],"P4":[],"P5":[],"P6":[],"P7":[]}'::json,
	"grading_config" json DEFAULT '{"grades":[{"grade":"D1","minScore":90,"maxScore":100,"points":1},{"grade":"D2","minScore":80,"maxScore":89,"points":2},{"grade":"C3","minScore":70,"maxScore":79,"points":3},{"grade":"C4","minScore":60,"maxScore":69,"points":4},{"grade":"C5","minScore":55,"maxScore":59,"points":5},{"grade":"C6","minScore":50,"maxScore":54,"points":6},{"grade":"P7","minScore":45,"maxScore":49,"points":7},{"grade":"P8","minScore":40,"maxScore":44,"points":8},{"grade":"F9","minScore":0,"maxScore":39,"points":9}],"divisions":[{"division":"I","minAggregate":4,"maxAggregate":12},{"division":"II","minAggregate":13,"maxAggregate":24},{"division":"III","minAggregate":25,"maxAggregate":28},{"division":"IV","minAggregate":29,"maxAggregate":32},{"division":"U","minAggregate":33,"maxAggregate":36}],"passingMark":40}'::json,
	"subjects_config" json DEFAULT '{"lowerPrimary":[{"name":"English","code":"english","isCompulsory":true},{"name":"Mathematics","code":"maths","isCompulsory":true},{"name":"Literacy 1","code":"literacy1","isCompulsory":true},{"name":"Literacy 2","code":"literacy2","isCompulsory":true}],"upperPrimary":[{"name":"English","code":"english","isCompulsory":true},{"name":"Mathematics","code":"maths","isCompulsory":true},{"name":"Science","code":"science","isCompulsory":true},{"name":"Social Studies","code":"sst","isCompulsory":true}]}'::json,
	"report_config" json DEFAULT '{"headteacherName":"","headteacherTitle":"Headteacher","showClassTeacherSignature":true,"showHeadteacherSignature":true,"showParentSignature":true,"commentTemplates":["Excellent performance. Keep it up!","Good work. Continue improving.","Fair performance. More effort needed.","Needs improvement. Work harder next term.","Poor performance. Requires special attention."],"conductOptions":["Excellent","Very Good","Good","Fair","Needs Improvement"]}'::json,
	"id_card_config" json DEFAULT '{"showBloodGroup":true,"showDob":true,"showEmergencyContact":true,"customTerms":["Property of the school","Carry at all times","Report loss immediately","Non-transferable"],"layout":"single"}'::json,
	"security_config" json DEFAULT '{"passwordMinLength":8,"passwordRequireUppercase":true,"passwordRequireLowercase":true,"passwordRequireNumbers":true,"passwordRequireSpecialChars":false,"passwordExpiryDays":0,"sessionTimeoutMinutes":60,"maxLoginAttempts":5,"lockoutDurationMinutes":15,"require2FA":false,"allowedIPAddresses":[],"enforceIPWhitelist":false}'::json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "student_fee_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"fee_type" text NOT NULL,
	"custom_amount" integer NOT NULL,
	"term" integer,
	"year" integer NOT NULL,
	"reason" text,
	"is_active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "student_fee_overrides_student_id_fee_type_year_term_unique" UNIQUE("student_id","fee_type","year","term")
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"guardian_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "student_guardians_student_id_guardian_id_unique" UNIQUE("student_id","guardian_id")
);
--> statement-breakpoint
CREATE TABLE "student_scholarships" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"student_id" integer NOT NULL,
	"scholarship_id" integer NOT NULL,
	"term" integer,
	"year" integer NOT NULL,
	"status" text DEFAULT 'active',
	"approved_by" integer,
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "student_scholarships_student_id_scholarship_id_year_term_unique" UNIQUE("student_id","scholarship_id","year","term")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"index_number" text NOT NULL,
	"name" text NOT NULL,
	"class_level" text NOT NULL,
	"stream" text NOT NULL,
	"gender" text NOT NULL,
	"paycode" text,
	"parent_name" text,
	"parent_contact" text,
	"date_of_birth" text,
	"nationality" text DEFAULT 'Ugandan',
	"religion" text,
	"photo_base64" text,
	"admission_date" text,
	"admission_number" text,
	"previous_school" text,
	"boarding_status" text DEFAULT 'day',
	"house_or_dormitory" text,
	"medical_info" json DEFAULT '{}'::json,
	"emergency_contacts" json DEFAULT '[]'::json,
	"special_cases" json DEFAULT '{"absenteeism":false,"sickness":false,"fees":false}'::json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "students_index_number_school_id_unique" UNIQUE("index_number","school_id")
);
--> statement-breakpoint
CREATE TABLE "teacher_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"teacher_id" integer NOT NULL,
	"date" text NOT NULL,
	"check_in_time" text,
	"check_out_time" text,
	"check_in_method" text DEFAULT 'manual',
	"check_out_method" text,
	"status" text DEFAULT 'present',
	"leave_type" text,
	"check_in_latitude" real,
	"check_in_longitude" real,
	"check_in_accuracy" real,
	"check_in_distance" real,
	"face_match_confidence" real,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "teacher_attendance_teacher_id_date_unique" UNIQUE("teacher_id","date")
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"employee_id" text,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"roles" json DEFAULT '[]'::json,
	"assigned_class" text,
	"assigned_stream" text,
	"subjects" json DEFAULT '[]'::json,
	"teaching_classes" json DEFAULT '[]'::json,
	"qualifications" text,
	"date_joined" text,
	"initials" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "term_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"theme" text,
	"objectives" json DEFAULT '[]'::json,
	"key_activities" json DEFAULT '[]'::json,
	"status" text DEFAULT 'draft',
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"test_session_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"raw_marks" json DEFAULT '{}'::json,
	"converted_marks" json DEFAULT '{}'::json,
	"aggregate" integer DEFAULT 0,
	"division" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "test_scores_student_id_test_session_id_unique" UNIQUE("student_id","test_session_id")
);
--> statement-breakpoint
CREATE TABLE "test_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer,
	"name" text NOT NULL,
	"test_type" text NOT NULL,
	"class_level" text NOT NULL,
	"stream" text,
	"term" integer NOT NULL,
	"year" integer NOT NULL,
	"test_date" text,
	"max_marks" json DEFAULT '{}'::json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timetable_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"name" text NOT NULL,
	"period_type" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"duration" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"applies_to" json DEFAULT '[]'::json
);
--> statement-breakpoint
CREATE TABLE "user_schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"school_id" integer NOT NULL,
	"role" text DEFAULT 'teacher' NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_schools_user_id_school_id_unique" UNIQUE("user_id","school_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'teacher' NOT NULL,
	"email" text,
	"phone" text,
	"is_super_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "visitor_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"school_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"visitor_name" text NOT NULL,
	"visitor_phone" text,
	"visitor_relationship" text NOT NULL,
	"visitor_national_id" text,
	"visit_date" text NOT NULL,
	"check_in_time" text,
	"check_out_time" text,
	"purpose" text,
	"items_brought" text,
	"registered_by_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_goals" ADD CONSTRAINT "appraisal_goals_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_goals" ADD CONSTRAINT "appraisal_goals_appraisal_id_appraisals_id_fk" FOREIGN KEY ("appraisal_id") REFERENCES "public"."appraisals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisal_goals" ADD CONSTRAINT "appraisal_goals_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_cycle_id_appraisal_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."appraisal_cycles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appraisals" ADD CONSTRAINT "appraisals_appraiser_id_users_id_fk" FOREIGN KEY ("appraiser_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_dorm_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."dorm_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_student_id_students_id_fk" FOREIGN KEY ("current_student_id") REFERENCES "public"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_profiles" ADD CONSTRAINT "boarding_profiles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_profiles" ADD CONSTRAINT "boarding_profiles_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_profiles" ADD CONSTRAINT "boarding_profiles_dormitory_id_dormitories_id_fk" FOREIGN KEY ("dormitory_id") REFERENCES "public"."dormitories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_profiles" ADD CONSTRAINT "boarding_profiles_room_id_dorm_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."dorm_rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_profiles" ADD CONSTRAINT "boarding_profiles_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_roll_calls" ADD CONSTRAINT "boarding_roll_calls_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_roll_calls" ADD CONSTRAINT "boarding_roll_calls_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_roll_calls" ADD CONSTRAINT "boarding_roll_calls_dormitory_id_dormitories_id_fk" FOREIGN KEY ("dormitory_id") REFERENCES "public"."dormitories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_roll_calls" ADD CONSTRAINT "boarding_roll_calls_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boarding_settings" ADD CONSTRAINT "boarding_settings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_attendance" ADD CONSTRAINT "class_attendance_marked_by_id_users_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_period_id_timetable_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."timetable_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_timetables" ADD CONSTRAINT "class_timetables_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dorm_rooms" ADD CONSTRAINT "dorm_rooms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dorm_rooms" ADD CONSTRAINT "dorm_rooms_dormitory_id_dormitories_id_fk" FOREIGN KEY ("dormitory_id") REFERENCES "public"."dormitories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dormitories" ADD CONSTRAINT "dormitories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_committees" ADD CONSTRAINT "event_committees_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_committees" ADD CONSTRAINT "event_committees_event_id_school_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."school_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_committees" ADD CONSTRAINT "event_committees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_event_id_school_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."school_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_tasks" ADD CONSTRAINT "event_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_embeddings" ADD CONSTRAINT "face_embeddings_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attendance" ADD CONSTRAINT "gate_attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attendance" ADD CONSTRAINT "gate_attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_attendance" ADD CONSTRAINT "gate_attendance_captured_by_id_users_id_fk" FOREIGN KEY ("captured_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_check_out_by_id_users_id_fk" FOREIGN KEY ("check_out_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_check_in_by_id_users_id_fk" FOREIGN KEY ("check_in_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation_criteria" ADD CONSTRAINT "observation_criteria_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_observer_id_users_id_fk" FOREIGN KEY ("observer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p7_exam_sets" ADD CONSTRAINT "p7_exam_sets_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p7_scores" ADD CONSTRAINT "p7_scores_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p7_scores" ADD CONSTRAINT "p7_scores_exam_set_id_p7_exam_sets_id_fk" FOREIGN KEY ("exam_set_id") REFERENCES "public"."p7_exam_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "p7_scores" ADD CONSTRAINT "p7_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_history" ADD CONSTRAINT "promotion_history_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_history" ADD CONSTRAINT "promotion_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_history" ADD CONSTRAINT "promotion_history_promoted_by_users_id_fk" FOREIGN KEY ("promoted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_slots" ADD CONSTRAINT "routine_slots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_slots" ADD CONSTRAINT "routine_slots_routine_id_school_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."school_routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_term_plan_id_term_plans_id_fk" FOREIGN KEY ("term_plan_id") REFERENCES "public"."term_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_coordinator_id_users_id_fk" FOREIGN KEY ("coordinator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_routines" ADD CONSTRAINT "school_routines_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fee_overrides" ADD CONSTRAINT "student_fee_overrides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_scholarships" ADD CONSTRAINT "student_scholarships_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_attendance" ADD CONSTRAINT "teacher_attendance_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_plans" ADD CONSTRAINT "term_plans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_plans" ADD CONSTRAINT "term_plans_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_scores" ADD CONSTRAINT "test_scores_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_scores" ADD CONSTRAINT "test_scores_test_session_id_test_sessions_id_fk" FOREIGN KEY ("test_session_id") REFERENCES "public"."test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_scores" ADD CONSTRAINT "test_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_schools" ADD CONSTRAINT "user_schools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_schools" ADD CONSTRAINT "user_schools_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_logs" ADD CONSTRAINT "visitor_logs_registered_by_id_users_id_fk" FOREIGN KEY ("registered_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_school_idx" ON "activity_logs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "appraisal_cycles_school_idx" ON "appraisal_cycles" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "appraisal_cycles_status_idx" ON "appraisal_cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appraisal_goals_school_idx" ON "appraisal_goals" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "appraisal_goals_teacher_idx" ON "appraisal_goals" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "appraisal_goals_appraisal_idx" ON "appraisal_goals" USING btree ("appraisal_id");--> statement-breakpoint
CREATE INDEX "appraisal_goals_status_idx" ON "appraisal_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "appraisals_school_idx" ON "appraisals" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "appraisals_teacher_idx" ON "appraisals" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "appraisals_cycle_idx" ON "appraisals" USING btree ("cycle_id");--> statement-breakpoint
CREATE INDEX "appraisals_status_idx" ON "appraisals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "beds_school_idx" ON "beds" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "beds_room_idx" ON "beds" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "boarding_profiles_school_idx" ON "boarding_profiles" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "boarding_profiles_student_idx" ON "boarding_profiles" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "boarding_roll_calls_school_idx" ON "boarding_roll_calls" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "boarding_roll_calls_student_idx" ON "boarding_roll_calls" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "boarding_roll_calls_date_idx" ON "boarding_roll_calls" USING btree ("date");--> statement-breakpoint
CREATE INDEX "class_attendance_school_idx" ON "class_attendance" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "class_attendance_student_idx" ON "class_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "class_attendance_date_idx" ON "class_attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "class_attendance_class_date_idx" ON "class_attendance" USING btree ("class_level","date");--> statement-breakpoint
CREATE INDEX "class_timetables_school_idx" ON "class_timetables" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "class_timetables_class_idx" ON "class_timetables" USING btree ("class_level","stream");--> statement-breakpoint
CREATE INDEX "class_timetables_period_idx" ON "class_timetables" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "class_timetables_teacher_idx" ON "class_timetables" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "class_timetables_day_idx" ON "class_timetables" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "conv_participants_conversation_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conv_participants_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_school_idx" ON "conversations" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "conversations_created_by_idx" ON "conversations" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "dorm_rooms_school_idx" ON "dorm_rooms" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "dorm_rooms_dorm_idx" ON "dorm_rooms" USING btree ("dormitory_id");--> statement-breakpoint
CREATE INDEX "dormitories_school_idx" ON "dormitories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "event_committees_event_idx" ON "event_committees" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_committees_user_idx" ON "event_committees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_tasks_event_idx" ON "event_tasks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_tasks_assigned_idx" ON "event_tasks" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "event_tasks_status_idx" ON "event_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expense_categories_school_idx" ON "expense_categories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "expenses_school_idx" ON "expenses" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "face_embeddings_school_idx" ON "face_embeddings" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "face_embeddings_person_idx" ON "face_embeddings" USING btree ("person_type","person_id");--> statement-breakpoint
CREATE INDEX "fee_payments_school_idx" ON "fee_payments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "fee_payments_student_idx" ON "fee_payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "fee_structures_school_idx" ON "fee_structures" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_school_idx" ON "finance_transactions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "finance_transactions_student_idx" ON "finance_transactions" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gate_attendance_school_idx" ON "gate_attendance" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "gate_attendance_student_idx" ON "gate_attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gate_attendance_date_idx" ON "gate_attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "guardians_school_idx" ON "guardians" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "leave_requests_school_idx" ON "leave_requests" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "leave_requests_student_idx" ON "leave_requests" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_date_idx" ON "leave_requests" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "marks_school_idx" ON "marks" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "observation_criteria_school_idx" ON "observation_criteria" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "observation_criteria_category_idx" ON "observation_criteria" USING btree ("category");--> statement-breakpoint
CREATE INDEX "observations_school_idx" ON "observations" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "observations_teacher_idx" ON "observations" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "observations_observer_idx" ON "observations" USING btree ("observer_id");--> statement-breakpoint
CREATE INDEX "observations_date_idx" ON "observations" USING btree ("observation_date");--> statement-breakpoint
CREATE INDEX "p7_exam_sets_school_idx" ON "p7_exam_sets" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "p7_scores_school_idx" ON "p7_scores" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "p7_scores_exam_set_idx" ON "p7_scores" USING btree ("exam_set_id");--> statement-breakpoint
CREATE INDEX "promotion_history_school_idx" ON "promotion_history" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "promotion_history_student_idx" ON "promotion_history" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "routine_slots_routine_idx" ON "routine_slots" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "scholarships_school_idx" ON "scholarships" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "school_events_school_idx" ON "school_events" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "school_events_date_idx" ON "school_events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "school_events_type_idx" ON "school_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "school_routines_school_idx" ON "school_routines" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "student_fee_overrides_school_idx" ON "student_fee_overrides" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "student_fee_overrides_student_idx" ON "student_fee_overrides" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_guardians_student_idx" ON "student_guardians" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_guardians_guardian_idx" ON "student_guardians" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "student_scholarships_school_idx" ON "student_scholarships" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "student_scholarships_student_idx" ON "student_scholarships" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_scholarships_scholarship_idx" ON "student_scholarships" USING btree ("scholarship_id");--> statement-breakpoint
CREATE INDEX "students_school_idx" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teacher_attendance_school_idx" ON "teacher_attendance" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "teacher_attendance_teacher_idx" ON "teacher_attendance" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "teacher_attendance_date_idx" ON "teacher_attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "teachers_school_idx" ON "teachers" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "term_plans_school_idx" ON "term_plans" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "term_plans_term_year_idx" ON "term_plans" USING btree ("term","year");--> statement-breakpoint
CREATE INDEX "test_scores_school_idx" ON "test_scores" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "test_scores_session_idx" ON "test_scores" USING btree ("test_session_id");--> statement-breakpoint
CREATE INDEX "test_sessions_school_idx" ON "test_sessions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "timetable_periods_school_idx" ON "timetable_periods" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "user_schools_user_idx" ON "user_schools" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_schools_school_idx" ON "user_schools" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "visitor_logs_school_idx" ON "visitor_logs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "visitor_logs_student_idx" ON "visitor_logs" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "visitor_logs_date_idx" ON "visitor_logs" USING btree ("visit_date");