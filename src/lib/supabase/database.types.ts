
// Generado a partir del esquema público del proyecto Supabase NEXO AI.
// Proyecto: tzggnlbpyuqfrukbpwuk | PostgREST 14.18

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      workspaces: Table<
        { created_at: string; created_by: string; id: string; name: string; updated_at: string },
        { created_at?: string; created_by: string; id?: string; name: string; updated_at?: string },
        { created_at?: string; created_by?: string; id?: string; name?: string; updated_at?: string }
      >;
      workspace_members: Table<
        { created_at: string; role: string; user_id: string; workspace_id: string },
        { created_at?: string; role?: string; user_id: string; workspace_id: string },
        { created_at?: string; role?: string; user_id?: string; workspace_id?: string },
        [{
          foreignKeyName: "workspace_members_workspace_id_fkey";
          columns: ["workspace_id"];
          isOneToOne: false;
          referencedRelation: "workspaces";
          referencedColumns: ["id"];
        }]
      >;
      contacts: Table<
        { company: string | null; created_at: string; created_by: string; email: string | null; first_name: string; id: string; last_name: string | null; notes: string | null; phone: string | null; source: string | null; status: string; updated_at: string; workspace_id: string },
        { company?: string | null; created_at?: string; created_by: string; email?: string | null; first_name: string; id?: string; last_name?: string | null; notes?: string | null; phone?: string | null; source?: string | null; status?: string; updated_at?: string; workspace_id: string },
        { company?: string | null; created_by?: string; email?: string | null; first_name?: string; id?: string; last_name?: string | null; notes?: string | null; phone?: string | null; source?: string | null; status?: string; updated_at?: string; workspace_id?: string }
      >;
      opportunities: Table<
        { contact_id: string | null; created_at: string; created_by: string; currency: string; expected_close_date: string | null; id: string; next_action_at: string | null; owner_id: string | null; probability: number; stage: string; title: string; updated_at: string; value: number; workspace_id: string },
        { contact_id?: string | null; created_at?: string; created_by: string; currency?: string; expected_close_date?: string | null; id?: string; next_action_at?: string | null; owner_id?: string | null; probability?: number; stage?: string; title: string; updated_at?: string; value?: number; workspace_id: string },
        { contact_id?: string | null; created_by?: string; currency?: string; expected_close_date?: string | null; id?: string; next_action_at?: string | null; owner_id?: string | null; probability?: number; stage?: string; title?: string; updated_at?: string; value?: number; workspace_id?: string },
        [
          {
            foreignKeyName: "opportunities_contact_workspace_fk";
            columns: ["contact_id", "workspace_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id", "workspace_id"];
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ]
      >;
      activities: Table<
        { body: string | null; contact_id: string | null; created_at: string; created_by: string; id: string; occurred_at: string; opportunity_id: string | null; subject: string; type: string; workspace_id: string },
        { body?: string | null; contact_id?: string | null; created_at?: string; created_by: string; id?: string; occurred_at?: string; opportunity_id?: string | null; subject: string; type: string; workspace_id: string },
        { body?: string | null; created_by?: string; occurred_at?: string; opportunity_id?: string | null; subject?: string; type?: string; workspace_id?: string }
      >;
      tasks: Table<
        { assigned_to: string | null; completed_at: string | null; contact_id: string | null; created_at: string; created_by: string; description: string | null; due_at: string | null; id: string; opportunity_id: string | null; priority: string; status: string; title: string; updated_at: string; workspace_id: string },
        { assigned_to?: string | null; completed_at?: string | null; contact_id?: string | null; created_at?: string; created_by: string; description?: string | null; due_at?: string | null; id?: string; opportunity_id?: string | null; priority?: string; status?: string; title: string; updated_at?: string; value?: number; workspace_id: string },
        { assigned_to?: string | null; completed_at?: string | null; contact_id?: string | null; created_by?: string; description?: string | null; due_at?: string | null; id?: string; opportunity_id?: string | null; priority?: string; status?: string; title?: string; updated_at?: string; workspace_id?: string }
      >;
      workspace_invitations: Table<
        { id: string; workspace_id: string; email: string; role: string; invited_by: string; status: string; expires_at: string; accepted_at: string | null; accepted_user_id: string | null; created_at: string },
        { id?: string; workspace_id: string; email: string; role: string; invited_by: string; status?: string; expires_at: string; accepted_at?: string | null; accepted_user_id?: string | null; created_at?: string },
        { id?: string; workspace_id?: string; email?: string; role?: string; invited_by?: string; status?: string; expires_at?: string; accepted_at?: string | null; accepted_user_id?: string | null; created_at?: string }
      >;
      nba_recommendation_events: Table<
        { id: string; workspace_id: string; opportunity_id: string | null; task_id: string | null; recommendation_key: string; recommendation_date: string; kind: string; title_snapshot: string; score: number; factors: Json; action_snapshot: string; message_snapshot: string | null; status: string; recommended_by: string; acted_by: string | null; acted_at: string | null; created_at: string; updated_at: string },
        { id?: string; workspace_id: string; opportunity_id?: string | null; task_id?: string | null; recommendation_key: string; recommendation_date?: string; kind: string; title_snapshot: string; score: number; factors?: Json; action_snapshot: string; message_snapshot?: string | null; status?: string; recommended_by: string; acted_by?: string | null; acted_at?: string | null; created_at?: string; updated_at?: string },
        { id?: string; workspace_id?: string; opportunity_id?: string | null; task_id?: string | null; recommendation_key?: string; recommendation_date?: string; kind?: string; title_snapshot?: string; score?: number; factors?: Json; action_snapshot?: string; message_snapshot?: string | null; status?: string; recommended_by?: string; acted_by?: string | null; acted_at?: string | null; created_at?: string; updated_at?: string }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_workspace_for_current_user: {
        Args: { workspace_name: string };
        Returns: string;
      };
      delete_contact_preserving_history: {
        Args: {
          p_workspace_id: string;
          p_contact_id: string;
        };
        Returns: string;
      };
      accept_workspace_invitation: {
        Args: { p_invitation_id: string };
        Returns: string;
      };
      add_workspace_member: {
        Args: {
          p_workspace_id: string;
          p_user_id: string;
          p_role: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<
  Name extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][Name]["Row"];

export type TablesInsert<
  Name extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][Name]["Insert"];

export type TablesUpdate<
  Name extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][Name]["Update"];
