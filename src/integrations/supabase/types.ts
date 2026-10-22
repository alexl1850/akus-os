// Row shapes for the tables in supabase/migrations.

export type Role = "platform_admin" | "owner" | "staff";
export type PlanId = "starter" | "pro";
export type SubAccountStatus = "active" | "paused" | "cancelled";
export type WebsiteStatus = "not_started" | "building" | "live" | "paused";
export type ContactSource = "website" | "missed_call" | "ai_voice" | "import" | "manual";
export type ContactStatus = "lead" | "customer" | "past_customer" | "lost";
export type UsageKind = "sms" | "email" | "ai_voice_minutes";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];
export type DayHours = { open: string; close: string; closed: boolean };
export type BusinessHours = Record<Day, DayHours>;

export interface Plan {
  id: PlanId;
  name: string;
  price_monthly: number;
  ai_voice_enabled: boolean;
  sms_limit: number;
  email_limit: number;
  ai_voice_minutes: number;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  sub_account_id: string | null;
}

export interface SubAccount {
  id: string;
  business_name: string;
  trade: string | null;
  abn: string | null;
  plan_id: PlanId;
  owner_name: string | null;
  owner_mobile: string | null;
  owner_email: string | null;
  business_email: string | null;
  address: string | null;
  service_suburbs: string[];
  business_hours: BusinessHours;
  google_review_url: string | null;
  twilio_number: string | null;
  logo_url: string | null;
  brand_colour: string;
  website_status: WebsiteStatus;
  website_url: string | null;
  status: SubAccountStatus;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  sub_account_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  suburb: string | null;
  address: string | null;
  source: ContactSource;
  tags: string[];
  status: ContactStatus;
  last_job_date: string | null;
  sms_opt_out: boolean;
  email_opt_out: boolean;
  notes: string | null;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  sub_account_id: string;
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

export interface Opportunity {
  id: string;
  sub_account_id: string;
  contact_id: string;
  stage_id: string;
  title: string;
  value: number;
  created_at: string;
}

export interface UsageEvent {
  id: string;
  sub_account_id: string;
  kind: UsageKind;
  quantity: number;
  date: string;
}

export interface PlatformOverviewRow {
  id: string;
  business_name: string;
  trade: string | null;
  plan_id: PlanId;
  plan_name: string;
  status: SubAccountStatus;
  owner_name: string | null;
  owner_email: string | null;
  leads_this_month: number;
  contacts_total: number;
  created_at: string;
}
