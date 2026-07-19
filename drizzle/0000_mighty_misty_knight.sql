CREATE TABLE "node_edges" (
	"parent_id" integer NOT NULL,
	"child_id" integer NOT NULL,
	CONSTRAINT "node_edges_parent_id_child_id_pk" PRIMARY KEY("parent_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "node_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "node_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"node_id" integer NOT NULL,
	"kind" text DEFAULT 'custom' NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "nodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'package' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"launched_at" text,
	"launched_by" text,
	"ownership" text DEFAULT 'opensource' NOT NULL,
	"license" text,
	"milestones" jsonb,
	"install_guide" text DEFAULT '' NOT NULL,
	"tutorial" text DEFAULT '' NOT NULL,
	"common_functions" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL,
	"published_at" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"display_name" text,
	"email" text,
	"role" text DEFAULT 'contributor' NOT NULL,
	"provider" text DEFAULT 'local' NOT NULL,
	"provider_id" text,
	"avatar_url" text,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_edges" ADD CONSTRAINT "node_edges_parent_id_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_edges" ADD CONSTRAINT "node_edges_child_id_nodes_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "node_links" ADD CONSTRAINT "node_links_node_id_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_links_node_idx" ON "node_links" USING btree ("node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "nodes_slug_idx" ON "nodes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "nodes_status_idx" ON "nodes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");